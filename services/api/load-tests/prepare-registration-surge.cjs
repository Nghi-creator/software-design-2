require('dotenv').config();
const crypto = require('node:crypto');
const { writeFileSync } = require('node:fs');
const { Pool } = require('pg');

const studentCount = Number(process.env.LOAD_STUDENT_COUNT || 12000);
const cohort = process.env.LOAD_TEST_COHORT || 'registration_surge';
const outputFile = process.env.TOKENS_FILE || './load-tests/registration-surge.tokens.json';
const jwtSecret = process.env.JWT_SECRET;
const expiresInSeconds = Number(process.env.JWT_EXPIRES_IN_SECONDS || 60 * 60 * 24);

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
  const tokens = [];
  let createdCount = 0;

  for (let index = 0; index < studentCount; index += 1) {
    const email = `${cohort}.${index}@load.test`;
    const studentId = `${cohort}_${index}`;
    const result = await pool.query(
      `
        insert into users (email, name, role, student_id)
        values ($1, $2, 'STUDENT', $3)
        on conflict (email) do update
          set name = excluded.name,
              role = excluded.role,
              student_id = excluded.student_id
        returning id, xmax = 0 as "wasInserted"
      `,
      [email, `Load Student ${index}`, studentId]
    );

    if (result.rows[0].wasInserted) {
      createdCount += 1;
    }

    tokens.push(createToken(result.rows[0].id));
  }

  writeFileSync(outputFile, JSON.stringify(tokens, null, 2));
  console.log(`cohort: ${cohort}`);
  console.log(`created ${createdCount} students, reused ${studentCount - createdCount}`);
  console.log(`wrote ${outputFile}`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
