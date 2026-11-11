import JSZip from 'jszip';

const decode = (value: string) => value.replace(/&#x([0-9a-f]+);|&#(\d+);|&(amp|lt|gt|quot|apos);/gi, (_, hex, decimal, named) => {
  if (hex || decimal) {
    const code = Number.parseInt(hex || decimal, hex ? 16 : 10);
    return code <= 0x10ffff ? String.fromCodePoint(code) : '';
  }
  return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" } as Record<string, string>)[named.toLowerCase()];
});
const textContent = (xml: string) => [...xml.matchAll(/<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>/g)].map(match => decode(match[1])).join('');

/** Extract visible cell values without evaluating formulas or executing workbook content. */
export async function extractSpreadsheetText(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const files = Object.values(zip.files).filter(entry => !entry.dir);
  const selected = files.filter(entry => /^xl\/(?:sharedStrings\.xml|worksheets\/sheet\d+\.xml)$/.test(entry.name));
  if (!selected.some(entry => entry.name.includes('/worksheets/')) || selected.length > 51) throw new Error('ไม่พบตาราง Excel ที่รองรับ');
  let size = 0;
  for (const entry of selected) {
    const length = (entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize;
    if (typeof length !== 'number') throw new Error('ไฟล์ Excel ไม่ถูกต้อง');
    size += length;
  }
  if (size > 32_000_000) throw new Error('ตาราง Excel มีขนาดข้อมูลใหญ่เกินไป');
  const sharedEntry = zip.file('xl/sharedStrings.xml');
  const sharedXml = sharedEntry ? await sharedEntry.async('string') : '';
  const shared = [...sharedXml.matchAll(/<(?:\w+:)?si(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?si>/g)].map(match => textContent(match[1]));
  const output: string[] = [];
  let cellCount = 0;
  for (const entry of selected.filter(item => item.name.includes('/worksheets/')).sort((a,b) => a.name.localeCompare(b.name, undefined, { numeric: true }))) {
    const xml = await entry.async('string');
    output.push(`[${entry.name}]`);
    for (const row of xml.matchAll(/<(?:\w+:)?row(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?row>/g)) {
      const cells: string[] = [];
      for (const cell of row[1].matchAll(/<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g)) {
        if (++cellCount > 30000) throw new Error('ไฟล์มีข้อมูลมากเกินไป กรุณาเลือกเฉพาะตารางที่ต้องการ');
        const address = /\br="([A-Z]+)\d+"/i.exec(cell[1])?.[1];
        if (!address) continue;
        let index = 0;
        for (const letter of address.toUpperCase()) index = index * 26 + letter.charCodeAt(0) - 64;
        if (index > 100) continue;
        const body = cell[2] ?? '';
        const raw = /<(?:\w+:)?v(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?v>/.exec(body)?.[1];
        const type = /\bt="([^"]+)"/.exec(cell[1])?.[1];
        const value = type === 's' ? (raw !== undefined && /^\d+$/.test(raw) ? shared[Number(raw)] ?? '' : '') : type === 'inlineStr' ? textContent(body) : decode(raw ?? '');
        cells[index - 1] = value.replace(/[\t\r\n]+/g, ' ').slice(0, 1500);
      }
      if (cells.some(Boolean)) output.push(Array.from({ length: cells.length }, (_, i) => cells[i] ?? '').join('\t'));
      if (output.join('\n').length > 100000) throw new Error('ข้อมูลใน Excel ยาวเกินไป กรุณาแบ่งไฟล์');
    }
  }
  const text = output.join('\n');
  if (!text.trim() || output.length < 2) throw new Error('ไม่พบข้อมูลในตาราง Excel');
  return text;
}
