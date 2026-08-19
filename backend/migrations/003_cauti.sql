-- CAUTI QuickAlert: ติดตามผู้ป่วยใส่สายสวนปัสสาวะ (Foley catheter)
CREATE TABLE IF NOT EXISTS cauti_patients (
  id            SERIAL PRIMARY KEY,
  bed           TEXT NOT NULL,
  patient_name  TEXT NOT NULL,
  age           INTEGER,
  hn            TEXT,
  diagnosis     TEXT,
  ward          TEXT,
  inserted_at   DATE NOT NULL,
  plan_off_date DATE,
  removed_at    DATE,
  outcome       TEXT,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cauti_active
  ON cauti_patients (inserted_at)
  WHERE removed_at IS NULL;
