import { NextResponse } from 'next/server';
import { loadStats } from '@/lib/queries';

export async function GET() {
  const result = await loadStats();
  return NextResponse.json(result);
}
