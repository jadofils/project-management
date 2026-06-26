import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './entities';

export async function seedDatabase(dataSource: DataSource) {
  const repo = dataSource.getRepository(User);
  const count = await repo.count();
  if (count > 0) return;

  console.log('[seeder] No users found — seeding admin account...');
  const hash = await bcrypt.hash('Sezikeye@12', 10);

  const admin = repo.create({
    email: 'jasezikeye50@gmail.com',
    password_hash: hash,
    first_name: 'Sezikeye',
    last_name: 'Jas',
    system_role: 'admin',
    is_active: true,
  } as any);
  await repo.save(admin);

  console.log('[seeder] Admin account created: jasezikeye50@gmail.com / Sezikeye@12');
  console.log('[seeder] Log in as admin to invite other team members.');
}
