-- Earlier submissions have no historical snapshot and remain NULL.
ALTER TABLE IF EXISTS risk_profile_submissions ADD COLUMN IF NOT EXISTS snapshot JSONB;
