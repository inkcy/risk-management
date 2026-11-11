import { readFile } from 'node:fs/promises';
import path from 'node:path';

export type KnowledgeExcerpt = { source: string; location: string; text: string };
type IndexedExcerpt = KnowledgeExcerpt & { tokens: Set<string> };
let indexPromise: Promise<{ items: IndexedExcerpt[]; frequencies: Map<string, number> }> | undefined;
const segmenter = new Intl.Segmenter('th', { granularity: 'word' });
const ignored = new Set(['อะไร','อย่างไร','ยังไง','ไหม','หรือ','ของ','การ','และ','ใน','เป็น','คือ','ให้','ที่','จาก','ได้','ต้อง','อย่าง','เกี่ยวกับ','โปรด','บอก','ช่วย','หน่อย','ขอ','ข้อมูล','เรื่อง','สรุป','รายละเอียด','เอกสาร','ตาม','the','what','how','are','and','with']);
function tokens(text: string) {
  const result = new Set<string>();
  for (const part of segmenter.segment(text.toLocaleLowerCase('th'))) {
    const token = part.segment.trim();
    if (part.isWordLike && token.length >= 2 && !ignored.has(token)) result.add(token);
  }
  return result;
}
async function getIndex() {
  if (!indexPromise) indexPromise = readFile(path.join(process.cwd(), 'data/chatbot-knowledge.json'), 'utf8').then(raw => {
    const entries = JSON.parse(raw) as KnowledgeExcerpt[];
    const frequencies = new Map<string, number>();
    const items = entries.map(entry => {
      const terms = tokens(`${entry.source} ${entry.text}`);
      for (const term of terms) frequencies.set(term, (frequencies.get(term) ?? 0) + 1);
      return { ...entry, tokens: terms };
    });
    return { items, frequencies };
  }).catch(error => { indexPromise = undefined; throw error; });
  return indexPromise;
}
export async function findKnowledge(question: string): Promise<KnowledgeExcerpt[]> {
  const terms = tokens(question);
  if (!terms.size) return [];
  const { items, frequencies } = await getIndex();
  const ranked = items.map(item => {
    let score = 0, matches = 0;
    for (const term of terms) if (item.tokens.has(term)) { matches++; score += Math.log(1 + items.length / (1 + (frequencies.get(term) ?? 0))); }
    return { item, score, matches };
  }).filter(entry => entry.matches > 0 && entry.score >= 2.2).sort((a, b) => b.score - a.score);
  const result: KnowledgeExcerpt[] = [];
  for (const { item, score } of ranked) {
    if (result.length >= 8 || score < ranked[0].score * 0.45) break;
    if (result.filter(entry => entry.source === item.source).length >= 3) continue;
    result.push({ source: item.source, location: item.location, text: item.text });
  }
  return result;
}
