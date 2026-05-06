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
