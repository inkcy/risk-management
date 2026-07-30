import { NextRequest, NextResponse } from 'next/server';
import { dbConfigured, query } from '@/lib/db';
import { loadCauti } from '@/lib/queries';

export async function GET() {
  const result = await loadCauti();
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  if (!dbConfigured()) {
    return NextResponse.json({ error: 'Database not configured — cannot save patient' }, { status: 503 });
  }
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
    return NextResponse.json({ patient: rows[0] }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
