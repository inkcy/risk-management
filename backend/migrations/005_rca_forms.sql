-- ร่างแบบฟอร์ม RCA (FM-QPS-QSH-002) ที่บันทึกไว้บนเซิร์ฟเวอร์
-- เก็บทั้งฟอร์มเป็น JSONB เพราะโครงสร้างฟอร์มยังปรับได้เรื่อย ๆ ไม่ควรผูกเป็นคอลัมน์ตายตัว
-- คอลัมน์ด้านบนคัดมาเฉพาะที่ต้องใช้ค้นหา/แสดงในรายการ
CREATE TABLE IF NOT EXISTS rca_forms (
  id         SERIAL PRIMARY KEY,
  rm_no      TEXT,
  subject    TEXT,
  unit       TEXT,
  ir_code    TEXT,
  data       JSONB NOT NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rca_forms_updated ON rca_forms (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_rca_forms_ir ON rca_forms (ir_code);
