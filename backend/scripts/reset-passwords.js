const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const DB = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_gK6wfaUhDs3k@ep-lingering-mountain-atazmwz2-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  const client = new Client({ connectionString: DB, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const { rows: users } = await client.query('SELECT id, email, first_name, last_name, system_role FROM users ORDER BY email');

  console.log('# System Credentials\n');
  console.log('| Email | Name | Role | Password |');
  console.log('|-------|------|------|----------|');

  const hash = await bcrypt.hash('Password123!', 10);

  for (const u of users) {
    const name = `${u.first_name} ${u.last_name}`.trim();
    const pwd = u.email === 'jasezikeye50@gmail.com' ? 'Sezikeye@12' : 'Password123!';
    const h = u.email === 'jasezikeye50@gmail.com' ? await bcrypt.hash('Sezikeye@12', 10) : hash;

    await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [h, u.id]);
    console.log(`| ${u.email} | ${name} | ${u.system_role} | ${pwd} |`);
  }

  console.log(`\n> Updated ${users.length} user passwords.`);
  await client.end();
}

main().catch(console.error);
