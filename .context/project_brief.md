# Project Brief: UniHub Workshop

## Goal
A comprehensive workshop management platform for universities to handle high-concurrency registrations and offline check-ins.

## Stack
- **Frontend**: React single web app for students/admins via RBAC-protected routes, Flutter (Mobile Check-in)
- **Backend**: Node.js, Express (REST API)
- **Database**: PostgreSQL (Relational), Redis (Caching & Rate Limiting)
- **Infrastructure**: BullMQ on Upstash Redis for queued jobs, Object Storage (PDFs)

## Core Features
1. **Browse & Register**: Students scan/browse and sign up for workshops.
2. **QR Check-in**: Mobile QR scanning with durable temporary offline capture and later sync when connectivity returns.
3. **Admin Dashboard**: RBAC-protected web routes for workshop CRUD, stats, and PDF resource management.
4. **Background Tasks**: AI-generated workshop summaries, email notifications, and legacy CSV data sync.
