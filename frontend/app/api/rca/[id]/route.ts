import { NextRequest, NextResponse } from 'next/server';
import { loadRcaBundle } from '@/lib/queries';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await loadRcaBundle(id);
  return NextResponse.json(result);
}
