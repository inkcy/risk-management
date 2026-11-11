import { query } from '@/lib/db';

export async function ensureSupervisorCredentials() {
  await query(`CREATE TABLE IF NOT EXISTS risk_unit_supervisors (
    unit_id INTEGER PRIMARY KEY REFERENCES risk_units(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await query('ALTER TABLE risk_unit_supervisors ADD COLUMN IF NOT EXISTS reviewer_password_hash TEXT');
  await query('ALTER TABLE risk_unit_supervisors ALTER COLUMN password_hash DROP NOT NULL');
}
