BEGIN;
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_severity_check;
ALTER TABLE incidents ADD CONSTRAINT incidents_severity_check
  CHECK (severity IN ('A','B','C','D','E','F','G','H','I','1','2','3','4','5'));
COMMIT;
