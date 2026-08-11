-- CAUTI QuickAlert: ติดตามผู้ป่วยใส่สายสวนปัสสาวะ (Foley catheter)
CREATE TABLE IF NOT EXISTS cauti_patients (
  id            SERIAL PRIMARY KEY,
  bed           TEXT NOT NULL,
  patient_name  TEXT NOT NULL,
  age           INTEGER,
  hn            TEXT,
  diagnosis     TEXT,
  ward          TEXT,
  inserted_at   DATE NOT NULL,
  plan_off_date DATE,
  removed_at    DATE,
  outcome       TEXT,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cauti_active
  ON cauti_patients (inserted_at)
  WHERE removed_at IS NULL;

-- db:migrate รันไฟล์นี้ทุกครั้ง — ใส่ข้อมูลตัวอย่างเฉพาะตอนตารางยังว่าง
-- (ON CONFLICT DO NOTHING ไม่ช่วย เพราะตารางนี้ไม่มี unique key ทำให้รัน migrate ซ้ำแล้วข้อมูลซ้ำ)
INSERT INTO cauti_patients (bed, patient_name, age, hn, diagnosis, ward, inserted_at, plan_off_date, removed_at, outcome, note)
SELECT * FROM (VALUES
  ('19A-1', 'สมชาย กิมนรากร',   49, 'HN001234', 'SBP with AKI',           '19A',   '2025-06-01'::date, '2025-06-04'::date, NULL::date,         'death',  'ผู้ป่วยเสียชีวิตก่อน off F/C'),
  ('19A-2', 'ประจิตร พรหมสรัย', 44, 'HN001235', 'Alcoholic ketoacidosis', '19A',   '2025-06-01',       '2025-06-04',       '2025-06-03'::date, 'removed', 'off ตามแผน'),
  ('19A-3', 'วิเชียร ธรรมสุ',    60, 'HN001236', 'Rt.MCA infarction',      '19A',   '2025-06-02',       '2025-06-05',       NULL,               'death',  ''),
  ('19A-4', 'สุนิสา แก้วใส',     71, 'HN001237', 'CAUTI prevention obs',   '19A',   '2025-05-29',       '2025-06-01',       NULL,               '',       'ใส่เกิน 3 วัน — ทบทวนแผน off')
) AS v(bed, patient_name, age, hn, diagnosis, ward, inserted_at, plan_off_date, removed_at, outcome, note)
WHERE NOT EXISTS (SELECT 1 FROM cauti_patients);
