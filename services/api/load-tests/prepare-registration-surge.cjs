require('dotenv').config();
const crypto = require('node:crypto');
const { writeFileSync } = require('node:fs');
const { Pool } = require('pg');

const studentCount = Number(process.env.LOAD_STUDENT_COUNT || 12000);
const workshopCapacity = Number(process.env.LOAD_WORKSHOP_CAPACITY || 60);
const cohort = process.env.LOAD_TEST_COHORT || 'registration_surge';
const outputFile = process.env.TOKENS_FILE || './load-tests/registration-surge.tokens.json';
const metadataFile = process.env.LOAD_TEST_METADATA_FILE || './load-tests/registration-surge.metadata.json';
const batchSize = Number(process.env.LOAD_STUDENT_BATCH_SIZE || 500);
const jwtSecret = process.env.JWT_SECRET;
const expiresInSeconds = Number(process.env.JWT_EXPIRES_IN_SECONDS || 60 * 60 * 24);
const roomName = `Load Test Room ${cohort}`;
const workshopTitle = `Load Test Registration Surge ${cohort}`;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined
});

const base64Url = (value) => Buffer.from(value).toString('base64url');
const sign = (value) => crypto.createHmac('sha256', jwtSecret).update(value).digest('base64url');
const createToken = (id) => {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({
    sub: id,
    role: 'STUDENT',
    iat: now,
    exp: now + expiresInSeconds
  }));
  const unsigned = `${header}.${payload}`;

  return `${unsigned}.${sign(unsigned)}`;
};

const main = async () => {
  const tokens = new Array(studentCount);
  let createdCount = 0;
  const existingRoom = await pool.query(
    'select id from rooms where name = $1 and location = $2',
    [roomName, 'Load Test']
  );
  const roomId = existingRoom.rows[0]?.id ?? (
    await pool.query(
      'insert into rooms (name, location, capacity) values ($1, $2, $3) returning id',
      [roomName, 'Load Test', studentCount]
    )
  ).rows[0].id;
  const existingWorkshop = await pool.query(
    'select id from workshops where title = $1',
    [workshopTitle]
  );
  const workshopId = existingWorkshop.rows[0]?.id ?? (
    await pool.query(
      `
        insert into workshops (title, speaker, room_id, capacity, seats_remaining, price, start_time)
        values ($1, $2, $3, $4, $4, 0, now() + interval '1 day')
        returning id
      `,
      [workshopTitle, 'Load Test Harness', roomId, workshopCapacity]
    )
  ).rows[0].id;
  await pool.query(
    `
      update workshops
      set capacity = $2,
        seats_remaining = least(seats_remaining, $2),
        updated_at = now()
      where id = $1
    `,
    [workshopId, workshopCapacity]
  );

  for (let start = 0; start < studentCount; start += batchSize) {
    const rows = Array.from(
      { length: Math.min(batchSize, studentCount - start) },
      (_, offset) => {
        const index = start + offset;

        return {
          index,
          email: `${cohort}.${index}@load.test`,
          name: `Load Student ${index}`,
          studentId: `${cohort}_${index}`
        };
      }
    );
    const values = [];
    const placeholders = rows.map((row, rowIndex) => {
      const base = rowIndex * 3;
      values.push(row.email, row.name, row.studentId);

      return `($${base + 1}, $${base + 2}, 'STUDENT', $${base + 3})`;
    });
    const result = await pool.query(
      `
        insert into users (email, name, role, student_id)
        values ${placeholders.join(', ')}
        on conflict (email) do update
          set name = excluded.name,
              role = excluded.role,
              student_id = excluded.student_id
        returning id, email, xmax = 0 as "wasInserted"
      `,
      values
    );
    const indexesByEmail = new Map(rows.map((row) => [row.email, row.index]));

    for (const row of result.rows) {
      const index = indexesByEmail.get(row.email);

      if (index === undefined) {
        throw new Error(`Unexpected email returned from upsert: ${row.email}`);
      }

      if (row.wasInserted) {
        createdCount += 1;
      }

      tokens[index] = createToken(row.id);
    }
  }

  writeFileSync(outputFile, JSON.stringify(tokens, null, 2));
  writeFileSync(metadataFile, JSON.stringify({
    cohort,
    roomId,
    workshopId,
    studentCount,
    workshopCapacity
  }, null, 2));
  console.log(`cohort: ${cohort}`);
  console.log(`created ${createdCount} students, reused ${studentCount - createdCount}`);
  console.log(`room id: ${roomId}`);
  console.log(`workshop id: ${workshopId}`);
  console.log(`workshop capacity: ${workshopCapacity}`);
  console.log(`wrote ${outputFile}`);
  console.log(`wrote ${metadataFile}`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
