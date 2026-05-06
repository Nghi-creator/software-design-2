# UniHub Workshop — Project Proposal

## Vấn đề
Hệ thống hiện tại quản lý đăng ký bằng Google Form và xác nhận thủ công bằng email. Khi quy mô lên tới 12.000 sinh viên, việc này dẫn đến quá tải, chậm trễ trong xác nhận, và không thể xử lý tốt việc giành chỗ ngồi trong các workshop hot có sức chứa giới hạn (ví dụ: 60 chỗ). Ngoài ra việc điểm danh thủ công gây ùn tắc tại cửa phòng sự kiện.

## Mục tiêu
Xây dựng hệ thống UniHub Workshop tự động hoá toàn bộ quy trình:
- Đảm bảo tính công bằng khi sinh viên đăng ký, xử lý tốt 12.000 sinh viên truy cập trong 10 phút đầu.
- Xử lý các rủi ro hệ thống: thanh toán lỗi, rớt mạng khi điểm danh.
- Số hoá quy trình thông báo, xác nhận, và nhập liệu sinh viên.

## Người dùng và nhu cầu
- **Sinh viên:** Cần xem danh sách workshop, đăng ký nhanh chóng, công bằng, nhận vé QR code để đi dự.
- **Ban tổ chức:** Cần quản lý số lượng workshop, theo dõi đăng ký, xuất báo cáo. Cần AI hỗ trợ tóm tắt tài liệu PDF nhanh chóng.
- **Nhân sự check-in:** Cần quét mã QR nhanh chóng tại cửa sự kiện, phải hoạt động được cả khi không có WiFi.

## Phạm vi
Trong đồ án này, hệ thống sẽ giới hạn ở:
- Backend API phục vụ web app & mobile app.
- Tích hợp mock AI (Google Gemini API).
- Tích hợp mock Payment Gateway với độ trễ và tỷ lệ lỗi cố định.
- Cơ chế đọc CSV nội bộ thay vì gọi API thực của phòng đào tạo.

## Rủi ro và ràng buộc
- Tranh chấp chỗ ngồi (Race condition).
- Tải đột biến (Spike load).
- Thanh toán không ổn định, trừ tiền nhiều lần.
- Mất mạng cục bộ.
