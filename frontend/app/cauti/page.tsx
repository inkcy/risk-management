import { getCauti } from '@/lib/api';
import { DemoBanner } from '@/components/DemoBanner';

export const dynamic = 'force-dynamic';

function fmt(d: string | null) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
  } catch {
    return d;
  }
}

export default async function CautiPage() {
  const { data: patients, error } = await getCauti();

  const active = patients.filter(p => !p.removed_at);
  const overdue = active.filter(p => p.is_overdue);
  const removed = patients.filter(p => p.removed_at);

  return (
    <>
      <DemoBanner error={error} />

      <div className="stats-row">
        <div className="stat-card blue">
          <div className="stat-label">ผู้ป่วยใส่ F/C ทั้งหมด</div>
          <div className="stat-val">{patients.length}</div>
          <div className="stat-change" style={{ color: 'var(--text3)' }}>กำลังติดตาม {active.length}</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">⚠ ใส่เกิน 3 วัน (Overdue)</div>
          <div className="stat-val">{overdue.length}</div>
          <div className="stat-change up">ต้องทบทวนแผน off F/C</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Off F/C ตามแผนแล้ว</div>
          <div className="stat-val">{removed.length}</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-label">ใส่ใหม่วันนี้</div>
          <div className="stat-val">
            {patients.filter(p => p.inserted_at === new Date().toISOString().slice(0, 10)).length}
          </div>
        </div>
      </div>

      {overdue.length > 0 && (
        <div className="card" style={{ marginBottom: 16, borderColor: 'rgba(226,81,74,0.35)' }}>
          <div className="card-header">
            <div className="card-title" style={{ color: 'var(--red)' }}>
              ⚠ QuickAlert — ใส่ F/C เกิน 3 วัน {overdue.length} ราย
            </div>
            <span className="badge badge-red">ต้องทบทวนทันที</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>เตียง</th>
                  <th>ผู้ป่วย</th>
                  <th>HN</th>
                  <th>Dx</th>
                  <th>วันใส่ F/C</th>
                  <th>วันแผน off</th>
                  <th>จำนวนวัน</th>
                </tr>
              </thead>
              <tbody>
                {overdue.map(p => (
                  <tr key={p.id}>
                    <td><span className="badge badge-red">{p.bed}</span></td>
                    <td>{p.patient_name} {p.age ? `(${p.age})` : ''}</td>
                    <td style={{ color: 'var(--text3)' }}>{p.hn ?? '—'}</td>
                    <td style={{ color: 'var(--text3)' }}>{p.diagnosis ?? '—'}</td>
                    <td>{fmt(p.inserted_at)}</td>
                    <td>{fmt(p.plan_off_date)}</td>
                    <td>
                      <span className="badge badge-red">{p.days_in} วัน</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="card-title">CAUTI QuickAlert — ทะเบียนผู้ป่วยใส่สาย Foley catheter</div>
          <span className="badge badge-blue">{active.length} กำลังติดตาม</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>เตียง</th>
                <th>ผู้ป่วย</th>
                <th>อายุ</th>
                <th>HN</th>
                <th>Dx</th>
                <th>Ward</th>
                <th>วันใส่</th>
                <th>แผน off</th>
                <th>วัน off จริง</th>
                <th>จำนวนวัน</th>
                <th>สถานะ</th>
                <th>หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {patients.map(p => {
                const status =
                  p.removed_at ? (p.outcome === 'death' ? { cls: 'badge-amber', label: 'เสียชีวิตก่อน off' } : { cls: 'badge-green', label: 'Off แล้ว' })
                  : p.is_overdue ? { cls: 'badge-red',   label: '⚠ เกิน 3 วัน' }
                  : { cls: 'badge-blue',  label: 'กำลังใส่' };
                return (
                  <tr key={p.id}>
                    <td>{p.bed}</td>
                    <td>{p.patient_name}</td>
                    <td style={{ color: 'var(--text3)' }}>{p.age ?? '—'}</td>
                    <td style={{ color: 'var(--text3)' }}>{p.hn ?? '—'}</td>
                    <td style={{ color: 'var(--text3)' }}>{p.diagnosis ?? '—'}</td>
                    <td style={{ color: 'var(--text3)' }}>{p.ward ?? '—'}</td>
                    <td>{fmt(p.inserted_at)}</td>
                    <td style={{ color: 'var(--text3)' }}>{fmt(p.plan_off_date)}</td>
                    <td style={{ color: 'var(--text3)' }}>{fmt(p.removed_at)}</td>
                    <td>{p.days_in}</td>
                    <td><span className={`badge ${status.cls}`}>{status.label}</span></td>
                    <td style={{ color: 'var(--text3)', fontSize: 11 }}>{p.note ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
