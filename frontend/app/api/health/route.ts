import { NextResponse } from 'next/server';
import { dbConfigured } from '@/lib/db';

export async function GET() {
  return NextResponse.json({ status: 'ok', db: dbConfigured(), timestamp: new Date().toISOString() });
}
