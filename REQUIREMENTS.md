# UniHub Workshop Requirements

## Project Context

Truong Dai hoc A to chuc "Tuan le ky nang va nghe nghiep" hang nam. Su kien keo dai 5 ngay, moi ngay co 8-12 workshop dien ra song song tai nhieu phong khac nhau.

Hien tai ban to chuc quan ly dang ky bang Google Form va thong bao email thu cong. Quy trinh nay khong con dap ung duoc khi quy mo tang len. He thong UniHub Workshop can so hoa toan bo quy trinh tu dang ky, thong bao, quan tri, thanh toan, den check-in tai su kien.

## User Roles

| Role | Vietnamese Name | Description |
| --- | --- | --- |
| Student | Sinh vien | Xem lich workshop, dang ky, nhan xac nhan, check-in khi tham du |
| Organizer | Ban to chuc / BTC | Tao va quan ly workshop, theo doi so luong dang ky, xem thong ke |
| Check-in Staff | Nhan su check-in | Xac nhan sinh vien tham du tai cua phong bang mobile app |

## Core Functional Requirements

### Workshop Browsing And Registration

- Sinh vien can xem duoc danh sach tat ca workshop trong tuan le.
- Moi workshop can hien thi thong tin dien gia, phong to chuc, so do phong, thoi gian, va so cho con lai theo thoi gian thuc.
- Sinh vien co the dang ky workshop.
- Workshop co the mien phi hoac co thu phi.
- Sau khi dang ky thanh cong, sinh vien nhan ma QR de check-in.
- He thong phai xu ly tranh chap cho ngoi de khong co hai sinh vien nao cung nhan duoc cho cuoi cung.

### Notifications

- Sau khi dang ky thanh cong, sinh vien nhan thong bao xac nhan qua app va email.
- Thiet ke notification phai de dang bo sung kenh moi trong tuong lai, vi du Telegram, ma khong can thay doi lon.

### Admin Management

- BTC dung trang web admin de tao workshop moi.
- BTC co the cap nhat thong tin, doi phong, doi gio, hoac huy workshop.
- Trang admin chi danh cho noi bo va can kiem soat truy cap chat che.
- BTC co quyen tao, sua, huy workshop va xem thong ke.

### Check-in

- Nhan su check-in dung mobile app de quet QR cua sinh vien tai cua phong.
- Mot so khu vuc co mang khong on dinh, vi vay app phai cho phep ghi nhan check-in tam thoi khi offline.
- Check-in offline phai duoc luu ben vung tren thiet bi va tu dong dong bo lai khi co ket noi.
- Du lieu check-in khong duoc mat khi ket noi tro lai.

### AI Summary

- BTC co the tai len file PDF gioi thieu ve workshop.
- He thong tu dong xu ly PDF, tach noi dung, lam sach van ban, va gui sang AI model.
- Ban tom tat AI duoc hien thi tren trang chi tiet workshop.

### Student Data Synchronization

- He thong quan ly sinh vien cu khong co API.
- Cach duy nhat de lay du lieu sinh vien la doc file CSV duoc export vao ban dem.
- UniHub Workshop can dinh ky nhap CSV de xac thuc sinh vien khi dang ky.
- Import CSV phai xu ly duoc file loi, du lieu trung, va khong lam gian doan he thong dang chay.

## Technical Problems To Solve

### Seat Contention

- Mot so workshop chi co 60 cho nhung co hang tram sinh vien co gang dang ky cung luc.
- He thong phai dam bao tinh nhat quan cua so cho.
- Khong duoc overbook.
- Khong duoc de hai sinh vien cung nhan cho cuoi cung.

### Traffic Spike

- Du kien khoang 12,000 sinh vien truy cap trong 10 phut dau khi mo dang ky.
- 60% traffic don vao 3 phut dau tien.
- Backend API can duoc bao ve khoi qua tai.
- Client gui request lien tuc phai bi ngan chan hoac dieu tiet.
- Co che xu ly can dam bao tinh cong bang giua cac sinh vien dang ky.
- Co the ap dung rate limiting nhu Fixed Window, Sliding Window, Token Bucket, hoac Leaky Bucket.

### Unstable Payment Gateway

- Neu cong thanh toan gap su co, sinh vien van phai xem duoc lich workshop va thong tin su kien binh thuong.
- Luong dang ky co phi phai xu ly thanh toan timeout.
- Khong duoc tru tien hai lan khi client retry.
- Cac tinh nang khong lien quan den thanh toan van phai hoat dong khi cong thanh toan loi keo dai.
- Co the ap dung Circuit Breaker voi cac trang thai Closed, Open, Half-Open ket hop Graceful Degradation.

### Double Charge Prevention

- Moi giao dich thanh toan chi duoc thuc hien dung mot lan du client retry nhieu lan.
- Can dung Idempotency Key.
- Thiet ke can xac dinh cach sinh key, noi luu tru, cach kiem tra trung lap, va TTL.

### Offline Check-in

- Nhan su check-in o khu vuc mat mang van phai check-in duoc.
- Du lieu offline phai duoc luu cuc bo va dong bo khi co mang.
- Dong bo phai xu ly trung lap, xung dot, va retry an toan.

### One-way Legacy Integration

- Khong the goi API he thong cu.
- Chi co the doc CSV duoc export theo lich co dinh.
- Import job phai co validation, deduplication, error reporting, va co che khong lam gian doan he thong chinh.

## Blueprint Deliverables

### 1. System Design Document

Can mo ta kien truc tong the, cac thanh phan chinh, cach chung giao tiep, va ly do chon kien truc.

Tai lieu phai tra loi:

- He thong gom nhung phan nao?
- Phan nao noi chuyen voi nhau nhu the nao?
- Khi mot phan gap su co thi phan con lai bi anh huong ra sao?

### 2. C4 Diagram

Can ve hai cap dau cua C4:

- Level 1 - System Context: UniHub Workshop trong toan canh, gom actors va he thong ngoai duoc tich hop.
- Level 2 - Container: phan ra web app, mobile app, backend API, database, message broker, va cac container khac; chi ro cong nghe de xuat va cach giao tiep.

### 3. High-Level Architecture Diagram

Can the hien luong du lieu va phu thuoc giua cac thanh phan, dac biet tai:

- He thong cu qua CSV.
- Cong thanh toan.
- AI model.
- Luong check-in offline.

### 4. Database Design

Can xac dinh cac loai du lieu chinh, de xuat database phu hop, va giai thich ly do dua tren dac diem du lieu.

Thiet ke schema cho cac entity quan trong, toi thieu nen bao gom:

- Users.
- Roles and permissions.
- Students.
- Workshops.
- Rooms and room maps.
- Registrations.
- Payments.
- QR tickets.
- Check-ins.
- Notification records.
- Uploaded PDFs and AI summaries.
- CSV import jobs and import errors.
- Idempotency keys.

### 5. Important Business Flows

Can mo ta chi tiet it nhat hai luong sau:

- Paid workshop registration, tu luc bam "Dang ky" den khi nhan QR.
- Offline check-in and later synchronization.
- Nightly CSV import.

Voi moi luong, can trinh bay:

- Cac buoc xu ly.
- Cac thanh phan tham gia.
- Cach he thong phan ung khi loi xay ra giua chung.

### 6. Access Control Design

Can thiet ke mo hinh phan quyen.

Toi thieu can co:

- Sinh vien: chi xem va dang ky workshop.
- BTC: tao, sua, huy workshop va xem thong ke.
- Nhan su check-in: chi truy cap chuc nang quet QR va dong bo check-in.

He thong can kiem tra quyen tai:

- API endpoints.
- Admin web pages.
- Mobile app screens.
- Background/admin-only operations where relevant.

RBAC is recommended unless another approach is justified.

### 7. System Protection Mechanisms

Blueprint phai trinh bay giai phap, cach hoat dong, va ly do phu hop cho:

- Traffic spike control with a concrete rate limiting strategy and thresholds.
- Payment gateway instability with circuit breaker and graceful degradation.
- Double charge prevention with idempotency keys.

## Implementation Deliverables

Phan mem hoan chinh, co the chay duoc, can cai dat toan bo he thong da mo ta trong Blueprint.

Bat buoc bao gom:

- Full business features: workshop browsing, registration, notification, admin, check-in, AI summary, CSV sync.
- Technical mechanisms: access control and all protection mechanisms in Blueprint sections 6 and 7 must be implemented in code, not only mocked or stubbed.
- README with clear setup and run instructions so graders can clone and run without asking.
- Seed data or initialization scripts for immediate testing after startup.

## Suggested Blueprint Structure

```text
blueprint/
├── proposal.md
├── design.md
└── specs/
    ├── auth.md
    ├── payment.md
    ├── checkin.md
    └── ...
```

### proposal.md

Must cover:

- Problem.
- Goals.
- Users and needs.
- Scope and out-of-scope items.
- Risks and constraints.

### design.md

Must cover:

- Overall architecture.
- C4 diagrams.
- High-level architecture diagram.
- Database design.
- Access control design.
- System protection mechanisms.
- Key architecture decision records.

### specs/[feature].md

Each feature spec should cover:

- Description.
- Main flow.
- Error scenarios.
- Constraints.
- Acceptance criteria.

## Submission Requirements

Nop mot file text duy nhat len he thong.

File name format:

```text
ma-nhom_mssv1_mssv2_mssv3_mssv4.txt
```

Example:

```text
N01_21127001_21127002_21127003_21127004.txt
```

File content:

- Public Google Drive link containing all deliverables.

Google Drive folder must include:

- Blueprint: either one `blueprint.pdf` or a Markdown `blueprint/` folder.
- Source code: `src/`, `data/`, and `README.md`.
- Presentation video: `clips/` with FullHD 1080p MP4, about 720 kbps, including presenter camera and live demo on code or running app.

## Standing Development Rule

Always reference this `REQUIREMENTS.md` for project scope, user roles (Sinh vien, BTC, Nhan su), and business logic before suggesting or implementing code.
