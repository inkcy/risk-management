-- หน่วยงานอ้างอิงที่แบบรายงานอุบัติการณ์ใช้งานจริง
-- ต้องมากับ migration ไม่ใช่ demo seed เพื่อให้ฐานข้อมูลใหม่บันทึกรายงานได้ทันที
INSERT INTO units (code, name_th) VALUES
  ('MICU', 'MICU / CCU'),
  ('MED',  'Ward อายุรกรรม'),
  ('SURG', 'Ward ศัลยกรรม'),
  ('ICU',  'ICU'),
  ('OR',   'ห้องผ่าตัด'),
  ('BB',   'ธนาคารเลือด'),
  ('ER',   'ห้องฉุกเฉิน')
ON CONFLICT (code) DO UPDATE SET name_th = EXCLUDED.name_th;
