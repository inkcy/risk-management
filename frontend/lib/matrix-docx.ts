import { readFile } from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import { DOMParser, XMLSerializer, type Element, type Document } from '@xmldom/xmldom';
import type { MatrixOptions, MatrixResult } from './matrix-analysis';
import type { MatrixExportNote, MatrixTreatment } from './matrix-treatment';

import { applyMatrixAdvice } from './matrix-treatment';
import { baselineMatrixAdvice, matrixReportContent } from './matrix-content';

const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const children = (parent: Element, name: string) => Array.from(parent.childNodes).filter(node => node.nodeType === 1 && node.localName === name && node.namespaceURI === ns) as Element[];
const first = (parent: Element, name: string) => children(parent, name)[0];
function element(doc: Document, name: string, attrs: Record<string, string> = {}) {
  const node = doc.createElementNS(ns, `w:${name}`);
  Object.entries(attrs).forEach(([key, value]) => node.setAttributeNS(ns, `w:${key}`, value));
  return node;
}
function property(parent: Element, name: string) {
  const existing = first(parent, name);
  if (existing) return existing;
  const node = element(parent.ownerDocument!, name); parent.insertBefore(node, parent.firstChild); return node;
}
function fill(cell: Element, value: string, centered = false, font = 'Cordia New', size = 28) {
  const doc = cell.ownerDocument!;
  const original = first(cell, 'p');
  const paragraph = original ? original.cloneNode(true) as Element : element(doc, 'p');
  Array.from(paragraph.childNodes).forEach(node => { if (node.nodeType !== 1 || node.localName !== 'pPr') paragraph.removeChild(node); });
  const props = property(paragraph, 'pPr');
  for (const name of ['jc', 'ind', 'rPr', 'spacing']) children(props,name).forEach(node=>props.removeChild(node));
  props.appendChild(element(doc,'jc',{val:centered?'center':'left'}));
  props.appendChild(element(doc,'spacing',{before:'0',after:'0'}));
  props.appendChild(element(doc,'snapToGrid',{val:'0'}));
  const run = element(doc,'r'), runProps = element(doc,'rPr');
  runProps.appendChild(element(doc,'rFonts',{ascii:font,hAnsi:font,cs:font}));
  runProps.appendChild(element(doc,'sz',{val:String(size)})); runProps.appendChild(element(doc,'szCs',{val:String(size)}));
  run.appendChild(runProps);
  value.split('\n').forEach((line,index)=>{
    if(index)run.appendChild(element(doc,'br'));
    const text=element(doc,'t');text.setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve');text.appendChild(doc.createTextNode(line));run.appendChild(text);
  });
  paragraph.appendChild(run);
  children(cell,'p').forEach(node=>cell.removeChild(node));cell.appendChild(paragraph);
  const cellProps=property(cell,'tcPr');
  children(cellProps,'tcMar').forEach(node=>cellProps.removeChild(node));
  const margins=element(doc,'tcMar');
  margins.appendChild(element(doc,'left',{w:centered?'10':'45',type:'dxa'}));
  margins.appendChild(element(doc,'right',{w:centered?'10':'45',type:'dxa'}));cellProps.appendChild(margins);
}
function span(cell: Element, widths: number[]) {
  const props=property(cell,'tcPr');
  children(props,'gridSpan').forEach(node=>props.removeChild(node));
  property(props,'tcW').setAttributeNS(ns,'w:w',String(widths.reduce((sum,width)=>sum+width,0)));
  if(widths.length>1)props.appendChild(element(cell.ownerDocument!,'gridSpan',{val:String(widths.length)}));
}

/** Fill a copy of the user's Word form; all other ZIP members stay unchanged. */
export async function buildMatrixDocx(rows: MatrixResult[], treatments: MatrixTreatment[], options: MatrixOptions, unitName: string, notes: MatrixExportNote[] = []) {
  treatments = applyMatrixAdvice(rows.map(row => row.id), treatments, baselineMatrixAdvice(rows));
  const zip=await JSZip.loadAsync(await readFile(path.join(process.cwd(),'templates/risk-profile-form.docx')));
  const source=await zip.file('word/document.xml')!.async('string');
  const doc=new DOMParser().parseFromString(source,'application/xml');
  const body=doc.getElementsByTagNameNS(ns,'body')[0];
  const [heading,table]=children(body,'tbl');
  const headingRows=children(heading,'tr');
  const months=[['ตุลาคม','ธันวาคม'],['มกราคม','มีนาคม'],['เมษายน','มิถุนายน'],['กรกฎาคม','กันยายน']][options.quarter-1];
  const metadata=first(headingRows[1],'tc');
  fill(metadata,`ชื่อหน่วยงาน ${unitName || 'ยังไม่ระบุ'}    ไตรมาสที่ ${options.quarter} (เดือน${months[0]}–เดือน${months[1]}) ประจำปีงบประมาณ ${options.year}`,true,'Cordia New',28);
  const templateRows=children(table,'tr'), original=templateRows[4].cloneNode(true) as Element;
  const baseCells=children(original,'tc');
  const widths=children(first(table,'tblGrid'),'gridCol').map(node=>Number(node.getAttributeNS(ns,'w')));
  const clinical=options.type==='clinical';
  const labels=clinical?['A','B','C','D','E','F','G','H','I']:['1','2','3','4','5'];
  const groups=clinical?labels.map((_,i)=>[i]):[[0,1],[2,3],[4,5],[6,7],[8]];
  if(!clinical){
    const header=templateRows[2], cells=children(header,'tc');
    groups.forEach((group,index)=>{
      const cell=cells[2+group[0]].cloneNode(true) as Element;
      span(cell,group.map(i=>widths[2+i]));fill(cell,labels[index],true,'Arial',16);header.insertBefore(cell,cells[2]);
    });
    cells.slice(2,11).forEach(cell=>header.removeChild(cell));
  }
  templateRows.slice(3).forEach(row=>table.removeChild(row));
  for(const row of rows){
    const item=treatments.find(item=>item.id===row.id);
    if(!item)throw new Error('ข้อมูลการจัดการความเสี่ยงไม่ครบ');
    const result=original.cloneNode(true) as Element;
    children(result,'tc').forEach(cell=>result.removeChild(cell));
    // Let long rows flow over a page, avoiding clipped paragraphs.
    const rowProps=property(result,'trPr');children(rowProps,'cantSplit').forEach(node=>rowProps.removeChild(node));
    const append=(index:number,value:string,centered=false,font='Cordia New',size=28)=>{
      const cell=baseCells[index].cloneNode(true) as Element;fill(cell,value,centered,font,size);result.appendChild(cell);return cell;
    };
    const content = matrixReportContent(row, item, notes.find(note => note.id === row.id));
    append(0,content.title);
    append(1,String(row.frequency),true,'Arial',16);
    const range=row.severity.toUpperCase().split(/[–-]/), start=labels.indexOf(range[0]), end=labels.indexOf(range.at(-1)!);
    if(start<0||end<start)throw new Error('ระดับความรุนแรงไม่ตรงกับแบบฟอร์ม');
    for(let i=0;i<labels.length;i++){
      const selected=i===start;
      const covered=selected?groups.slice(start,end+1).flat():groups[i];
      const cell=append(2+covered[0],selected?String(row.frequency):'',true,'Arial',16);
      span(cell,covered.map(index=>widths[2+index]));
      if(selected)i=end;
    }
    ['green','yellow','orange','red'].forEach((color,index)=>append(11+index,row.color===color?'✓':'',true,'Segoe UI Symbol',20));
    [item.transferPrevention,item.monitorControl,item.mitigation].forEach((selected,index)=>append(15+index,selected?'✓':'',true,'Segoe UI Symbol',20));
    append(18,content.measures);
    append(19,content.reviewFrequency);
    table.appendChild(result);
  }
  // Repeat the source title and metadata with its table headers, leaving room for the logo on every page.
  const anchor=children(table,'tr')[0];
  for(const row of headingRows){
    const copy=row.cloneNode(true) as Element;
    span(first(copy,'tc'),widths);
    property(copy,'trPr').appendChild(element(doc,'tblHeader'));
    table.insertBefore(copy,anchor);
  }
  body.removeChild(heading);
  // Blank rows are source rows, not recreated styling. Keep a short single-page form filled out.
  const estimatedLines=rows.reduce((sum,row)=>{
    const item=treatments.find(item=>item.id===row.id)!;
    const content=matrixReportContent(row,item,notes.find(note=>note.id===row.id));
    return sum+Math.max(1,content.title.split('\n').reduce((n,line)=>n+Math.max(1,Math.ceil(line.length/40)),0),content.measures.split('\n').reduce((n,line)=>n+Math.max(1,Math.ceil((line.length+6)/30)),0),Math.ceil(content.reviewFrequency.length/17));
  },0);
  for(let i=estimatedLines;i<12;i++){
    const blank=original.cloneNode(true) as Element;
    if(!clinical){
      const cells=children(blank,'tc');
      groups.forEach(group=>{const cell=cells[2+group[0]].cloneNode(true) as Element;span(cell,group.map(i=>widths[2+i]));blank.insertBefore(cell,cells[2]);});
      cells.slice(2,11).forEach(cell=>blank.removeChild(cell));
    }
    table.appendChild(blank);
  }
  // Keep the signature block attached to the last table row on continuation pages.
  const lastRow=children(table,'tr').at(-1)!;
  Array.from(lastRow.getElementsByTagNameNS(ns,'p')).forEach(p=>property(p,'pPr').appendChild(element(doc,'keepNext')));
  let following=table.nextSibling;
  while(following && following.nodeType===1 && following.localName==='p'){property(following as Element,'pPr').appendChild(element(doc,'keepNext'));following=following.nextSibling;}
  zip.file('word/document.xml',new XMLSerializer().serializeToString(doc));
  return zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});
}
