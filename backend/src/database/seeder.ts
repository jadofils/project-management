import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, ContentCategory } from './entities';

const DEFAULT_CATEGORIES = [
  { name: 'Funny',       slug: 'funny',      icon: '😂', color: '#f59e0b', description: 'Memes, relatable humor, and jokes' },
  { name: 'Wise',        slug: 'wise',       icon: '🧠', color: '#6366f1', description: 'Philosophy, paradoxes, and deep thoughts' },
  { name: 'Guidance',    slug: 'guidance',   icon: '💡', color: '#10b981', description: 'Motivational quotes and life hacks' },
  { name: 'Love',        slug: 'love',       icon: '❤️', color: '#ef4444', description: 'Romance, friendship, and family' },
  { name: 'Science',     slug: 'science',    icon: '🔬', color: '#3b82f6', description: 'Experiments, tech humor, and discoveries' },
  { name: 'Psychology',  slug: 'psychology', icon: '🧩', color: '#8b5cf6', description: 'Mind tricks, behavior, and mental health' },
  { name: 'Sociology',   slug: 'sociology',  icon: '🌍', color: '#06b6d4', description: 'Culture, society, and human behavior' },
  { name: 'Myths',       slug: 'myths',      icon: '🔮', color: '#ec4899', description: 'Spiritual, cultural, and mythological' },
];

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
      bio:           'System Administrator',
      phone:         '+250700000000',
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

export async function seedContentCategories(dataSource: DataSource) {
  const repo = dataSource.getRepository(ContentCategory);
  const existing = await repo.count();
  if (existing > 0) return;
  console.log('[seeder] Seeding content categories...');
  for (const cat of DEFAULT_CATEGORIES) {
    await repo.save(repo.create(cat as any));
  }
  console.log(`[seeder] ✅ ${DEFAULT_CATEGORIES.length} content categories created`);
}
