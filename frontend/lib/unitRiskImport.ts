import JSZip from 'jszip';

export type ImportedRisk = { title: string; occurrence_count: number; impact: number; levels: string };
export function parseRiskText(text: string) {
  const items: ImportedRisk[] = [];
  const warnings: string[] = [];
  const rows = /([^\t]+)\t[ \r\n]*(\d+)[ \r\n]*\t((?:[^\t]*\t){9})/g;
  for (const row of text.matchAll(rows)) {
    const title = row[1].replace(/\s+/g, ' ').trim();
    const cells = row[3].split('\t').slice(0, 9).map(s => s.trim());
    if (!title || cells.some(s => s && !/^(?:\d+|[✓✔√⁄∕/()]+)$/.test(s))) continue;
    const total = Number(row[2]);
    const marked = cells.flatMap((s, i) => s && !/^\d+$/.test(s) ? [i] : []);
    if (marked.length > 1 || (marked.length && cells.some(s => /^\d+$/.test(s) && Number(s) > 0))) {
      warnings.push(`ระบุผลกระทบไม่ชัดเจน กรุณาตรวจสอบ: ${title}`);
      continue;
    }
    const counts = cells.map((s, i) => marked.length ? (i === marked[0] ? total : 0) : Number(s || 0));
    if (counts.reduce((a,b) => a+b,0) !== total) { warnings.push(`ผลรวมระดับ A–I ไม่ตรงกับจำนวนรวม: ${title}`); continue; }
    for (let impact = 1; impact <= 5; impact++) {
      const indices = [[0,1],[2,3],[4],[5],[6,7,8]][impact-1];
      const count = indices.reduce((sum,i) => sum+counts[i],0);
      if (count) items.push({ title: title.slice(0, 240), occurrence_count: count, impact, levels: indices.filter(i=>counts[i]>0).map(i=>`${'ABCDEFGHI'[i]} ${counts[i]}`).join(', ') });
    }
  }
  if (!items.length) throw new Error('ไม่พบตารางความเสี่ยงที่มีจำนวนครั้งและคอลัมน์ A–I กรุณาตรวจสอบรูปแบบไฟล์');
  const year = Number(text.match(/ประจำปีงบประมาณ\s*(25\d{2})/)?.[1]) || undefined;
  const quarter = Number(text.match(/ไตรมาสที่\s*([1-4])/)?.[1]) || undefined;
  const unitName = text.match(/ชื่อหน่วยงาน\s+([^\t]+?)(?=\s+ไตรมาส)/)?.[1]?.replace(/^[_\s]+/, '').trim();
  return { items, warnings, year, quarter, unitName, sourceRows: new Set(items.map(i=>i.title)).size };
}

export async function extractUnitRisks(buffer: Buffer, extension: string) {
  let text: string;
  if (extension === 'doc') {
    const WordExtractor = (await import('word-extractor')).default;
    text = (await new WordExtractor().extract(buffer)).getBody();
  } else {
    const zip = await JSZip.loadAsync(buffer);
    const entry = zip.file('word/document.xml');
    if (!entry || (entry as unknown as {_data?:{uncompressedSize:number}})._data?.uncompressedSize! > 5_000_000) throw new Error('ไฟล์ Word ไม่ถูกต้องหรือใหญ่เกินไป');
    const xml = await entry.async('string');
    const decode = (s:string) => s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'");
    const content = (s:string) => [...s.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(m=>decode(m[1])).join(' ');
    // Keep metadata separate so it cannot be mistaken for a risk title.
    text = content(xml.replace(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/g, '')) + '\t\n' + [...xml.matchAll(/<w:tr(?:\s[^>]*)?>([\s\S]*?)<\/w:tr>/g)].map(row=>[...row[1].matchAll(/<w:tc(?:\s[^>]*)?>([\s\S]*?)<\/w:tc>/g)].map(c=>content(c[1])).join('\t')+'\t').join('\n');
  }
  return parseRiskText(text);
}
