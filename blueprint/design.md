# UniHub Workshop — Technical Design

## Kiến trúc tổng thể
Hệ thống được thiết kế theo kiến trúc Monolith (Client-Server truyền thống) sử dụng Node.js (Express), kết hợp với Redis để xử lý các vấn đề hiệu năng cao (Rate Limiting, Idempotency) và PostgreSQL để đảm bảo tính toàn vẹn dữ liệu (ACID) cho giao dịch đăng ký.
Chúng tôi chọn Monolith vì quy mô hiện tại chưa quá lớn đến mức phải dùng Microservices, nhưng vẫn áp dụng các pattern chịu tải và fault tolerance.

## C4 Diagram

### Level 1 — System Context
- **Sinh viên** tương tác với **UniHub Web/Mobile App**.
- **Admin** quản lý qua **UniHub Web App**.
- **Check-in Staff** dùng **Mobile App**.
- **UniHub System** giao tiếp với **Mock Payment Gateway** và **Google Gemini API**. Hệ thống nhận file định kỳ từ **Hệ thống Quản lý Sinh viên Cũ**.

### Level 2 — Container
- **Web App (React/Vue)**: Frontend cho Sinh viên và Admin.
- **Mobile App (Flutter/React Native)**: Frontend cho Check-in Staff (có local storage).
- **API Server (Node.js/Express)**: Backend xử lý logic chính.
- **Relational DB (PostgreSQL)**: Lưu trữ dữ liệu.
- **In-memory Store (Redis)**: Caching, Rate Limiting, Idempotency keys.

## Thiết kế cơ sở dữ liệu
Sử dụng **PostgreSQL**. Lý do: Bài toán đăng ký chỗ ngồi cần tính toàn vẹn giao dịch (ACID) rất cao. PostgreSQL hỗ trợ tốt Row-level Locking (`SELECT ... FOR UPDATE`), giúp tránh được race conditions hiệu quả hơn NoSQL.
Các Entity chính:
- `User`: Lưu thông tin sinh viên, admin, staff.
- `Workshop`: Lưu thông tin sự kiện, số ghế tổng, số ghế còn lại.
- `Registration`: Bảng nối giữa User và Workshop, lưu QR Code và trạng thái đăng ký.
- `IdempotencyKey`: Bảng phụ lưu trữ các response đã được xử lý để tránh trừ tiền 2 lần.

## Thiết kế kiểm soát truy cập
Hệ thống sử dụng Role-Based Access Control (RBAC):
- `STUDENT`: Chỉ được gọi API GET workshop và POST register.
- `ORGANIZER`: Được quyền CRUD workshop, upload file.
- `CHECKIN_STAFF`: Chỉ được gọi API POST checkin và POST sync.
(Trong mã nguồn hiện tại lược bỏ phần authentication middleware để tập trung vào logic cốt lõi, nhưng schema đã hỗ trợ Role).

## Thiết kế các cơ chế bảo vệ hệ thống

### Kiểm soát tải đột biến
Sử dụng **Token Bucket Rate Limiting** bằng Redis Lua Script. Khi 12,000 sinh viên vào cùng lúc, API sẽ giới hạn (ví dụ: 5 requests / 10s / IP). Vượt ngưỡng sẽ trả về 429 Too Many Requests, bảo vệ DB không bị sập.

### Xử lý cổng thanh toán không ổn định
Áp dụng **Circuit Breaker (Thư viện Opossum)**. Khi cổng thanh toán mock trả về lỗi liên tục (vượt ngưỡng 50% trong thời gian nhất định), Circuit Breaker chuyển sang trạng thái **OPEN**. Các request đăng ký mới yêu cầu thanh toán sẽ lập tức bị chặn (Fail Fast) với thông báo thân thiện mà không cần chờ timeout từ cổng thanh toán, giúp giải phóng connection cho server.

### Chống trừ tiền hai lần
Áp dụng **Idempotency Key**. Frontend sinh một mã UUID (Idempotency-Key) cho mỗi phiên đăng ký và gửi kèm trong Header.
Backend lưu key này vào Redis (TTL 24h) và PostgreSQL. Nếu người dùng bấm liên tục tạo ra nhiều request trùng key, backend sẽ phát hiện key đã tồn tại và trả về nguyên trạng thái (response) của request đầu tiên mà không gọi lại hàm trừ tiền hay tạo vé mới.
