import { NextResponse } from 'next/server';
import { loadActions } from '@/lib/queries';

export async function GET() {
  const result = await loadActions();
  return NextResponse.json(result);
}
