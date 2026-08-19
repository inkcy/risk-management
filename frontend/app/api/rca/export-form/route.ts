import { NextRequest, NextResponse } from 'next/server';
import { buildRcaFormDocx } from '@/lib/rcaFormDocx';
import { normalizeRcaForm } from '@/lib/rcaForm';
import { requireReadAccess } from '@/lib/auth';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const denied = await requireReadAccess();
  if (denied) return denied;
  try {
    const body = await request.json();
    const form = normalizeRcaForm(body);
    const buffer = await buildRcaFormDocx(form);

    const stem = (form.rmNo || form.subject || 'form').slice(0, 60).replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_');
    const fileName = `RCA_${stem}.docx`;
    // ชื่อไฟล์อาจเป็นภาษาไทย — ส่ง ASCII fallback คู่กับ filename* (RFC 5987)
    const asciiName = `RCA_${stem.replace(/[^\w.-]+/g, '_')}.docx`;

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
