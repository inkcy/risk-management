import { readFile } from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';

export const runtime = 'nodejs';
type Asset = { file: string; archive: number };
let index: Promise<Record<string, Asset>> | undefined;
const archives = new Map<number, Promise<JSZip>>();
function loadIndex() {
  if (!index) index = readFile(path.join(process.cwd(), 'data/chatbot-page-visuals.json'), 'utf8').then(JSON.parse).catch(error => { index = undefined; throw error; });
  return index;
}
function loadArchive(number: number) {
  let archive = archives.get(number);
  if (!archive) {
    archive = readFile(path.join(process.cwd(), 'data', `chatbot-page-visuals-${number}.zip`)).then(bytes => JSZip.loadAsync(bytes)).catch(error => { archives.delete(number); throw error; });
    archives.set(number, archive);
  }
  return archive;
}
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('viewer');
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!/^[a-f0-9]{24}$/.test(id)) return new Response(null, { status: 404 });
  try {
    const item = (await loadIndex())[id];
    if (!item || item.file !== `${id}.jpg` || !Number.isInteger(item.archive) || item.archive < 0 || item.archive > 99) return new Response(null, { status: 404 });
    const file = (await loadArchive(item.archive)).file(item.file);
    if (!file) return new Response(null, { status: 404 });
    const bytes = await file.async('uint8array');
    return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch {
    return NextResponse.json({ error: 'ไม่สามารถโหลดภาพอ้างอิงได้' }, { status: 500 });
  }
}
