import type { SafetyIndicator, SafetyMeasurement } from './safety';
export type PeriodMode = SafetyMeasurement['mode'];
export const fiscalMonths = ['ตุลาคม','พฤศจิกายน','ธันวาคม','มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน'];
export function periodLabel(label:string,mode:PeriodMode,year:number,period:number):string {
  return mode==='month'?fiscalMonths[period-1]??label:mode==='year'?label:`${label} ${year}`;
}

/** Keep source totals separate: rates cannot be summed or averaged without denominators. */
export function referenceQuarters(item:SafetyIndicator, defaults:string[]):SafetyMeasurement[] {
  const result:SafetyMeasurement[]=[];
  const add=(year:number,period:number,value:number)=>{
    if(!result.some(r=>r.year===year&&r.period===period)) result.push({year,mode:'quarter',period,value});
  };
  (item.periods??defaults).forEach((label,index)=>{
    const year=Number(label.match(/^\d{4}/)?.[0]);
    const quarter=label.match(/^\d{4} Q([1-4])$/);
    if(quarter&&item.values[index]!==null) add(year,Number(quarter[1]),item.values[index]!);
    // These source cells explicitly enumerate separate quarters, unlike Q1–Q3 totals.
    if(item.slide===3||item.slide===4){
      const raw=item.raw[index]??'';
      for(const match of raw.matchAll(/ไตร(?:มาส)?\s*([1-4])\s*=\s*(\d+(?:\.\d+)?)/g)) add(year,Number(match[1]),Number(match[2]));
    }
  });
  return result;
}

export function periodSeries(item:SafetyIndicator,defaults:string[],mode:PeriodMode,year:number) {
  const records=item.measurements??[];
  if(mode==='year') {
    const source=(item.periods??defaults).map((label,i)=>({label,value:item.values[i],year:Number(label.match(/^\d{4}/)?.[0])})).filter(r=>/^\d{4}(?:$| Q1[–-]Q3$| \(ไม่ระบุช่วง\)$)/.test(r.label));
    const years=Array.from(new Set([...source.map(r=>r.year),...records.filter(r=>r.mode==='year').map(r=>r.year),year])).sort((a,b)=>a-b);
    return years.map(y=>{
      const record=records.find(r=>r.mode==='year'&&r.year===y);
      const original=source.find(r=>r.year===y);
      return {label:record?`${y}`:original?.label??`${y}`,value:record?record.value:original?.value??null,year:y,period:1};
    });
  }
  const reference=mode==='quarter'?referenceQuarters(item,defaults):[];
  return Array.from({length:mode==='month'?12:4},(_,i)=>{
    // Display January–December, retaining the existing fiscal-period storage keys.
    const period=mode==='month'?(i+3)%12+1:i+1;
    const record=records.find(r=>r.mode===mode&&r.year===year&&r.period===period);
    const fallback=reference.find(r=>r.year===year&&r.period===period);
    return {label:mode==='month'?fiscalMonths[period-1]:`Q${period}`,value:record?record.value:fallback?.value??null,year,period};
  });
}

export function updateMeasurement(item:SafetyIndicator,mode:PeriodMode,year:number,period:number,value:number|null):SafetyMeasurement[] {
  return [...(item.measurements??[]).filter(r=>!(r.mode===mode&&r.year===year&&r.period===period)),{mode,year,period,value}];
}
