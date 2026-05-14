# Đặc tả: Luồng thanh toán và chống trừ tiền 2 lần

## Mô tả
Luồng đăng ký các workshop có thu phí. Hệ thống phải tích hợp Payment Gateway, chống trừ tiền 2 lần khi người dùng double click/refresh/retry request, và fail fast khi Payment Gateway lỗi liên tục.

File này mô tả hành vi nghiệp vụ. Contract endpoint, request, response, auth, và mã lỗi phải được định nghĩa trong `api_spec.md` trước khi implement client/server integration.

## Luồng chính
1. Sinh viên bấm "Đăng ký". Client sinh UUID và gửi trong header `Idempotency-Key`.
2. API kiểm tra Redis trước. Nếu key đã có response hoàn tất, trả lại response cũ.
3. Nếu Redis miss, backend kiểm tra/persist `Idempotency-Key` trong PostgreSQL với trạng thái `IN_PROGRESS` hoặc dùng unique constraint tương đương. Nếu key đang `IN_PROGRESS`, trả `409/202` theo contract trong `api_spec.md`; không tạo payment mới.
4. Backend mở transaction ngắn, lock record `Workshop`, kiểm tra sức chứa và unique registration `(student_id, workshop_id)`.
5. Nếu còn chỗ, tạo `Registration(PENDING)`, tạo `Payment(PENDING, idempotency_key)`, tạm giữ/trừ 1 ghế theo rule đã chọn trong `data_models.md`, rồi commit. Không gọi Payment Gateway khi đang giữ DB lock.
6. Backend gọi Payment Gateway qua `CircuitBreaker`.
7. Nếu thanh toán thành công, mở transaction ngắn để cập nhật `Payment(SUCCESS)`, `Registration(CONFIRMED)`, tạo `qr_code`, và lưu response hoàn tất theo `Idempotency-Key`.
8. Redis cache response hoàn tất với TTL 24h. PostgreSQL vẫn là nguồn khôi phục khi Redis mất cache.

## Kịch bản lỗi
- **Payment Gateway timeout/lỗi ngẫu nhiên:** cập nhật `Payment(FAILED)`, `Registration(CANCELLED)`, trả lại ghế nếu đã giữ, lưu response lỗi ổn định cho cùng `Idempotency-Key`.
- **Payment Gateway lỗi liên tục (>50% trong 10s):** Circuit Breaker mở. Request mới fail fast với thông báo user-safe như "Hệ thống thanh toán đang bảo trì"; không gọi gateway. Sau khoảng 30s, Circuit Breaker chuyển Half-Open để thử request giới hạn.
- **Client retry khi response bị mất:** cùng `Idempotency-Key` phải trả cùng kết quả cuối cùng từ Redis hoặc PostgreSQL, không gọi gateway lần 2.
- **Spam click khác key:** Rate Limiter chặn; unique registration `(student_id, workshop_id)` ngăn tạo nhiều đăng ký cho cùng workshop.

## Ràng buộc
- Mọi registration/payment POST endpoint phải yêu cầu `Idempotency-Key`.
- Redis TTL cho response theo `Idempotency-Key` là 24h.
- PostgreSQL phải lưu đủ dữ liệu để xác định trạng thái cuối cùng của key khi Redis cache hết hạn/mất dữ liệu.
- Transaction giữ lock workshop phải ngắn và chỉ bao quanh kiểm tra/cập nhật dữ liệu nội bộ. Không gọi external service trong transaction.
- Seat handling phải nhất quán: nếu giữ ghế trước khi thanh toán, phải release khi payment fail/timeout; nếu chỉ trừ ghế sau payment, phải chấp nhận rủi ro hết chỗ sau khi payment thành công và có chính sách hoàn tiền.
