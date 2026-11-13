import { NextRequest, NextResponse } from 'next/server';
import { loadRcaBundle, loadActions } from '@/lib/queries';
import { analyzeRca } from '@/lib/ai';
import { audit, requireRole } from '@/lib/auth';

export const maxDuration = 60;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // ผู้ใช้ที่ล็อกอินและยัง active ทุกระดับสามารถเรียก AI วิเคราะห์ได้
  const auth = await requireRole('viewer');
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const [bundleEnv, actionsEnv] = await Promise.all([loadRcaBundle(id), loadActions()]);
    if (!bundleEnv.data.incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }
    const result = await analyzeRca(bundleEnv.data, actionsEnv.data);
    await audit(auth.user, 'rca.analyze', 'incident', id, { model: result.model ?? null, demo: result.demo });
    return NextResponse.json(result);
  } catch (err) {
    console.error('AI analyze failed:', err);
    return NextResponse.json({ error: 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 });
  }
}
