// Rebuild the bundled reference dataset from the supplied PowerPoint.
const fs = require('node:fs');
const path = require('node:path');
const JSZip = require('jszip');
const decode = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
const texts = s => [...s.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map(m => decode(m[1])).join('');
(async () => {
  const zip = await JSZip.loadAsync(fs.readFileSync(process.argv[2]));
  const indicators = [], notes = [];
  for (let slide = 2; slide <= 8; slide++) {
    const xml = await zip.file(`ppt/slides/slide${slide}.xml`).async('string');
    if (slide >= 7) notes.push({ slide, text: texts(xml) });
    for (const row of xml.matchAll(/<a:tr\b[^>]*>([\s\S]*?)<\/a:tr>/g)) {
      const cells = [...row[1].matchAll(/<a:tc\b[^>]*>([\s\S]*?)<\/a:tc>/g)].map(m => texts(m[1]).trim());
      if (!cells[0] || cells[0].startsWith('ตัวชี้วัด') || cells[0].includes('1. Safety') || cells[0].startsWith('Never Event') || cells[0].startsWith('Harm Free Care')) continue;
      const raw = cells.slice(2,7);
      const values = raw.map(v => {
        if (!v || v === 'NA') return null;
        if (/^ไตร/.test(v)) {
          const matches = [...v.matchAll(/=\s*(\d+(?:\.\d+)?)/g)];
          return matches.length ? matches.reduce((sum,m) => sum + Number(m[1]),0) : null;
        }
        const n = v.match(/^\d+(?:\.\d+)?/); return n ? Number(n[0]) : null;
      });
      const targetText = cells[1] || (slide === 5 ? (cells[0].includes('Harm Free') ? '> 98%' : '0 ครั้ง') : '');
      const target = Number(targetText.match(/\d+(?:\.\d+)?/)?.[0] ?? 0);
      indicators.push({ id: `s${slide}-${indicators.length+1}`, group: slide === 2 ? 'การผ่าตัดและการติดเชื้อ' : slide === 3 ? 'ความปลอดภัยด้านยา' : slide === 4 ? 'การดูแลและการวินิจฉัย' : 'Never Event และ Harm Free Care', name: cells[0], targetText, target, comparison: targetText.includes('<') ? 'lt' : targetText.includes('>') ? 'gt' : 'eq', unit: cells[0].includes('ร้อยละ') ? '%' : targetText.includes('1,000') ? targetText.replace(/^.*?\//,'ต่อ ') : 'ครั้ง', values, raw, benchmark: cells[7] || '', slide, note: slide === 4 && cells[0].includes('ห้องปฏิบัติการ') ? 'ปี 2567 เปลี่ยนชื่อตัวชี้วัดและเป้าหมาย ข้อมูลก่อนและหลังอาจเปรียบเทียบโดยตรงไม่ได้' : '' });
    }
  }
  const data = { periods: ['2564','2565','2566','2567','2568 Q1–Q3'], indicators, notes, source: path.basename(process.argv[2]), sourceNote: 'ข้อมูลปี 2568 เป็นข้อมูลระหว่างปีตามที่ระบุในต้นฉบับ ไม่ใช่ผลทั้งปี ช่องว่าง/NA หมายถึงไม่มีข้อมูล ไม่ใช่ศูนย์ จำนวนเหตุการณ์แต่ละตัวชี้วัดอาจเป็นเหตุการณ์เดียวกัน จึงไม่ควรรวมยอดข้ามตัวชี้วัด Benchmark อ้างอิงปี 2567 ตามต้นฉบับ ซึ่งระบุวันที่แหล่งข้อมูล 31 กรกฎาคม 2567 แม้มีข้อมูลปี 2568' };
  for (const item of indicators) {
    if (item.slide === 5) item.periods = ['2564','2565','2566','2567','2568 (ไม่ระบุช่วง)'];
  }
  const mmu = [
    ['Prescribing OPD (อัตรา)',1.5,'lt',0.53,0.74,'อัตราตามต้นฉบับ (ไม่ระบุฐาน)'],
    ['Prescribing OPD ระดับ E ขึ้นไป',0,'eq',1,0,'ครั้ง'],
    ['Prescribing IPD (อัตรา)',2,'lt',4.76,7.01,'อัตราตามต้นฉบับ (ไม่ระบุฐาน)'],
    ['Prescribing IPD ระดับ E ขึ้นไป',0,'eq',1,1,'ครั้ง'],
    ['Dispensing OPD (อัตรา)',0.1,'lt',0.01,0.06,'อัตราตามต้นฉบับ (ไม่ระบุฐาน)'],
    ['Dispensing OPD ระดับ E ขึ้นไป',0,'eq',0,0,'ครั้ง'],
    ['Dispensing IPD (อัตรา)',1,'lt',0.68,2.29,'อัตราตามต้นฉบับ (ไม่ระบุฐาน)'],
    ['Dispensing IPD ระดับ E ขึ้นไป',0,'eq',0,1,'ครั้ง'],
    ['Administration OPD ระดับ A–B',0.5,'lt',0,0,'ครั้ง / 1,000 ใบสั่งยา'],
    ['Administration OPD ระดับ C–I ยาทั่วไป',0.1,'lt',0,0.03,'ครั้ง / 1,000 ใบสั่งยา'],
    ['Administration OPD ระดับ E–I ยาทั่วไป',0,'eq',0,0,'ครั้ง'],
    ['Administration OPD ระดับ C–I ยา HAD',0,'eq',0,0,'ครั้ง'],
    ['Administration IPD ระดับ A–B',3,'lt',3.77,3.29,'ครั้ง / 1,000 วันนอน'],
    ['Administration IPD ระดับ C–D ยาทั่วไป',1,'lt',1.06,1.3,'ครั้ง / 1,000 วันนอน'],
    ['Administration IPD ระดับ E–I ยาทั่วไป',0,'eq',1,1,'ครั้ง'],
    ['Administration IPD ระดับ C–I ยา HAD',0,'eq',null,null,'ครั้ง'],
  ];
  mmu.forEach(([name,target,comparison,q1,q2,unit],i) => indicators.push({id:`mmu-${i+1}`,group:'ข้อมูลยา MMU รายไตรมาส',name,target,targetText:`${comparison==='lt'?'< ':''}${target}`,comparison,unit,periods:['2568 Q1','2568 Q2'],values:[q1,q2],raw:[q1===null?'':String(q1),q2===null?'':String(q2)],benchmark:'',slide:i<14?7:8,note:i===15?'ต้นฉบับรายงานรวม 4 ครั้ง ช่วงมกราคม–มีนาคม 2568 โดยไม่ได้แยกเป็นไตรมาส จึงไม่ลงค่าใน Q1/Q2':''}));
  const had = indicators.find(i => i.id === 'mmu-16');
  had.periods = ['ม.ค.–มี.ค. 2568']; had.values = [4]; had.raw = ['4'];
  const allergy = [[63,31,26,33,10],[1,0,1,1,0],[0,2,0,0,1],[0,0,0,0,0]];
  ['เกือบแพ้ยาซ้ำ (Near miss)','แพ้ยาซ้ำ ระดับ C–D','แพ้ยาซ้ำ ระดับ E ขึ้นไป','แพ้ยาซ้ำ ระดับ G ขึ้นไป'].forEach((name,i) => indicators.push({id:`allergy-${i}`,group:'การแพ้ยาซ้ำ',name,target:0,targetText:i===0?'ไม่กำหนด':'0 ครั้ง',comparison:i===0?'none':'eq',unit:'ครั้ง',periods:['2563','2564','2565','2566','2567'],values:allergy[i],raw:allergy[i].map(String),benchmark:'',slide:6,note:i===0?'จำนวน Near miss เป็นการตรวจพบก่อนเกิดเหตุ ไม่ควรแปลผลว่าค่าน้อยกว่าดีกว่า':''}));
  fs.mkdirSync(path.join(__dirname,'../lib/data'), {recursive:true});
  fs.writeFileSync(path.join(__dirname,'../lib/data/safety.json'),JSON.stringify(data,null,2)+'\n');
  fs.writeFileSync(path.join(__dirname,'../public/safety-source-slide6.png'),await zip.file('ppt/media/image4.png').async('nodebuffer'));
  console.log(`Imported ${indicators.length} indicators and ${notes.length} supplementary slides`);
})();
