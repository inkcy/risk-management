-- Hospital Risk Management — Initial schema
-- Postgres 15+ (Neon / Vercel Postgres)

CREATE TABLE IF NOT EXISTS units (
  id           SERIAL PRIMARY KEY,
  code         TEXT NOT NULL UNIQUE,
  name_th      TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incidents (
  id             SERIAL PRIMARY KEY,
  ir_code        TEXT NOT NULL UNIQUE,
  occurred_at    TIMESTAMPTZ NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT,
  unit_id        INTEGER REFERENCES units(id),
  category       TEXT NOT NULL CHECK (category IN (
                   'blood','medication','fall','procedure','communication','other'
                 )),
  severity       CHAR(1) NOT NULL CHECK (severity IN ('A','B','C','D','E','F','G','H','I')),
  rca_status     TEXT NOT NULL DEFAULT 'pending'
                 CHECK (rca_status IN ('pending','in_progress','done','not_required')),
  reported_by    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidents_occurred_at ON incidents(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);

CREATE TABLE IF NOT EXISTS rca_cases (
  id             SERIAL PRIMARY KEY,
  incident_id    INTEGER NOT NULL UNIQUE REFERENCES incidents(id) ON DELETE CASCADE,
  summary        TEXT,
  hro_sensitivity      INTEGER CHECK (hro_sensitivity BETWEEN 0 AND 100),
  hro_deference        INTEGER CHECK (hro_deference BETWEEN 0 AND 100),
  hro_reluctance       INTEGER CHECK (hro_reluctance BETWEEN 0 AND 100),
  hro_preoccupation    INTEGER CHECK (hro_preoccupation BETWEEN 0 AND 100),
  hro_resilience       INTEGER CHECK (hro_resilience BETWEEN 0 AND 100),
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rca_timeline (
  id             SERIAL PRIMARY KEY,
  rca_case_id    INTEGER NOT NULL REFERENCES rca_cases(id) ON DELETE CASCADE,
  occurred_at    TIMESTAMPTZ NOT NULL,
  event_title    TEXT NOT NULL,
  event_detail   TEXT,
  severity_tag   TEXT CHECK (severity_tag IN ('ok','warn','bad')) DEFAULT 'ok',
  sort_order     INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_timeline_case ON rca_timeline(rca_case_id, sort_order);

CREATE TABLE IF NOT EXISTS rca_causes (
  id             SERIAL PRIMARY KEY,
  rca_case_id    INTEGER NOT NULL REFERENCES rca_cases(id) ON DELETE CASCADE,
  category       TEXT NOT NULL CHECK (category IN ('people','system','environment','management')),
  label          TEXT NOT NULL,
  is_hot         BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS actions (
  id             SERIAL PRIMARY KEY,
  incident_id    INTEGER REFERENCES incidents(id) ON DELETE SET NULL,
  title          TEXT NOT NULL,
  description    TEXT,
  owner          TEXT,
  due_date       DATE,
  status         TEXT NOT NULL DEFAULT 'planned'
                 CHECK (status IN ('planned','in_progress','done','overdue')),
  progress       INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_actions_status ON actions(status);

CREATE TABLE IF NOT EXISTS risk_register (
  id             SERIAL PRIMARY KEY,
  title          TEXT NOT NULL,
  likelihood     INTEGER NOT NULL CHECK (likelihood BETWEEN 1 AND 5),
  consequence    INTEGER NOT NULL CHECK (consequence BETWEEN 1 AND 5),
  category       TEXT,
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
