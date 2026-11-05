import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { calculateMatrix } from '@/lib/matrix-analysis';
import { analyzeMatrixRisks } from '@/lib/matrix-ai';

export const maxDuration = 60;
export async function POST(request: NextRequest) {
  const auth = await requireRole('viewer');
  if (!auth.ok) return auth.response;
  let rows;
  try {
    const raw = await request.text();
    if (raw.length > 80000) throw new Error('ข้อมูลยาวเกินกำหนด กรุณาส่งไม่เกิน 50 รายการ');
    const body = JSON.parse(raw);
    rows = calculateMatrix(body.items, body.options);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }
  if (!process.env.GEMINI_API_KEY?.trim()) return NextResponse.json({ rows, advice: [], aiError: 'บริการ AI ยังไม่ได้เปิดใช้งาน ผลคำนวณ Risk Matrix ยังใช้งานได้' }, { headers: { 'Cache-Control': 'no-store' } });
  try {
    return NextResponse.json({ rows, advice: await analyzeMatrixRisks(rows) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('matrix AI analysis failed', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ rows, advice: [], aiError: 'วิเคราะห์ด้วย AI ไม่สำเร็จ กรุณาลองอีกครั้ง ผลคำนวณ Risk Matrix ด้านล่างยังใช้งานได้' }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
