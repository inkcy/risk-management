import { readFile } from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';

export const runtime = 'nodejs';
type Asset = { file: string; contentType: string };
let indices: Promise<{ base: Record<string, Asset>; extra: Record<string, Asset> }> | undefined;
const archives = new Map<'base' | 'extra', Promise<JSZip>>();
function loadIndices() {
  if (!indices) indices = Promise.all([
    readFile(path.join(process.cwd(), 'data/chatbot-visuals.json'), 'utf8'),
    readFile(path.join(process.cwd(), 'data/chatbot-extra-visuals.json'), 'utf8'),
  ]).then(([base, extra]) => ({ base: JSON.parse(base), extra: JSON.parse(extra) })).catch(error => { indices = undefined; throw error; });
  return indices;
}
function loadArchive(kind: 'base' | 'extra') {
  let archive = archives.get(kind);
  if (!archive) {
    const name = kind === 'base' ? 'chatbot-visuals.zip' : 'chatbot-extra-visuals.zip';
    archive = readFile(path.join(process.cwd(), 'data', name)).then(bytes => JSZip.loadAsync(bytes)).catch(error => { archives.delete(kind); throw error; });
    archives.set(kind, archive);
  }
  return archive;
}
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('viewer');
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!/^[a-f0-9]{24}$/.test(id)) return new Response(null, { status: 404 });
  try {
    const { base, extra } = await loadIndices();
    const kind = base[id] ? 'base' : 'extra';
    const item = base[id] ?? extra[id];
    if (!item || !/^[a-f0-9]{24}\.(?:jpg|png)$/.test(item.file) || !['image/jpeg', 'image/png'].includes(item.contentType)) return new Response(null, { status: 404 });
    const file = (await loadArchive(kind)).file(item.file);
    if (!file) return new Response(null, { status: 404 });
    const bytes = await file.async('uint8array');
    return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': item.contentType, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch {
    return NextResponse.json({ error: 'ไม่สามารถโหลดภาพอ้างอิงได้' }, { status: 500 });
  }
}
