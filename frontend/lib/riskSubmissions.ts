import { query } from '@/lib/db';

export type RiskSubmission = { unit_id: number; year: number; quarter: number; submitted_at: string };

export async function ensureRiskSubmissions() {
  await query(`CREATE TABLE IF NOT EXISTS risk_profile_submissions (
    unit_id INTEGER NOT NULL REFERENCES risk_units(id) ON DELETE CASCADE,
    year INTEGER NOT NULL CHECK (year BETWEEN 2500 AND 2700),
    quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    submitted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    PRIMARY KEY (unit_id, year, quarter)
  )`);
}

export async function loadRiskSubmissions(unitId: number | null): Promise<RiskSubmission[]> {
  await ensureRiskSubmissions();
  return (await query<RiskSubmission>(`SELECT unit_id, year, quarter, submitted_at::text
    FROM risk_profile_submissions WHERE ($1::integer IS NULL OR unit_id=$1)`, [unitId])).rows;
}
