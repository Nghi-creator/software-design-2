# Đặc tả: Luồng thanh toán và chống trừ tiền 2 lần

## Mô tả
Luồng đăng ký các workshop có thu phí. Yêu cầu tích hợp với Payment Gateway. Phải chống được tình trạng trừ tiền 2 lần khi người dùng double click hoặc refresh trang, đồng thời không sập hệ thống khi Payment Gateway bị lỗi liên tục.

## Luồng chính
1. Sinh viên bấm "Đăng ký". Client sinh ra một UUID gọi là `Idempotency-Key` gửi lên Header.
2. Middleware kiểm tra Redis/DB xem key này đã xử lý chưa. Nếu có rồi, trả luôn kết quả cũ.
3. Backend bắt đầu Transaction database. Lock record Workshop tương ứng.
4. Kiểm tra sức chứa. Gọi hàm thanh toán qua `CircuitBreaker`.
5. Nếu thanh toán thành công, trừ 1 ghế, tạo QR code, commit Transaction.
6. Middleware lưu response thành công kèm `Idempotency-Key` vào Redis & DB.

## Kịch bản lỗi
- **Payment Gateway timeout/lỗi ngẫu nhiên:** Giao dịch bị huỷ, rollback ghế ngồi.
- **Payment Gateway lỗi liên tục (>50% trong 10s):** Circuit Breaker mở. Các request mới sẽ bị báo lỗi "Hệ thống thanh toán đang bảo trì" ngay lập tức mà không cần gọi hàm thanh toán, tránh treo server. Nửa phút sau, Circuit Breaker vào trạng thái Half-Open để thử nghiệm lại một số request.
- **Spam Click:** Các request từ click thứ 2 trở đi sẽ có cùng `Idempotency-Key` (nếu client implement chuẩn) hoặc bị Rate Limiter chặn (nếu khác key).

## Ràng buộc
- Thời gian sống (TTL) của Idempotency Key trên Redis là 24h.
- Luôn phải kiểm tra Database Locking trước khi gọi Payment Gateway để đảm bảo có ghế chắc chắn mới trừ tiền.
