# UniHub Workshop - Cài đặt

## Yêu cầu hệ thống
- Node.js >= 18
- Supabase Postgres project
- Redis, local or hosted

## Cài đặt và Khởi chạy

1. Cài đặt các thư viện:
\`\`\`bash
npm install
\`\`\`

2. Khởi động Redis local nếu chưa dùng Redis hosted:
\`\`\`bash
docker-compose up -d
\`\`\`

3. Tạo file `.env` từ `.env.example` (Hoặc tạo mới với nội dung sau):
\`\`\`env
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@<region>.pooler.supabase.com:6543/postgres"
DATABASE_SSL="true"
REDIS_URL="redis://localhost:6379"
GEMINI_API_KEY="your_api_key_here"
MAIL_USER="your_gmail_address@gmail.com"
MAIL_PASS="your_gmail_app_password"
PORT=3000
\`\`\`

4. Tạo schema trong Supabase bằng SQL Editor:
- Mở Supabase Dashboard -> SQL Editor.
- Chạy nội dung file `sql/001_init_supabase.sql`.

5. Khởi chạy server:
\`\`\`bash
npm run dev
\`\`\`

6. Khởi chạy worker gửi thông báo ở terminal khác:
\`\`\`bash
npm run worker:notifications
\`\`\`

## Các tính năng kỹ thuật chính

- **Supabase Postgres:** Backend kết nối trực tiếp tới Supabase Postgres bằng `pg` và `DATABASE_URL`; không còn dùng Prisma Client.
- **Concurrency (Tranh chấp chỗ ngồi):** Sử dụng `SELECT ... FOR UPDATE` trong transaction ngắn để giữ chỗ. Không gọi Payment Gateway khi đang giữ DB lock.
- **Spike Load (Chịu tải đột biến):** Sử dụng Redis + Lua Script triển khai token bucket kép ở API đăng ký: một bucket toàn cục để bảo vệ backend, một bucket theo sinh viên để giữ công bằng giữa các client.
- **Thanh toán lỗi (Circuit Breaker):** Sử dụng thư viện `opossum`. Nếu cổng thanh toán mock fail ngẫu nhiên quá 50%, Circuit Breaker sẽ chuyển sang trạng thái Open và ngắt sớm các request tiếp theo, giúp hệ thống không bị treo.
- **Trừ tiền 2 lần (Idempotency):** Header `Idempotency-Key` là bắt buộc với API đăng ký. Redis cache response 24h, PostgreSQL lưu trạng thái `IN_PROGRESS`/`COMPLETED` để chặn request trùng đang chạy.
- **Check-in Offline:** API `/api/checkin/sync` nhận batch item `{ localId?, qrCode, scannedAt? }` và trả kết quả theo từng item để mobile app biết item nào xoá, retry, hoặc đối soát.
- **AI Summary:** Khi tạo Workshop, upload file PDF. Middleware sẽ dùng `pdf-parse` để đọc text và truyền qua Google Gemini API để tạo tóm tắt, sau đó lưu vào DB.
- **Event-driven notifications:** Khi registration được xác nhận, API publish job BullMQ `registration.confirmed`; worker riêng xử lý gửi thông báo và cập nhật trạng thái delivery trong bảng `notifications`.
- **Gmail notifications:** Worker gửi email thật qua Gmail SMTP bằng `MAIL_USER` và `MAIL_PASS` trong `.env`. Với Gmail, `MAIL_PASS` nên là App Password thay vì mật khẩu đăng nhập thường.
- **CSV Sync:** Job `node-cron` chạy lúc 2 AM mỗi ngày, đọc file CSV tại `data/students.csv` bằng `csv-parser` và dùng cơ chế UPSERT để thêm mới hoặc cập nhật thông tin sinh viên mà không gây crash nếu có 1 dòng lỗi.

## Seed data
Bạn có thể tự insert dữ liệu workshop qua API tạo Workshop hoặc dùng script seed (nếu có). Sinh viên được load tự động từ file CSV qua cron job.

## Load test đăng ký bằng k6

Chỉ chạy trên môi trường test/disposable vì bài test sẽ tạo nhiều user và registration thật trong database.

1. Chạy API với Postgres + Redis thật:
```bash
npm run dev
```

2. Chuẩn bị token cho 12.000 sinh viên mô phỏng:
```bash
npm run load:prepare:registration
```
Lệnh này idempotent theo cohort mặc định `registration_surge`: lần chạy sau sẽ reuse sinh viên cũ, reuse workshop/room load-test, và chỉ ghi lại file token.
Mặc định script upsert theo batch 500 user/lần; có thể chỉnh bằng `LOAD_STUDENT_BATCH_SIZE=...`.
Workshop load-test mặc định có 60 chỗ để mô phỏng bài toán tranh chấp ghế; có thể chỉnh bằng `LOAD_WORKSHOP_CAPACITY=...`.

3. Chạy mô phỏng đúng profile yêu cầu: 7.200 request trong 3 phút đầu, 4.800 request trong 7 phút tiếp theo:
```bash
BASE_URL=http://127.0.0.1:3000 npm run load:registration
```

Mặc định script đọc token từ `load-tests/registration-surge.tokens.json` và workshop metadata từ `load-tests/registration-surge.metadata.json`. Có thể đổi bằng `TOKENS_FILE=...` và `LOAD_TEST_METADATA_FILE=...`.

5. Dọn cohort load test khi cần:
```bash
npm run load:cleanup:registration
```

Có thể đặt `LOAD_TEST_COHORT=<name>` nếu muốn nhiều cohort độc lập.
