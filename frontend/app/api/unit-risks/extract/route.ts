import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { extractUnitRisks } from '@/lib/unitRiskImport';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  const auth = await requireRole('viewer'); if (!auth.ok) return auth.response;
  try {
    const form = await request.formData(); const file = form.get('file');
    if (!(file instanceof File) || !file.size || file.size > 5*1024*1024) return NextResponse.json({error:'กรุณาเลือกไฟล์ Word ขนาดไม่เกิน 5 MB'},{status:400});
    const ext = file.name.toLowerCase().match(/\.(docx?)$/)?.[1];
    if (!ext) return NextResponse.json({error:'รองรับไฟล์ .doc และ .docx'},{status:400});
    return NextResponse.json(await extractUnitRisks(Buffer.from(await file.arrayBuffer()),ext));
  } catch (error) { return NextResponse.json({error:error instanceof Error?error.message:'อ่านไฟล์ไม่สำเร็จ'},{status:422}); }
}
