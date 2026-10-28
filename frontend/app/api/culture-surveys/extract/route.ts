import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { extractCultureSurvey } from '@/lib/cultureSurveyExtract';

export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  const auth = await requireRole('admin');
  if (!auth.ok) return auth.response;
  try {
    const form = await request.formData();
    const file = form.get('report');
    const year = Number(form.get('year'));
    if (!Number.isInteger(year) || year < 2568 || year > 2700) return NextResponse.json({ error: 'กรุณากรอกปี พ.ศ. ก่อนอ่านไฟล์' }, { status: 400 });
    if (!(file instanceof File) || !file.size || file.size > 3 * 1024 * 1024) return NextResponse.json({ error: 'กรุณาเลือกไฟล์ขนาดไม่เกิน 3 MB' }, { status: 400 });
    const type = file.name.toLowerCase().match(/\.(pptx|pdf|docx)$/)?.[1] as 'pptx' | 'pdf' | 'docx' | undefined;
    if (!type) return NextResponse.json({ error: 'รองรับเฉพาะ PPTX, PDF และ DOCX' }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    if (type === 'pdf' ? buffer.subarray(0, 5).toString() !== '%PDF-' : buffer.subarray(0, 4).toString('hex') !== '504b0304') return NextResponse.json({ error: 'ชนิดไฟล์ไม่ถูกต้อง' }, { status: 400 });
    const fields = await extractCultureSurvey(buffer, type, year);
    return NextResponse.json({ fields });
  } catch (error) {
    console.error('culture survey extraction failed:', error);
    return NextResponse.json({ error: 'ไม่สามารถอ่านไฟล์นี้ได้ กรุณาตรวจสอบไฟล์หรือกรอกข้อมูลเอง' }, { status: 422 });
  }
}
