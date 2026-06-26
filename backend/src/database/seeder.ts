import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, ProjectRole } from './entities';

const DEMO_USERS: Array<{ email: string; first_name: string; last_name: string; role: ProjectRole | 'admin' }> = [
  { email: 'pm@pm.local',           first_name: 'Alice',   last_name: 'Manager',   role: 'project_manager' },
  { email: 'backend@pm.local',      first_name: 'Bob',     last_name: 'Backend',   role: 'backend_dev' },
  { email: 'frontend@pm.local',     first_name: 'Carol',   last_name: 'Frontend',  role: 'frontend_dev' },
  { email: 'docs@pm.local',         first_name: 'David',   last_name: 'Docs',      role: 'documentalist' },
  { email: 'tester@pm.local',       first_name: 'Eve',     last_name: 'Tester',    role: 'tester' },
  { email: 'qa@pm.local',           first_name: 'Frank',   last_name: 'QA',        role: 'qa_tester' },
];

export async function seedDatabase(dataSource: DataSource) {
  const repo = dataSource.getRepository(User);
  const count = await repo.count();
  if (count > 0) return;

  console.log('[seeder] No users found — seeding demo data...');
  const hash = await bcrypt.hash('admin123', 10);

  const admin = repo.create({
    email: 'admin@pm.local',
    password_hash: hash,
    first_name: 'Admin',
    last_name: 'System',
    system_role: 'admin',
    is_active: true,
  } as any);
  await repo.save(admin);

  for (const u of DEMO_USERS) {
    const user = repo.create({
      email: u.email,
      password_hash: hash,
      first_name: u.first_name,
      last_name: u.last_name,
      system_role: 'user',
      is_active: true,
    } as any);
    await repo.save(user);
  }

  console.log('[seeder] Seeded 7 users (admin + 6 demo). Default password: admin123');
}
