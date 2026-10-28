CREATE TABLE IF NOT EXISTS risk_units (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS risk_unit_sessions (
  token_hash TEXT PRIMARY KEY,
  unit_id INTEGER NOT NULL REFERENCES risk_units(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS unit_risks (
  id SERIAL PRIMARY KEY,
  unit_id INTEGER NOT NULL REFERENCES risk_units(id) ON DELETE CASCADE,
  year INTEGER NOT NULL CHECK (year BETWEEN 2500 AND 2700),
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  category TEXT NOT NULL CHECK (category IN ('clinical', 'nonclinical')),
  title TEXT NOT NULL,
  occurrence_count INTEGER NOT NULL CHECK (occurrence_count BETWEEN 0 AND 10000000),
  impact INTEGER NOT NULL CHECK (impact BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_unit_risks_unit_period ON unit_risks(unit_id, year, quarter);
