require('dotenv').config();
const { Pool } = require('pg');

const cohort = process.env.LOAD_TEST_COHORT || 'registration_surge';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined
});

const main = async () => {
  const users = await pool.query(
    `
      select id
      from users
      where email like $1
    `,
    [`${cohort}.%@load.test`]
  );
  const userIds = users.rows.map((row) => row.id);

  if (userIds.length === 0) {
    console.log(`cohort: ${cohort}`);
    console.log('deleted 0 students');
    return;
  }

  await pool.query(
    `
      delete from notifications
      where registration_id in (
        select id from registrations where user_id = any($1::uuid[])
      )
    `,
    [userIds]
  );
  await pool.query(
    `
      delete from checkins
      where registration_id in (
        select id from registrations where user_id = any($1::uuid[])
      )
    `,
    [userIds]
  );
  await pool.query(
    `
      delete from payments
      where registration_id in (
        select id from registrations where user_id = any($1::uuid[])
      )
    `,
    [userIds]
  );
  await pool.query('delete from registrations where user_id = any($1::uuid[])', [userIds]);
  await pool.query('delete from users where id = any($1::uuid[])', [userIds]);

  console.log(`cohort: ${cohort}`);
  console.log(`deleted ${userIds.length} students`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
