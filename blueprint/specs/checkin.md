# Đặc tả: Luồng check-in khi mất mạng và đồng bộ lại

## Mô tả
Nhân sự tại cửa phòng dùng Flutter mobile app để quét QR. Khi mất mạng, app vẫn phải lưu scan cục bộ bền vững và tự đồng bộ lại khi có mạng.

## Luồng chính
1. Mobile app quét QR code.
2. Nếu đang online, app gửi `POST /api/checkin` với bearer token của `CHECKIN_STAFF`.
3. API xác thực role, tìm registration theo QR, kiểm tra registration đã `CONFIRMED`, và kiểm tra scan diễn ra cùng ngày lịch với workshop.
4. Nếu hợp lệ, API update `registrations.checked_in_at` và tạo `Checkin(source=ONLINE)` trong transaction.
5. Nếu mất mạng, app lưu scan vào SQLite queue cục bộ với dữ liệu như `localId`, `qrCode`, `scannedAt`, `syncStatus`.
6. Khi kết nối quay lại hoặc khi app mở lại, background sync gửi batch item chưa đồng bộ tới `POST /api/checkin/sync`.
7. API xử lý từng item bằng cùng logic check-in, nhưng ghi `Checkin(source=OFFLINE_SYNC)` và dùng `scannedAt` để kiểm tra đúng ngày workshop.
8. API trả kết quả theo từng item: `checked_in`, `already_checked_in`, `invalid`, hoặc `failed`.
9. App chỉ xoá/đánh dấu synced các item thành công hoặc duplicate an toàn; item lỗi tạm thời vẫn giữ để retry.

## Kịch bản lỗi
- **App crash trước khi sync:** queue nằm trong SQLite nên không mất; lần mở sau tiếp tục đồng bộ.
- **Mất mạng khi đang gửi batch:** batch có thể retry an toàn vì backend idempotent.
- **QR giả/malformed/chưa confirmed:** API trả `invalid`; app không coi đây là lỗi mạng.
- **QR đã check-in trước đó:** API trả `already_checked_in`; app có thể dọn item khỏi queue.
- **Một batch có cả item hợp lệ và lỗi:** API trả item-level results; app chỉ xoá item thành công.
- **Scan diễn ra sai ngày workshop:** API trả `invalid`, cả online lẫn offline sync.
- **Client gửi payload sync sai định dạng:** middleware trả `400` trước khi chạy nghiệp vụ.

## Ràng buộc
- Chỉ role `CHECKIN_STAFF` được check-in.
- Không tạo nhiều `Checkin` cho cùng `registration_id`.
- Update phải có điều kiện tương đương `WHERE checked_in_at IS NULL`.
- Offline queue phải là storage bền vững, không chỉ nằm trong memory.
- Sync response phải có kết quả theo từng item để client retry chính xác.
- QR validation được gộp vào check-in flow; không có endpoint validate QR riêng.

## Tiêu chí chấp nhận
- Mất mạng sau khi scan không làm mất dữ liệu check-in cục bộ.
- Khi mạng trở lại, item hợp lệ được sync thành công và ghi `source=OFFLINE_SYNC`.
- Retry cùng item không tạo duplicate check-in.
- QR sai, QR đã dùng, và scan sai ngày đều được phân loại đúng theo từng item.
- Một batch lỗi một phần không làm mất các item chưa xử lý thành công.
