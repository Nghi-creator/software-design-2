# Data Models: UniHub Workshop

PostgreSQL is the source of truth. Use transactions for multi-step writes and row-level locks for registration capacity updates.

## Entities

### User
- `id` UUID primary key
- `student_id` string, nullable, unique when present
- `name` string
- `email` string, unique
- `role` enum: `STUDENT`, `ORGANIZER`, `CHECKIN_STAFF`
- `password_hash` string, nullable for legacy/seed users

### Room
- `id` primary key
- `name` string
- `location` string
- `capacity` integer
- `layout_url` string, nullable

### Workshop
- `id` primary key
- `title` string
- `speaker` string
- `room_id` foreign key to `Room`
- `start_time` timestamp
- `capacity` integer
- `seats_remaining` integer
- `pdf_url` string, nullable
- `ai_summary` text, nullable

### Registration
- `id` primary key
- `student_id` foreign key to `User`
- `workshop_id` foreign key to `Workshop`
- `status` enum: `PENDING`, `CONFIRMED`, `CANCELLED`
- `qr_code` string, unique
- `checked_in_at` timestamp, nullable

### Payment
- `id` primary key
- `registration_id` foreign key to `Registration`
- `amount` decimal
- `status` enum: `PENDING`, `SUCCESS`, `FAILED`
- `transaction_id` string, nullable
- `idempotency_key` string, unique

### Checkin
- `id` primary key
- `registration_id` foreign key to `Registration`
- `staff_id` foreign key to `User`
- `checkin_time` timestamp
- `source` enum: `ONLINE`, `OFFLINE_SYNC`

### Notification
- `id` primary key
- `user_id` foreign key to `User`
- `registration_id` nullable foreign key to `Registration`
- `event_key` unique event idempotency key per channel
- `channel` enum: `EMAIL`
- `subject` text
- `body` text
- `status` enum: `PENDING`, `SENT`, `FAILED`
- `attempt_count` integer
- `last_error` text, nullable
- `sent_at` timestamp, nullable
- `read_at` timestamp, nullable

### CsvImportJob
- `id` UUID primary key
- `source` text path/source label for the imported CSV
- `status` enum: `RUNNING`, `COMPLETED`, `FAILED`
- `started_at` timestamp
- `finished_at` timestamp, nullable
- `total_rows`, `success_count`, `error_count` integer counters
- `message` text, nullable

### CsvImportError
- `id` UUID primary key
- `job_id` foreign key to `CsvImportJob`
- `row_number` integer from the CSV file
- `student_id`, `email` nullable row identifiers
- `error` text
- `raw_row` JSONB snapshot
- `created_at` timestamp

## Relationships

- One `Room` has many `Workshop`.
- One `User` can have many `Registration`.
- One `Workshop` can have many `Registration`.
- One `Registration` can have zero or one `Payment`.
- One `Registration` can have zero or one `Checkin`.
- One `User` can receive many `Notification`.
- One `CsvImportJob` can have many `CsvImportError`.

## Constraints And Indexes

- Unique registration per `(student_id, workshop_id)`.
- `Workshop.seats_remaining` must stay between `0` and `capacity`.
- `Registration.qr_code` must be unique and hard to guess.
- Index `Workshop.start_time` for browsing and upcoming workshop queries.
- Index `Registration.workshop_id` for admin stats.
- Index `Payment.idempotency_key` for duplicate-payment protection.
- Index `Checkin.registration_id` for QR validation and sync.
- Unique notification per `(event_key, channel)`.
- Index `Notification.user_id` for inbox/history queries.
- Index `Notification.status` for delivery monitoring/retry queries.
- Index `CsvImportJob.started_at` desc for latest status.
- Index `CsvImportError.job_id` for per-import error reporting.
