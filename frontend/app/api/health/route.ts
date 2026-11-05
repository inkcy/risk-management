import { NextResponse } from 'next/server';
import { dbConfigured } from '@/lib/db';

export async function GET() {
  return NextResponse.json({ status: 'ok', db: dbConfigured(), ai: !!process.env.GEMINI_API_KEY?.trim(), timestamp: new Date().toISOString() });
}
