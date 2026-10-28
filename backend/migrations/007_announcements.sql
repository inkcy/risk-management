-- ประกาศบนหน้าแดชบอร์ด: เก็บรูปเป็น data URL เพื่อให้ใช้งานได้โดยไม่ต้องพึ่งบริการเก็บไฟล์ภายนอก
CREATE TABLE IF NOT EXISTS announcements (
  id           SERIAL PRIMARY KEY,
  title        TEXT,
  image_data   TEXT NOT NULL,
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);
