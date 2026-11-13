-- A credential is granted access only to explicitly assigned departments.
-- Existing credentials have no implicit access until a trusted mapping is supplied.
CREATE TABLE IF NOT EXISTS department_code_units (
  code_id INTEGER NOT NULL REFERENCES department_login_codes(id) ON DELETE CASCADE,
  unit_id INTEGER NOT NULL REFERENCES risk_units(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (code_id, unit_id)
);
CREATE INDEX IF NOT EXISTS idx_department_code_units_unit ON department_code_units(unit_id);
CREATE TABLE IF NOT EXISTS department_access_policy (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  enforced BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO department_access_policy (id) VALUES (true) ON CONFLICT DO NOTHING;
