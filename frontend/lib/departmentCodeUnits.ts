import { query } from '@/lib/db';

let initialized: Promise<void> | undefined;
export function ensureDepartmentCodeUnits() {
  if (initialized) return initialized;
  initialized = (async () => {
  await query(`CREATE TABLE IF NOT EXISTS department_code_units (
    code_id INTEGER NOT NULL REFERENCES department_login_codes(id) ON DELETE CASCADE,
    unit_id INTEGER NOT NULL REFERENCES risk_units(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (code_id, unit_id)
  )`);
  await query(`CREATE TABLE IF NOT EXISTS department_access_policy (
    id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id), enforced BOOLEAN NOT NULL DEFAULT false
  )`);
  await query('INSERT INTO department_access_policy (id) VALUES (true) ON CONFLICT DO NOTHING');
  await query('ALTER TABLE department_login_codes ADD COLUMN IF NOT EXISTS is_supervisor BOOLEAN NOT NULL DEFAULT false');
  })().catch(error => { initialized = undefined; throw error; });
  return initialized;
}
