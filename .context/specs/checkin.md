# Đặc tả: Luồng check-in offline

## Mô tả
Nhân sự tại cửa phòng dùng mobile app quét QR code để điểm danh sinh viên. Khi mạng không ổn định hoặc mất hoàn toàn, app vẫn phải lưu scan cục bộ và tự động đồng bộ khi có mạng.

File này mô tả hành vi nghiệp vụ. Contract endpoint, request, response, auth, và mã lỗi phải được định nghĩa trong `api_spec.md` trước khi implement mobile/server integration.

## Phạm vi theo yêu cầu gốc
- Yêu cầu bắt buộc trong `REQUIREMENTS.md`: app cho phép ghi nhận check-in tạm thời khi offline, lưu bền vững trên thiết bị, và tự động đồng bộ lại khi có mạng.
- `REQUIREMENTS.md` không yêu cầu app phải xác thực QR hoàn toàn khi offline bằng danh sách cache cục bộ.
- Vì vậy hành vi tối thiểu đúng đề là: **scan offline -> lưu cục bộ -> sync khi online -> server xác thực và trả kết quả theo từng item**.
- Xác thực offline bằng attendee cache là một cải tiến sản phẩm có thể cân nhắc sau, không phải baseline bắt buộc của assignment.

## Luồng chính
1. Mobile app quét QR code.
2. App kiểm tra kết nối mạng.
3. Nếu có mạng: gửi API check-in online với QR code và thông tin staff. Server xác thực QR, kiểm tra quyền `CHECKIN_STAFF`, sau đó cập nhật `Registration.checked_in_at` nếu còn null và tạo `Checkin(source=ONLINE)`.
4. Nếu không có mạng: app lưu scan vào queue cục bộ bền vững, ví dụ SQLite/AsyncStorage. Mỗi item nên có `local_id`, `qr_code`, `scanned_at`, và `sync_status`.
5. Background sync: khi app có mạng lại hoặc khi mở app, app gửi batch các item chưa sync lên API sync.
6. Server xử lý từng QR idempotently: chỉ check-in registration hợp lệ, đã `CONFIRMED`, và `checked_in_at IS NULL`; tạo `Checkin(source=OFFLINE_SYNC)` với timestamp phù hợp.
7. Server trả kết quả theo từng item. App chỉ xoá/đánh dấu synced các item thành công hoặc đã được server xác nhận là duplicate an toàn.

## Kịch bản lỗi
- **App crash trước khi sync:** queue nằm trong storage bền vững nên không mất; app tiếp tục sync ở lần mở tiếp theo.
- **QR code không hợp lệ/giả mạo:** server trả kết quả item-level là invalid; app giữ lại hoặc hiển thị cho staff đối soát, không xoá âm thầm.
- **QR đã check-in trước đó:** server trả duplicate/already_checked_in; app có thể xoá item khỏi queue vì trạng thái server đã hoàn tất.
- **Batch sync bị lỗi một phần:** app chỉ xoá item thành công; item failed/transient giữ lại để retry.

## Ràng buộc
- Server phải idempotent: không tạo nhiều `Checkin` cho cùng `registration_id`.
- Update phải dùng điều kiện tương đương `WHERE checked_in_at IS NULL` để không ghi đè check-in đã có.
- Sync response phải có kết quả theo từng QR/local item, không chỉ tổng số thành công.
- Offline queue không được chỉ là mảng trong memory; phải nằm trong storage bền vững của mobile app.
