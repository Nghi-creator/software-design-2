# Đặc tả: Luồng đăng ký workshop có phí

## Mô tả
Luồng từ khi sinh viên bấm **Đăng ký** trên workshop có phí đến khi nhận mã QR. Hệ thống phải chống trừ tiền hai lần, không oversell ghế, và trả về kết quả ổn định khi client retry.

## Luồng chính
1. React web app gửi `POST /api/workshops/:id/register` với bearer token, header `Idempotency-Key`, và `paymentToken`.
2. API áp dụng pre-auth IP rate limit và Redis sold-out shield trước khi kiểm tra danh tính để giảm tải khi có spike hoặc workshop đã hết chỗ.
3. `attachUser` xác thực bearer token; `requireRole(STUDENT)` chỉ cho sinh viên tiếp tục.
4. API áp dụng post-auth global/per-student rate limit.
5. Idempotency middleware kiểm tra Redis trước, sau đó PostgreSQL `idempotency_keys`. Nếu key đã hoàn tất, API trả lại response cũ.
6. Registration service mở transaction ngắn trong PostgreSQL:
   - kiểm tra workshop tồn tại
   - kiểm tra sinh viên chưa đăng ký workshop đó
   - giữ 1 ghế bằng atomic conditional decrement `... where seats_remaining > 0 returning ...`
   - tạo `Registration(PENDING)`
   - tạo `Payment(PENDING)`
7. Transaction commit trước khi gọi dịch vụ ngoài.
8. API gọi mock Payment Gateway qua circuit breaker.
9. Nếu thanh toán thành công, API mở transaction ngắn thứ hai để cập nhật `Payment(SUCCESS)`, `Registration(CONFIRMED)`, sinh `qr_code`, và lưu kết quả hoàn tất theo `Idempotency-Key`.
10. API cache response hoàn tất trong Redis TTL 24h.
11. Client nhận registration đã confirmed, sau đó gọi `GET /api/checkin/qr/:registrationId` để lấy QR token và render mã QR.
12. Sau khi registration được confirmed, API publish event `registration.confirmed` sang BullMQ để notification worker ghi notification và gửi email qua Gmail SMTP.

## Kịch bản lỗi
- **Thiếu `paymentToken` ở workshop có phí:** API từ chối trước khi giữ ghế; không tạo payment, không đi vào hot seat path.
- **Workshop đã hết ghế:** sold-out shield hoặc atomic decrement trả lỗi đầy chỗ; không tạo registration mới.
- **Double click / retry cùng `Idempotency-Key`:** Redis/PostgreSQL trả lại kết quả cũ; không gọi gateway lần hai, không trừ tiền lần hai.
- **Request cùng key còn đang xử lý:** API trả trạng thái conflict theo contract; không tạo payment mới.
- **Payment timeout/lỗi ngẫu nhiên:** API cập nhật `Payment(FAILED)`, `Registration(CANCELLED)`, trả lại ghế đã giữ, và lưu response lỗi ổn định cho key đó.
- **Gateway lỗi liên tục:** circuit breaker mở và fail fast với thông báo user-safe thay vì giữ tài nguyên API.
- **Client mất response sau khi payment đã xong:** retry cùng key nhận cùng kết quả cuối từ Redis hoặc PostgreSQL.
- **Notification worker/email lỗi sau khi đã đăng ký thành công:** registration vẫn confirmed; BullMQ retry delivery, trạng thái notification được lưu riêng.

## Ràng buộc
- Mọi registration/payment POST flow phải có `Idempotency-Key`.
- Redis chỉ là cache; PostgreSQL là nguồn khôi phục khi cache mất.
- Không được gọi external payment service trong transaction đang giữ lock dữ liệu.
- Giữ ghế phải atomic và không bao giờ làm `seats_remaining` âm.
- Nếu payment fail sau khi đã giữ ghế, hệ thống phải release ghế đúng một lần.
- Sinh viên chỉ được có một registration trên mỗi workshop.

## Tiêu chí chấp nhận
- 100 request đồng thời vào 60 ghế tạo đúng 60 registration confirmed, không oversell.
- Hai request cùng `Idempotency-Key` trả cùng kết quả và chỉ tạo một payment attempt logic.
- Payment fail để lại registration cancelled, payment failed, và ghế được hoàn lại.
- Workshop có phí thiếu `paymentToken` bị từ chối trước khi seat reservation chạy.
- Registration thành công tạo QR có thể truy xuất và tạo notification event.
