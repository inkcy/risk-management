import { NextRequest, NextResponse } from 'next/server';
import { loadRcaBundle, loadActions } from '@/lib/queries';
import { buildRcaDocx } from '@/lib/docx';

export const maxDuration = 30;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const [bundleEnv, actionsEnv] = await Promise.all([loadRcaBundle(id), loadActions()]);
    if (!bundleEnv.data.incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }
    const buffer = await buildRcaDocx(bundleEnv.data, actionsEnv.data);
    const safeName = (bundleEnv.data.incident.ir_code || 'rca').replace(/[^\w.-]+/g, '_');
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="RCA_${safeName}.docx"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
