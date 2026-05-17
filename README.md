# Demo UniHub Workshop

UniHub là hệ thống demo quản lý workshop cho trường đại học. Repository này gồm:

- `supabase/migrations/*`: schema PostgreSQL, cần chạy theo thứ tự tên file.
- `supabase/seed.sql`: dữ liệu demo cho phòng, workshop, người dùng, đăng ký, thanh toán và check-in.
- `services/api`: REST API Express, cron import CSV, logic đăng ký/thanh toán/check-in.
- `services/api/src/workers/notificationWorker.ts`: worker thông báo dùng BullMQ.
- `apps/web`: web app React/Vite cho sinh viên và organizer.
- `apps/mobile`: app Flutter để nhân viên check-in quét QR và đồng bộ offline.

## Phạm vi hướng dẫn này

Hướng dẫn dưới đây dành cho **mô hình demo dùng dịch vụ hosted**:

- PostgreSQL trên Supabase.
- Redis trên Upstash hoặc một Redis hosted khác.
- API, worker, web app và mobile app chạy trực tiếp trên máy local.

Repository hiện **không cung cấp cấu hình Docker** như `Dockerfile` hay `docker-compose.yml`. Docker là công cụ bên ngoài, nhưng để có một luồng setup bằng Docker thì project vẫn cần các file cấu hình riêng cho chính hệ thống này.

## Yêu cầu trước khi chạy

- Node.js 18 trở lên và npm.
- Một project Supabase Postgres.
- Upstash Redis, hoặc một Redis hosted khác truy cập được qua `REDIS_URL`.
- Tùy chọn: Flutter SDK nếu muốn chạy app mobile check-in.
- Tùy chọn nhưng bắt buộc nếu muốn gửi email thật: tài khoản Gmail và App Password.

## 1. Tạo database

Chạy toàn bộ migration theo đúng thứ tự, sau đó chạy file seed:

1. `supabase/migrations/20260514000000_init_supabase.sql`
2. `supabase/migrations/20260515163034_csv_process.sql`
3. `supabase/migrations/20260517000000_room_layout_urls.sql`
4. `supabase/migrations/20260517090000_notifications.sql`
5. `supabase/migrations/20260517120000_notification_read_receipts.sql`
6. `supabase/seed.sql`

Cách an toàn nhất cho người chấm là dùng Supabase Dashboard -> SQL Editor, dán và chạy từng file theo đúng thứ tự trên. Nếu muốn dùng `psql`, hãy dùng direct connection string của Supabase Postgres:

```bash
for file in supabase/migrations/*.sql; do psql "$DATABASE_URL" -f "$file"; done
psql "$DATABASE_URL" -f supabase/seed.sql
```

Khi chạy ứng dụng, API có thể dùng pooler URL của Supabase trong `services/api/.env`.

## 2. Cấu hình Redis

Tạo một database Redis trên Upstash và sao chép TLS URL của nó. Bộ demo hiện tại được thiết kế để dùng Redis hosted thay vì Redis local qua Docker.

## 3. Chạy API

```bash
cd services/api
cp .env.example .env
npm install
npm run dev
```

Trước khi chạy, chỉnh `services/api/.env`:

```env
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@<region>.pooler.supabase.com:6543/postgres"
DATABASE_SSL="true"
REDIS_URL="rediss://<upstash-host>:6379"
JWT_SECRET="replace-with-at-least-32-characters"
JWT_EXPIRES_IN_SECONDS=86400
AUTH_ALLOW_ROLE_REGISTRATION=true
GEMINI_API_KEY="optional-for-live-ai-summary"
MAIL_USER="your_gmail_address@gmail.com"
MAIL_PASS="your_gmail_app_password"
PORT=3000
```

Kiểm tra API:

```bash
curl http://localhost:3000/health
```

## 4. Chạy notification worker

Mở terminal thứ hai:

```bash
cd services/api
npm run worker:notifications
```

API sẽ đẩy job `registration.confirmed` vào Redis. Worker đọc các job BullMQ đó, gửi email qua Gmail SMTP và lưu trạng thái gửi vào bảng `notifications`. Nếu chưa cấu hình `MAIL_USER` và `MAIL_PASS`, luồng đăng ký vẫn chạy được nhưng worker sẽ không thể gửi email thật.

## 5. Chạy web app

Mở terminal thứ ba:

```bash
cd apps/web
cp .env.example .env.local
npm install
npm run dev
```

`apps/web/.env.example` mặc định trỏ tới `http://localhost:3000/api`, khớp với cấu hình mặc định của API. Vite thường in ra địa chỉ `http://localhost:5173/`.

## Tài khoản demo

Tất cả tài khoản seed đều dùng mật khẩu `Password123`.

| Vai trò | Email | Mục đích |
| --- | --- | --- |
| Sinh viên | `mai.nguyen@student.unihub.edu` | Duyệt workshop, đăng ký, xem vé QR |
| Sinh viên | `an.tran@student.unihub.edu` | Dữ liệu sinh viên thay thế |
| Organizer | `admin@unihub.edu` | CRUD workshop, thống kê, import |
| Nhân viên check-in | `checkin@unihub.edu` | Check-in QR trên mobile |

## App mobile check-in

Để chạy app Flutter cho nhân viên:

```bash
cd apps/mobile
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
```

Dùng `10.0.2.2` khi Android emulator cần gọi API trên máy host. Nếu dùng điện thoại thật, hãy thay bằng LAN IP của máy tính, ví dụ `http://192.168.1.10:3000`.

## Lệnh kiểm tra

```bash
cd services/api
npm test
```

```bash
cd apps/web
npm run lint
npm run build
npm test
```

Các test API dùng dịch vụ thật cần Supabase và Redis đang hoạt động:

```bash
cd services/api
RUN_INTEGRATION_TESTS=true DATABASE_URL="..." REDIS_URL="..." npm test
```

Kiểm tra Gmail thật sẽ gửi email thật:

```bash
cd services/api
RUN_GMAIL_TESTS=true MAIL_USER="..." MAIL_PASS="..." MAIL_TEST_TO="..." npm test
```

## Luồng demo nhanh

1. Mở URL của Vite và duyệt danh sách workshop.
2. Đăng nhập bằng `mai.nguyen@student.unihub.edu` / `Password123`.
3. Đăng ký một workshop và mở vé QR.
4. Đăng xuất, sau đó đăng nhập bằng `admin@unihub.edu` / `Password123`.
5. Mở các route organizer để tạo/sửa workshop, xem thống kê và kiểm tra trạng thái import.
6. Giữ notification worker đang chạy trong lúc đăng ký để trình diễn luồng gửi email qua hàng đợi.
7. Tùy chọn: chạy app mobile bằng `checkin@unihub.edu` / `Password123` và quét QR đã seed hoặc QR được tạo từ web.
