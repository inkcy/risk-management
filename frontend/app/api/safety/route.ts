import { NextRequest, NextResponse } from 'next/server';
import { audit, requireReadAccess, requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { loadSafety } from '@/lib/safety';

export const dynamic = 'force-dynamic';

export async function GET() {
  const denied = await requireReadAccess();
  if (denied) return denied;
  const result = await loadSafety();
  if (result.error) return NextResponse.json({error:result.error},{status:503,headers:{'Cache-Control':'no-store'}});
  return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
}

export async function PUT(request:NextRequest) {
  const auth=await requireRole('admin');
  if (!auth.ok) return auth.response;
  try {
    const body=await request.json();
    const data=body.data;
    const strings=(a:unknown):a is string[]=>Array.isArray(a)&&a.length>0&&a.length<=30&&a.every(v=>typeof v==='string'&&v.length<=3000);
    if (!Number.isInteger(body.revision)||body.revision<0||!data||!strings(data.periods)||!Array.isArray(data.indicators)||data.indicators.length<1||data.indicators.length>200||JSON.stringify(data).length>500000||!Array.isArray(data.notes)||typeof data.source!=='string'||typeof data.sourceNote!=='string') return NextResponse.json({error:'รูปแบบข้อมูลไม่ถูกต้อง'},{status:400});
    if (data.years!==undefined&&(!Array.isArray(data.years)||data.years.length>200||!data.years.every((y:unknown)=>typeof y==='number'&&Number.isInteger(y)&&y>=2400&&y<=2800)||new Set(data.years).size!==data.years.length)) return NextResponse.json({error:'รายการปีไม่ถูกต้อง'},{status:400});
    if (data.deletedIndicators !== undefined && (!Array.isArray(data.deletedIndicators) || data.deletedIndicators.length > 200)) return NextResponse.json({error:'รายการตัวชี้วัดที่ลบไม่ถูกต้อง'},{status:400});
    const noteSlides=new Set();
    if (data.sourceNote.length>10000||data.notes.length>100) return NextResponse.json({error:'ข้อความยาวเกินกำหนด'},{status:400});
    for (const note of data.notes) {
      if (!note||!Number.isInteger(note.slide)||note.slide<1||noteSlides.has(note.slide)||typeof note.text!=='string'||note.text.length>50000||(note.title!==undefined&&(typeof note.title!=='string'||note.title.length>300))) return NextResponse.json({error:'กรุณาตรวจสอบหัวข้อและข้อความประกอบ (ข้อความไม่เกิน 50,000 ตัวอักษร)'},{status:400});
      noteSlides.add(note.slide);
    }
    const ids=new Set();
    for (const item of [...data.indicators, ...(data.deletedIndicators ?? [])]) {
      if (item?.measurements !== undefined) {
        const seen=new Set();
        if (!Array.isArray(item.measurements)||item.measurements.length>5000) return NextResponse.json({error:'ข้อมูลช่วงเวลาไม่ถูกต้อง'},{status:400});
        for (const r of item.measurements) {
          if (!r||!['month','quarter','year'].includes(r.mode)||!Number.isInteger(r.year)||r.year<2400||r.year>2800||!Number.isInteger(r.period)||r.period<1||r.period>(r.mode==='month'?12:r.mode==='quarter'?4:1)||(r.value!==null&&(typeof r.value!=='number'||!Number.isFinite(r.value)||r.value<0))) return NextResponse.json({error:'กรุณาตรวจสอบปี ช่วงเวลา และค่าตัวเลข'},{status:400});
          if (r.basis!==undefined&&!['calendar','fiscal'].includes(r.basis)) return NextResponse.json({error:'ประเภทปีไม่ถูกต้อง'},{status:400});
          const key=`${r.mode}:${r.year}:${r.period}:${r.mode==='year'?r.basis??'fiscal':''}`;
          if(seen.has(key)) return NextResponse.json({error:'พบช่วงเวลาซ้ำ'},{status:400});
          seen.add(key);
        }
      }
      if (!item||!['id','group','name','unit','targetText','benchmark','note'].every(k=>typeof item[k]==='string'&&item[k].length<=5000)||ids.has(item.id)||!['lt','gt','lte','gte','eq','none'].includes(item.comparison)||!Number.isFinite(item.target)||item.target<0||!Number.isInteger(item.slide)||!Array.isArray(item.raw)||!item.raw.every((v:unknown)=>typeof v==='string')||(item.periods&&!strings(item.periods))||!Array.isArray(item.values)||item.values.length!==(item.periods??data.periods).length||!item.values.every((v:unknown)=>v===null||(typeof v==='number'&&Number.isFinite(v)&&v>=0))) return NextResponse.json({error:'กรุณาตรวจสอบตัวชี้วัดและค่าตัวเลข (ต้องไม่ติดลบ)'},{status:400});
      ids.add(item.id);
    }
    await query('CREATE TABLE IF NOT EXISTS safety_dashboard (id INTEGER PRIMARY KEY CHECK (id=1), data JSONB NOT NULL, revision INTEGER NOT NULL DEFAULT 1, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())');
    const result=body.revision===0
      ? await query('INSERT INTO safety_dashboard (id,data) VALUES (1,$1) ON CONFLICT DO NOTHING RETURNING revision',[JSON.stringify(data)])
      : await query('UPDATE safety_dashboard SET data=$1,revision=revision+1,updated_at=now() WHERE id=1 AND revision=$2 RETURNING revision',[JSON.stringify(data),body.revision]);
    if (!result.rows[0]) return NextResponse.json({error:'มีผู้แก้ไขข้อมูลล่าสุดแล้ว กรุณารีเฟรชหน้าและลองอีกครั้ง'},{status:409});
    await audit(auth.user,'safety.update','safety_dashboard',1,{revision:result.rows[0].revision});
    return NextResponse.json({revision:result.rows[0].revision});
  } catch(error) { console.error('save safety failed',error); return NextResponse.json({error:'บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง'},{status:500}); }
}
