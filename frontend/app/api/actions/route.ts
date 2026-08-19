import { NextResponse } from 'next/server';
import { loadActions } from '@/lib/queries';
import { requireReadAccess } from '@/lib/auth';

export async function GET() {
  const denied = await requireReadAccess();
  if (denied) return denied;
  const result = await loadActions();
  return NextResponse.json(result);
}
