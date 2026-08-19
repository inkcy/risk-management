import { NextRequest, NextResponse } from 'next/server';
import { loadRcaBundle } from '@/lib/queries';
import { requireReadAccess } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireReadAccess();
  if (denied) return denied;
  const { id } = await params;
  const result = await loadRcaBundle(id);
  return NextResponse.json(result);
}
