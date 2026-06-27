/**
 * List all users in the database.
 * Usage:  node scripts/list-users.js
 */
const { Client } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const { rows } = await client.query(
    `SELECT id, email, first_name, last_name, system_role, is_active, created_at
     FROM users ORDER BY created_at ASC`,
  );

  if (rows.length === 0) {
    console.log('No users found.');
  } else {
    console.log(`\n${'─'.repeat(100)}`);
    console.log(`  Total users: ${rows.length}`);
    console.log(`${'─'.repeat(100)}`);
    rows.forEach((u, i) => {
      console.log(`  ${i + 1}. ${u.first_name} ${u.last_name} <${u.email}>`);
      console.log(`     id: ${u.id}  role: ${u.system_role}  active: ${u.is_active}  joined: ${u.created_at.toISOString().split('T')[0]}`);
    });
    console.log(`${'─'.repeat(100)}\n`);
  }

  await client.end();
})().catch(err => { console.error('❌', err.message); process.exit(1); });
