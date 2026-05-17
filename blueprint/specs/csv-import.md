# Đặc tả: Luồng nhập dữ liệu sinh viên từ CSV đêm

## Mô tả
Luồng đồng bộ một chiều từ file CSV legacy vào UniHub. Hệ thống cũ chỉ xuất file, nên UniHub đọc file theo lịch, upsert sinh viên theo `student_id`, và ghi lại trạng thái import để organizer theo dõi.

## Luồng chính
1. Khi API server khởi động, `startCsvSyncJob()` đăng ký cron job.
2. `node-cron` chạy lúc 02:00 mỗi ngày.
3. Job đọc `services/api/data/students.csv`.
4. Nếu file tồn tại, job tạo một `CsvImportJob(RUNNING)` rồi parse CSV bằng stream.
5. Với từng dòng:
   - chuẩn hoá dữ liệu cần thiết
   - upsert `users` theo `student_id`
   - gán role mặc định `STUDENT`
   - tăng `success_count` nếu thành công
6. Nếu một dòng lỗi, job ghi `CsvImportError` chứa số dòng, định danh, raw row, và message; tăng `error_count` rồi tiếp tục xử lý các dòng sau.
7. Khi hết file, job cập nhật tổng số dòng, số thành công, số lỗi, trạng thái cuối và thời điểm kết thúc.
8. Organizer có thể xem job gần nhất qua `GET /api/imports/csv/latest` và xem lỗi từng job qua `GET /api/imports/csv/:id/errors`.

## Kịch bản lỗi
- **File không tồn tại:** job log lỗi/skip, không làm server sập.
- **Một dòng CSV malformed hoặc thiếu dữ liệu:** ghi lỗi riêng cho dòng đó, tiếp tục import các dòng còn lại.
- **Nhiều dòng lỗi trong cùng file:** job kết thúc với số đếm lỗi phản ánh đầy đủ thay vì rollback toàn bộ file.
- **Lỗi không xử lý được ở cấp file/job:** job được đánh dấu `FAILED` với message để organizer kiểm tra.
- **Client admin truy vấn sai job id hoặc pagination sai:** API validation trả lỗi phù hợp mà không ảnh hưởng job nền.

## Ràng buộc
- Đây là tích hợp một chiều; UniHub chỉ đọc CSV export, không gọi ngược API hệ thống cũ.
- Import phải xử lý theo stream để không cần nạp toàn bộ file vào memory.
- Một dòng lỗi không được làm mất tiến độ của các dòng hợp lệ khác.
- `student_id` là khoá nghiệp vụ để upsert sinh viên.
- Phải lưu đủ metadata để organizer biết job nào chạy, khi nào, thành công bao nhiêu, lỗi bao nhiêu.

## Tiêu chí chấp nhận
- Cron job được đăng ký khi server chạy và thực thi theo lịch 02:00.
- File hợp lệ tạo/cập nhật user theo `student_id`.
- File có dòng lỗi vẫn import được các dòng hợp lệ còn lại.
- Organizer xem được job gần nhất và danh sách lỗi chi tiết qua API.
- Không cần kết nối tới hệ thống cũ trong lúc chạy import.
