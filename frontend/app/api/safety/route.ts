import { NextRequest, NextResponse } from 'next/server';
import { audit, requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
export async function PUT(request:NextRequest) {
  const auth=await requireRole('admin');
  if (!auth.ok) return auth.response;
  try {
    const body=await request.json();
    const data=body.data;
    const strings=(a:unknown):a is string[]=>Array.isArray(a)&&a.length>0&&a.length<=30&&a.every(v=>typeof v==='string'&&v.length<=3000);
    if (!Number.isInteger(body.revision)||body.revision<0||!data||!strings(data.periods)||!Array.isArray(data.indicators)||data.indicators.length<1||data.indicators.length>200||JSON.stringify(data).length>500000||!Array.isArray(data.notes)||typeof data.source!=='string'||typeof data.sourceNote!=='string') return NextResponse.json({error:'รูปแบบข้อมูลไม่ถูกต้อง'},{status:400});
    const ids=new Set();
    for (const item of data.indicators) {
      if (!item||!['id','group','name','unit','targetText','benchmark','note'].every(k=>typeof item[k]==='string'&&item[k].length<=5000)||ids.has(item.id)||!['lt','gt','eq','none'].includes(item.comparison)||!Number.isFinite(item.target)||item.target<0||!Number.isInteger(item.slide)||!Array.isArray(item.raw)||!item.raw.every((v:unknown)=>typeof v==='string')||(item.periods&&!strings(item.periods))||!Array.isArray(item.values)||item.values.length!==(item.periods??data.periods).length||!item.values.every((v:unknown)=>v===null||(typeof v==='number'&&Number.isFinite(v)&&v>=0))) return NextResponse.json({error:'กรุณาตรวจสอบตัวชี้วัดและค่าตัวเลข (ต้องไม่ติดลบ)'},{status:400});
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
