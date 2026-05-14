# UniHub Workshop - Thiết kế kỹ thuật

## Kiến trúc tổng thể

UniHub Workshop hiện được triển khai theo mô hình **modular monolith backend + client prototypes**:

- **Web App**: Vite, React, TypeScript. Hiện là prototype UI cho sinh viên và admin, thể hiện lịch workshop, đăng ký có phí, áp lực chỗ ngồi, QR/check-in và bản xem trước admin dashboard.
- **Mobile App**: Flutter, Material 3. Hiện là prototype UI cho nhân sự check-in, gồm màn hình scanner, hàng đợi đồng bộ offline, lịch sử và hồ sơ cá nhân.
- **Backend API**: Node.js, Express, TypeScript, Prisma. Đây là container nghiệp vụ chính, cung cấp REST API cho workshop, đăng ký, check-in và đồng bộ offline.
- **PostgreSQL**: database chính, chạy qua docker-compose với image `postgres:15-alpine`.
- **Redis**: in-memory store cho rate limiting và idempotency response cache, chạy qua docker-compose với image `redis:7-alpine`.

Implementation hiện tại **không có message broker, worker service riêng, email service hay authentication middleware**. Các tác vụ nền đang có trong code, như CSV sync, chạy trong cùng process với Backend API bằng `node-cron`.

## Architectural Style

Kiến trúc thực tế là **layered modular monolith**:

- Presentation layer nằm ở `apps/web` và `apps/mobile`.
- API layer nằm ở `services/api/src/routes`.
- Middleware layer xử lý các cross-cutting concerns như Redis rate limiting và idempotency.
- Service layer bọc các tích hợp payment và AI summary.
- Data layer dùng Prisma để truy cập PostgreSQL.
- Scheduled job layer nằm trong API process và đồng bộ CSV mỗi ngày lúc 02:00.

Cách tiếp cận này phù hợp với quy mô hiện tại: code đơn giản để chạy local, các boundary rõ ràng, và các cơ chế quan trọng như Redis, database lock, circuit breaker đã nằm đúng chỗ trong request path.

## Các thành phần chính

### 1. Web App

**Đường dẫn:** `apps/web`

**Công nghệ:** Vite + React + TypeScript.

Web App hiện tại là giao diện prototype cho cả trải nghiệm student-facing và admin-facing:

- Hiển thị danh sách workshop mẫu, topic, phòng, giá và số ghế còn lại.
- Mô tả flow đăng ký, thanh toán, nhận QR và check-in.
- Có admin preview cho registration metrics, seat pressure và payment incidents.
- Chưa wire trực tiếp đến Backend API trong code hiện tại; phần API contract đã nằm ở Express service.

### 2. Mobile Check-in App

**Đường dẫn:** `apps/mobile`

**Công nghệ:** Flutter + Material 3.

Mobile App hiện tại là prototype UI cho nhân sự check-in:

- Scanner tab cho QR check-in.
- Offline queue tab thể hiện các scan đang chờ mạng và kết quả sync.
- History tab cho lịch sử điểm danh theo phòng.
- Profile tab cho thông tin staff và quyền truy cập.

Backend đã implement hai endpoint phù hợp với mobile flow:

- `POST /api/checkin`: check-in online từng QR code.
- `POST /api/checkin/sync`: batch sync danh sách QR code đã scan offline.

Local storage/camera/network detection chưa được implement trong Flutter code. Tài liệu này xem đó là client-side extension tiếp theo, còn server contract đã có.

### 3. Backend API

**Đường dẫn:** `services/api`

**Công nghệ:** Node.js + Express + TypeScript + Prisma.

Backend API expose:

- `GET /api/workshops`: lấy danh sách workshop.
- `POST /api/workshops`: tạo workshop, upload PDF bằng `multer`, tạo AI summary nếu có file.
- `POST /api/workshops/:id/register`: đăng ký workshop, có rate limiting, idempotency, Postgres locking và payment circuit breaker.
- `POST /api/checkin`: check-in một QR code.
- `POST /api/checkin/sync`: đồng bộ batch QR code offline.
- `GET /health`: health check đơn giản.

Khi server start, `src/index.ts` gọi `startCsvSyncJob()` để schedule CSV sync.

### 4. PostgreSQL

**Schema:** `services/api/prisma/schema.prisma`

Database lưu các model đang có:

- `User`: email, name, role, optional `studentId`.
- `Workshop`: title, speaker, room, total/available seats, price, start/end time, optional AI `summary`.
- `Registration`: user/workshop relation, unique `qrCode`, status `PENDING | SUCCESS | FAILED | CHECKED_IN`, unique pair `[userId, workshopId]`.
- `IdempotencyKey`: persistent response cache theo key.

Khác với bản thiết kế cũ, code hiện tại **không có** bảng riêng cho `Room`, `Payment`, `Checkin` hay `Notification`. Room đang là field string trong `Workshop`; check-in đang được biểu diễn bằng `Registration.status = CHECKED_IN`; kết quả thanh toán mock không được lưu vào bảng riêng.

### 5. Redis

**Thư viện:** `ioredis`.

Redis được dùng cho hai cơ chế quan trọng:

- **Token Bucket Rate Limiting**: middleware `rateLimiter(5, 0.5)` trên endpoint register giới hạn 5 request với tốc độ refill 0.5 token/giây theo IP. Lua script cập nhật atomic các field `tokens` và `last_refill`, key hết hạn sau 60 giây.
- **Idempotency Response Cache**: middleware đọc `Idempotency-Key` header, trả lại response cached nếu có `idempotency:{key}`, và lưu response thành công với TTL 24h.

Nếu Redis gặp lỗi ở rate limiter, middleware fail-open và cho request đi tiếp để tránh làm down toàn bộ API.

### 6. Payment Circuit Breaker

**Đường dẫn:** `services/api/src/services/payment.ts`

Payment flow là mock gateway được bọc bằng `opossum` circuit breaker:

- Gateway giả lập delay 500ms và random failure 30%.
- Timeout: 3000ms.
- Error threshold: 50%.
- Reset timeout: 10000ms.
- Khi breaker open, fallback ném lỗi "Payment Service is currently unavailable. Please try again later."

Trong endpoint register, payment chỉ được gọi nếu `Workshop.price > 0`. Lỗi payment nằm trong database transaction nên registration và decrement seat sẽ rollback nếu payment fail.

### 7. AI Summary

**Đường dẫn:** `services/api/src/services/ai.ts`

Khi organizer tạo workshop với PDF:

1. `multer` đọc file vào memory.
2. `pdf-parse` trích text từ PDF buffer.
3. `@google/genai` gọi model `gemini-2.5-flash`.
4. API lưu text summary vào `Workshop.summary`.

Nếu AI hoặc PDF parsing lỗi, service trả về chuỗi lỗi thân thiện và vẫn cho phép tạo workshop với summary fallback.

### 8. CSV Sync Flow

**Đường dẫn:** `services/api/src/jobs/csvSync.ts`

CSV sync chạy bằng `node-cron` trong API process:

- Schedule: `0 2 * * *` mỗi ngày lúc 02:00.
- File source: `services/api/data/students.csv`.
- Parser: `csv-parser`.
- Mỗi dòng CSV được `prisma.user.upsert` theo `studentId`.
- Nếu file không tồn tại, job skip và log message.

Đây là import job nội bộ, không phải message queue hay worker riêng.

## Luồng nghiệp vụ quan trọng

### Đăng ký workshop

`POST /api/workshops/:id/register`

1. Client gửi `userId`, optional `paymentToken`, và optional `Idempotency-Key` header.
2. Redis token bucket giới hạn request theo IP.
3. Idempotency middleware kiểm tra Redis trước, sau đó PostgreSQL `IdempotencyKey`.
4. API mở Prisma transaction.
5. API lock workshop row bằng raw SQL:

```sql
SELECT * FROM "Workshop" WHERE id = $1 FOR UPDATE;
```

6. API kiểm tra workshop tồn tại, còn ghế và user chưa đăng ký workshop đó.
7. Nếu workshop có phí, API yêu cầu `paymentToken` và gọi `paymentCircuitBreaker.fire`.
8. API decrement `availableSeats`, tạo `Registration` với UUID `qrCode` và status `SUCCESS`.
9. Response thành công được lưu vào Redis TTL 24h và bảng `IdempotencyKey`.

Cơ chế này giải quyết ba rủi ro chính: spike traffic, double submit/double charge, và race condition ở ghế cuối.

### Check-in online và offline sync

`POST /api/checkin`

- Tìm `Registration` theo `qrCode`.
- Nếu không thấy QR, trả 404.
- Nếu đã `CHECKED_IN`, trả 400.
- Nếu hợp lệ, update status thành `CHECKED_IN`.

`POST /api/checkin/sync`

- Nhận payload `{ qrCodes: string[] }`.
- Dùng `updateMany` với điều kiện `qrCode in qrCodes` và `status != CHECKED_IN`.
- Trả về số bản ghi đã sync.

Endpoint sync idempotent theo trạng thái: QR đã check-in sẽ không bị update lại.

## C4 Diagram

Chi tiết C4 nằm trong `c4_diagrams.md`.

### Level 1 - System Context

Level 1 thể hiện UniHub Workshop như một hệ thống duy nhất trong môi trường đại học:

- Sinh viên đăng ký, thanh toán nếu cần và nhận QR.
- Ban tổ chức tạo workshop và upload PDF.
- Nhân sự check-in scan QR và sync offline queue.
- Hệ thống tích hợp Mock Payment Gateway, Google Gemini API và nguồn CSV sinh viên từ hệ thống cũ.

### Level 2 - Container

Level 2 phân rã đúng các container hiện có:

- Web App: Vite + React + TypeScript.
- Mobile App: Flutter.
- Backend API: Express + TypeScript + Prisma.
- PostgreSQL: persistent data và row-level locking.
- Redis: rate limiting và idempotency cache.
- Student CSV File: input cho cron sync job.

Không vẽ Message Broker trong C4 Level 2 vì code hiện tại chưa có queue runtime.

## Thiết kế cơ sở dữ liệu

Hệ thống dùng **PostgreSQL** vì registration cần tính nhất quán ACID và pessimistic locking. Prisma schema hiện tại tập trung vào các bảng cần cho workshop registration và check-in state.

### User

- `id`: UUID primary key.
- `email`: unique email.
- `name`: tên người dùng.
- `role`: `STUDENT`, `ORGANIZER`, `CHECKIN_STAFF`.
- `studentId`: unique optional field cho CSV sync.
- `registrations`: relation đến `Registration`.

### Workshop

- `id`: UUID primary key.
- `title`: tên workshop.
- `speaker`: diễn giả.
- `room`: phòng/tòa nhà dạng string.
- `totalSeats`: tổng số ghế.
- `availableSeats`: số ghế còn lại.
- `price`: giá, `0` là miễn phí.
- `startTime`, `endTime`: thời gian workshop.
- `summary`: AI summary optional.

### Registration

- `id`: UUID primary key.
- `userId`, `workshopId`: foreign keys.
- `qrCode`: unique QR token.
- `status`: `PENDING`, `SUCCESS`, `FAILED`, `CHECKED_IN`.
- Unique constraint `[userId, workshopId]` ngăn một user đăng ký trùng workshop.

### IdempotencyKey

- `key`: primary key từ `Idempotency-Key` header.
- `response`: JSON response string.
- `createdAt`: thời điểm tạo.

## Thiết kế kiểm soát truy cập

Prisma schema đã có enum `Role`, và UI/domain chia vai trò thành:

- `STUDENT`: xem workshop và đăng ký.
- `ORGANIZER`: tạo workshop, upload PDF, quản lý thông tin.
- `CHECKIN_STAFF`: check-in và sync offline queue.

Tuy nhiên, API hiện tại **chưa implement authentication/authorization middleware**. `userId` đang được nhận từ request body trong register route với comment "In real app, userId from JWT". Bước tiếp theo nếu tiếp tục productionize là thêm JWT/session middleware và enforce role theo route.

## Cơ chế bảo vệ hệ thống

### Kiểm soát tải đột biến

Endpoint register dùng Redis Lua token bucket. Tham số hiện tại là 5 token capacity và refill 0.5 token/giây, tương đương comment trong code: 5 requests mỗi 10 giây theo IP. Vượt ngưỡng trả `429 Too Many Requests`.

**Trade-off:** Nếu Redis lỗi, rate limiter fail-open để giữ API khả dụng; đổi lại database có thể nhận nhiều request hơn trong thời gian Redis outage.

### Chống double submit và double charge

Idempotency middleware dùng hai tầng:

- Redis fast path với key `idempotency:{key}` và TTL 24h.
- PostgreSQL persistent fallback bằng `IdempotencyKey`.

Middleware chỉ lưu response khi status code 2xx. Request trùng key sẽ nhận lại response thành công cũ mà không tạo registration mới.

**Trade-off:** Cần thêm storage cho response cache, nhưng giảm rủi ro double charge/double ticket khi client retry.

### PostgreSQL locking cho ghế cuối

Đăng ký workshop chạy trong transaction và lock row `Workshop` bằng `FOR UPDATE`. Vì vậy hai request tranh ghế cuối sẽ được serialize tại database. Sau khi lock, API kiểm tra `availableSeats`, unique registration, payment, rồi mới decrement seat và tạo registration.

**Trade-off:** Lock row làm giảm throughput trên cùng một workshop hot, nhưng đảm bảo không overbook.

### Payment circuit breaker

Payment mock gateway được bọc bằng Opossum. Khi gateway lỗi liên tục, breaker open và fail fast thay vì để request treo đến timeout. Flow này chỉ ảnh hưởng workshop có phí; workshop miễn phí không gọi payment.

**Trade-off:** Một số payment request có thể bị từ chối nhanh trong lúc gateway đang hồi phục, nhưng API tránh cascading failure.

## Alternatives đã xem xét

- **Message broker + worker riêng**: Phù hợp khi cần email, notification, retry queue và job volume lớn. Chưa được implement trong code hiện tại, nên không đưa vào C4 như một container thật.
- **Microservices**: Chưa cần thiết cho scope hiện tại; modular monolith giúp dễ debug và giữ transaction registration đơn giản.
- **NoSQL database cho registration**: Không phù hợp bằng PostgreSQL cho bài toán ghế cuối vì cần ACID transaction và row-level locking.
- **Chỉ disable button ở frontend để chống double click**: Không đủ vì retry mạng/API client vẫn có thể gửi trùng. Backend idempotency vẫn là bắt buộc cho paid registration.
