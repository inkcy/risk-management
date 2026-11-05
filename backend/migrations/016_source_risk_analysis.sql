ALTER TABLE unit_risks ADD COLUMN IF NOT EXISTS source_title TEXT;
ALTER TABLE unit_risks ADD COLUMN IF NOT EXISTS source_analysis_level TEXT
  CHECK (source_analysis_level IN ('green','yellow','orange','red'));
