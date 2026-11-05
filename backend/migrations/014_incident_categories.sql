-- Keep existing clinical codes and accept the four general-risk categories.
BEGIN;
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_category_check;
ALTER TABLE incidents ADD CONSTRAINT incidents_category_check CHECK (category IN (
  'blood', 'medication', 'fall', 'procedure', 'communication', 'other',
  'traffic', 'environment', 'natural_disaster', 'corruption'
));
COMMIT;
