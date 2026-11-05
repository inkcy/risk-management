BEGIN;
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_category_check;
ALTER TABLE incidents ADD CONSTRAINT incidents_category_check CHECK (category IN (
  'blood', 'medication', 'fall', 'procedure', 'communication', 'other',
  'traffic', 'environment', 'natural_disaster', 'corruption',
  'complaint_distress', 'complaint_prevention', 'complaint_treatment',
  'complaint_clarification', 'complaint_discipline', 'complaint_compensation',
  'complaint_social_support'
));
COMMIT;
