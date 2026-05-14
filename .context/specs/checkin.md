# Đặc tả: Luồng check-in offline

## Mô tả
Nhân sự tại cửa phòng dùng mobile app quét QR code để điểm danh sinh viên. Khi kết nối mạng không ổn định hoặc mất hoàn toàn, app vẫn phải ghi nhận được việc check-in và tự động đẩy lên server khi có mạng.

## Luồng chính
1. Mobile app quét QR code.
2. App kiểm tra kết nối mạng.
3. Nếu CÓ mạng: Gửi API POST `/api/checkin` với QR code. Server đánh dấu `CHECKED_IN`.
4. Nếu KHÔNG CÓ mạng: App lưu mã QR vào mảng `offline_queue` trong Local Storage (SQLite/AsyncStorage). Hiển thị thông báo "Đã lưu offline".
5. Background sync: Khi app nhận được sự kiện có mạng lại, app lấy toàn bộ danh sách trong `offline_queue` gửi lên API `/api/checkin/sync`.
6. Server nhận mảng QR code, thực hiện Bulk Update những vé chưa check-in thành `CHECKED_IN` và trả về số lượng thành công.
7. App xoá các QR code đã đồng bộ thành công khỏi `offline_queue`.

## Kịch bản lỗi
- **App crash trước khi sync:** Dữ liệu nằm trong Local Storage nên không bị mất, sẽ sync vào lần mở app kế tiếp.
- **QR Code không hợp lệ hoặc giả mạo:** Server sẽ bỏ qua trong quá trình Bulk Update. Nhân viên sẽ phát hiện ra sau khi có mạng lại và đối soát.

## Ràng buộc
- Server API `/sync` phải sử dụng mệnh đề `WHERE status != 'CHECKED_IN'` để không update đè lên dữ liệu đã có.
