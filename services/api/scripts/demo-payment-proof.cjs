const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

const demoDirectory = path.resolve(__dirname, '../demo');
const modePath = path.join(demoDirectory, 'payment-mode.json');
const eventsPath = path.join(demoDirectory, 'payment-events.json');
const apiBaseUrl = process.env.DEMO_API_BASE_URL ?? 'http://127.0.0.1:3000/api';
const apiOrigin = apiBaseUrl.replace(/\/api\/?$/, '');
const suffix = `demo_payment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const idempotencyKey = `demo-payment-timeout-${suffix}`;

main().catch((error) => {
  console.error(`Demo proof failed: ${error.message}`);
  process.exit(1);
});

async function main() {
  const env = readEnvFile(path.resolve(__dirname, '../.env'));
  const databaseUrl = process.env.DATABASE_URL ?? env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required in services/api/.env or the shell environment.');
  }

  await assertApiIsRunning();
  setPaymentMode('timeout');

  const student = await registerDemoStudent();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const fixture = await createPaidWorkshop(client);

    const first = await postRegistration({
      accessToken: student.accessToken,
      paymentToken: 'tok_first_timeout',
      workshopId: fixture.workshopId
    });

    const browse = await getJson(`/workshops?q=${encodeURIComponent(fixture.title)}`);

    const replay = await postRegistration({
      accessToken: student.accessToken,
      paymentToken: 'tok_second_should_not_charge',
      workshopId: fixture.workshopId
    });

    const proof = await readDatabaseProof(client, {
      studentId: student.user.id,
      workshopId: fixture.workshopId
    });
    const events = readPaymentEvents().filter((event) => event.userId === student.user.id);

    console.log('\nPayment outage idempotency proof');
    console.log('--------------------------------');
    console.log(`Demo workshop: ${fixture.title}`);
    console.log(`Workshop id:   ${fixture.workshopId}`);
    console.log(`Student email: ${student.user.email}`);
    console.log(`Idempotency-Key: ${idempotencyKey}`);
    console.log('');
    console.log(`First paid registration:  HTTP ${first.status} ${JSON.stringify(first.body)}`);
    console.log(`Replay same idempotency:  HTTP ${replay.status} ${JSON.stringify(replay.body)}`);
    console.log(`Browse still works:       HTTP ${browse.status}; matching workshops=${browse.body.items?.length ?? 0}`);
    console.log(`Gateway charge attempts:  ${events.length}`);
    console.log(`Registration status:      ${proof.registrationStatus}`);
    console.log(`Payment status:           ${proof.paymentStatus}`);
    console.log(`Seats remaining:          ${proof.seatsRemaining}/${proof.capacity}`);
    console.log('');
    console.log('Expected talking point: the first request times out, the retry replays the same failure,');
    console.log('the gateway was called once, the payment is FAILED, the registration is CANCELLED,');
    console.log('the seat was restored, and workshop browsing still works during the outage.');
    console.log('');
    console.log('For the browser demo, keep the API running and use:');
    console.log('  npm run demo:payment:timeout');
    console.log('Then browse the schedule and try a paid registration from the web UI.');
    console.log('Restore normal behavior with:');
    console.log('  npm run demo:payment:normal');
  } finally {
    await client.end();
  }
}

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return Object.fromEntries(
    fs.readFileSync(filePath, 'utf8')
      .split(/\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const separatorIndex = line.indexOf('=');
        return [
          line.slice(0, separatorIndex),
          line.slice(separatorIndex + 1).replace(/^"|"$/g, '')
        ];
      })
  );
}

async function assertApiIsRunning() {
  const response = await fetch(`${apiOrigin}/health`).catch(() => null);

  if (!response?.ok) {
    throw new Error(`Start the API first: npm run dev from services/api. Tried ${apiOrigin}/health`);
  }
}

function setPaymentMode(mode) {
  fs.mkdirSync(demoDirectory, { recursive: true });
  fs.writeFileSync(modePath, `${JSON.stringify({ mode }, null, 2)}\n`);
  fs.writeFileSync(eventsPath, '[]\n');
}

async function registerDemoStudent() {
  const body = {
    email: `${suffix}@example.test`,
    password: 'Password123',
    name: `Payment Demo ${suffix}`,
    role: 'STUDENT',
    studentId: suffix
  };
  const response = await fetch(`${apiBaseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const responseBody = await response.json();

  if (response.status !== 201) {
    throw new Error(`Student registration failed: HTTP ${response.status} ${JSON.stringify(responseBody)}`);
  }

  return responseBody;
}

async function createPaidWorkshop(client) {
  const room = await client.query(
    'insert into rooms (name, location, capacity) values ($1, $2, $3) returning id',
    [`Payment Demo Room ${suffix}`, 'Demo Wing, Floor 2', 24]
  );
  const title = `Payment Outage Demo ${suffix}`;
  const workshop = await client.query(
    `
      insert into workshops (title, speaker, room_id, capacity, seats_remaining, price, start_time)
      values ($1, $2, $3, 24, 24, 50000, now() + interval '1 day')
      returning id
    `,
    [title, 'Demo Payment Gateway', room.rows[0].id]
  );

  return {
    roomId: room.rows[0].id,
    title,
    workshopId: workshop.rows[0].id
  };
}

async function postRegistration({ accessToken, paymentToken, workshopId }) {
  const response = await fetch(`${apiBaseUrl}/workshops/${workshopId}/register`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      'idempotency-key': idempotencyKey
    },
    body: JSON.stringify({ paymentToken })
  });

  return {
    status: response.status,
    body: await response.json()
  };
}

async function getJson(pathname) {
  const response = await fetch(`${apiBaseUrl}${pathname}`);

  return {
    status: response.status,
    body: await response.json()
  };
}

async function readDatabaseProof(client, { studentId, workshopId }) {
  const result = await client.query(
    `
      select
        w.capacity,
        w.seats_remaining as "seatsRemaining",
        r.status as "registrationStatus",
        p.status as "paymentStatus"
      from workshops w
      join registrations r on r.workshop_id = w.id
      join payments p on p.registration_id = r.id
      where w.id = $1 and r.user_id = $2
    `,
    [workshopId, studentId]
  );

  if (!result.rows[0]) {
    throw new Error('Expected failed registration/payment proof rows were not found.');
  }

  return result.rows[0];
}

function readPaymentEvents() {
  try {
    return JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
  } catch {
    return [];
  }
}
