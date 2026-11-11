import { readFile } from 'node:fs/promises';
import path from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, degrees, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { MatrixOptions, MatrixResult } from './matrix-analysis';
import { applyMatrixAdvice } from './matrix-treatment';
import { baselineMatrixAdvice, matrixReportContent } from './matrix-content';
import type { MatrixExportNote, MatrixTreatment } from './matrix-treatment';

const pageWidth = 842, pageHeight = 595.22;
const top = 239.16, bottom = 468.48;
const left = 28.37, titleEnd = 233.39, frequencyEnd = 268.73, impactEnd = 396.17;
const colorEdges = [396.17, 413.9, 430.91, 447.89, 468.11];
const responseEdges = [468.11, 511.43, 546.83, 582.29];
const measureEnd = 766.55, right = 822.17;
const colors = [rgb(0, .69, .31), rgb(1, 1, 0), rgb(.92, .45, 0), rgb(1, 0, 0)];
const fontSize = 7.4, lineHeight = 10;

function wrap(text: string, font: PDFFont, width: number): string[] {
  // Segment by grapheme so Thai combining marks stay attached to their consonants.
  const segmenter = new Intl.Segmenter('th', { granularity: 'grapheme' });
  return text.replace(/\r/g, '').split('\n').flatMap(paragraph => {
    const lines: string[] = []; let line = '';
    for (const { segment } of segmenter.segment(paragraph.replace(/\t/g, ' '))) {
      if (line && font.widthOfTextAtSize(line + segment, fontSize) > width) { lines.push(line); line = ''; }
      line += segment;
    }
    lines.push(line); return lines;
  });
}

export async function buildMatrixPdf(rows: MatrixResult[], treatments: MatrixTreatment[], options: MatrixOptions, unitName: string, notes: MatrixExportNote[] = []) {
  treatments = applyMatrixAdvice(rows.map(row => row.id), treatments, baselineMatrixAdvice(rows));
  const [templateBytes, fontBytes] = await Promise.all([
    readFile(path.join(process.cwd(), 'public/risk-profile/risk-profile-form.pdf')),
    readFile(path.join(process.cwd(), 'public/fonts/Sarabun-Regular.ttf')),
  ]);
  const doc = await PDFDocument.create(); doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes, { subset: true });
  const [template] = await doc.embedPdf(templateBytes, [0]);
  const labels = options.type === 'clinical' ? ['A','B','C','D','E','F','G','H','I'] : ['1','2','3','4','5'];
  const severityEdges = Array.from({ length: labels.length + 1 }, (_, i) => frequencyEnd + (impactEnd - frequencyEnd) * i / labels.length);
  const pages: PDFPage[] = [];
  const text = (page: PDFPage, value: string, x: number, yTop: number, size = fontSize) => {
    if (value) page.drawText(value, { x, y: pageHeight - yTop - size, size, font, color: rgb(0, 0, 0) });
  };
  const center = (page: PDFPage, value: string, a: number, b: number, yTop: number, size = fontSize) => {
    const fitted = Math.min(size, (b-a-2) / Math.max(1, font.widthOfTextAtSize(value, 1)));
    text(page, value, (a+b-font.widthOfTextAtSize(value, fitted))/2, yTop, fitted);
  };
  const line = (page: PDFPage, x1: number, y1: number, x2: number, y2: number, thickness = .35) => page.drawLine({ start: {x:x1,y:pageHeight-y1}, end:{x:x2,y:pageHeight-y2}, thickness, color:rgb(0,0,0) });
  const tick = (page: PDFPage, a: number, b: number, yTop: number) => {
    const x = (a+b)/2, y = yTop+7;
    line(page,x-3,y,x-1,y+2, .9); line(page,x-1,y+2,x+4,y-4, .9);
  };
  const createPage = () => {
    if (pages.length >= 100) throw new Error('ข้อมูลยาวเกิน 100 หน้า กรุณาลดรายการหรือย่อมาตรการก่อนส่งออก PDF');
    const page = doc.addPage([pageWidth,pageHeight]); pages.push(page);
    // The original is portrait media with /Rotate 90. Normalize its content to landscape.
    page.drawPage(template,{x:0,y:pageHeight,rotate:degrees(-90)});
    page.drawRectangle({x:left,y:pageHeight-bottom,width:right-left,height:bottom-top,color:rgb(1,1,1)});
    colorEdges.slice(0,4).forEach((x,i)=>page.drawRectangle({x,y:pageHeight-bottom,width:colorEdges[i+1]-x,height:bottom-top,color:colors[i]}));
    const edges = [left,titleEnd,...severityEdges,...colorEdges.slice(1),...responseEdges.slice(1),measureEnd,right];
    edges.forEach(x=>line(page,x,top,x,bottom)); line(page,left,top,right,top); line(page,left,bottom,right,bottom);
    // Fill the existing header blanks without touching the hospital logo or signatures.
    page.drawRectangle({x:211,y:pageHeight-111.8,width:138,height:13.5,color:rgb(1,1,1)});
    center(page,unitName || 'ยังไม่ระบุ',211,349,99,9);
    center(page,String(options.quarter),397,408,99,9);
    const months = [['ตุลาคม','ธันวาคม'],['มกราคม','มีนาคม'],['เมษายน','มิถุนายน'],['กรกฎาคม','กันยายน']][options.quarter-1];
    page.drawRectangle({x:430,y:pageHeight-111.8,width:63,height:13.5,color:rgb(1,1,1)});
    page.drawRectangle({x:520,y:pageHeight-111.8,width:59,height:13.5,color:rgb(1,1,1)});
    center(page,months[0],430,493,99,9); center(page,months[1],520,579,99,9);
    center(page,String(options.year),672,714,99,9);
    // State the frequency basis so a likelihood level cannot be mistaken for a count.
    text(page,options.type === 'clinical' ? 'ด้านคลินิก' : 'ด้านทั่วไป',80,23,8);
    text(page,options.basis === 'level' ? 'ความถี่: ระดับโอกาสเกิด 1–5' : options.basis === 'year' ? 'ความถี่: จำนวนครั้งต่อปี' : 'ความถี่: จำนวนครั้งในไตรมาส',170,23,8);
    if (options.type !== 'clinical') {
      page.drawRectangle({x:frequencyEnd,y:pageHeight-top,width:impactEnd-frequencyEnd,height:45.8,color:rgb(1,1,1)});
      severityEdges.forEach(x=>line(page,x,top-45.8,x,top)); line(page,frequencyEnd,top-45.8,impactEnd,top-45.8);
      labels.forEach((label,i)=>center(page,label,severityEdges[i],severityEdges[i+1],210,8));
    }
    return page;
  };
  let page = createPage(), cursor = top;
  for (const row of rows) {
    const treatment = treatments.find(item=>item.id===row.id);
    if (!treatment) throw new Error('ข้อมูลการจัดการความเสี่ยงไม่ครบ');
    const content = matrixReportContent(row, treatment, notes.find(note => note.id === row.id));
    const title = content.title;
    const measures = content.measures;
    const columns = [wrap(title,font,titleEnd-left-6),wrap(measures,font,measureEnd-responseEdges[3]-6),wrap(content.reviewFrequency,font,right-measureEnd-6)];
    let offset=0; const totalLines = Math.max(...columns.map(lines=>lines.length));
    while (offset<totalLines) {
      if (bottom-cursor<16) {page=createPage();cursor=top;}
      const capacity = Math.floor((bottom-cursor-6)/lineHeight);
      const count = Math.min(totalLines-offset,capacity);
      const height = Math.max(14.35,count*lineHeight+6);
      columns.forEach((lines,index)=>lines.slice(offset,offset+count).forEach((value,i)=>text(page,value,[left+3,responseEdges[3]+3,measureEnd+3][index],cursor+2+i*lineHeight)));
      if (offset===0) {
        center(page,String(row.frequency),titleEnd,frequencyEnd,cursor+2);
        const range = row.severity.toUpperCase().split(/[–-]/);
        const start=labels.indexOf(range[0]),end=labels.indexOf(range.at(-1)!);
        if (start<0||end<start) throw new Error('ระดับความรุนแรงไม่ตรงกับแบบฟอร์ม');
        // A grouped severity gets one count across the matching columns, never a guessed letter.
        if (end>start) {
          page.drawRectangle({x:severityEdges[start]+.4,y:pageHeight-cursor-height+.4,width:severityEdges[end+1]-severityEdges[start]-.8,height:height-.8,color:rgb(1,1,1)});
        }
        center(page,String(row.frequency),severityEdges[start],severityEdges[end+1],cursor+2);
        const color=['green','yellow','orange','red'].indexOf(row.color); tick(page,colorEdges[color],colorEdges[color+1],cursor+1);
        [treatment.transferPrevention,treatment.monitorControl,treatment.mitigation].forEach((selected,i)=>{if(selected)tick(page,responseEdges[i],responseEdges[i+1],cursor+1);});
      } else {
        if (offset >= columns[0].length) text(page,wrap(`${row.title} (ต่อ)`,font,titleEnd-left-6)[0],left+3,cursor+2);
        text(page,'(ต่อ)',titleEnd+3,cursor+2,6);
      }
      cursor+=height; line(page,left,cursor,right,cursor); offset+=count;
    }
  }
  // Retain blank form rows below the last item.
  for (let y=cursor+14.35; y<bottom-.5; y+=14.35) line(page,left,y,right,y);
  pages.forEach((page,i)=>{
    page.drawRectangle({x:744,y:pageHeight-33,width:68,height:12,color:rgb(1,1,1)});
    text(page,`หน้า ${i+1}/${pages.length}`,746,23,8);
  });
  doc.setTitle('บัญชีความเสี่ยง FM-QPS-QSH-001/04'); doc.setProducer('Hospital Risk Management');
  return doc.save();
}
