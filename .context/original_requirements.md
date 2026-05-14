# COURSE PROJECT – UniHub Workshop

## Context

University A organizes an annual "Skills and Career Week." The event lasts 5 days, with 8–12 workshops running simultaneously in various rooms each day. Currently, the organizing committee manages registrations using Google Forms and manual email notifications—a process that no longer meets the needs as the scale grows.

The organizing committee wants to build the **UniHub Workshop** system to digitize the entire process, from registration to event check-in.

## Users

| Group | Description |
| :--- | :--- |
| **Students** | View workshop schedule, register, receive confirmation, and check-in when attending |
| **Organizing Committee** | Create and manage workshops, track registration numbers |
| **Check-in Staff** | Validate student attendance at room doors using a mobile app |

## System Requirements

### 1. View and Register for Workshops
Students can view a list of all workshops during the week, including speaker information, the designated room, room layout, and real-time available seats. Students register for workshops—some are free, while others require a fee. After successful registration, students receive a QR code for check-in.

### 2. Notifications
After successful registration, students receive confirmation notifications via the app and email. The system should be designed to easily add new notification channels (e.g., Telegram) in future semesters without significant changes.

### 3. Administration
The organizing committee uses an admin website to create new workshops, update information, change rooms, reschedule, or cancel workshops. The admin site is for internal use only and requires strict access control—three user groups have different permissions:
- **Students**: Can only view and register for workshops.
- **Organizing Committee**: Authorized to create, edit, cancel workshops, and view statistics.
- **Check-in Staff**: Only has access to the QR code scanning functionality.

### 4. Event Check-in
Staff at the room doors use a mobile app to scan students' QR codes. Some areas of the university have unstable network connections—the app must allow temporary check-in logging when offline and automatically synchronize data once the connection is restored.

### 5. AI Summary
The organizing committee can upload PDF files introducing the workshops. The system automatically processes, extracts content, cleans text, and sends it to an AI model to generate a summary displayed on the workshop details page.

### 6. Student Data Synchronization
The university's current student management system lacks an API. The only way to retrieve data is via CSV files exported by the old system at night. UniHub Workshop needs to periodically import this data to validate students during registration.

## Critical Issues to Solve

- **Seat Contention**: Some workshops only have 60 seats but may have hundreds of students trying to register simultaneously as soon as registration opens. The system must ensure that no two students receive the same final seat.
- **Sudden Load Spikes**: An estimated 12,000 students are expected to access the system in the first 10 minutes of registration, with 60% concentrated in the first 3 minutes. The system needs protection mechanisms for the backend API to prevent overloading, block repeated client requests, and ensure fairness among registering students.
- **Payment Instability**: If the payment gateway fails, students should still be able to view the workshop schedule and event information normally. Paid registration flows must handle payment timeouts without causing double charges, and non-payment features must remain functional during prolonged gateway outages.
- **Offline Check-in**: Staff in areas without internet must still be able to check students in; data must not be lost when the connection returns.
- **One-way Integration**: Impossible to call the old system's API—can only read CSV files exported on a fixed schedule. The data import flow must handle corrupted files, duplicate data, and not disrupt the running system.

---

## Deliverables

### Part 1 — Blueprint

1.  **System Design Document**: Describes the overall architecture, main components, and communication methods.
2.  **C4 Diagram**: Level 1 (System Context) and Level 2 (Container).
3.  **High-Level Architecture Diagram**: Flowchart showing data flow, integration with legacy systems, payments, AI models, and offline check-in.
4.  **Database Design**: Proposals for SQL/NoSQL with justifications and schemas for critical entities.
5.  **Key Business Flow Descriptions**:
    - Paid workshop registration flow.
    - Offline check-in and synchronization flow.
    - Nightly CSV data import flow.
6.  **Access Control Design**: Permission model (e.g., RBAC).
7.  **System Protection Mechanisms**:
    - Sudden Load Spike Control (Rate Limiting).
    - Payment Gateway Failure Handling (Circuit Breaker).
    - Double Charge Prevention (Idempotency Key).

### Part 2 — Implementation

Complete, runnable software implementing the entire system described in the Blueprint. Must include:
- Full business features.
- Actual implementation of technical mechanisms (no stubs).
- Launch instructions (README).
- Sample data (Seed data).

---

## Reference – Blueprint Template

Proposed directory structure based on the OpenSpec framework:

```text
blueprint/
├── proposal.md          # Context, issues, objectives
├── design.md            # Architecture, diagrams, technical decisions
└── specs/
    ├── auth.md          # Permission specifications
    ├── payment.md       # Payment flow specifications
    ├── checkin.md       # Offline check-in specifications
    └── ...              # Other feature specifications
```

### [Template Details for proposal.md, design.md, specs/...]
*(Please refer to the source text for detailed template contents)*

---

## Submission Guidelines

- **Submission Format**: A single text file named `group-id_student-id1_student-id2_student-id3_student-id4.txt` containing a public Google Drive link.
- **Google Drive Folder Structure**:
    - `Blueprint/`: PDF or Markdown folder.
    - `Source code/`: `src/` folder, `data/` folder, and `README.md`.
    - `Presentation Video/`: `clips/` folder for technical demonstration videos (FullHD, MP4).
