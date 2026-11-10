import { dbConfigured, getPool, query } from './db';

export type RcaLesson = { id: number; title: string; image: string; year: number | null };
const defaults: RcaLesson[] = [
  { id: 1, image: '/rca-lesson-catheter.png', title: 'แนวทางการป้องกันการถอดสายสวนหลอดเลือดผิดตำแหน่ง', year: null },
  { id: 2, image: '/rca-lesson-childbirth.png', title: 'แนวทางแก้ไขและป้องกันสิ่งตกค้างในช่องคลอดหลังการคลอด', year: null },
];

export async function ensureRcaLessons() {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('rca_lessons_init'))");
    await client.query('CREATE TABLE IF NOT EXISTS rca_lessons (id SERIAL PRIMARY KEY, title TEXT NOT NULL, image TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())');
    await client.query('ALTER TABLE rca_lessons ADD COLUMN IF NOT EXISTS year INTEGER');
    await client.query('CREATE TABLE IF NOT EXISTS rca_lessons_initialized (id INTEGER PRIMARY KEY CHECK (id = 1))');
    const initialized = await client.query('INSERT INTO rca_lessons_initialized (id) VALUES (1) ON CONFLICT DO NOTHING RETURNING id');
    if (initialized.rowCount) {
      for (const lesson of defaults) await client.query('INSERT INTO rca_lessons (title, image) VALUES ($1, $2)', [lesson.title, lesson.image]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function loadRcaLessons(): Promise<RcaLesson[]> {
  if (!dbConfigured()) return defaults;
  await ensureRcaLessons();
  return (await query<RcaLesson>('SELECT id, title, image, year FROM rca_lessons ORDER BY year DESC NULLS LAST, id')).rows;
}
