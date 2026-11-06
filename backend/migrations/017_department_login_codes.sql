CREATE TABLE IF NOT EXISTS department_login_codes (
  id SERIAL PRIMARY KEY,
  code_lookup TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  source_names JSONB NOT NULL DEFAULT '[]'::jsonb,
  user_id INTEGER UNIQUE REFERENCES users(id),
  active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS department_login_attempts (
  attempt_key TEXT PRIMARY KEY,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
