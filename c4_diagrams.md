# UniHub Workshop - C4 Diagrams bằng PlantUML

Tài liệu này dùng PlantUML để mô tả hai cấp đầu của C4 diagram và các luồng runtime quan trọng của UniHub Workshop. Nội dung bám theo `REQUIREMENTS.md`: sự kiện kéo dài 5 ngày, mỗi ngày có 8-12 workshop song song, sinh viên đăng ký workshop miễn phí hoặc có phí, nhận QR để check-in, BTC quản trị workshop, và nhân sự check-in dùng mobile app có hỗ trợ offline sync.

## Level 1 - System Context

Level 1 đặt UniHub Workshop trong bức tranh tổng thể của trường đại học. Sinh viên, BTC và nhân sự check-in cùng sử dụng một hệ thống chung để xem workshop, tạo workshop, đăng ký, thanh toán nếu cần, nhận QR và điểm danh tại cửa phòng. Hệ thống tích hợp với cổng thanh toán mock, Google Gemini API để tạo tóm tắt từ PDF, và nguồn CSV sinh viên từ hệ thống quản lý cũ.

```plantuml
@startuml C4_Context_UniHub
!include <C4/C4_Context>

LAYOUT_WITH_LEGEND()
title Level 1 - System Context: UniHub Workshop

Person(student, "Sinh viên", "Xem lịch workshop, đăng ký chỗ ngồi, thanh toán workshop có phí và nhận QR code.")
Person(organizer, "BTC", "Tạo workshop, upload PDF giới thiệu, theo dõi chỗ ngồi và số lượng đăng ký.")
Person(checkinStaff, "Nhân sự check-in", "Quét QR tại cửa phòng và đồng bộ các lượt quét offline.")

System(unihub, "UniHub Workshop", "Nền tảng quản lý workshop đại học: website, mobile check-in, API đăng ký, QR và đồng bộ dữ liệu sinh viên.")

System_Ext(paymentGateway, "Mock Payment Gateway", "Dịch vụ thanh toán giả lập cho workshop có phí; được bọc bởi circuit breaker.")
System_Ext(gemini, "Google Gemini API", "Tạo tóm tắt workshop từ nội dung PDF upload.")
System_Ext(legacyCsv, "Hệ thống quản lý sinh viên cũ", "Cung cấp file students.csv để đồng bộ danh sách sinh viên theo lịch cố định.")

Rel(student, unihub, "Xem workshop, đăng ký, gửi Idempotency-Key, nhận QR", "HTTPS/JSON")
Rel(organizer, unihub, "Tạo workshop, đổi phòng/giờ, hủy workshop, upload PDF", "HTTPS multipart/form-data")
Rel(checkinStaff, unihub, "Quét QR online hoặc gửi batch offline sync", "HTTPS/JSON")

Rel(unihub, paymentGateway, "Xử lý thanh toán có phí qua circuit breaker", "API call mock")
Rel(unihub, gemini, "Gửi text trích xuất từ PDF, nhận tóm tắt", "HTTPS")
Rel(unihub, legacyCsv, "Đọc CSV định kỳ lúc 02:00", "File import")

@enduml
```

## Level 2 - Container

Level 2 phân rã UniHub Workshop thành các container đúng với code hiện tại. Backend API là Express service trung tâm; implementation hiện tại không có message broker hay worker riêng. Cron CSV sync chạy trong cùng process với API khi server start. Redis được dùng cho token-bucket rate limiting và cache idempotency response; PostgreSQL lưu dữ liệu chính và được lock pessimistic bằng `SELECT ... FOR UPDATE` khi đăng ký.

```plantuml
@startuml C4_Container_UniHub
!include <C4/C4_Container>

LAYOUT_WITH_LEGEND()
title Level 2 - Container: UniHub Workshop

Person(student, "Sinh viên", "Người dùng đăng ký workshop.")
Person(organizer, "BTC", "Người tạo workshop và quản lý nội dung.")
Person(checkinStaff, "Nhân sự check-in", "Người quét QR tại địa điểm.")

System_Boundary(unihub, "UniHub Workshop") {
  Container(webApp, "Web App", "Vite + React + TypeScript", "Prototype UI cho sinh viên và admin: lịch workshop, trạng thái ghế, paid flow, QR/check-in/admin preview.")
  Container(mobileApp, "Mobile Check-in App", "Flutter + Material 3", "Prototype UI cho scanner, offline queue, history và staff profile; API sync được backend hỗ trợ.")
  Container(api, "Backend API", "Node.js + Express + TypeScript + Prisma", "REST API cho workshop, đăng ký, check-in, batch sync; chạy cron CSV sync; gọi AI summary và payment circuit breaker.")
  ContainerDb(postgres, "PostgreSQL", "Postgres 15 + Prisma schema", "Lưu User, Workshop, Registration và IdempotencyKey.")
  ContainerDb(redis, "Redis", "Redis 7 + ioredis", "Token-bucket rate limit, cache idempotency response TTL 24h.")
  Container(csvFile, "Student CSV File", "students.csv", "File import local mô phỏng dữ liệu từ hệ thống sinh viên cũ.")
}

System_Ext(paymentGateway, "Mock Payment Gateway", "Hàm thanh toán giả lập, có delay và random failure.")
System_Ext(gemini, "Google Gemini API", "gemini-2.5-flash.")
System_Ext(legacyCsv, "Hệ thống quản lý sinh viên cũ", "Nguồn export CSV.")

Rel(student, webApp, "Sử dụng giao diện web", "Browser")
Rel(organizer, webApp, "Sử dụng giao diện admin", "Browser")
Rel(checkinStaff, mobileApp, "Sử dụng app scan và queue", "iOS/Android")

Rel(webApp, api, "Dự kiến gọi API workshop/register/admin", "HTTPS/JSON + multipart upload")
Rel(mobileApp, api, "POST /api/checkin và POST /api/checkin/sync", "HTTPS/JSON")

Rel(api, postgres, "Đọc/ghi bằng Prisma; lock Workshop khi register", "SQL/TCP")
Rel(api, redis, "Lua token bucket và idempotency cache", "RESP/TCP")
Rel(api, paymentGateway, "paymentCircuitBreaker.fire(userId, amount, token)", "In-process mock/external boundary")
Rel(api, gemini, "generateContent sau khi pdf-parse trích text", "HTTPS")
Rel(api, csvFile, "node-cron đọc và upsert User lúc 02:00", "Filesystem stream")
Rel(legacyCsv, csvFile, "Xuất students.csv", "CSV")

@enduml
```

## Key Runtime Flows

### Đăng ký workshop miễn phí hoặc có phí

Luồng này xử lý cả workshop miễn phí và workshop có phí. Điểm quan trọng là request đăng ký đi qua rate limiting, idempotency, transaction và row-level lock trước khi trừ ghế. Với workshop có phí, payment gateway được gọi qua circuit breaker để tránh lỗi dây chuyền khi cổng thanh toán không ổn định.

```plantuml
@startuml Register_Workshop_Flow
title Đăng ký workshop miễn phí hoặc có phí

actor "Sinh viên" as Student
participant "Web/Student Client" as Client
participant "Express API" as API
database "Redis" as Redis
database "PostgreSQL" as PG
participant "Payment Circuit Breaker" as Pay

Student -> Client: Bấm "Đăng ký"
Client -> API: POST /api/workshops/{id}/register\nIdempotency-Key, userId, paymentToken
API -> Redis: tokenBucket(ratelimit:ip)
Redis --> API: allowed hoặc denied

alt Vượt rate limit
  API --> Client: 429 Too Many Requests
else Được phép tiếp tục
  API -> Redis: GET idempotency:key
  alt Cache hit
    Redis --> API: response đã lưu
    API --> Client: Trả lại response cũ
  else Cache miss
    API -> PG: Tìm IdempotencyKey
    API -> PG: BEGIN
    API -> PG: SELECT Workshop FOR UPDATE
    API -> PG: Kiểm tra còn ghế và user chưa đăng ký workshop này

    alt Workshop có phí
      API -> Pay: fire(userId, price, paymentToken)
      alt Thanh toán lỗi hoặc circuit breaker open
        Pay --> API: fail-fast error
        API -> PG: ROLLBACK
        API --> Client: 503/400 lỗi thanh toán thân thiện
      else Thanh toán thành công
        Pay --> API: transaction id
        API -> PG: decrement availableSeats; create Registration(qrCode, SUCCESS)
        API -> PG: COMMIT
        API -> Redis: SETEX idempotency:key 24h
        API -> PG: create IdempotencyKey(response)
        API --> Client: success + registration + qrCode
      end
    else Workshop miễn phí
      API -> PG: decrement availableSeats; create Registration(qrCode, SUCCESS)
      API -> PG: COMMIT
      API -> Redis: SETEX idempotency:key 24h
      API -> PG: create IdempotencyKey(response)
      API --> Client: success + registration + qrCode
    end
  end
end

@enduml
```

### Check-in online và đồng bộ offline

Mobile app phải cho phép nhân sự check-in tiếp tục quét QR khi mất mạng. Khi online, app gọi API check-in từng QR. Khi offline, app lưu QR vào local queue và gửi batch sync khi có mạng trở lại. Server xử lý sync theo hướng idempotent: QR đã `CHECKED_IN` sẽ không bị update lại.

```plantuml
@startuml Offline_Checkin_Sync_Flow
title Check-in online và đồng bộ offline

actor "Nhân sự check-in" as Staff
participant "Flutter Mobile App" as Mobile
participant "Express API" as API
database "PostgreSQL" as PG

Staff -> Mobile: Quét QR

alt Có mạng
  Mobile -> API: POST /api/checkin { qrCode }
  API -> PG: Tìm Registration theo qrCode
  alt QR không hợp lệ
    API --> Mobile: 404 QR không tồn tại
  else Đã check-in
    API --> Mobile: 400 đã CHECKED_IN
  else Hợp lệ
    API -> PG: update status = CHECKED_IN
    API --> Mobile: Check-in thành công
  end
else Mất mạng
  Mobile -> Mobile: Lưu qrCode vào offline queue bền vững
  Mobile -> Mobile: Hiển thị trạng thái chờ đồng bộ
  ... Khi kết nối mạng phục hồi ...
  Mobile -> API: POST /api/checkin/sync { qrCodes[] }
  API -> PG: updateMany where qrCode in list and status != CHECKED_IN
  API --> Mobile: synced count
  Mobile -> Mobile: Xóa các item đã sync khỏi queue
end

@enduml
```

### Tạo AI summary từ PDF và đồng bộ CSV hằng đêm

BTC có thể upload PDF khi tạo workshop. Backend trích xuất text bằng `pdf-parse`, gửi sang Google Gemini API và lưu summary vào workshop. Dữ liệu sinh viên được đồng bộ từ file CSV hằng đêm vì hệ thống cũ không có API.

```plantuml
@startuml Pdf_Summary_And_Csv_Sync_Flow
title Tạo AI summary từ PDF và đồng bộ CSV hằng đêm

actor "BTC" as Organizer
participant "Express API" as API
participant "pdf-parse" as PDF
participant "Google Gemini API" as Gemini
database "PostgreSQL" as PG
participant "node-cron CSV Job" as Cron
collections "students.csv" as CSV

Organizer -> API: POST /api/workshops với optional PDF
alt Có PDF
  API -> PDF: Trích text từ PDF buffer
  PDF --> API: Nội dung text đã làm sạch cơ bản
  API -> Gemini: Generate 3-4 sentence summary
  alt AI/PDF lỗi
    Gemini --> API: error
    API -> API: Dùng summary fallback thân thiện
  else AI thành công
    Gemini --> API: summary text
  end
end
API -> PG: create Workshop(summary, seats, price, time)
API --> Organizer: workshop JSON

== CSV sync lúc 02:00 ==
Cron -> CSV: Đọc services/api/data/students.csv
alt File không tồn tại hoặc lỗi đọc file
  Cron -> Cron: Log lỗi và skip, không làm gián đoạn API
else Đọc được file
  loop Mỗi dòng sinh viên
    Cron -> PG: upsert User by studentId
  end
end

@enduml
```
