import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { audit, requireReadAccess, requireRole } from '@/lib/auth';
import { loadCauti } from '@/lib/queries';

export async function GET() {
  const denied = await requireReadAccess();
  if (denied) return denied;
  const result = await loadCauti();
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const auth = await requireRole('editor');
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json() as Record<string, unknown>;
    const { bed, patient_name, age, hn, diagnosis, ward, inserted_at, plan_off_date, note } = body;
    if (!bed || !patient_name || !inserted_at) {
      return NextResponse.json({ error: 'bed, patient_name, inserted_at are required' }, { status: 400 });
    }
    const { rows } = await query(
      `INSERT INTO cauti_patients (bed, patient_name, age, hn, diagnosis, ward, inserted_at, plan_off_date, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [bed, patient_name, age ?? null, hn ?? null, diagnosis ?? null, ward ?? null,
       inserted_at, plan_off_date ?? null, note ?? null],
    );
    // ไม่บันทึกชื่อ/HN ลง audit detail — เก็บแค่ที่พอชี้เป้าได้ ตัวข้อมูลเต็มอยู่ในตารางหลักแล้ว
    await audit(auth.user, 'cauti.create', 'cauti_patient', rows[0].id, { bed, ward: ward ?? null });
    return NextResponse.json({ patient: rows[0] }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 });
  }
}
