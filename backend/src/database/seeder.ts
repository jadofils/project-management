import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './entities';

export async function seedDatabase(dataSource: DataSource) {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  const ADMIN_PASS  = process.env.ADMIN_PASS;

  if (!ADMIN_EMAIL || !ADMIN_PASS) {
    console.log('[seeder] ADMIN_EMAIL or ADMIN_PASS not set — skipping admin seed.');
    return;
  }

  const repo = dataSource.getRepository(User);

  console.log('[seeder] Checking admin account...');
  const hash = await bcrypt.hash(ADMIN_PASS, 10);

  const existing = await repo.findOne({ where: { email: ADMIN_EMAIL } as any });

  if (!existing) {
    console.log('[seeder] No admin found — creating...');
    await repo.insert({
      email:         ADMIN_EMAIL,
      password_hash: hash,
      first_name:    'Sezikeye',
      last_name:     'Jas',
      system_role:   'admin' as any,
      is_active:     true,
    } as any);
    console.log('[seeder] ✅ Admin account created');
  } else {
    console.log(`[seeder] Admin exists (id: ${existing.id}) — refreshing password hash...`);
    await dataSource.query(
      `UPDATE users SET password_hash = $1, system_role = 'admin', is_active = true WHERE email = $2`,
      [hash, ADMIN_EMAIL],
    );
    console.log('[seeder] ✅ Admin password refreshed');
  }
}
