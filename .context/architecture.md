# Architecture: UniHub Workshop

## Style
**Layered Monolith** with **Event-Driven** components for background processing.

## Layers
- **Presentation**: 
    - Web Student App (Web Client)
    - Web Admin App (Web Client)
    - Mobile Check-in App (Local persistence for offline mode)
- **API (Node.js)**: Stateless REST API handling business logic and request routing.
- **Background Workers**: Consumer services for message queue jobs (Email, AI, Data Sync).
- **Persistence**: Relational (PostgreSQL) and Key-Value (Redis).

## Key Components
1. **API Server**: Business logic, Auth, Rate Limiting.
2. **Workers**: Background processing using RabbitMQ.
3. **Database**: Managed PostgreSQL with ACID transactions.
4. **Cache**: Redis for session, idempotency keys, and rate-limit counters.
