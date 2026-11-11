import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { calculateMatrix } from '@/lib/matrix-analysis';
import { normalizeExportNotes, normalizeTreatments } from '@/lib/matrix-treatment';
import { buildMatrixPdf } from '@/lib/matrix-pdf';

export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: NextRequest) {
  const auth = await requireRole('viewer');
  if (!auth.ok) return auth.response;
  let body, rows, treatments, notes;
  try {
    const raw = await request.text();
    if (raw.length > 500000) throw new Error('ข้อมูลส่งออกยาวเกินกำหนด');
    body = JSON.parse(raw);
    rows = calculateMatrix(body.items, body.options);
    treatments = normalizeTreatments(rows.map(row => row.id), body.treatments);
    notes = normalizeExportNotes(rows.map(row => row.id), body.advice ?? []);
    if (typeof body.unitName !== 'string' || body.unitName.length > 200) throw new Error('ชื่อหน่วยงานยาวเกินกำหนด');
  } catch (error) {
    return NextResponse.json({error: error instanceof Error ? error.message : 'ข้อมูลไม่ถูกต้อง'}, {status: 400});
  }
  try {
    const file = await buildMatrixPdf(rows, treatments, body.options, body.unitName.trim(), notes);
    return new Response(new Uint8Array(file), {headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Risk_Profile_${body.options.year}_Q${body.options.quarter}.pdf"`,
      'Cache-Control': 'no-store',
    }});
  } catch (error) {
    console.error('matrix pdf export failed', error);
    return NextResponse.json({error: 'สร้างไฟล์ PDF ไม่สำเร็จ กรุณาลดจำนวนรายการหรือย่อมาตรการแล้วลองใหม่'}, {status: 500});
  }
}
