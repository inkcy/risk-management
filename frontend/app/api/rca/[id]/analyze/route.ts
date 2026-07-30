import { NextRequest, NextResponse } from 'next/server';
import { loadRcaBundle, loadActions } from '@/lib/queries';
import { analyzeRca } from '@/lib/ai';

export const maxDuration = 60;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const [bundleEnv, actionsEnv] = await Promise.all([loadRcaBundle(id), loadActions()]);
    if (!bundleEnv.data.incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }
    const result = await analyzeRca(bundleEnv.data, actionsEnv.data);
    return NextResponse.json(result);
  } catch (err) {
    console.error('AI analyze failed:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
