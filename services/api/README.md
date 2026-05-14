# UniHub Workshop - Cài đặt

## Yêu cầu hệ thống
- Node.js >= 18
- Docker & Docker Compose

## Cài đặt và Khởi chạy

1. Cài đặt các thư viện:
\`\`\`bash
npm install
\`\`\`

2. Khởi động Database (PostgreSQL) và Redis:
\`\`\`bash
docker-compose up -d
\`\`\`

3. Tạo file `.env` từ `.env.example` (Hoặc tạo mới với nội dung sau):
\`\`\`env
DATABASE_URL="postgresql://unihub:password@localhost:5432/unihub?schema=public"
REDIS_URL="redis://localhost:6379"
GEMINI_API_KEY="your_api_key_here"
PORT=3000
\`\`\`

4. Chạy migration để tạo bảng trong database:
\`\`\`bash
npx prisma generate
npx prisma db push
\`\`\`

5. Khởi chạy server:
\`\`\`bash
npm run dev
\`\`\`
*(Thêm script \`"dev": "ts-node-dev src/index.ts"\` vào package.json nếu chưa có)*

## Các tính năng kỹ thuật chính

- **Concurrency (Tranh chấp chỗ ngồi):** Sử dụng `SELECT ... FOR UPDATE` trong transaction ngắn để giữ chỗ. Không gọi Payment Gateway khi đang giữ DB lock.
- **Spike Load (Chịu tải đột biến):** Sử dụng Redis + Lua Script triển khai thuật toán Token Bucket ở middleware. Cho phép tối đa 5 requests mỗi 10 giây cho mỗi IP ở API đăng ký.
- **Thanh toán lỗi (Circuit Breaker):** Sử dụng thư viện `opossum`. Nếu cổng thanh toán mock fail ngẫu nhiên quá 50%, Circuit Breaker sẽ chuyển sang trạng thái Open và ngắt sớm các request tiếp theo, giúp hệ thống không bị treo.
- **Trừ tiền 2 lần (Idempotency):** Header `Idempotency-Key` là bắt buộc với API đăng ký. Redis cache response 24h, PostgreSQL lưu trạng thái `IN_PROGRESS`/`COMPLETED` để chặn request trùng đang chạy.
- **Check-in Offline:** API `/api/checkin/sync` nhận batch item `{ localId?, qrCode, scannedAt? }` và trả kết quả theo từng item để mobile app biết item nào xoá, retry, hoặc đối soát.
- **AI Summary:** Khi tạo Workshop, upload file PDF. Middleware sẽ dùng `pdf-parse` để đọc text và truyền qua Google Gemini API để tạo tóm tắt, sau đó lưu vào DB.
- **CSV Sync:** Job `node-cron` chạy lúc 2 AM mỗi ngày, đọc file CSV tại `data/students.csv` bằng `csv-parser` và dùng cơ chế UPSERT để thêm mới hoặc cập nhật thông tin sinh viên mà không gây crash nếu có 1 dòng lỗi.

## Seed data
Bạn có thể tự insert dữ liệu workshop qua API tạo Workshop hoặc dùng script seed (nếu có). Sinh viên được load tự động từ file CSV qua cron job.
