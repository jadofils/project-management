import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, ContentCategory } from './entities';

const DEFAULT_CATEGORIES = [
  { name: 'Funny',           slug: 'funny',          icon: 'smile',    color: '#f59e0b', description: 'Memes, relatable humor, and jokes' },
  { name: 'Wise',            slug: 'wise',           icon: 'brain',    color: '#6366f1', description: 'Philosophy, paradoxes, and deep thoughts' },
  { name: 'Guidance',        slug: 'guidance',       icon: 'lightbulb',color: '#10b981', description: 'Motivational quotes and life hacks' },
  { name: 'Love',            slug: 'love',           icon: 'heart',    color: '#ef4444', description: 'Romance, friendship, and family' },
  { name: 'Science',         slug: 'science',        icon: 'flask',    color: '#3b82f6', description: 'Experiments, tech humor, and discoveries' },
  { name: 'Psychology',      slug: 'psychology',     icon: 'puzzle',   color: '#8b5cf6', description: 'Mind tricks, behavior, and mental health' },
  { name: 'Sociology',       slug: 'sociology',      icon: 'globe',    color: '#06b6d4', description: 'Culture, society, and human behavior' },
  { name: 'Myths',           slug: 'myths',          icon: 'sparkles', color: '#ec4899', description: 'Spiritual, cultural, and mythological' },
  { name: 'Code Humor',      slug: 'code-humor',     icon: 'puzzle',   color: '#7c3aed', description: 'Developer jokes, programming fails, and tech life memes' },
  { name: 'English Challenge', slug: 'eng-challenge',icon: 'book',     color: '#0369a1', description: 'Grammar memes, vocabulary puzzles, language quirks' },
  { name: 'Interview Roast', slug: 'interview',      icon: 'brain',    color: '#047857', description: 'Tricky interview questions, clever answers, HR humor' },
  { name: 'Mind Benders',    slug: 'mind-benders',   icon: 'lightbulb',color: '#b45309', description: 'Brain teasers, paradoxes, and "wait... what?" moments' },
  { name: 'Viral Challenge', slug: 'viral-challenge',icon: 'trending', color: '#dc2626', description: 'Social media challenges, dares, viral trends' },
  { name: 'Life Hacks',      slug: 'life-hacks',     icon: 'zap',      color: '#15803d', description: 'Smart shortcuts, productivity tricks, everyday wins' },
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
  let added = 0;
  for (const cat of DEFAULT_CATEGORIES) {
    const exists = await repo.findOne({ where: { slug: cat.slug } as any });
    if (!exists) { await repo.save(repo.create(cat as any)); added++; }
  }
  if (added > 0) console.log(`[seeder] ✅ ${added} new content categories added`);
}
