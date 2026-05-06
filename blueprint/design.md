# UniHub Workshop — Technical Design

## Kiến trúc tổng thể

### Architectural Style
Hệ thống **UniHub Workshop** sử dụng kiến trúc **Layered Architecture** kết hợp **Event-Driven** cho các tác vụ bất đồng bộ.

*   **Layered Architecture**: Được sử dụng cho các chức năng nghiệp vụ chính (xem workshop, đăng ký, check-in).
*   **Event-Driven Architecture**: Được sử dụng cho các tác vụ nền như gửi thông báo, xử lý AI summary và nhập dữ liệu CSV.

Cách tiếp cận này giúp hệ thống:
*   Tách biệt rõ presentation layer, business logic và data layer.
*   Giảm sự phụ thuộc giữa các thành phần.
*   Tăng khả năng mở rộng và chịu lỗi (**fault tolerance**) khi hệ thống có tải lớn hoặc khi một thành phần gặp sự cố.

### Các thành phần chính của hệ thống
Hệ thống gồm 7 thành phần chính:
1.  **Web Student Application**
2.  **Web Admin Application**
3.  **Mobile Check-in Application**
4.  **Backend API Service**
5.  **Database**
6.  **Cache Layer**
7.  **Message Queue + Worker Services**

Các thành phần này giao tiếp thông qua **HTTP API** và **message queue**.

#### 1. Web Student Application
Web Student là ứng dụng web dành cho sinh viên.
*   **Chức năng chính**:
    *   Xem danh sách các workshop đang mở.
    *   Đăng ký tham gia workshop.
    *   Thanh toán qua cổng thanh toán (mock).
    *   Nhận và hiển thị mã QR Code sau khi đăng ký thành công.
*   Web Student giao tiếp với **Backend API** thông qua **REST API**.
*   Đảm bảo giao diện tối ưu cho cả mobile and desktop (Responsive).

#### 2. Web Admin Application
Web Admin là ứng dụng web dành cho ban tổ chức.
*   **Chức năng chính**:
    *   Tạo workshop mới.
    *   Chỉnh sửa thông tin workshop.
    *   Thay đổi phòng hoặc thời gian.
    *   Tải lên file PDF giới thiệu workshop.
    *   Xem thống kê đăng ký.
*   Web Admin giao tiếp với **Backend API** thông qua **REST API qua HTTPS**.

#### 3. Mobile Check-in Application
Ứng dụng mobile được sử dụng bởi nhân sự check-in tại cửa phòng.
*   **Chức năng**:
    *   Quét mã QR của sinh viên.
    *   Xác nhận check-in.
    *   Lưu check-in tạm thời khi mất mạng.
    *   Đồng bộ dữ liệu khi kết nối internet được khôi phục.
*   Ứng dụng giao tiếp với **Backend API** qua **HTTP**.
*   Trong trường hợp mất kết nối:
    *   Dữ liệu check-in được lưu tạm trong local storage trên thiết bị.
    *   Sau đó gửi lại backend theo dạng **batch synchronization**.

#### 4. Backend API Service
Backend API là thành phần trung tâm của hệ thống, chịu trách nhiệm xử lý toàn bộ logic nghiệp vụ.
*   **Các chức năng chính**:
    *   Xác thực và phân quyền người dùng.
    *   Quản lý workshop.
    *   Xử lý đăng ký workshop.
    *   Xử lý thanh toán.
    *   Tạo và xác nhận QR code.
    *   Xử lý check-in.
    *   Cung cấp dữ liệu cho web và mobile app.
*   Backend API cũng chịu trách nhiệm:
    *   Kiểm soát tranh chấp chỗ ngồi.
    *   **Rate limiting** để chống tải đột biến.
    *   Tích hợp với **message queue** cho các tác vụ nền.
*   Backend được triển khai dưới dạng **stateless service**, giúp có thể mở rộng theo chiều ngang nếu cần.

#### 5. Database
Hệ thống sử dụng **relational database (PostgreSQL)** để lưu trữ dữ liệu chính.
*   **Các loại dữ liệu được lưu trữ**:
    *   Thông tin sinh viên.
    *   Thông tin workshop.
    *   Đăng ký workshop.
    *   Giao dịch thanh toán.
    *   Dữ liệu check-in.
*   Database đảm bảo:
    *   **ACID transactions**.
    *   **Row-level locking**.
*   Giúp giải quyết vấn đề tranh chấp chỗ ngồi khi nhiều sinh viên đăng ký cùng lúc.

#### 6. Cache Layer
Cache layer được sử dụng để:
*   Lưu trữ dữ liệu truy cập thường xuyên.
*   Hỗ trợ cơ chế **rate limiting**.
*   Lưu trữ **idempotency key** cho thanh toán.
*   Giúp giảm tải cho database khi có nhiều request đồng thời.

#### 7. Message Queue và Worker Services
Một số tác vụ trong hệ thống không cần xử lý ngay lập tức, ví dụ:
*   Gửi thông báo.
*   Xử lý AI summary.
*   Nhập dữ liệu CSV từ hệ thống cũ.
*   Các tác vụ này được gửi vào **message queue** để xử lý bất đồng bộ.
*   **Worker service** sẽ tiêuhtu message từ queue và thực hiện các tác vụ tương ứng.

**Lợi ích**:
*   Giảm tải cho backend API.
*   Tránh làm chậm request của người dùng.
*   Giúp hệ thống chịu lỗi tốt hơn.
*   Ví dụ: Nếu hệ thống gửi email bị lỗi, request đăng ký workshop vẫn hoàn tất; worker có thể retry job sau.

### Cách các thành phần giao tiếp với nhau
Các thành phần trong hệ thống giao tiếp theo hai cơ chế chính:

#### 1. Synchronous communication
Web Student, Web Admin và Mobile App giao tiếp trực tiếp với Backend API qua **HTTP REST API**.
*   **Ví dụ**:
    *   **Student → Backend**: `GET /workshops`, `POST /register`
    *   **Check-in Staff → Backend**: `POST /checkin`

#### 2. Asynchronous communication
Backend API gửi các sự kiện vào **message queue** để worker xử lý.
*   **Ví dụ**:
    *   Student đăng ký workshop → Backend API tạo registration → Push event → `notification_queue` → Worker gửi email xác nhận.
*   **Các luồng sử dụng queue bao gồm**:
    *   Gửi thông báo.
    *   Tạo AI summary.
    *   Nhập dữ liệu CSV.

### Lý do lựa chọn kiến trúc này
Kiến trúc được chọn dựa trên các yêu cầu của hệ thống:
*   Hệ thống có tải đột biến khi mở đăng ký → Cần khả năng mở rộng backend.
*   Một số tác vụ không cần xử lý ngay → Sử dụng message queue để xử lý bất đồng bộ.
*   Cần đảm bảo tính nhất quán khi nhiều sinh viên đăng ký cùng lúc → Sử dụng relational database với transaction.
*   Một số khu vực mất mạng → Mobile app cần hỗ trợ offline.

Kiến trúc này giúp hệ thống:
*   Dễ phát triển.
*   Dễ mở rộng.
*   Đảm bảo tính ổn định khi tải tăng cao.

### Đánh đổi (Trade-offs)
Mọi quyết định thiết kế đều đi kèm với sự đánh đổi. Dưới đây là các điểm mấu chốt của hệ thống:

*   **Tính phức tạp vs. Khả năng đáp ứng (Complexity vs. Responsiveness)**: Việc sử dụng **Event-Driven Architecture (EDA)** cho các tác vụ nền (gửi thông báo, xử lý AI summary) làm tăng độ phức tạp của hệ thống (phải quản lý Message Queue, Workers, và xử lý eventual consistency). Tuy nhiên, đổi lại API chính luôn duy trì được tốc độ phản hồi cực nhanh cho các thao tác đăng ký và xem workshop của hàng chục nghìn sinh viên.
*   **Monolith vs. Microservices (Ease of development vs. Scaling)**: Chúng tôi chọn kiến trúc Monolith (với các mô-đun tách biệt) thay vì chia nhỏ thành hàng chục Microservices. Điều này giúp đội ngũ phát triển nhanh hơn, triển khai đơn giản và tránh được các chi phí quản lý vận hành (overhead) phức tạp của hệ thống phân tán ở giai đoạn hiện tại. **Vì sao nó chấp nhận được?** Với dự báo 12,000 traffic spike, một hệ thống Monolith được tối ưu và scale theo chiều ngang (stateless) vẫn hoàn toàn đủ khả năng chịu tải mà mạng lại sự nhất quán cao hơn.
*   **Tính nhất quán ACID vs. Hiệu suất ghi cực đại (Consistency vs. Throughput)**: Việc sử dụng PostgreSQL đảm bảo tính toàn vẹn dữ liệu tuyệt đối (không bao giờ xảy ra tình trạng đăng ký vượt quá số ghế), nhưng có thể bị giới hạn về hiệu suất ghi so với các NoSQL DB. Chúng tôi chấp nhận đánh đổi này và giảm tải cho DB bằng cách áp dụng **Redis Caching** và **Rate Limiting** ở tầng trước đó.

### Phương án thay thế (Alternatives)
Dưới đây là các phương án đã được xem xét nhưng không được lựa chọn:

*   **Kiến trúc Microservices toàn phần**: Tách mỗi chức năng (Inventory, Payment, Notification) thành một dịch vụ riêng. Phương án này bị loại bỏ vì quy mô dự án hiện tại chưa cần thiết phải đánh đổi lấy sự phức tạp trong giao tiếp mạng giữa các service (network latency) và độ phức tạp trong việc duy trì giao dịch phân tán.
*   **Xử lý đồng bộ mọi tác vụ (Synchronous processing)**: Gửi email xác nhận ngay trong request đăng ký. Phương án này bị loại bỏ vì nó sẽ làm tăng thời gian chờ của người dùng và nếu dịch vụ email gặp sự cố, toàn bộ tiến trình đăng ký cũng sẽ bị thất bại một cách không đáng có.

## C4 Diagram

### Level 1 — System Context
- **Sinh viên** tương tác với **UniHub Web/Mobile App**.
- **Admin** quản lý qua **UniHub Web App**.
- **Check-in Staff** dùng **Mobile App**.
- **UniHub System** giao tiếp with **Mock Payment Gateway** and **Google Gemini API**. Hệ thống nhận file định kỳ từ **Hệ thống Quản lý Sinh viên Cũ**.

### Level 2 — Container
- **Web App (React/Vue)**: Frontend cho Sinh viên và Admin.
- **Mobile App (Flutter/React Native)**: Frontend cho Check-in Staff (có local storage).
- **API Server (Node.js/Express)**: Backend xử lý logic chính.
- **Relational DB (PostgreSQL)**: Lưu trữ dữ liệu.
- **In-memory Store (Redis)**: Caching, Rate Limiting, Idempotency keys.

## Thiết kế cơ sở dữ liệu
Sử dụng **PostgreSQL**. Lý do: Bài toán đăng ký chỗ ngồi cần tính toàn vẹn giao dịch (**ACID**) và khả năng kiểm soát tranh chấp cao. PostgreSQL hỗ trợ tốt **Row-level Locking** (`SELECT ... FOR UPDATE`), giúp ngăn chặn race conditions khi nhiều sinh viên cùng đăng ký một chỗ ngồi cuối cùng.

### Các Entity chính

#### 1. User
Lưu trữ thông tin cơ bản của người dùng hệ thống (Sinh viên, Ban tổ chức, Nhân sự check-in).
- `id`: Primary Key (UUID).
- `student_id`: Mã số sinh viên (Dùng để đồng bộ và hiển thị).
- `full_name`: Họ và tên.
- `email`: Email liên hệ.
- `role`: Phân quyền (STUDENT, ORGANIZER, CHECKIN_STAFF).

#### 2. Room
Quản lý thông tin địa điểm tổ chức.
- `id`: Primary Key.
- `name`: Tên phòng (ví dụ: A.102).
- `location`: Vị trí tòa nhà/tầng.
- `capacity`: Sức chứa tối đa của phòng.

#### 3. Workshop
Thông tin về các buổi hội thảo.
- `id`: Primary Key.
- `title`: Tên hội thảo.
- `speaker`: Diễn giả.
- `room_id`: Foreign Key (Rooms).
- `start_time`: Thời gian bắt đầu.
- `capacity`: Tổng số ghế mở đăng ký.
- `seats_remaining`: Số ghế còn trống (Cập nhật real-time).

#### 4. Registration
Thông tin đăng ký của sinh viên.
- `id`: Primary Key.
- `student_id`: Foreign Key (Users).
- `workshop_id`: Foreign Key (Workshops).
- `status`: Trạng thái (PENDING, CONFIRMED, CANCELLED).
- `qr_code`: Chuỗi dữ liệu mã QR duy nhất.

#### 5. Payment
Thông tin thanh toán (Nếu workshop có phí).
- `id`: Primary Key.
- `registration_id`: Foreign Key (Registrations).
- `amount`: Số tiền thanh toán.
- `status`: Trạng thái (SUCCESS, FAILED).
- `transaction_id`: Mã giao dịch từ cổng thanh toán.
- `idempotency_key`: Khóa chống trùng lặp request thanh toán.

#### 6. Checkin
Theo dõi sự tham gia thực tế tại phòng.
- `id`: Primary Key.
- `registration_id`: Foreign Key (Registrations).
- `checkin_time`: Thời gian quét mã QR.
- `staff_id`: Foreign Key (Users - Nhân sự thực hiện quét).

#### 7. Notification
Lịch sử gửi thông báo đến người dùng.
- `id`: Primary Key.
- `user_id`: Foreign Key (Users).
- `message`: Nội dung thông báo.
- `type`: Loại (EMAIL, APP_PUSH).
- `sent_at`: Thời điểm gửi.


## Thiết kế kiểm soát truy cập
Hệ thống sử dụng **Role-Based Access Control (RBAC)** để quản lý quyền hạn của người dùng.

### Lý do lựa chọn
RBAC được chọn vì tính đơn giản, dễ triển khai và bảo trì. Các vai trò trong hệ thống UniHub (Sinh viên, Ban tổ chức, Nhân sự check-in) có ranh giới quyền hạn rất rõ ràng và ít khi thay đổi theo thời gian.

### Các vai trò (Roles)
- `STUDENT`: Chỉ được quyền xem danh sách workshop (`GET /workshops`) và đăng ký tham gia (`POST /register`).
- `ORGANIZER`: Có toàn quyền quản lý workshop (CRUD), upload tài liệu và xem thống kê.
- `CHECKIN_STAFF`: Chỉ được quyền quét mã QR (`POST /checkin`) và đồng bộ dữ liệu check-in (`POST /sync`).

### Đánh đổi (Trade-offs)
*   **Tính linh hoạt vs. Sự đơn giản (Flexibility vs. Simplicity)**: RBAC có thể gặp hạn chế nếu trong tương lai hệ thống cần phân quyền cực kỳ chi tiết dựa trên các điều kiện động (ví dụ: chỉ được check-in trong một khung giờ cụ thể tại một vị trí cụ thể). **Tuy nhiên**, sự đánh đổi này là chấp nhận được vì độ phức tạp tăng thêm của các mô hình khác sẽ làm chậm quá trình phát triển và tăng nguy cơ lỗi bảo mật. Khi cần, chúng ta có thể bổ sung các tầng kiểm tra logic (Logic-based checks) phía trên RBAC.

### Phương án thay thế (Alternatives)
*   **ABAC (Attribute-Based Access Control)**: Phân quyền dựa trên thuộc tính của người dùng, tài nguyên và môi trường. 
    *   **Lý do không chọn**: ABAC cung cấp khả năng kiểm soát cao nhất nhưng đi kèm với chi phí thiết kế Policy và công cụ thực thi (Policy Engine) vô cùng phức tạp. Với quy mô dự án hiện tại, ABAC là một giải pháp không mang lại lợi ích tương xứng với công sức bỏ ra.


## Thiết kế các cơ chế bảo vệ hệ thống

### Kiểm soát tải đột biến
Sử dụng **Token Bucket Rate Limiting** bằng Redis Lua Script. Khi 12,000 sinh viên vào cùng lúc, API sẽ giới hạn (ví dụ: 5 requests / 10s / IP). Vượt ngưỡng sẽ trả về 429 Too Many Requests, bảo vệ DB không bị sập.

### Xử lý cổng thanh toán không ổn định
Áp dụng **Circuit Breaker (Thư viện Opossum)**. Khi cổng thanh toán mock trả về lỗi liên tục (vượt ngưỡng 50% trong thời gian nhất định), Circuit Breaker chuyển sang trạng thái **OPEN**. Các request đăng ký mới yêu cầu thanh toán sẽ lập tức bị chặn (Fail Fast) with thông báo thân thiện mà không cần chờ timeout từ cổng thanh toán, giúp giải phóng connection cho server.

### Chống trừ tiền hai lần
Áp dụng **Idempotency Key**. Frontend sinh một mã UUID (Idempotency-Key) cho mỗi phiên đăng ký và gửi kèm trong Header.
Backend lưu key này vào Redis (TTL 24h) and PostgreSQL. Nếu người dùng bấm liên tục tạo ra nhiều request trùng key, backend sẽ phát hiện key đã tồn tại và trả về nguyên trạng thái (response) của request đầu tiên mà không gọi lại hàm trừ tiền hay tạo vé mới.
