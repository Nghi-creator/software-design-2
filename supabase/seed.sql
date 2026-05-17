begin;

insert into users (id, email, name, role, student_id, password_hash)
values
  ('11111111-1111-1111-1111-111111111111', 'mai.nguyen@student.unihub.edu', 'Mai Nguyen', 'STUDENT', 'UNI2026001', 'scrypt$unihub-demo-salt$ii9kjjGb70tIEhkY3MICyUgzrNq_8BmBjLtDew0-C7Mr1JFmzhEd8WYWE1f_7YTUMoquYTZs5WwyibdCQnQrMw'),
  ('11111111-1111-1111-1111-111111111112', 'an.tran@student.unihub.edu', 'An Tran', 'STUDENT', 'UNI2026002', 'scrypt$unihub-demo-salt$ii9kjjGb70tIEhkY3MICyUgzrNq_8BmBjLtDew0-C7Mr1JFmzhEd8WYWE1f_7YTUMoquYTZs5WwyibdCQnQrMw'),
  ('11111111-1111-1111-1111-111111111113', 'linh.pham@student.unihub.edu', 'Linh Pham', 'STUDENT', 'UNI2026003', 'scrypt$unihub-demo-salt$ii9kjjGb70tIEhkY3MICyUgzrNq_8BmBjLtDew0-C7Mr1JFmzhEd8WYWE1f_7YTUMoquYTZs5WwyibdCQnQrMw'),
  ('11111111-1111-1111-1111-111111111114', 'khoa.le@student.unihub.edu', 'Khoa Le', 'STUDENT', 'UNI2026004', 'scrypt$unihub-demo-salt$ii9kjjGb70tIEhkY3MICyUgzrNq_8BmBjLtDew0-C7Mr1JFmzhEd8WYWE1f_7YTUMoquYTZs5WwyibdCQnQrMw'),
  ('11111111-1111-1111-1111-111111111115', 'nhi.vo@student.unihub.edu', 'Nhi Vo', 'STUDENT', 'UNI2026005', 'scrypt$unihub-demo-salt$ii9kjjGb70tIEhkY3MICyUgzrNq_8BmBjLtDew0-C7Mr1JFmzhEd8WYWE1f_7YTUMoquYTZs5WwyibdCQnQrMw'),
  ('11111111-1111-1111-1111-111111111116', 'admin@unihub.edu', 'UniHub Admin', 'ORGANIZER', null, 'scrypt$unihub-demo-salt$ii9kjjGb70tIEhkY3MICyUgzrNq_8BmBjLtDew0-C7Mr1JFmzhEd8WYWE1f_7YTUMoquYTZs5WwyibdCQnQrMw'),
  ('11111111-1111-1111-1111-111111111117', 'checkin@unihub.edu', 'Check-in Staff', 'CHECKIN_STAFF', null, 'scrypt$unihub-demo-salt$ii9kjjGb70tIEhkY3MICyUgzrNq_8BmBjLtDew0-C7Mr1JFmzhEd8WYWE1f_7YTUMoquYTZs5WwyibdCQnQrMw')
on conflict (id) do update
set
  email = excluded.email,
  name = excluded.name,
  role = excluded.role,
  student_id = excluded.student_id,
  password_hash = excluded.password_hash;

insert into rooms (id, name, location, capacity, layout_url)
values
  ('22222222-2222-2222-2222-222222222221', 'Innovation Hall', 'Building A, Floor 2', 120, 'https://example.test/maps/innovation-hall'),
  ('22222222-2222-2222-2222-222222222222', 'AI Lab', 'Building B, Floor 5', 60, 'https://example.test/maps/ai-lab'),
  ('22222222-2222-2222-2222-222222222223', 'Startup Studio', 'Building C, Floor 1', 80, 'https://example.test/maps/startup-studio'),
  ('22222222-2222-2222-2222-222222222224', 'Data Theater', 'Building D, Floor 3', 160, 'https://example.test/maps/data-theater'),
  ('22222222-2222-2222-2222-222222222225', 'QR Demo Room', 'Demo Wing, Floor 1', 40, 'https://example.test/maps/qr-demo-room')
on conflict (id) do update
set
  name = excluded.name,
  location = excluded.location,
  capacity = excluded.capacity,
  layout_url = excluded.layout_url;

insert into workshops (
  id,
  title,
  speaker,
  room_id,
  capacity,
  seats_remaining,
  price,
  start_time,
  pdf_url,
  ai_summary
)
values
  (
    '33333333-3333-3333-3333-333333333331',
    'Building Reliable APIs with Node.js',
    'Dr. Minh Hoang',
    '22222222-2222-2222-2222-222222222223',
    80,
    77,
    0.00,
    '2026-06-03 09:00:00+07',
    'https://example.com/unihub/api-workshop.pdf',
    'Covers layered Express APIs, idempotency, rate limiting, and production-friendly error handling.'
  ),
  (
    '33333333-3333-3333-3333-333333333332',
    'AI Summaries for Academic Resources',
    'Prof. Lan Bui',
    '22222222-2222-2222-2222-222222222222',
    60,
    59,
    50000.00,
    '2026-06-05 13:30:00+07',
    'https://example.com/unihub/ai-summaries.pdf',
    'Introduces document upload, prompt design, and review workflows for workshop resource summaries.'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Offline-First QR Check-in',
    'Ms. Thao Dang',
    '22222222-2222-2222-2222-222222222221',
    120,
    118,
    25000.00,
    '2026-06-08 10:00:00+07',
    null,
    'Explains mobile QR scanning, local queues, sync retries, and idempotent backend processing.'
  ),
  (
    '33333333-3333-3333-3333-333333333334',
    'High-Concurrency Registration Drills',
    'Mr. Quang Nguyen',
    '22222222-2222-2222-2222-222222222224',
    40,
    0,
    100000.00,
    '2026-06-12 15:00:00+07',
    null,
    'A practical load and concurrency session focused on seat locks, queues, and graceful failure modes.'
  ),
  (
    '33333333-3333-3333-3333-333333333341',
    'QR Demo #1 - Valid Today',
    'Demo Staff',
    '22222222-2222-2222-2222-222222222225',
    40,
    39,
    0.00,
    '2026-05-17 10:00:00+07',
    null,
    'Happy-path QR demo workshop scheduled for the current demo day.'
  ),
  (
    '33333333-3333-3333-3333-333333333342',
    'QR Demo #2 - Wrong Day',
    'Demo Staff',
    '22222222-2222-2222-2222-222222222225',
    40,
    39,
    0.00,
    '2026-05-18 10:00:00+07',
    null,
    'Confirmed ticket that should be rejected when scanned on the wrong calendar day.'
  ),
  (
    '33333333-3333-3333-3333-333333333343',
    'QR Demo #3 - Pending Registration',
    'Demo Staff',
    '22222222-2222-2222-2222-222222222225',
    40,
    39,
    0.00,
    '2026-05-17 11:00:00+07',
    null,
    'Ticket exists but payment/confirmation is still pending.'
  ),
  (
    '33333333-3333-3333-3333-333333333344',
    'QR Demo #4 - Already Checked In',
    'Demo Staff',
    '22222222-2222-2222-2222-222222222225',
    40,
    39,
    0.00,
    '2026-05-17 12:00:00+07',
    null,
    'Confirmed ticket that has already been used once.'
  ),
  (
    '33333333-3333-3333-3333-333333333345',
    'QR Demo #5 - Cancelled Registration',
    'Demo Staff',
    '22222222-2222-2222-2222-222222222225',
    40,
    40,
    0.00,
    '2026-05-17 13:00:00+07',
    null,
    'Ticket was cancelled and should no longer admit entry.'
  )
on conflict (id) do update
set
  title = excluded.title,
  speaker = excluded.speaker,
  room_id = excluded.room_id,
  capacity = excluded.capacity,
  seats_remaining = excluded.seats_remaining,
  price = excluded.price,
  start_time = excluded.start_time,
  pdf_url = excluded.pdf_url,
  ai_summary = excluded.ai_summary,
  updated_at = now();

insert into registrations (
  id,
  user_id,
  workshop_id,
  qr_code,
  status,
  checked_in_at,
  created_at,
  updated_at
)
values
  (
    '44444444-4444-4444-4444-444444444441',
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333331',
    'UNIHUB-QR-API-MAI',
    'CONFIRMED',
    null,
    '2026-05-18 08:05:00+07',
    '2026-05-18 08:05:00+07'
  ),
  (
    '44444444-4444-4444-4444-444444444442',
    '11111111-1111-1111-1111-111111111112',
    '33333333-3333-3333-3333-333333333331',
    'UNIHUB-QR-API-AN',
    'CONFIRMED',
    null,
    '2026-05-18 08:12:00+07',
    '2026-05-18 08:12:00+07'
  ),
  (
    '44444444-4444-4444-4444-444444444443',
    '11111111-1111-1111-1111-111111111113',
    '33333333-3333-3333-3333-333333333331',
    'UNIHUB-QR-API-LINH',
    'PENDING',
    null,
    '2026-05-18 08:20:00+07',
    '2026-05-18 08:20:00+07'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111114',
    '33333333-3333-3333-3333-333333333332',
    'UNIHUB-QR-AI-KHOA',
    'CONFIRMED',
    '2026-06-05 13:05:00+07',
    '2026-05-19 09:00:00+07',
    '2026-06-05 13:05:00+07'
  ),
  (
    '44444444-4444-4444-4444-444444444445',
    '11111111-1111-1111-1111-111111111115',
    '33333333-3333-3333-3333-333333333333',
    'UNIHUB-QR-CHECKIN-NHI',
    'CONFIRMED',
    null,
    '2026-05-19 09:15:00+07',
    '2026-05-19 09:15:00+07'
  ),
  (
    '44444444-4444-4444-4444-444444444446',
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    'UNIHUB-QR-CHECKIN-MAI',
    'CONFIRMED',
    null,
    '2026-05-19 09:17:00+07',
    '2026-05-19 09:17:00+07'
  ),
  (
    '44444444-4444-4444-4444-444444444451',
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333341',
    'UNIHUB-QR-DEMO-VALID',
    'CONFIRMED',
    null,
    '2026-05-17 08:00:00+07',
    '2026-05-17 08:00:00+07'
  ),
  (
    '44444444-4444-4444-4444-444444444452',
    '11111111-1111-1111-1111-111111111112',
    '33333333-3333-3333-3333-333333333342',
    'UNIHUB-QR-DEMO-WRONG-DAY',
    'CONFIRMED',
    null,
    '2026-05-17 08:05:00+07',
    '2026-05-17 08:05:00+07'
  ),
  (
    '44444444-4444-4444-4444-444444444453',
    '11111111-1111-1111-1111-111111111113',
    '33333333-3333-3333-3333-333333333343',
    'UNIHUB-QR-DEMO-PENDING',
    'PENDING',
    null,
    '2026-05-17 08:10:00+07',
    '2026-05-17 08:10:00+07'
  ),
  (
    '44444444-4444-4444-4444-444444444454',
    '11111111-1111-1111-1111-111111111114',
    '33333333-3333-3333-3333-333333333344',
    'UNIHUB-QR-DEMO-ALREADY-CHECKED-IN',
    'CONFIRMED',
    '2026-05-17 12:01:00+07',
    '2026-05-17 08:15:00+07',
    '2026-05-17 12:01:00+07'
  ),
  (
    '44444444-4444-4444-4444-444444444455',
    '11111111-1111-1111-1111-111111111115',
    '33333333-3333-3333-3333-333333333345',
    'UNIHUB-QR-DEMO-CANCELLED',
    'CANCELLED',
    null,
    '2026-05-17 08:20:00+07',
    '2026-05-17 08:20:00+07'
  )
on conflict (id) do update
set
  user_id = excluded.user_id,
  workshop_id = excluded.workshop_id,
  qr_code = excluded.qr_code,
  status = excluded.status,
  checked_in_at = excluded.checked_in_at,
  updated_at = excluded.updated_at;

insert into payments (
  id,
  registration_id,
  amount,
  status,
  transaction_id,
  idempotency_key,
  created_at,
  updated_at
)
values
  (
    '55555555-5555-5555-5555-555555555551',
    '44444444-4444-4444-4444-444444444441',
    0.00,
    'SUCCESS',
    'free',
    'seed-api-mai',
    '2026-05-18 08:05:00+07',
    '2026-05-18 08:05:00+07'
  ),
  (
    '55555555-5555-5555-5555-555555555552',
    '44444444-4444-4444-4444-444444444442',
    0.00,
    'SUCCESS',
    'free',
    'seed-api-an',
    '2026-05-18 08:12:00+07',
    '2026-05-18 08:12:00+07'
  ),
  (
    '55555555-5555-5555-5555-555555555553',
    '44444444-4444-4444-4444-444444444443',
    0.00,
    'PENDING',
    null,
    'seed-api-linh-pending',
    '2026-05-18 08:20:00+07',
    '2026-05-18 08:20:00+07'
  ),
  (
    '55555555-5555-5555-5555-555555555554',
    '44444444-4444-4444-4444-444444444444',
    50000.00,
    'SUCCESS',
    'seed-txn-ai-khoa',
    'seed-ai-khoa',
    '2026-05-19 09:00:00+07',
    '2026-05-19 09:01:00+07'
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    '44444444-4444-4444-4444-444444444445',
    25000.00,
    'SUCCESS',
    'seed-txn-checkin-nhi',
    'seed-checkin-nhi',
    '2026-05-19 09:15:00+07',
    '2026-05-19 09:16:00+07'
  ),
  (
    '55555555-5555-5555-5555-555555555556',
    '44444444-4444-4444-4444-444444444446',
    25000.00,
    'SUCCESS',
    'seed-txn-checkin-mai',
    'seed-checkin-mai',
    '2026-05-19 09:17:00+07',
    '2026-05-19 09:18:00+07'
  ),
  (
    '55555555-5555-5555-5555-555555555561',
    '44444444-4444-4444-4444-444444444451',
    0.00,
    'SUCCESS',
    'free',
    'seed-qr-demo-valid',
    '2026-05-17 08:00:00+07',
    '2026-05-17 08:00:00+07'
  ),
  (
    '55555555-5555-5555-5555-555555555562',
    '44444444-4444-4444-4444-444444444452',
    0.00,
    'SUCCESS',
    'free',
    'seed-qr-demo-wrong-day',
    '2026-05-17 08:05:00+07',
    '2026-05-17 08:05:00+07'
  ),
  (
    '55555555-5555-5555-5555-555555555563',
    '44444444-4444-4444-4444-444444444453',
    0.00,
    'PENDING',
    null,
    'seed-qr-demo-pending',
    '2026-05-17 08:10:00+07',
    '2026-05-17 08:10:00+07'
  ),
  (
    '55555555-5555-5555-5555-555555555564',
    '44444444-4444-4444-4444-444444444454',
    0.00,
    'SUCCESS',
    'free',
    'seed-qr-demo-already-checked-in',
    '2026-05-17 08:15:00+07',
    '2026-05-17 08:15:00+07'
  ),
  (
    '55555555-5555-5555-5555-555555555565',
    '44444444-4444-4444-4444-444444444455',
    0.00,
    'SUCCESS',
    'free',
    'seed-qr-demo-cancelled',
    '2026-05-17 08:20:00+07',
    '2026-05-17 08:20:00+07'
  )
on conflict (id) do update
set
  registration_id = excluded.registration_id,
  amount = excluded.amount,
  status = excluded.status,
  transaction_id = excluded.transaction_id,
  idempotency_key = excluded.idempotency_key,
  updated_at = excluded.updated_at;

insert into checkins (
  id,
  registration_id,
  staff_id,
  checkin_time,
  source
)
values
  (
    '66666666-6666-6666-6666-666666666661',
    '44444444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111117',
    '2026-06-05 13:05:00+07',
    'ONLINE'
  ),
  (
    '66666666-6666-6666-6666-666666666662',
    '44444444-4444-4444-4444-444444444454',
    '11111111-1111-1111-1111-111111111117',
    '2026-05-17 12:01:00+07',
    'ONLINE'
  )
on conflict (id) do update
set
  registration_id = excluded.registration_id,
  staff_id = excluded.staff_id,
  checkin_time = excluded.checkin_time,
  source = excluded.source;

commit;
