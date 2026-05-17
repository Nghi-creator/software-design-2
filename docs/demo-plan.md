# UniHub Workshop Demo Plan

## Demo Goal

Show that UniHub Workshop is not only feature-complete, but dependable under the exact constraints in the assignment:

- students can browse, register, pay, receive confirmation, and get a QR code
- organizers can manage workshops securely
- check-in still works when the network disappears
- AI summaries and nightly CSV imports are integrated into real product flows
- the system remains safe under concurrency, duplicate requests, and unstable external services

## Recommended Demo Format

Run the demo as one connected story with three roles:

1. **Student**
2. **Organizer**
3. **Check-in staff**

Use:

- one browser window for the student flow
- one private/incognito browser window for organizer access
- one mobile device or emulator for the check-in app
- one API/testing terminal window for proof moments

The cleanest narrative is:

```text
Organizer prepares workshop
        ↓
Student discovers and registers
        ↓
System confirms + notifies
        ↓
Staff checks student in
        ↓
Organizer verifies stats and background integrations
```

## Pre-Demo Setup

Prepare these before presenting:

- Seed at least:
  - one **free workshop**
  - one **paid workshop**
  - one workshop with an uploaded **PDF**
  - one workshop with a room that has a **layout image / URL**
- Have three test accounts ready:
  - `STUDENT`
  - `ORGANIZER`
  - `CHECKIN_STAFF`
- Make sure one student already exists in the imported CSV-backed dataset.
- Keep these proof artifacts ready:
  - the student notification inbox / email
  - organizer stats page
  - CSV import status page
  - a sample PDF and its generated summary
  - mobile offline queue screen
  - optional terminal/API calls for RBAC and duplicate-request proof

## Live Demo Script

### 1. Student Browses the Workshop Week

**What to do**

1. Log in as a student.
2. Open the workshop schedule.
3. Show multiple workshops across the week.
4. Open one workshop detail page.

**What to show**

- workshop title, speaker, date/time
- assigned room
- room layout / map
- free vs paid workshop information
- real-time remaining seats
- AI-generated summary on the detail page if available

**How to prove it works**

- Open two browser windows on the same workshop and register once; refresh the second view to show the remaining seat count changed.
- Point out that the room layout and summary are loaded as real workshop data, not static presentation slides.

---

### 2. Student Registers for a Free Workshop

**What to do**

1. From the student page, register for a free workshop.
2. Open “My Registrations”.
3. Retrieve and display the QR code.

**What to show**

- registration succeeds without payment
- registration appears as confirmed
- QR code is generated after success

**How to prove it works**

- Attempt to register for the same workshop again and show that duplicate registration is blocked.
- If desired, show the API response or database state proving there is only one confirmed registration for that student/workshop pair.

---

### 3. Student Registers for a Paid Workshop

**What to do**

1. Register for a paid workshop.
2. Submit the mock payment token.
3. Show the successful registration result and QR code.

**What to show**

- paid and free flows differ
- payment is required before confirmation
- the user still ends with a valid QR code

**How to prove it works**

- Re-submit the same request with the same `Idempotency-Key` and show the same final result is returned instead of charging twice.
- Optionally show the failure case by triggering a payment timeout / maintenance mode, then prove workshop browsing still works normally while paid registration fails safely.

---

### 4. Confirmation Notifications

**What to do**

1. Immediately after successful registration, open the student notification area.
2. Show the in-app confirmation.
3. Show the matching confirmation email.

**What to show**

- app notification and email are both produced from the same registration success event
- the system is event-driven rather than hard-coded to one channel

**How to prove it works**

- Explain that delivery is handled by a channel dispatcher / worker model, so a future channel like Telegram can be added as another channel implementation instead of rewriting the registration flow.
- If useful, show notification delivery records or worker logs proving the event was processed asynchronously.

---

### 5. Organizer Manages Workshops Securely

**What to do**

1. In a separate browser, log in as organizer.
2. Create a workshop.
3. Edit its time and room.
4. Open its statistics.
5. Cancel/delete a workshop if there are no registrations.

**What to show**

- organizer CRUD workflow
- room changes and schedule changes
- stats such as capacity, seats remaining, registration counts, checked-in count, and successful payments

**How to prove it works**

- Try to open the organizer page as:
  - a logged-out user
  - a student
  - check-in staff
- Show they are denied, while the organizer is allowed.
- This demonstrates RBAC, not just hidden buttons.

---

### 6. QR Check-In with Online and Offline Paths

**What to do**

1. Log in on the mobile app as check-in staff.
2. Scan the student’s QR code while online.
3. Show successful check-in.
4. Disable network connectivity.
5. Scan another QR code while offline.
6. Re-enable connectivity and show automatic synchronization.

**What to show**

- online check-in works immediately
- offline scans are stored locally in a durable queue
- the queue survives until the network returns
- sync resumes automatically and resolves item by item

**How to prove it works**

- While offline, show the queued scan inside the app before reconnecting.
- After reconnecting, show the queued item disappears or becomes synced.
- Re-scan the same QR code and show the backend returns an already-checked-in / duplicate-safe result instead of creating a second attendance record.

---

### 7. AI Summary from PDF

**What to do**

1. As organizer, upload a workshop PDF.
2. Open the workshop detail page.
3. Show the generated summary.

**What to show**

- PDF upload
- text extraction and cleaning
- AI-generated summary surfaced to users

**How to prove it works**

- Use a PDF whose content is visibly different from the existing workshop description so the generated summary is obviously derived from the uploaded file.
- If helpful, show the summary-status view moving from “processing/not uploaded” to “ready”.

---

### 8. Nightly CSV Student Sync

**What to do**

1. Show the organizer CSV import status page.
2. Display the latest import job.
3. Show a sample row-level error if one exists.
4. Register with a valid imported student account.

**What to show**

- UniHub can consume the legacy nightly CSV export even without a legacy API
- malformed rows do not stop the entire import
- imported students are used for validation during registration

**How to prove it works**

- Show the import job counters: total rows, successes, failures.
- Show at least one row-level error example.
- Then log in/register with a student that came from the imported data to prove the sync feeds the actual product flow.

## Strong Proof Moments to Include

These are the moments that make the demo feel engineering-heavy rather than cosmetic:

| Requirement | Best proof |
| --- | --- |
| Real-time seats | Register once, then refresh another client and show seats decrease |
| No overselling | Run a prepared concurrency test or cite a live test proving only 60 confirmations for 60 seats |
| Duplicate-payment prevention | Repeat a request with the same `Idempotency-Key` and show the same response |
| Payment outage resilience | Simulate payment failure while workshop browsing still works |
| RBAC | Open organizer/check-in routes with the wrong roles and show denial |
| Offline check-in | Queue while offline, then auto-sync after reconnect |
| Notification extensibility | Show current email + app flow and explain pluggable channel dispatch |
| AI summary | Upload PDF, then show generated summary from that content |
| CSV integration | Show import status, partial failure handling, and a successful registration using imported student data |

## Payment Outage Recording Helper

Use these commands from `services/api` while the API is running:

```bash
npm run demo:payment:normal
npm run demo:payment:timeout
npm run demo:payment:down
npm run demo:payment:proof
```

Suggested video flow:

1. Start API, notification worker if needed, and web.
2. Run `npm run demo:payment:normal`, log in as a student, and show that the workshop schedule loads normally.
3. Run `npm run demo:payment:timeout`, then attempt a paid registration in the web UI. The payment request times out and the UI shows the payment-unavailable message.
4. Without touching payment again, browse the schedule and open a workshop detail page to show graceful degradation: non-payment features still work while the payment gateway is down.
5. Run `npm run demo:payment:proof`. Narrate the printed proof: the first paid request fails, the replay with the same `Idempotency-Key` returns the same failure, gateway attempts stay at `1`, payment is `FAILED`, registration is `CANCELLED`, and seats are restored.
6. Run `npm run demo:payment:normal` before continuing other demos. If the circuit breaker was open, wait about 10 seconds for it to half-open/close.

## Suggested Demo Order for a 10–12 Minute Presentation

1. **1 min** — problem statement and role setup  
2. **2 min** — student browse + free registration + QR  
3. **1 min** — paid registration + idempotency proof  
4. **1 min** — notifications  
5. **2 min** — organizer CRUD + RBAC  
6. **2 min** — online/offline mobile check-in  
7. **1 min** — AI summary  
8. **1 min** — CSV import  
9. **1 min** — final proof board: concurrency, resilience, and architecture highlights

## If Time Is Short

Prioritize this cut:

1. browse workshops
2. register free workshop
3. show QR + notification
4. organizer RBAC + CRUD
5. offline check-in sync
6. one quick slide/terminal proof for payment idempotency, AI summary, and CSV import

That shorter version still covers the soul of the assignment.
