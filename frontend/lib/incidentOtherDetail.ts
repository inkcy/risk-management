import { query } from '@/lib/db';

export async function ensureIncidentOtherDetail() {
  await query('ALTER TABLE incidents ADD COLUMN IF NOT EXISTS other_detail TEXT');
}
