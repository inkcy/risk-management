import seed from './data/safety.json';
import { dbConfigured, query } from './db';
export type SafetyMeasurement = { year:number; mode:'month'|'quarter'|'year'; period:number; value:number|null; basis?:'calendar'|'fiscal' };
export type SafetyIndicator = { id:string; group:string; name:string; targetText:string; target:number; comparison:string; unit:string; values:(number|null)[]; raw:string[]; periods?:string[]; benchmark:string; slide:number; note:string; measurements?:SafetyMeasurement[] };
export type SafetyData = { periods:string[]; indicators:SafetyIndicator[]; notes:{slide:number;text:string;title?:string}[]; source:string; sourceNote:string; years?:number[] };
export async function loadSafety():Promise<{data:SafetyData; revision:number; error?:string}> {
  if (!dbConfigured()) return {data:seed,revision:0};
  try {
    const {rows}=await query('SELECT data, revision FROM safety_dashboard WHERE id=1');
    return rows[0] ? {data:rows[0].data,revision:rows[0].revision} : {data:seed,revision:0};
  } catch(error) {
    if ((error as {code?:string}).code==='42P01') return {data:seed,revision:0};
    console.error('load safety failed',error);
    return {data:seed,revision:0,error:'โหลดข้อมูลที่แก้ไขไม่สำเร็จ กำลังแสดงข้อมูลอ้างอิงจาก PowerPoint'};
  }
}
