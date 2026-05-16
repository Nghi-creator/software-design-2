# Decisions: UniHub Workshop

## Infrastructure

### 2026-05-06: PostgreSQL for Registration
- **Decision**: Use PostgreSQL as the primary database.
- **Reason**: Need for ACID compliance and Row-level locking to handle seat race conditions during high-concurrency spikes.

### 2026-05-06: Layered Monolith
- **Decision**: Adopt a layered monolith architecture.
- **Reason**: Simplifies development and deployment for the current scale, with modules clearly separated for future microservices migration if needed.

### 2026-05-07: Redis for Rate Limiting
- **Decision**: Implement Token Bucket rate limiting via Redis Lua scripts.
- **Reason**: Protect against 12k concurrent traffic spikes without overwhelming the DB.

### 2026-05-07: Circuit Breaker for Payments
- **Decision**: Use Opossum for payment gateway integration.
- **Reason**: Prevent cascading failures when external payment mocks are unstable.

### 2026-05-16: BullMQ on Upstash Redis for Notifications
- **Decision**: Implement event-driven notifications with BullMQ backed by Upstash Redis, using a separate worker process for delivery jobs.
- **Reason**: UniHub already uses Redis, `bullmq` is already present in the backend, and this keeps a recognizable message-queue architecture without adding RabbitMQ solely for one remaining feature.
- **Fallback**: If deployment becomes fully serverless and cannot keep a worker process alive, use QStash instead of BullMQ for HTTP-based job delivery.

## Frontend

### 2026-05-14: Single React Web App with RBAC
- **Decision**: Use one React web app for both students and admins, with RBAC-protected routes and actions.
- **Reason**: Avoid duplicated frontend shells while keeping permissions centralized and explicit.

## Check-In

### 2026-05-16: Keep QR Validation Inside Check-In
- **Decision**: Do not create a separate QR validation endpoint; validate QR tokens inside online and offline check-in flows.
- **Reason**: Current product flow only needs validation at commit time, so a separate pre-check endpoint would add contract surface without required behavior.
