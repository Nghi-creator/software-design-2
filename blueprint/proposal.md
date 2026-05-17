# UniHub Workshop — Project Proposal

## Vấn đề
Hệ thống hiện tại quản lý đăng ký bằng Google Form và xác nhận thủ công qua email. Khi quy mô tăng lên khoảng 12.000 sinh viên, quy trình này dễ quá tải, chậm phản hồi, khó kiểm soát công bằng khi nhiều sinh viên cùng tranh các workshop hot chỉ có khoảng 60 chỗ, và không phù hợp với nhu cầu theo dõi theo thời gian thực của ban tổ chức. Ngoài ra, điểm danh thủ công tại cửa phòng gây ùn tắc, còn việc xử lý tài liệu workshop và đồng bộ dữ liệu sinh viên từ hệ thống cũ vẫn tốn nhiều thao tác thủ công.

## Mục tiêu
Xây dựng hệ thống UniHub Workshop để số hoá toàn bộ vòng đời workshop:
- Cho phép sinh viên xem lịch, đăng ký công bằng, nhận xác nhận và vé QR.
- Bảo vệ hệ thống trước lưu lượng đột biến khoảng 12.000 sinh viên trong 10 phút đầu, trong đó phần lớn truy cập dồn vào vài phút đầu tiên.
- Hỗ trợ workshop miễn phí và có phí, đồng thời xử lý an toàn các lỗi thanh toán và retry từ client.
- Cho phép nhân sự check-in quét QR nhanh, kể cả khi khu vực sự kiện mất mạng tạm thời.
- Hỗ trợ ban tổ chức quản lý workshop, xem thống kê, nhận AI summary từ PDF và đồng bộ dữ liệu sinh viên từ file CSV định kỳ.
- Tự động hoá thông báo xác nhận qua app và email để giảm thao tác thủ công.

## Người dùng và nhu cầu
- **Sinh viên:** Cần xem danh sách workshop, đăng ký nhanh chóng, công bằng, nhận vé QR code để đi dự.
- **Ban tổ chức:** Cần quản lý số lượng workshop, theo dõi đăng ký, xuất báo cáo. Cần AI hỗ trợ tóm tắt tài liệu PDF nhanh chóng.
- **Nhân sự check-in:** Cần quét mã QR nhanh chóng tại cửa sự kiện, phải hoạt động được cả khi không có WiFi.

## Phạm vi
Trong đồ án này, hệ thống bao gồm:
- Web app cho sinh viên và ban tổ chức.
- Mobile app cho nhân sự check-in.
- Backend API, cơ sở dữ liệu quan hệ, Redis và notification worker.
- Chức năng duyệt workshop, đăng ký, QR ticket, quản trị workshop, thống kê, check-in online/offline, thông báo, AI summary từ PDF và đồng bộ CSV sinh viên.
- Các cơ chế kỹ thuật chính: RBAC, rate limiting, chống race condition khi giữ chỗ, idempotency key, circuit breaker cho thanh toán và đồng bộ check-in an toàn khi offline.
- Tích hợp Google Gemini API cho AI summary.
- Tích hợp mock Payment Gateway với độ trễ và tỷ lệ lỗi cố định để mô phỏng môi trường không ổn định.
- Cơ chế đọc file CSV nội bộ do hệ thống cũ export thay vì gọi API trực tiếp.

## Ngoài phạm vi
- Xây dựng hệ thống thanh toán thật hoặc kết nối ngân hàng thật.
- Thay thế hoàn toàn hệ thống quản lý sinh viên cũ của trường.
- Tích hợp hai chiều với phòng đào tạo hoặc đồng bộ thời gian thực từ hệ thống cũ.
- Triển khai production ở quy mô doanh nghiệp với monitoring, autoscaling và quy trình vận hành đầy đủ.
- Mở rộng thêm các kênh thông báo ngoài app và email trong phiên bản đầu tiên.

## Rủi ro và ràng buộc
- **Tranh chấp chỗ ngồi:** Nhiều sinh viên có thể cùng đăng ký workshop chỉ còn một ghế; hệ thống phải tránh overbooking.
- **Tải đột biến:** Khoảng 12.000 sinh viên có thể truy cập trong 10 phút đầu, với khoảng 60% lưu lượng dồn vào 3 phút đầu tiên.
- **Thanh toán không ổn định:** Gateway có thể timeout hoặc lỗi; hệ thống phải tránh double charge khi client retry và không để lỗi thanh toán làm ảnh hưởng các chức năng khác.
- **Mất mạng cục bộ:** Khu vực check-in có thể không ổn định mạng; dữ liệu offline phải được lưu bền vững và đồng bộ lại an toàn.
- **Tích hợp hệ thống cũ một chiều:** Hệ thống chỉ có thể đọc CSV export định kỳ, không có API để truy vấn trực tiếp hay đồng bộ tức thời.
