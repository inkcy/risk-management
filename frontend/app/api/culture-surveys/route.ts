import { NextRequest, NextResponse } from 'next/server';
import { audit, requireRole } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  const auth = await requireRole('admin');
  if (!auth.ok) return auth.response;
  try {
    const form = await request.formData();
    const required = ['year', 'excellent', 'very_good', 'acceptable', 'poor', 'falling', 'excellent_pct', 'very_good_pct'];
    if (required.some(key => typeof form.get(key) !== 'string' || !String(form.get(key)).trim())) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลทุกช่อง' }, { status: 400 });
    }
    const year = Number(form.get('year'));
    const counts = ['excellent', 'very_good', 'acceptable', 'poor', 'falling'].map(key => Number(form.get(key)));
    const excellentPct = Number(form.get('excellent_pct'));
    const veryGoodPct = Number(form.get('very_good_pct'));
    const report = form.get('report');
    if (!Number.isInteger(year) || year < 2568 || year > 2700 || counts.some(n => !Number.isInteger(n) || n < 0 || n > 10000000) || !counts.some(n => n > 0) || [excellentPct, veryGoodPct].some(n => !Number.isFinite(n) || n < 0 || n > 100) || excellentPct + veryGoodPct > 100) {
      return NextResponse.json({ error: 'กรุณาตรวจสอบปี จำนวนผู้ตอบ และร้อยละให้ถูกต้อง' }, { status: 400 });
    }
    let data: Buffer | null = null;
    let type: string | null = null;
    if (report instanceof File && report.size) {
      if (report.size > 3 * 1024 * 1024 || !/\.(pptx|pdf)$/i.test(report.name)) return NextResponse.json({ error: 'รองรับไฟล์ PPTX หรือ PDF ขนาดไม่เกิน 3 MB' }, { status: 400 });
      data = Buffer.from(await report.arrayBuffer());
      const isPdf = data.subarray(0, 5).toString() === '%PDF-';
      const isPptx = data.subarray(0, 4).toString('hex') === '504b0304';
      if (!(report.name.toLowerCase().endsWith('.pdf') ? isPdf : isPptx)) return NextResponse.json({ error: 'ไฟล์รายงานไม่ตรงกับชนิดที่เลือก' }, { status: 400 });
      type = isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    }
    await query('INSERT INTO culture_surveys (year, counts, excellent_pct, very_good_pct, report_data, report_type, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7)', [year, counts, excellentPct, veryGoodPct, data, type, auth.user.id]);
    await audit(auth.user, 'culture_survey.create', 'culture_survey', year);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if ((err as { code?: string }).code === '23505') return NextResponse.json({ error: 'มีข้อมูลปีนี้แล้ว' }, { status: 409 });
    console.error('culture survey save failed:', err);
    return NextResponse.json({ error: 'บันทึกข้อมูลไม่สำเร็จ' }, { status: 500 });
  }
}
