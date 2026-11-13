import { readFile } from 'node:fs/promises';
import path from 'node:path';

export type KnowledgeExcerpt = { source: string; location: string; text: string; visualId?: string; visualKind?: 'images' | 'pages' };
type IndexedExcerpt = KnowledgeExcerpt & { tokens: Set<string>; textTokens: Set<string>; sourceTokens: Set<string> };
let indexPromise: Promise<{ items: IndexedExcerpt[]; frequencies: Map<string, number> }> | undefined;
const segmenter = new Intl.Segmenter('th', { granularity: 'word' });
const ignored = new Set(['อะไร','อย่างไร','ยังไง','ไหม','หรือ','ของ','การ','และ','ใน','เป็น','คือ','ให้','ที่','จาก','ได้','ต้อง','อย่าง','เกี่ยวกับ','โปรด','บอก','ช่วย','หน่อย','ขอ','ข้อมูล','เรื่อง','สรุป','รายละเอียด','เอกสาร','ตาม','the','what','how','are','and','with']);
function tokens(text: string) {
  const result = new Set<string>();
  const separated = text.toLocaleLowerCase('th').replace(/_/g, ' ').replace(/([\u0E00-\u0E7F])([a-z])/g, '$1 $2').replace(/([a-z])([\u0E00-\u0E7F])/g, '$1 $2');
  for (const part of segmenter.segment(separated)) {
    const token = part.segment.trim();
    if (part.isWordLike && token.length >= 2 && !ignored.has(token)) result.add(token);
  }
  return result;
}
async function getIndex() {
  if (!indexPromise) indexPromise = Promise.all([
    readFile(path.join(process.cwd(), 'data/chatbot-knowledge.json'), 'utf8'),
    readFile(path.join(process.cwd(), 'data/chatbot-ocr.json'), 'utf8'),
    readFile(path.join(process.cwd(), 'data/chatbot-visuals.json'), 'utf8'),
    readFile(path.join(process.cwd(), 'data/chatbot-extra.json'), 'utf8'),
    readFile(path.join(process.cwd(), 'data/chatbot-extra-ocr.json'), 'utf8'),
    readFile(path.join(process.cwd(), 'data/chatbot-extra-visuals.json'), 'utf8'),
    readFile(path.join(process.cwd(), 'data/chatbot-page-visuals.json'), 'utf8'),
  ]).then(([raw, ocr, visualRaw, extra, extraOcr, extraVisualRaw, pageVisualRaw]) => {
    const visuals = { ...JSON.parse(visualRaw), ...JSON.parse(extraVisualRaw) } as Record<string, { source: string; location: string }>;
    const pageVisuals = JSON.parse(pageVisualRaw) as Record<string, { source: string; location: string }>;
    const lookup = new Map(Object.entries(visuals).map(([id, item]) => [`${item.source}\0${item.location}`, id]));
    const pageLookup = new Map(Object.entries(pageVisuals).map(([id, item]) => [`${item.source}\0${item.location}`, id]));
    const entries = [...JSON.parse(raw), ...JSON.parse(ocr), ...JSON.parse(extra), ...JSON.parse(extraOcr)] as KnowledgeExcerpt[];
    // Broken font extraction can produce boxes, replacement glyphs or mojibake.
    const readable = entries.filter(entry => !/[\uFFFD\u25A1\uFFFC\uE000-\uF8FF]|\(cid:\d+\)|[À-ÿ]{3,}|[ก-๛][À-ÿ·][ก-๛]/u.test(entry.text));
    const frequencies = new Map<string, number>();
    const items = readable.map(entry => {
      const textTokens = tokens(entry.text), sourceTokens = tokens(entry.source);
      const terms = new Set([...textTokens, ...sourceTokens]);
      for (const term of terms) frequencies.set(term, (frequencies.get(term) ?? 0) + 1);
      const location = entry.location.match(/^(?:หน้า|สไลด์)\s+\d+/u)?.[0] ?? entry.location;
      const visualId = entry.visualId ?? lookup.get(`${entry.source}\0${location}`) ?? pageLookup.get(`${entry.source}\0${location}`) ?? (entry.location.startsWith('ภาพ') ? lookup.get(`${entry.source}\0ภาพ`) : undefined);
      const visualKind = visualId && pageVisuals[visualId] ? 'pages' as const : 'images' as const;
      return { ...entry, visualId, visualKind, tokens: terms, textTokens, sourceTokens };
    });
    return { items, frequencies };
  }).catch(error => { indexPromise = undefined; throw error; });
  return indexPromise;
}
export async function findKnowledge(question: string): Promise<KnowledgeExcerpt[]> {
  const terms = tokens(question);
  if (!terms.size) return [];
  const { items, frequencies } = await getIndex();
  const generic = new Set(['ยก','ตัวอย่าง','ความ','เสี่ยง','แผนก','หน่วยงาน','โรงพยาบาล']);
  const focus = [...terms].filter(term => !generic.has(term));
  const acronyms = [...new Set([...question.matchAll(/(?<![A-Za-z])[A-Z]{2,}(?:[0-9]+)?(?![A-Za-z])/g), ...question.matchAll(/(?<![A-Za-z])(?:hrms|nrls|rca|rmis)(?![A-Za-z])/gi)].map(match => match[0].toLowerCase()))];
  const asksManual = /คู่มือ|manual|วิธีใช้|การใช้งาน/iu.test(question);
  const requestedTitle = question.trim().toLocaleLowerCase('th');
  // Multiword English topics need to match as a phrase; a common word such as
  // "risk" or an unrelated mention of "table" alone is not enough.
  const englishPhrases = [...question.toLocaleLowerCase('th').matchAll(/\b[a-z][a-z0-9-]{1,}(?:\s+[a-z][a-z0-9-]{1,}){1,3}\b/g)].map(match => match[0].replace(/\s+/g, ' '));
  const asksFinanceUnit = /(?:แผนก|หน่วยงาน|ฝ่าย|งาน)\s*(?:การเงิน|การคลัง|บัญชี)|finance\s+department/iu.test(question);
  const financeEvidence = /การเงิน|การคลัง|เบิกจ่าย|การรับเงิน|การจ่ายเงิน|การเรียกเก็บ|เรียกเก็บหนี้|ปิดบัญชี|บัญชี(?:การเงิน|ลูกหนี้|เจ้าหนี้)|financial|finance|cashier/iu;
  const asksSafetyGoals = /patient\s+safety\s+goals/iu.test(question);
  const asksRegister = /risk\s*register|ทะเบียน(?:จัดการ)?ความเสี่ยง/iu.test(question);
  const ranked = items.map(item => {
    let score = 0, matches = 0;
    for (const term of terms) if (item.tokens.has(term)) {
      matches++;
      score += Math.log(1 + items.length / (1 + (frequencies.get(term) ?? 0))) * (item.textTokens.has(term) ? 1 : 0.15) * (generic.has(term) ? 0.2 : 1);
    }
    const normalizedText = item.text.toLocaleLowerCase('th').replace(/\s+/g, ' ');
    for (const phrase of englishPhrases) if (normalizedText.includes(phrase)) score += 18;
    if (/ตัวอย่าง|ตาราง|table|example/iu.test(question) && /ตาราง|table|matrix/iu.test(item.text) && englishPhrases.some(phrase => normalizedText.includes(phrase))) score += 4;
    if (acronyms.length && acronyms.every(term => (item.source + ' ' + item.text).toLowerCase().includes(term))) score += 8;
    if (asksManual && /คู่มือ|manual/iu.test(item.source) && (!acronyms.length || acronyms.every(term => item.source.toLowerCase().includes(term)))) score += 12;
    if (requestedTitle.length >= 6 && item.source.toLocaleLowerCase('th').includes(requestedTitle)) score += 8;
    if (asksFinanceUnit && /การเงิน|การคลัง|financial|finance/iu.test(item.text) && /บัญชี|เรียกเก็บ|เบิกจ่าย|ชำระ|รับเงิน|รายได้|รายจ่าย/iu.test(item.text)) score += 6;
    if (asksFinanceUnit && /เรียกเก็บหนี้|เบิกจ่าย|การจ่ายเงิน|การรับเงิน|ปิดบัญชี/iu.test(item.text)) score += 12;
    if (asksSafetyGoals && /patient\s+safety\s+goals/iu.test(item.text)) score += 5;
    if (asksSafetyGoals && /^(?:คำนำ|คํานํา)/u.test(item.text.trim())) score -= 4;
    if (asksRegister && /risk\s*register|ทะเบียน(?:จัดการ)?ความเสี่ยง/iu.test(item.text)) score += 8;
    if (asksRegister && /risk\s*register|ทะเบียน(?:จัดการ)?ความเสี่ยง/iu.test(item.source) && /ระบุความเสี่ยง|วิเคราะห์ความเสี่ยง|มาตรการ|ติดตาม|องค์ประกอบ/iu.test(item.text)) score += 4;
    return { item, score, matches };
  }).filter(entry => entry.matches > 0 && entry.score >= 2.2 && (!focus.length || focus.some(term => entry.item.tokens.has(term))) && (!acronyms.length || acronyms.every(term => (entry.item.source + ' ' + entry.item.text).toLowerCase().includes(term))) && (!asksFinanceUnit || financeEvidence.test(entry.item.source + ' ' + entry.item.text))).sort((a, b) => b.score - a.score);
  const result: KnowledgeExcerpt[] = [];
  const seenLocations = new Set<string>();
  for (const { item, score } of ranked) {
    if (result.length >= 8 || score < ranked[0].score * 0.45) break;
    if (result.filter(entry => entry.source === item.source).length >= 3) continue;
    const locationKey = `${item.source}\0${item.location.replace(/\s*\(OCR[^)]*\)$/, '')}`;
    if (seenLocations.has(locationKey)) continue;
    seenLocations.add(locationKey);
    result.push({ source: item.source, location: item.location, text: item.text, visualId: item.visualId, visualKind: item.visualKind });
  }
  return result;
}
