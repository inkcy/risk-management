import JSZip from 'jszip';

type Fields = Record<string, number>;
type Source = { text: string; rows: string[] };
const labels: [string, RegExp][] = [
  ['excellent', /\bexcellent\b|ดีเยี่ยม/i],
  ['very_good', /\b(?:very|vevry)\s*good\b|ดีมาก/i],
  ['acceptable', /\bacceptable\b|ยอมรับได้/i],
  ['poor', /\bpoor\b|ไม่ดี/i],
  ['falling', /\bfall(?:ing)?\b|\bfailed\b|ตก/i],
];

function decode(value: string) {
  return value.replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi, entity => {
    const named: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" };
    if (named[entity]) return named[entity];
    const value = entity.slice(2, -1);
    const code = value[0]?.toLowerCase() === 'x' ? parseInt(value.slice(1), 16) : parseInt(value, 10);
    return Number.isFinite(code) && code <= 0x10ffff ? String.fromCodePoint(code) : '';
  });
}

function xmlText(xml: string) {
  return [...xml.matchAll(/<(?:a|w):t(?:\s[^>]*)?>([\s\S]*?)<\/(?:a|w):t>/g)].map(m => decode(m[1])).join(' ');
}

async function readOffice(buffer: Buffer, type: 'pptx' | 'docx'): Promise<Source[]> {
  const zip = await JSZip.loadAsync(buffer);
  const names = Object.keys(zip.files).filter(name => type === 'pptx' ? /^ppt\/slides\/slide\d+\.xml$/.test(name) : name === 'word/document.xml');
  if (!names.length) throw new Error('ไม่พบเนื้อหาในไฟล์');
  if (names.length > 200) throw new Error('ไฟล์มีจำนวนหน้ามากเกินไป');
  const result: Source[] = [];
  for (const name of names) {
    const entry = zip.file(name)!;
    const uncompressedSize = (entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize;
    if (uncompressedSize !== undefined && uncompressedSize > 5_000_000) throw new Error('เนื้อหาในไฟล์มีขนาดมากเกินไป');
    const xml = await entry.async('string');
    if (xml.length > 5_000_000) throw new Error('เนื้อหาในไฟล์มีขนาดมากเกินไป');
    const tag = type === 'pptx' ? 'a' : 'w';
    const rows = [...xml.matchAll(new RegExp(`<${tag}:tr(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}:tr>`, 'g'))].map(match => {
      const cells = [...match[1].matchAll(new RegExp(`<${tag}:tc(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}:tc>`, 'g'))];
      return cells.map(cell => xmlText(cell[1])).join(' | ');
    });
    if (type === 'docx') rows.push(...[...xml.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g)].map(m => xmlText(m[1])));
    result.push({ text: xmlText(xml), rows });
  }
  return result;
}

async function readPdf(buffer: Buffer): Promise<Source[]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true, isEvalSupported: false }).promise;
  if (pdf.numPages > 200) throw new Error('ไฟล์มีจำนวนหน้ามากเกินไป');
  const result: Source[] = [];
  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const lines = new Map<number, { x: number; text: string }[]>();
      for (const item of content.items) if ('str' in item && item.str.trim()) {
        const y = Math.round(item.transform[5] / 3) * 3;
        const line = lines.get(y) ?? [];
        line.push({ x: item.transform[4], text: item.str }); lines.set(y, line);
      }
      const rows = [...lines.entries()].sort((a, b) => b[0] - a[0]).map(([, items]) => items.sort((a, b) => a.x - b.x).map(item => item.text).join(' '));
      result.push({ text: rows.join(' '), rows });
    }
  } finally { await pdf.destroy(); }
  return result;
}

export async function extractCultureSurvey(buffer: Buffer, type: 'pptx' | 'pdf' | 'docx', year: number): Promise<Fields> {
  const sources = type === 'pdf' ? await readPdf(buffer) : await readOffice(buffer, type);
  const candidates: Record<string, number[]> = {};
  for (const source of sources) {
    const normalized = source.text.replace(/(25\d)\s+(\d)\b/g, '$1$2');
    const years = [...new Set((normalized.match(/\b25\d{2}\b/g) ?? []).map(Number))].sort((a, b) => a - b);
    const yearIndex = years.indexOf(year);
    for (const row of source.rows) {
      for (const [key, pattern] of labels) {
        const match = pattern.exec(row);
        if (!match) continue;
        const tail = row.slice(match.index + match[0].length).replace(/,/g, '');
        const numbers = [...tail.matchAll(/(?<![\d.])\d+(?:\.\d+)?(?![\d.])/g)].map(m => Number(m[0]));
        let count: number | undefined;
        let pct: number | undefined;
        if (numbers.length === 2 && years.length <= 1 && (years.length === 0 || yearIndex === 0)) [count, pct] = numbers;
        else if (yearIndex >= 0 && years.length >= 2 && numbers.length === years.length * 2) { count = numbers[yearIndex * 2]; pct = numbers[yearIndex * 2 + 1]; }
        if (count !== undefined && Number.isInteger(count) && count >= 0 && pct !== undefined && pct >= 0 && pct <= 100) {
          (candidates[key] ??= []).push(count);
          if (key === 'excellent' || key === 'very_good') (candidates[`${key}_pct`] ??= []).push(pct);
        }
      }
    }
  }
  const fields: Fields = {};
  for (const [key, values] of Object.entries(candidates)) if (new Set(values).size === 1) fields[key] = values[0];
  return fields;
}
