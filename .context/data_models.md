# Data Models: UniHub Workshop

## Key Entities

### User
- `id` (UUID)
- `student_id` (String, nullable)
- `full_name`, `email`, `role` (STUDENT, ORGANIZER, CHECKIN_STAFF)

### Room
- `id`, `name`, `location`, `capacity`

### Workshop
- `id`, `title`, `speaker`
- `room_id` (FK)
- `start_time`, `capacity`, `seats_remaining`

### Registration
- `id`, `student_id` (FK), `workshop_id` (FK)
- `status` (PENDING, CONFIRMED, CANCELLED)
- `qr_code`

### Payment
- `id`, `registration_id` (FK), `amount`, `status`, `idempotency_key`

### Checkin
- `id`, `registration_id` (FK), `staff_id` (FK), `checkin_time`

### Notification
- `id`, `user_id` (FK), `message`, `type`, `sent_at`
