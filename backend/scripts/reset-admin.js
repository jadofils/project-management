/**
 * Run once to force-reset the admin password in the DB.
 * Usage:  node scripts/reset-admin.js
 */
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const ADMIN_EMAIL = 'jasezikeye50@gmail.com';
const ADMIN_PASS  = 'Sezikeye@12';

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected to DB');

  const hash = await bcrypt.hash(ADMIN_PASS, 10);
  console.log('New hash:', hash);

  // Check if user exists
  const { rows } = await client.query('SELECT id, email, system_role FROM users WHERE email = $1', [ADMIN_EMAIL]);

  if (rows.length === 0) {
    // Insert fresh
    await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, system_role, is_active)
       VALUES ($1, $2, 'Sezikeye', 'Jas', 'admin', true)`,
      [ADMIN_EMAIL, hash],
    );
    console.log('✅ Admin created');
  } else {
    await client.query(
      `UPDATE users SET password_hash = $1, system_role = 'admin', is_active = true WHERE email = $2`,
      [hash, ADMIN_EMAIL],
    );
    console.log('✅ Admin password reset — row id:', rows[0].id);
  }

  await client.end();
  console.log('Done. Login with:', ADMIN_EMAIL, '/', ADMIN_PASS);
})().catch(err => { console.error('❌', err.message); process.exit(1); });
