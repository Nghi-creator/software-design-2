# UniHub Workshop - Thiết kế kỹ thuật

## Kiến trúc tổng thể

UniHub Workshop hiện được triển khai theo mô hình **modular monolith backend + client prototypes**. Thiết kế này giữ hệ thống đủ đơn giản để chạy local và demo, nhưng vẫn đặt các cơ chế quan trọng đúng vị trí: RBAC ở API boundary, rate limiting trước luồng đăng ký, idempotency cho đăng ký/thanh toán, transaction và row-level locking cho tranh chấp ghế, circuit breaker cho thanh toán, và batch sync cho check-in offline.

Các thành phần chính:

- **Web App**: Vite, React, TypeScript. Là prototype UI cho sinh viên và BTC, thể hiện lịch workshop, số ghế còn lại, đăng ký có phí, QR/check-in và admin dashboard preview.
- **Mobile Check-in App**: Flutter, Material 3. Là prototype UI cho nhân sự check-in, gồm scanner, offline queue, history và staff profile.
- **Backend API**: Node.js, Express, TypeScript. Là service nghiệp vụ trung tâm, cung cấp REST API cho workshop, phòng, đăng ký, check-in và đồng bộ offline.
- **PostgreSQL / Supabase-compatible SQL**: database chính, được khởi tạo bằng `services/api/sql/001_init_supabase.sql`.
- **Redis**: in-memory store cho token-bucket rate limiting và idempotency response cache.
- **CSV import job**: `node-cron` job chạy trong Backend API process để đồng bộ dữ liệu sinh viên từ file CSV hằng đêm.

Implementation hiện tại không có message broker/worker service riêng. `bullmq` đã có trong `package.json`, và hướng hoàn thiện đã chọn là thêm worker riêng dùng BullMQ trên Upstash Redis cho notification jobs; runtime hiện tại vẫn xử lý CSV sync trong API process.

## Architectural Style

Kiến trúc thực tế là **layered modular monolith**:

- Presentation layer nằm ở `apps/web` và `apps/mobile`.
- API layer nằm ở `services/api/src/routes`.
- Controller layer nằm ở `services/api/src/controllers`.
- Service layer nằm ở `services/api/src/services` và chứa nghiệp vụ workshop, room, registration, check-in, payment và AI summary.
- Middleware layer xử lý RBAC, Redis rate limiting và idempotency.
- Data layer dùng `pg` Pool trong `services/api/src/lib/db.ts` để truy cập PostgreSQL bằng SQL trực tiếp.
- Scheduled job layer nằm trong API process và đồng bộ CSV mỗi ngày lúc 02:00.

Cách tiếp cận này phù hợp với quy mô đồ án: dễ chạy, dễ debug, ít overhead vận hành, nhưng vẫn thể hiện các quyết định kỹ thuật bắt buộc trong yêu cầu.

## Các thành phần chính

### 1. Web Application

**Đường dẫn:** `apps/web`

**Công nghệ:** Vite + React + TypeScript.

Web Application là một ứng dụng web duy nhất dành cho cả sinh viên và BTC. Hệ thống dùng RBAC để phân quyền route, màn hình và thao tác theo vai trò.

Chức năng chính:

- Sinh viên xem danh sách workshop đang mở.
- Sinh viên xem thông tin diễn giả, phòng, giá, số ghế còn lại và AI summary.
- Sinh viên đăng ký workshop miễn phí hoặc có phí.
- Sinh viên nhận QR code sau khi đăng ký thành công.
- BTC tạo workshop mới.
- BTC chỉnh sửa thông tin workshop, thay đổi phòng hoặc thời gian, hủy workshop theo phạm vi admin.
- BTC tải lên file PDF giới thiệu workshop để tạo AI summary.
- BTC xem số liệu đăng ký và tình trạng chỗ ngồi.

Web App giao tiếp với Backend API qua REST API. Phần prototype UI hiện tại chưa wire đầy đủ mọi endpoint, nhưng API contract đã được backend hỗ trợ.

### 2. Mobile Check-in Application

**Đường dẫn:** `apps/mobile`

**Công nghệ:** Flutter + Material 3.

Mobile App là prototype UI cho nhân sự check-in:

- Scanner tab cho QR check-in.
- Offline queue tab thể hiện các lượt scan đang chờ mạng và kết quả sync.
- History tab cho lịch sử điểm danh theo phòng.
- Profile tab cho thông tin staff và quyền truy cập.

Backend hỗ trợ hai endpoint chính:

- `POST /api/checkin`: check-in online từng QR code.
- `POST /api/checkin/sync`: batch sync danh sách QR code đã scan offline.

Yêu cầu offline ở client là app phải lưu queue bền vững khi mất mạng và retry khi kết nối trở lại. Server side hiện đã xử lý sync theo hướng idempotent: QR không hợp lệ, QR đã check-in và QR hợp lệ được trả trạng thái riêng cho từng item.

### 3. Backend API

**Đường dẫn:** `services/api`

**Công nghệ:** Node.js + Express + TypeScript + `pg` + Redis.

Backend API expose:

- `GET /api/workshops`: lấy danh sách workshop kèm thông tin phòng.
- `POST /api/workshops`: BTC tạo workshop, upload PDF bằng `multer`, tạo AI summary nếu có file.
- `POST /api/workshops/:id/register`: sinh viên đăng ký workshop, có RBAC, rate limiting, idempotency, PostgreSQL row lock và payment circuit breaker.
- `GET /api/rooms`: lấy danh sách phòng.
- `POST /api/rooms`: BTC tạo phòng.
- `PUT /api/rooms/:id`: BTC cập nhật phòng.
- `DELETE /api/rooms/:id`: BTC xóa phòng.
- `POST /api/checkin`: nhân sự check-in xác nhận một QR code.
- `POST /api/checkin/sync`: nhân sự check-in đồng bộ batch QR offline.
- `GET /health`: health check đơn giản.

Khi server start, `src/index.ts` gọi `startCsvSyncJob()` để schedule CSV sync.

### 4. PostgreSQL

**Schema:** `services/api/sql/001_init_supabase.sql`

Database lưu các bảng chính:

- `users`: người dùng với role `STUDENT`, `ORGANIZER`, `CHECKIN_STAFF`, email và optional `student_id`.
- `rooms`: phòng tổ chức, vị trí và sức chứa.
- `workshops`: thông tin workshop, speaker, `room_id`, capacity, `seats_remaining`, price, `start_time`, `pdf_url`, `ai_summary`.
- `registrations`: quan hệ sinh viên-workshop, `qr_code`, trạng thái `PENDING`, `CONFIRMED`, `CANCELLED`, và `checked_in_at`.
- `payments`: thanh toán gắn với registration, amount, status, transaction id và `idempotency_key`.
- `checkins`: log điểm danh, staff, thời gian check-in và nguồn `ONLINE` hoặc `OFFLINE_SYNC`.
- `idempotency_keys`: trạng thái idempotency `IN_PROGRESS` hoặc `COMPLETED`, response và status code.

PostgreSQL được chọn vì luồng đăng ký cần ACID transaction và row-level locking để không overbook khi nhiều sinh viên tranh ghế cuối.

### 5. Redis

**Thư viện:** `ioredis`.

Redis được dùng cho hai cơ chế quan trọng:

- **Token Bucket Rate Limiting**: middleware `rateLimiter(5, 0.5)` trên endpoint register giới hạn 5 request với tốc độ refill 0.5 token/giây theo IP. Lua script cập nhật atomic các field `tokens` và `last_refill`, key hết hạn sau 60 giây.
- **Idempotency Response Cache**: middleware đọc `Idempotency-Key` header, trả lại response cached nếu có `idempotency:{key}`, và lưu response với TTL 24h.

Nếu Redis gặp lỗi ở rate limiter, middleware fail-open và cho request đi tiếp để tránh làm down toàn bộ API.

### 6. Payment Circuit Breaker

**Đường dẫn:** `services/api/src/services/payment.ts`

Payment flow là mock gateway được bọc bằng `opossum` circuit breaker:

- Gateway giả lập delay 500ms và random failure 30%.
- Timeout: 3000ms.
- Error threshold: 50%.
- Reset timeout: 10000ms.
- Khi breaker open, fallback ném lỗi "Payment Service is currently unavailable. Please try again later."

Trong service đăng ký, payment chỉ được gọi nếu workshop có `price > 0`. Registration và payment được tạo ở trạng thái pending trước, sau đó được confirm khi thanh toán thành công. Nếu thiếu payment token hoặc payment fail, reservation bị cancel, payment chuyển `FAILED`, registration chuyển `CANCELLED`, và ghế được trả lại.

### 7. AI Summary

**Đường dẫn:** `services/api/src/services/ai.ts`

Khi BTC tạo workshop với PDF:

1. `multer` đọc file vào memory.
2. `pdf-parse` trích text từ PDF buffer.
3. `@google/genai` gọi model AI để tạo summary.
4. API lưu summary vào `workshops.ai_summary`.

Nếu AI hoặc PDF parsing lỗi, service cần trả fallback thân thiện để thao tác tạo workshop không làm sập hệ thống.

### 8. CSV Sync Flow

**Đường dẫn:** `services/api/src/jobs/csvSync.ts`

CSV sync chạy bằng `node-cron` trong API process:

- Schedule: `0 2 * * *` mỗi ngày lúc 02:00.
- File source: `services/api/data/students.csv`.
- Parser: `csv-parser`.
- Mỗi dòng CSV được upsert vào bảng `users` theo `student_id`.
- Nếu file không tồn tại, job skip và log message.
- Nếu một dòng lỗi, job log lỗi, tăng error count và tiếp tục xử lý các dòng còn lại.

Đây là import job nội bộ, phù hợp ràng buộc tích hợp một chiều vì hệ thống cũ chỉ export CSV và không có API.

## Luồng nghiệp vụ quan trọng

### Đăng ký workshop

`POST /api/workshops/:id/register`

1. Client gửi request với `Idempotency-Key` header và optional `paymentToken`.
2. `attachUser` lấy user từ `x-user-id`/`x-user-role` hoặc body theo cơ chế demo.
3. `requireRole(STUDENT)` chỉ cho sinh viên đăng ký.
4. Redis token bucket giới hạn request theo IP.
5. Idempotency middleware kiểm tra Redis trước, sau đó bảng `idempotency_keys`.
6. Registration service mở transaction.
7. API lock workshop row:

```sql
select id, price, seats_remaining
from workshops
where id = $1
for update;
```

8. API kiểm tra workshop tồn tại, còn ghế và user chưa đăng ký workshop đó.
9. API trừ `seats_remaining`, tạo `registrations` status `PENDING`, tạo `payments` status `PENDING`.
10. Nếu workshop có phí, API yêu cầu `paymentToken` và gọi `paymentCircuitBreaker.fire`.
11. Nếu payment thành công, API update payment `SUCCESS` và registration `CONFIRMED`.
12. Nếu payment fail hoặc thiếu token, API cancel reservation, trả ghế lại, payment `FAILED`, registration `CANCELLED`.
13. Response được lưu vào Redis TTL 24h và bảng `idempotency_keys`.

Cơ chế này giải quyết spike traffic, double submit/double charge và race condition ở ghế cuối.

### Check-in online và offline sync

`POST /api/checkin`

- Chỉ role `CHECKIN_STAFF` được gọi.
- API tìm `Registration` theo `qrCode`.
- Nếu QR không tồn tại hoặc registration chưa `CONFIRMED`, trả trạng thái invalid.
- Nếu đã có `checked_in_at` hoặc bản ghi `checkins`, trả `already_checked_in`.
- Nếu hợp lệ, transaction update `registrations.checked_in_at` và insert `checkins` với source `ONLINE`.

`POST /api/checkin/sync`

- Chỉ role `CHECKIN_STAFF` được gọi.
- Payload có thể là `{ items: [...] }` hoặc `{ qrCodes: [...] }`.
- API xử lý từng item, gọi cùng logic check-in với source `OFFLINE_SYNC`.
- Mỗi item trả kết quả riêng: `checked_in`, `already_checked_in`, `invalid` hoặc `failed`.

Luồng sync an toàn khi retry vì registration đã check-in sẽ không bị tạo check-in trùng.

### Nhập dữ liệu sinh viên từ CSV hằng đêm

`startCsvSyncJob()`

1. `node-cron` chạy lúc 02:00 mỗi ngày.
2. Job đọc `services/api/data/students.csv`.
3. Nếu file không tồn tại, job log và skip.
4. Job parse CSV bằng stream.
5. Mỗi dòng được upsert vào `users` theo `student_id`, role mặc định `STUDENT`.
6. Dòng lỗi được log riêng, không làm dừng toàn bộ job.
7. Job in tổng số dòng thành công và lỗi.

Luồng này đáp ứng ràng buộc legacy integration một chiều: chỉ đọc CSV export theo lịch cố định, không gọi API hệ thống cũ.

## C4 Diagram

Chi tiết C4 nằm trong `c4_diagrams.md`.

### Level 1 - System Context

Level 1 thể hiện UniHub Workshop như một hệ thống duy nhất trong môi trường đại học:

- Sinh viên đăng ký, thanh toán nếu cần và nhận QR.
- BTC tạo workshop, quản lý phòng, upload PDF và xem thống kê.
- Nhân sự check-in scan QR và sync offline queue.
- Hệ thống tích hợp Mock Payment Gateway, Google Gemini API và nguồn CSV sinh viên từ hệ thống cũ.

### Level 2 - Container

Level 2 phân rã các container hiện có:

- Web App: Vite + React + TypeScript.
- Mobile App: Flutter.
- Backend API: Express + TypeScript.
- PostgreSQL: persistent data và row-level locking.
- Redis: rate limiting và idempotency cache.
- Student CSV File: input cho cron sync job.

Không vẽ Message Broker như runtime container bắt buộc vì implementation hiện tại chưa có queue worker riêng; bước hoàn thiện còn lại là thêm BullMQ worker trên Upstash Redis cho notification jobs.

## Thiết kế cơ sở dữ liệu

Hệ thống dùng **PostgreSQL** vì registration cần tính nhất quán ACID và row-level locking.

### `users`

- `id`: UUID primary key.
- `email`: unique email.
- `name`: tên người dùng.
- `role`: `STUDENT`, `ORGANIZER`, `CHECKIN_STAFF`.
- `student_id`: unique optional field cho CSV sync.
- `created_at`: thời điểm tạo.

### `rooms`

- `id`: UUID primary key.
- `name`: tên phòng.
- `location`: vị trí phòng.
- `capacity`: sức chứa phòng.

### `workshops`

- `id`: UUID primary key.
- `title`: tên workshop.
- `speaker`: diễn giả.
- `room_id`: foreign key đến `rooms`.
- `capacity`: tổng số ghế mở đăng ký.
- `seats_remaining`: số ghế còn lại.
- `price`: giá, `0` là miễn phí.
- `start_time`: thời gian bắt đầu.
- `pdf_url`: đường dẫn PDF nếu có.
- `ai_summary`: AI summary optional.
- `created_at`, `updated_at`: timestamps.

### `registrations`

- `id`: UUID primary key.
- `user_id`, `workshop_id`: foreign keys.
- `qr_code`: unique QR token.
- `status`: `PENDING`, `CONFIRMED`, `CANCELLED`.
- `checked_in_at`: thời điểm check-in nếu có.
- Unique constraint `(user_id, workshop_id)` ngăn một user đăng ký trùng workshop.

### `payments`

- `id`: UUID primary key.
- `registration_id`: unique foreign key.
- `amount`: số tiền.
- `status`: `PENDING`, `SUCCESS`, `FAILED`.
- `transaction_id`: mã giao dịch từ gateway.
- `idempotency_key`: unique key chống retry trùng.

### `checkins`

- `id`: UUID primary key.
- `registration_id`: unique foreign key.
- `staff_id`: nhân sự check-in.
- `checkin_time`: thời điểm quét.
- `source`: `ONLINE` hoặc `OFFLINE_SYNC`.

### `idempotency_keys`

- `key`: primary key từ `Idempotency-Key` header.
- `status`: `IN_PROGRESS` hoặc `COMPLETED`.
- `response`: JSON response string.
- `status_code`: HTTP status code đã trả.
- `created_at`, `updated_at`: timestamps.

## Thiết kế kiểm soát truy cập

Hệ thống dùng RBAC với ba vai trò đúng theo yêu cầu:

- `STUDENT`: xem workshop, xem phòng và đăng ký workshop.
- `ORGANIZER`: tạo workshop, upload PDF, quản lý phòng, quản lý thông tin workshop và xem dữ liệu quản trị.
- `CHECKIN_STAFF`: check-in QR và sync offline queue.

Implementation hiện tại có middleware:

- `attachUser`: gắn user demo từ `x-user-id`, `x-user-role` hoặc body.
- `requireRole(...)`: trả `401` nếu chưa có user, trả `403` nếu role không được phép.

Route đang enforce role:

- `POST /api/workshops`: `ORGANIZER`.
- `POST /api/workshops/:id/register`: `STUDENT`.
- `POST /api/rooms`, `PUT /api/rooms/:id`, `DELETE /api/rooms/:id`: `ORGANIZER`.
- `POST /api/checkin`, `POST /api/checkin/sync`: `CHECKIN_STAFF`.

Vì đây là đồ án/demo, authentication hiện chưa phải JWT/session thật. Nếu productionize, `attachUser` cần được thay bằng xác thực thật và token ký số.

## Cơ chế bảo vệ hệ thống

### Kiểm soát tải đột biến

Endpoint register dùng Redis Lua token bucket. Tham số hiện tại là 5 token capacity và refill 0.5 token/giây, tương đương 5 request mỗi 10 giây theo IP. Vượt ngưỡng trả `429 Too Many Requests`.

**Trade-off:** Nếu Redis lỗi, rate limiter fail-open để giữ API khả dụng; đổi lại database có thể nhận nhiều request hơn trong thời gian Redis outage.

### Chống double submit và double charge

Idempotency middleware dùng hai tầng:

- Redis fast path với key `idempotency:{key}` và TTL 24h.
- PostgreSQL persistent fallback bằng bảng `idempotency_keys`.

Middleware yêu cầu `Idempotency-Key` cho registration endpoint. Request trùng key đã hoàn tất sẽ nhận lại response cũ mà không tạo registration/payment mới. Request trùng key đang xử lý sẽ nhận `409 Request is already in progress`.

**Trade-off:** Cần thêm storage cho response cache, nhưng giảm rủi ro double charge/double ticket khi client retry.

### PostgreSQL locking cho ghế cuối

Đăng ký workshop lock row `workshops` bằng `FOR UPDATE`. Vì vậy hai request tranh ghế cuối sẽ được serialize tại database. Sau khi lock, API kiểm tra `seats_remaining`, unique registration, rồi mới giữ ghế.

**Trade-off:** Lock row làm giảm throughput trên cùng một workshop hot, nhưng đảm bảo không overbook.

### Payment circuit breaker

Payment mock gateway được bọc bằng Opossum. Khi gateway lỗi liên tục, breaker open và fail fast thay vì để request treo đến timeout. Flow này chỉ ảnh hưởng workshop có phí; workshop miễn phí không gọi payment gateway thật.

**Trade-off:** Một số payment request có thể bị từ chối nhanh trong lúc gateway đang hồi phục, nhưng API tránh cascading failure và các tính năng không liên quan đến payment vẫn hoạt động.

## Alternatives đã xem xét

- **BullMQ + Upstash Redis worker riêng**: Phù hợp cho email notification, retry queue và job volume của scope hiện tại; giữ kiến trúc queue + worker dễ giải thích mà không cần thêm RabbitMQ chỉ cho một feature còn lại. Nếu chuyển sang serverless hoàn toàn và không giữ được worker process, QStash là phương án thay thế phù hợp hơn.
- **Microservices**: Chưa cần thiết cho scope hiện tại; modular monolith giúp dễ debug và giữ transaction registration đơn giản.
- **NoSQL database cho registration**: Không phù hợp bằng PostgreSQL cho bài toán ghế cuối vì cần ACID transaction và row-level locking.
- **Chỉ disable button ở frontend để chống double click**: Không đủ vì retry mạng/API client vẫn có thể gửi trùng. Backend idempotency vẫn là bắt buộc cho paid registration.
