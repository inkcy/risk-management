-- ผู้ใช้ระบบ — ยืนยันตัวตนผ่าน Google Sign-In จึงไม่เก็บรหัสผ่านเอง
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  google_sub    TEXT UNIQUE,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT,
  picture       TEXT,
  role          TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin','editor','viewer')),
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- session เก็บฝั่ง server เพื่อให้เพิกถอนได้ทันที (ปิดบัญชี = session ตายทันที)
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  user_agent TEXT,
  ip         TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);

-- ร่องรอยการใช้งาน — ข้อมูลผู้ป่วยต้องตรวจสอบย้อนหลังได้ว่าใครทำอะไรเมื่อไหร่
CREATE TABLE IF NOT EXISTS audit_log (
  id         BIGSERIAL PRIMARY KEY,
  at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_email TEXT,
  action     TEXT NOT NULL,
  entity     TEXT,
  entity_id  TEXT,
  detail     JSONB,
  ip         TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_at ON audit_log (at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log (user_id, at DESC);
