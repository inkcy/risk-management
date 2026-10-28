import { getSessionUser } from '@/lib/auth';
import { dbConfigured, query } from '@/lib/db';
import { CultureSurveyForm } from '@/components/CultureSurveyForm';

export const dynamic = 'force-dynamic';

const baseResults = [
  { year: '2564', excellent: '13.3', veryGood: '56.8', combined: '70.1' },
  { year: '2565', excellent: '14.5', veryGood: '52.8', combined: '67.3' },
  { year: '2566', excellent: '18.2', veryGood: '54.1', combined: '72.3' },
  { year: '2567', excellent: '18.2', veryGood: '56.8', combined: '75.0' },
];
const chartGroups = [
  { label: 'Excellent ดีเยี่ยม', values: [209, 192, 287, 289] },
  { label: 'Very Good ดีมาก', values: [890, 701, 852, 903] },
  { label: 'Acceptable ยอมรับได้', values: [459, 422, 459, 389] },
  { label: 'Poor ไม่ดี', values: [9, 11, 13, 9] },
  { label: 'Falling ตก', values: [1, 2, 3, 1] },
];

export default async function CulturePage() {
  const user = await getSessionUser();
  let added: { year: number; counts: number[]; excellent_pct: string; very_good_pct: string; has_report: boolean }[] = [];
  let loadError = false;
  if (dbConfigured()) {
    try { added = (await query<typeof added[number]>('SELECT year, counts, excellent_pct, very_good_pct, report_data IS NOT NULL AS has_report FROM culture_surveys ORDER BY year')).rows; }
    catch (err) { console.error('load culture surveys failed:', err); loadError = true; }
  }
  const results = [...baseResults, ...added.map(row => ({ year: String(row.year), excellent: Number(row.excellent_pct).toFixed(1), veryGood: Number(row.very_good_pct).toFixed(1), combined: (Number(row.excellent_pct) + Number(row.very_good_pct)).toFixed(1) }))];
  const groups = chartGroups.map((group, i) => ({ ...group, values: [...group.values, ...added.map(row => row.counts[i])] }));
  const axisMax = Math.max(1000, Math.ceil(Math.max(...groups.flatMap(group => group.values)) / 200) * 200);
  const colors = ['#5084bd', '#c54d50', '#9dbb55', '#8064a2', '#168eaa', '#d47d26', '#b34382', '#357850'];
  return <>
    <div className="glow-card" style={{ padding: 20, marginBottom: 20 }}>
      <div style={{ fontSize: 20.7, fontWeight: 600 }}>ผลการสำรวจวัฒนธรรมความปลอดภัยของโรงพยาบาลออนไลน์</div>
      <p style={{ marginTop: 6, color: 'var(--text2)', fontSize: 13.8 }}>Hospital Safety Culture Survey Online · ผลสำรวจรายปี</p>
    </div>
    {user?.role === 'admin' && <CultureSurveyForm />}
    {loadError && <p className="announcement-error" role="alert">ไม่สามารถโหลดผลสำรวจปีที่เพิ่มได้ กรุณาตรวจสอบฐานข้อมูล</p>}
    <div className="stats-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
      {results.slice(-2).map(result => <div className="stat-card blue" key={result.year}>
        <div className="stat-label">ระดับความปลอดภัย ดีเยี่ยม + ดีมาก · ปี {result.year}</div>
        <div className="stat-val">{result.combined}%</div>
      </div>)}
    </div>
    <section className="card" style={{ marginBottom: 16 }}>
      <div className="card-header"><div className="card-title">ระดับความปลอดภัยของผู้ป่วย ปี 2564–{results[results.length - 1].year}</div></div>
      <div className="card-body">
        <p style={{ color: 'var(--text2)', fontSize: 13.8, marginBottom: 12 }}>ร้อยละความคิดเห็นของผู้ตอบแบบสำรวจ จำแนกระดับดีเยี่ยมและดีมาก</p>
        <div className="culture-bar-chart">
          <div className="culture-bar-heading">จำนวนผู้ตอบจำแนกตามระดับความปลอดภัยของผู้ป่วย (คน)</div>
          <div className="culture-bar-legend">{results.map((year, i) => <span key={year.year}><i style={{ background: colors[i % colors.length] }} /> ปี {year.year}</span>)}</div>
          <div className="culture-bar-scroll"><div className="culture-bar-layout">
            <div className="culture-bar-yaxis">{[5, 4, 3, 2, 1, 0].map(value => <span key={value}>{Math.round(axisMax * value / 5)}</span>)}</div>
            <div className="culture-bar-groups">{groups.map(group => <div className="culture-bar-group" key={group.label}>
              <div className="culture-bar-columns">{group.values.map((value, i) => <div className="culture-bar-column" key={results[i].year}>
                <div className="culture-bar-fill" style={{ height: `${value / axisMax * 100}%`, background: colors[i % colors.length] }}><span>{value}</span></div>
              </div>)}</div><div className="culture-bar-label">{group.label}</div>
            </div>)}</div>
          </div></div>
          <p className="culture-bar-note">จำนวนคนตามรายงานต้นฉบับ · ตารางด้านล่างแสดงร้อยละ</p>
        </div>
        <div className="data-table-wrap"><table className="data-table">
          <thead><tr><th>ปีงบประมาณ</th><th>ดีเยี่ยม</th><th>ดีมาก</th><th>รวมดีเยี่ยมและดีมาก</th></tr></thead>
          <tbody>{results.map(result => <tr key={result.year}><td>{result.year}</td><td>{result.excellent}%</td><td>{result.veryGood}%</td><td><strong>{result.combined}%</strong></td></tr>)}</tbody>
        </table></div>
        <p style={{ color: 'var(--text3)', fontSize: 12.6, marginTop: 12 }}>ปี 2564–2567: สไลด์ผลการสำรวจ HSCS ปี 2567 หน้า 5 · ปีถัดไป: ข้อมูลที่แอดมินบันทึกจากรายงาน</p>
      </div>
    </section>
    <section className="card">
      <div className="card-header"><div className="card-title">รายงานผลสำรวจฉบับเต็ม</div></div>
      <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <a className="tb-btn tb-btn-ghost" href="/culture/survey-2566.pptx" download>ดาวน์โหลดรายงานปี 2566</a>
        <a className="tb-btn tb-btn-ghost" href="/culture/survey-2567.pptx" download>ดาวน์โหลดรายงานปี 2567</a>
        {added.filter(row => row.has_report).map(row => <a key={row.year} className="tb-btn tb-btn-ghost" href={`/api/culture-surveys/${row.year}`}>ดาวน์โหลดรายงานปี {row.year}</a>)}
      </div>
    </section>
  </>;
}
