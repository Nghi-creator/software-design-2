import './App.css'

type Workshop = {
  title: string
  speaker: string
  time: string
  room: string
  seatsLeft: number
  capacity: number
  price: string
  tag: string
  status: 'Open' | 'Almost full' | 'Waitlist'
}

type Stat = {
  label: string
  value: string
  note: string
}

const featuredWorkshops: Workshop[] = [
  {
    title: 'Career Launchpad: CV, LinkedIn and Interview Clinic',
    speaker: 'Lan Pham, Talent Partner at NovaTech',
    time: 'Mon 09:00 - 10:30',
    room: 'Hall A1',
    seatsLeft: 24,
    capacity: 120,
    price: 'Free',
    tag: 'Career',
    status: 'Open',
  },
  {
    title: 'Design Systems for Student Builders',
    speaker: 'Minh Truong, Product Designer at Pixel Foundry',
    time: 'Tue 13:30 - 15:00',
    room: 'Lab B3',
    seatsLeft: 8,
    capacity: 60,
    price: '59.000 VND',
    tag: 'Design',
    status: 'Almost full',
  },
  {
    title: 'AI for Internships: Prompting and Portfolio Proof',
    speaker: 'Dr. Ha Nguyen, UniHub AI Lab',
    time: 'Wed 10:00 - 11:30',
    room: 'Innovation Hub',
    seatsLeft: 0,
    capacity: 80,
    price: '79.000 VND',
    tag: 'AI',
    status: 'Waitlist',
  },
  {
    title: 'Product Thinking Bootcamp for Non-Tech Students',
    speaker: 'Ngoc Bui, Senior PM at Skylark',
    time: 'Thu 15:30 - 17:00',
    room: 'Hall C2',
    seatsLeft: 31,
    capacity: 100,
    price: 'Free',
    tag: 'Product',
    status: 'Open',
  },
]

const quickStats: Stat[] = [
  {
    label: 'Students expected',
    value: '12,000+',
    note: 'Peak traffic concentrated in the first 3 minutes.',
  },
  {
    label: 'Parallel workshops',
    value: '8-12/day',
    note: 'Room map and seat count update in near real time.',
  },
  {
    label: 'Check-in mode',
    value: 'Offline-ready',
    note: 'Door staff can keep scanning even if campus Wi-Fi drops.',
  },
]

const adminCards = [
  {
    title: 'Registrations at a glance',
    metric: '4,218',
    detail: '+612 in the last hour',
  },
  {
    title: 'Seats under pressure',
    metric: '7 workshops',
    detail: 'Auto queue enabled for high-demand rooms',
  },
  {
    title: 'Payment incidents',
    metric: '2 alerts',
    detail: 'Circuit breaker degraded paid flow without affecting schedule pages',
  },
]

const timeline = [
  {
    step: 'Browse schedule',
    desc: 'Students filter by day, topic, speaker, room and remaining seats.',
  },
  {
    step: 'Reserve seat',
    desc: 'The system holds inventory fairly and prevents double-booking at the final seat.',
  },
  {
    step: 'Pay if required',
    desc: 'Paid workshops show a clear payment state with retry-safe confirmations.',
  },
  {
    step: 'Receive QR',
    desc: 'Confirmation is delivered in-app and by email, ready for on-site scanning.',
  },
]

const checkinQueue = [
  '09:02 - 14 scans synced after Wi-Fi recovered',
  '09:05 - Duplicate QR blocked at Room B3',
  '09:09 - Manual verification used for 1 student without battery',
]

function seatTone(status: Workshop['status']) {
  switch (status) {
    case 'Open':
      return 'seat-pill seat-pill-open'
    case 'Almost full':
      return 'seat-pill seat-pill-warn'
    case 'Waitlist':
      return 'seat-pill seat-pill-muted'
  }
}

function App() {
  return (
    <div className="page-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">UniHub Workshop</p>
          <p className="brand-subtitle">Skill Week 2026</p>
        </div>
        <nav className="topnav" aria-label="Primary">
          <a href="#schedule">Schedule</a>
          <a href="#experience">Experience</a>
          <a href="#admin">Admin</a>
          <a href="#checkin">Check-in</a>
        </nav>
      </header>

      <main>
        <section className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Workshop registration, payment and on-site entry in one flow</p>
            <h1>One platform for students, organizers and check-in staff.</h1>
            <p className="hero-text">
              UniHub Workshop brings together live seat availability, paid registration,
              QR confirmation, offline mobile check-in and operational visibility for a
              5-day university event.
            </p>
            <div className="hero-actions">
              <button type="button" className="primary-button">
                Explore workshops
              </button>
              <button type="button" className="secondary-button">
                Open admin preview
              </button>
            </div>
            <div className="hero-badges">
              <span>Realtime seats</span>
              <span>Offline scan queue</span>
              <span>AI summaries</span>
            </div>
          </div>

          <div className="hero-panel">
            <div className="hero-panel-header">
              <div>
                <p className="panel-label">Live event pulse</p>
                <h2>Registration opening dashboard</h2>
              </div>
              <span className="status-dot">Stable</span>
            </div>
            <div className="hero-metrics">
              {quickStats.map((stat) => (
                <article key={stat.label} className="metric-card">
                  <p>{stat.label}</p>
                  <strong>{stat.value}</strong>
                  <span>{stat.note}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section-block" id="schedule">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Student Website</p>
              <h2>Schedule that feels useful the moment registration opens</h2>
            </div>
            <p className="section-note">
              This UI combines landing, schedule discovery, workshop detail signals and a
              clear path to registration without needing backend logic yet.
            </p>
          </div>

          <div className="schedule-layout">
            <aside className="filter-card">
              <h3>Find your track</h3>
              <div className="chip-row">
                <span className="chip chip-active">All days</span>
                <span className="chip">Career</span>
                <span className="chip">AI</span>
                <span className="chip">Product</span>
                <span className="chip">Design</span>
              </div>
              <div className="filter-stack">
                <div>
                  <p className="label">Recommended for you</p>
                  <strong>3 workshops</strong>
                  <span>Based on saved interests and available time slots.</span>
                </div>
                <div>
                  <p className="label">Map preview</p>
                  <strong>4 active zones</strong>
                  <span>Each workshop card links to room location and directions.</span>
                </div>
                <div>
                  <p className="label">AI summaries ready</p>
                  <strong>18 uploaded PDFs</strong>
                  <span>Workshop details can surface concise summaries from organizer documents.</span>
                </div>
              </div>
            </aside>

            <div className="workshop-list">
              {featuredWorkshops.map((workshop) => (
                <article key={workshop.title} className="workshop-card">
                  <div className="workshop-topline">
                    <span className="tag">{workshop.tag}</span>
                    <span className={seatTone(workshop.status)}>{workshop.status}</span>
                  </div>
                  <h3>{workshop.title}</h3>
                  <p className="speaker">{workshop.speaker}</p>
                  <div className="workshop-meta">
                    <span>{workshop.time}</span>
                    <span>{workshop.room}</span>
                    <span>{workshop.price}</span>
                  </div>
                  <div className="capacity-row">
                    <div>
                      <strong>{workshop.seatsLeft}</strong>
                      <span>seats left / {workshop.capacity}</span>
                    </div>
                    <div className="capacity-bar" aria-hidden="true">
                      <span
                        style={{
                          width: `${(workshop.seatsLeft / workshop.capacity) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="card-actions">
                    <button type="button" className="primary-button small">
                      {workshop.status === 'Waitlist' ? 'Join waitlist' : 'Register now'}
                    </button>
                    <button type="button" className="ghost-button">
                      View details
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section-block alt-block" id="experience">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Experience Flow</p>
              <h2>Designed around the real journey from discovery to door entry</h2>
            </div>
          </div>

          <div className="timeline-grid">
            {timeline.map((item, index) => (
              <article key={item.step} className="timeline-card">
                <span className="timeline-index">0{index + 1}</span>
                <h3>{item.step}</h3>
                <p>{item.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section-block" id="admin">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Admin Console Snapshot</p>
              <h2>Internal operations UI with enough depth to feel believable</h2>
            </div>
          </div>

          <div className="admin-layout">
            <div className="admin-overview">
              {adminCards.map((card) => (
                <article key={card.title} className="admin-card">
                  <p>{card.title}</p>
                  <strong>{card.metric}</strong>
                  <span>{card.detail}</span>
                </article>
              ))}
            </div>

            <div className="admin-panels">
              <section className="admin-panel">
                <div className="panel-heading">
                  <div>
                    <p className="label">Workshop operations</p>
                    <h3>Today&apos;s critical updates</h3>
                  </div>
                  <button type="button" className="ghost-button">
                    Create workshop
                  </button>
                </div>
                <ul className="admin-list">
                  <li>
                    <strong>Room change</strong>
                    <span>AI for Internships moved from Hall B1 to Innovation Hub.</span>
                  </li>
                  <li>
                    <strong>Schedule shift</strong>
                    <span>Design Systems starts 30 minutes later due to speaker arrival.</span>
                  </li>
                  <li>
                    <strong>Cancellation policy</strong>
                    <span>Paid registrations keep QR access until refund state is confirmed.</span>
                  </li>
                </ul>
              </section>

              <section className="admin-panel">
                <div className="panel-heading">
                  <div>
                    <p className="label">Access control</p>
                    <h3>Role-aware surfaces</h3>
                  </div>
                </div>
                <div className="role-grid">
                  <article>
                    <span>Student</span>
                    <p>Browse schedule, register, receive QR and notifications.</p>
                  </article>
                  <article>
                    <span>Organizer</span>
                    <p>Create workshops, edit slots, view stats and manage event changes.</p>
                  </article>
                  <article>
                    <span>Check-in Staff</span>
                    <p>Access only scanner, attendance list and sync queue operations.</p>
                  </article>
                </div>
              </section>
            </div>
          </div>
        </section>

        <section className="section-block accent-block" id="checkin">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Mobile Companion</p>
              <h2>Check-in staff interface centered on speed, visibility and offline trust</h2>
            </div>
          </div>

          <div className="mobile-preview">
            <div className="phone-frame">
              <div className="phone-screen">
                <div className="phone-top">
                  <span className="status-dot warning">Offline queue: 14</span>
                  <strong>Room B3 Scanner</strong>
                </div>
                <div className="scanner-window">
                  <div className="scanner-box" />
                  <p>Align student QR inside the frame</p>
                </div>
                <div className="sync-card">
                  <p className="label">Recent sync events</p>
                  <ul>
                    {checkinQueue.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="mobile-copy">
              <h3>What this UI communicates</h3>
              <ul className="feature-list">
                <li>Door staff can scan immediately without navigating through clutter.</li>
                <li>Offline state is impossible to miss, reducing confusion during network drops.</li>
                <li>Queued check-ins, duplicate protection and sync feedback are visible on the home surface.</li>
                <li>Later, the same layout can plug into camera scanning and local persistence with minimal redesign.</li>
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
