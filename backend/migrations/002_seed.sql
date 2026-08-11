-- Seed data — based on the original RCA example (IR 2503000003)

INSERT INTO units (code, name_th) VALUES
  ('MICU',     'MICU / CCU'),
  ('SURG',     'Ward ศัลยกรรม'),
  ('MED',      'Ward อายุรกรรม'),
  ('ICU',      'ICU'),
  ('OR',       'ห้องผ่าตัด'),
  ('BB',       'ธนาคารเลือด'),
  ('ER',       'ห้องฉุกเฉิน')
ON CONFLICT (code) DO NOTHING;

INSERT INTO incidents (ir_code, occurred_at, title, description, unit_id, category, severity, rca_status, reported_by)
VALUES
  ('IR 2503000003', '2025-02-18 10:48+07', 'ให้เลือดผิดคน ผิดหมู่เลือด', 'Platelet concentrate วางใกล้กันโดยไม่แยก ขาดการบ่งชี้ตัวผู้ป่วยและไม่มี double check',
    (SELECT id FROM units WHERE code='MICU'), 'blood', 'E', 'done', 'พยาบาลเวร'),
  ('IR 2504000021', '2025-04-04 14:30+07', 'ให้ยา Insulin ผิดขนาด', 'High Alert Drug — เข้าใจผิดเรื่อง unit',
    (SELECT id FROM units WHERE code='ICU'), 'medication', 'D', 'in_progress', 'พยาบาลเวร'),
  ('IR 2505000045', '2025-05-12 02:15+07', 'ผู้ป่วยพลัดตกจากเตียง', 'ผู้สูงอายุ 78 ปี ลุกไปห้องน้ำกลางดึก',
    (SELECT id FROM units WHERE code='SURG'), 'fall', 'C', 'done', 'พยาบาลเวรดึก'),
  ('IR 2505000072', '2025-05-20 09:10+07', 'ไม่ได้ระบุตัวผู้ป่วยก่อนให้ยา (Near miss)', 'หัวหน้าทีมตรวจพบ — ยังไม่ได้ให้',
    (SELECT id FROM units WHERE code='MED'), 'medication', 'B', 'done', 'พยาบาลเวร'),
  ('IR 2502000009', '2025-02-03 18:45+07', 'ผู้ป่วย CAPD มีภาวะ Septic shock หลัง admit', 'Septic shock with HHS',
    (SELECT id FROM units WHERE code='MICU'), 'other', 'F', 'done', 'แพทย์เวร')
ON CONFLICT (ir_code) DO NOTHING;

INSERT INTO rca_cases (incident_id, summary, hro_sensitivity, hro_deference, hro_reluctance, hro_preoccupation, hro_resilience, completed_at)
SELECT id, 'การให้เลือดผิดคน เกิดจากการตรวจสอบ Blood number เพียงอย่างเดียว ไม่ได้บ่งชี้ตัวผู้ป่วยและไม่มี double check',
  25, 20, 35, 70, 80, '2025-03-15+07'
FROM incidents WHERE ir_code = 'IR 2503000003'
ON CONFLICT DO NOTHING;

-- RCA timeline for IR 2503000003
WITH rca AS (SELECT rc.id FROM rca_cases rc JOIN incidents i ON rc.incident_id=i.id WHERE i.ir_code='IR 2503000003')
INSERT INTO rca_timeline (rca_case_id, occurred_at, event_title, event_detail, severity_tag, sort_order)
SELECT rca.id, t.occurred_at::timestamptz, t.event_title, t.event_detail, t.severity_tag, t.sort_order
FROM rca, (VALUES
  ('2025-02-18 08:10+07'::text, 'Lab รายงาน CBC', 'Hct 26% · PLT 13k · INR 1.5', 'ok', 1),
  ('2025-02-18 08:48+07', 'แพทย์ order เลือดทั้ง 2 ราย', 'FFP · LPPC · Cryo · LPRC ผู้ป่วย 1 / PLT ผู้ป่วย 2', 'ok', 2),
  ('2025-02-18 10:19+07', 'รับเลือดทั้ง 2 ราย วางใกล้กัน', 'ผู้ช่วยพยาบาลวางเลือดรวมกันหลังเคาน์เตอร์ ไม่แยกออก', 'warn', 3),
  ('2025-02-18 10:48+07', 'ตรวจสอบ Blood number เท่านั้น', 'ไม่ตรวจชื่อผู้ป่วยกับป้ายคล้องเลือด ไม่มี double check', 'bad', 4),
  ('2025-02-18 11:00+07', 'ให้เลือดผิดคน', 'ไม่คล้องป้ายหมู่เลือด ไม่บ่งชี้ตัวผู้ป่วยที่ป้ายข้อมือ', 'bad', 5),
  ('2025-02-18 11:15+07', 'หัวหน้าทีมตรวจพบ หยุดทันที', 'รายงานแพทย์ เจาะเลือดตรวจ ส่งถุงคืนธนาคารเลือด', 'ok', 6)
) t(occurred_at, event_title, event_detail, severity_tag, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM rca_timeline);

-- Causes (Swiss Cheese)
WITH rca AS (SELECT rc.id FROM rca_cases rc JOIN incidents i ON rc.incident_id=i.id WHERE i.ir_code='IR 2503000003')
INSERT INTO rca_causes (rca_case_id, category, label, is_hot)
SELECT rca.id, c.category, c.label, c.is_hot
FROM rca, (VALUES
  ('people','ภาระงานมาก',true),
  ('people','พยาบาลต่างหน่วย',true),
  ('people','ไม่รายงานตัว',true),
  ('system','ไม่มี barcode scan',true),
  ('system','ขั้นตอนไม่ชัดเจน',true),
  ('system','ไม่กด HIS รับเลือด',false),
  ('environment','วางเลือด 2 รายรวมกัน',true),
  ('environment','ขาดป้ายแยก',false),
  ('management','ไม่กำหนดนโยบายชัด',true),
  ('management','มอบหมายงานไม่ชัด',true)
) c(category, label, is_hot)
WHERE NOT EXISTS (SELECT 1 FROM rca_causes);

-- Actions for IR 2503000003
INSERT INTO actions (incident_id, title, description, owner, due_date, status, progress)
SELECT i.id, a.title, a.description, a.owner, a.due_date::date, a.status, a.progress
FROM incidents i, (VALUES
  ('แก้ไข SOP HP-COP-QSH-005', 'ระเบียบรับ-จ่ายเลือด เพิ่มขั้นตอนแยกกระติกเลือดและแจ้งพยาบาล', 'คณะกรรมการ QPS', '2025-06-30', 'done', 100),
  ('Double identification บังคับ', 'พยาบาล 2 คน ตรวจชื่อ HN หมู่เลือด Unit number ป้ายข้อมือ', 'หัวหน้าฝ่ายการพยาบาล', '2025-03-31', 'done', 100),
  ('ปรับ Performance Check List', 'เพิ่มการบ่งชี้ตัวผู้ป่วยข้างเตียง สอดคล้อง IPSG-1', 'คณะกรรมการ QPS', '2025-04-30', 'done', 100),
  ('ระบบสแกนบาร์โค้ดเลือด', 'ป้องกันให้เลือดผิดคนด้วยระบบอัตโนมัติ ลด human error', 'ฝ่าย IT / BME', '2025-12-31', 'in_progress', 40),
  ('นโยบายมอบหมายงานข้ามหน่วย', 'ต้องได้รับมอบหมายจากหัวหน้าทีมก่อนทำกิจกรรม High Risk', 'ผู้อำนวยการพยาบาล', '2025-04-30', 'done', 100),
  ('กระติกขนส่งเลือดมาตรฐาน', 'มี ice pack และเทอร์โมมิเตอร์ Calibrate แล้ว', 'BME', '2025-09-30', 'planned', 0)
) a(title, description, owner, due_date, status, progress)
WHERE i.ir_code = 'IR 2503000003'
  AND NOT EXISTS (SELECT 1 FROM actions);

INSERT INTO risk_register (title, likelihood, consequence, category, note)
SELECT * FROM (VALUES
  ('การให้เลือดผิดคน / ผิดหมู่', 3, 5, 'blood', 'จากเคส IR 2503000003'),
  ('ยา High Alert ผิดขนาด', 4, 4, 'medication', 'มีอุบัติการณ์ซ้ำในไตรมาส'),
  ('ผู้ป่วยพลัดตกจากเตียง', 4, 2, 'fall', 'พบบ่อยใน ward ผู้สูงอายุ'),
  ('การสื่อสารส่งต่อผิดพลาด', 5, 4, 'communication', 'จุดเชื่อม ER → ward'),
  ('ติดเชื้อจากหัตถการ', 3, 3, 'procedure', 'IPC')
) AS v(title, likelihood, consequence, category, note)
WHERE NOT EXISTS (SELECT 1 FROM risk_register);
