import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { audit, requireRole } from '@/lib/auth';
import { envelope } from '@/lib/envelope';
import { demoIncidents } from '@/lib/demo';
import type { Incident } from '@/lib/types';

export async function GET() {
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
  }, demoIncidents);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const auth = await requireRole('editor');
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json() as Record<string, unknown>;
    const { ir_code, occurred_at, title, description, unit_id, category, severity, reported_by } = body;
    if (!ir_code || !occurred_at || !title || !category || !severity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const { rows } = await query<Incident>(
      `INSERT INTO incidents (ir_code, occurred_at, title, description, unit_id, category, severity, reported_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [ir_code, occurred_at, title, description ?? null, unit_id ?? null, category, severity, reported_by ?? null],
    );
    await audit(auth.user, 'incident.create', 'incident', rows[0].id, { ir_code, severity });
    return NextResponse.json({ incident: rows[0] }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
