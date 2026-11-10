import { query } from '@/lib/db';

export async function ensureSupervisorCredentials() {
  await query(`CREATE TABLE IF NOT EXISTS risk_unit_supervisors (
    unit_id INTEGER PRIMARY KEY REFERENCES risk_units(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
}
