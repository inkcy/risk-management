import { NextRequest, NextResponse } from 'next/server';
import { requireReadAccess } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(_request: NextRequest, context: { params: Promise<{ year: string }> }) {
  const denied = await requireReadAccess();
  if (denied) return denied;
  const year = Number((await context.params).year);
  if (!Number.isInteger(year) || year < 2568 || year > 2700) return new NextResponse(null, { status: 400 });
  try {
    const { rows } = await query<{ report_data: Buffer | null; report_type: string | null }>('SELECT report_data, report_type FROM culture_surveys WHERE year = $1', [year]);
    const report = rows[0];
    if (!report?.report_data || !report.report_type) return new NextResponse(null, { status: 404 });
    const extension = report.report_type === 'application/pdf' ? 'pdf' : 'pptx';
    return new NextResponse(new Uint8Array(report.report_data), { headers: { 'Content-Type': report.report_type, 'Content-Disposition': `attachment; filename="safety-culture-${year}.${extension}"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch (err) {
    console.error('culture report download failed:', err);
    return new NextResponse(null, { status: 500 });
  }
}
