import JSZip from 'jszip';

export function parseDepartmentCodeText(paragraphs: string[]) {
  const entries = new Map<string, Set<string>>();
  paragraphs.forEach((value,index)=>{
    const text=value.replace(/\s+/g,' ').trim();
    if(!text)return;
    const codes=[...text.matchAll(/(?<!\d)\d{7}[A-Za-z]?(?![A-Za-z0-9])/g)];
    if(codes.length!==1||!text.endsWith(codes[0][0]))throw new Error(`อ่านรายชื่อแถว ${index+1} ไม่สำเร็จ ต้องมีรหัสตามรายชื่อหนึ่งรหัสต่อรายการ`);
    const code=codes[0][0];
    const name=text.slice(0,codes[0].index).replace(/หัวหน้ากลุ่ม\s*\/\s*หน่วยงาน/g,'').trim();
    if(!name||name.length>200)throw new Error(`ชื่อในแถว ${index+1} ไม่ถูกต้อง`);
    const names=entries.get(code)??new Set<string>();names.add(name);entries.set(code,names);
  });
  if(!entries.size||entries.size>1000)throw new Error('รองรับรายชื่อ 1–1,000 รหัส');
  return [...entries].map(([code,names])=>({code,names:[...names],displayName:names.size>1?`บัญชีร่วม: ${[...names].join(' / ')}`:[...names][0]}));
}
export async function readDepartmentCodeDocx(buffer: Buffer) {
  const zip=await JSZip.loadAsync(buffer);const document=zip.file('word/document.xml');
  if(!document)throw new Error('ไฟล์ Word ไม่ถูกต้อง');
  const xml=await document.async('string');
  if(xml.length>5000000)throw new Error('ไฟล์ใหญ่เกินกำหนด');
  const decode=(value:string)=>value.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'");
  const paragraphs=[...xml.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g)].map(match=>[...match[1].matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(part=>decode(part[1])).join(''));
  return parseDepartmentCodeText(paragraphs);
}
