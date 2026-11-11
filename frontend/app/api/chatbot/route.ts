import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';

export const runtime = 'nodejs';
export const maxDuration = 60;
type Message = { role: 'user' | 'assistant'; text: string };

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 403 });
  const auth = await requireRole('viewer');
  if (!auth.ok) return auth.response;
  let messages: Message[];
  try {
    const text = await request.text();
    if (text.length > 90000) throw new Error();
    const body = JSON.parse(text);
    if (!Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > 20) throw new Error();
    messages = body.messages;
    if (messages.some((item, i) => !item || item.role !== (i % 2 === 0 ? 'user' : 'assistant') || typeof item.text !== 'string' || !item.text.trim() || item.text.length > 4000) || messages.at(-1)?.role !== 'user') throw new Error();
  } catch { return NextResponse.json({ error: 'ข้อความไม่ถูกต้องหรือยาวเกินกำหนด' }, { status: 400 }); }
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return NextResponse.json({ error: 'บริการ AI ยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ' }, { status: 503 });
  const model = (process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite').trim().replace(/^models\//, '');
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) return NextResponse.json({ error: 'บริการ AI ยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ' }, { status: 503 });
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, signal: AbortSignal.timeout(45000),
      body: JSON.stringify({ systemInstruction: { parts: [{ text: 'คุณเป็นผู้ช่วยภาษาไทยด้านการบริหารความเสี่ยงและความปลอดภัยในโรงพยาบาล ตอบอย่างชัดเจน ไม่แต่งข้อมูลหรืออ้างว่าทราบนโยบายโรงพยาบาลหากไม่มีข้อมูล ระบุเมื่อไม่แน่ใจ แนะนำให้ตรวจสอบแนวทางของโรงพยาบาลและปรึกษาผู้รับผิดชอบก่อนตัดสินใจทางคลินิก ไม่ขอข้อมูลระบุตัวผู้ป่วย' }] }, contents: messages.map(item => ({ role: item.role === 'assistant' ? 'model' : 'user', parts: [{ text: item.text }] })) }),
    });
    if (!response.ok) return NextResponse.json({ error: 'บริการ AI ตอบกลับไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }, { status: 502 });
    const body = await response.json();
    const reply = body.candidates?.[0]?.content?.parts?.filter((part: { thought?: boolean }) => !part.thought).map((part: { text?: string }) => part.text || '').join('').trim();
    if (!reply) return NextResponse.json({ error: 'บริการ AI ไม่ส่งคำตอบกลับมา กรุณาลองใหม่อีกครั้ง' }, { status: 502 });
    return NextResponse.json({ reply: reply.slice(0, 4000) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'ติดต่อบริการ AI ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }, { status: 502 }); }
}
