import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { audit, requireReadAccess, requireRole } from '@/lib/auth';
import { envelope } from '@/lib/envelope';
import { demoIncidents } from '@/lib/demo';
import type { Incident } from '@/lib/types';
import { riskUnitDirectory } from '@/lib/riskUnitDirectory';
import { incidentCategories } from '@/lib/incident-categories';

const CATEGORIES = incidentCategories.map(category => category.value);
const SEVERITIES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] as const;

export async function GET() {
  const denied = await requireReadAccess();
  if (denied) return denied;
  const result = await envelope<Incident[]>(async () => {
    const { rows } = await query<Incident>(`
      SELECT i.id, i.ir_code, i.occurred_at, i.title, i.description,
             i.unit_id, u.name_th AS unit_name,
             i.category, i.severity, i.rca_status, i.reported_by
      FROM incidents i
      LEFT JOIN units u ON u.id = i.unit_id
      ORDER BY i.occurred_at DESC
    `);
    return rows;
  }, demoIncidents, []);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const auth = await requireRole('editor');
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json() as Record<string, unknown>;
    const { ir_code, occurred_at, title, description, unit_id, unit_code, category, severity } = body;
    if (
      typeof ir_code !== 'string' || !ir_code.trim() ||
      typeof occurred_at !== 'string' || !occurred_at.trim() ||
      typeof title !== 'string' || !title.trim() ||
      typeof category !== 'string' || !CATEGORIES.includes(category as (typeof CATEGORIES)[number]) ||
      typeof severity !== 'string' || !SEVERITIES.includes(severity as (typeof SEVERITIES)[number])
    ) {
      return NextResponse.json({ error: 'ข้อมูลรายงานไม่ครบหรือมีค่าไม่ถูกต้อง' }, { status: 400 });
    }
    if (Number.isNaN(Date.parse(occurred_at))) {
      return NextResponse.json({ error: 'วันที่หรือเวลาเกิดเหตุไม่ถูกต้อง' }, { status: 400 });
    }

    let resolvedUnitId = typeof unit_id === 'number' && Number.isInteger(unit_id) ? unit_id : null;
    if (resolvedUnitId === null && typeof unit_code === 'string' && unit_code.trim()) {
      const code = unit_code.trim();
      const name = code.startsWith('RP:') ? code.slice(3) : null;
      if (name !== null && !riskUnitDirectory.some(unit => unit === name)) {
        return NextResponse.json({ error: 'ไม่พบหน่วยงานที่เลือก' }, { status: 400 });
      }
      // Provision official Risk Profile units on first use, without a separate seed step.
      const unit = name !== null
        ? await query<{ id: number }>(
          `INSERT INTO units (code, name_th) VALUES ($1, $2)
           ON CONFLICT (code) DO UPDATE SET name_th = EXCLUDED.name_th RETURNING id`, [code, name],
        )
        : await query<{ id: number }>('SELECT id FROM units WHERE code = $1', [code]);
      if (unit.rows.length === 0) {
        return NextResponse.json({ error: 'ไม่พบหน่วยงานที่เลือก' }, { status: 400 });
      }
      resolvedUnitId = unit.rows[0].id;
    }
    const { rows } = await query<Incident>(
      `INSERT INTO incidents (ir_code, occurred_at, title, description, unit_id, category, severity, reported_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        ir_code.trim(), occurred_at, title.trim(),
        typeof description === 'string' && description.trim() ? description.trim() : null,
        resolvedUnitId, category, severity, auth.user.name ?? auth.user.email,
      ],
    );
    await audit(auth.user, 'incident.create', 'incident', rows[0].id, { ir_code: ir_code.trim(), severity });
    return NextResponse.json({ incident: rows[0] }, { status: 201 });
  } catch (err) {
    if ((err as { code?: string }).code === '23505') {
      return NextResponse.json({ error: 'รหัสอุบัติการณ์ซ้ำ กรุณาลองบันทึกอีกครั้ง' }, { status: 409 });
    }
    console.error('create incident failed:', err);
    return NextResponse.json({ error: 'บันทึกรายงานไม่สำเร็จ' }, { status: 500 });
  }
}
