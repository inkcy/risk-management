ALTER TABLE announcements ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS publish_at TIMESTAMPTZ;
ALTER TABLE announcements ALTER COLUMN image_data DROP NOT NULL;
UPDATE announcements SET publish_at = created_at WHERE publish_at IS NULL;
ALTER TABLE announcements ALTER COLUMN publish_at SET DEFAULT now();
ALTER TABLE announcements ALTER COLUMN publish_at SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_announcements_publish_at ON announcements(publish_at DESC);
