-- Link department credentials to the existing application session and role system.
ALTER TABLE users ADD COLUMN IF NOT EXISTS risk_unit_id INTEGER UNIQUE REFERENCES risk_units(id);
