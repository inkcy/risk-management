import Link from 'next/link';
import { getIncidents, categoryLabel } from '@/lib/api';
import { DemoBanner } from '@/components/DemoBanner';

export const dynamic = 'force-dynamic';

const sevBadge = (s: string) =>
  ['E', 'F', 'G', 'H', 'I'].includes(s) ? 'badge-red'
  : ['C', 'D'].includes(s) ? 'badge-amber' : 'badge-blue';

const rcaBadge = (s: string) =>
  s === 'done' ? 'badge-purple'
  : s === 'in_progress' ? 'badge-amber'
  : s === 'not_required' ? 'badge-blue' : 'badge-green';

const rcaLabel = (s: string) =>
  s === 'done' ? 'RCA แล้ว'
  : s === 'in_progress' ? 'กำลัง RCA'
  : s === 'not_required' ? 'ไม่ต้องทำ' : 'รอดำเนินการ';

export default async function IncidentsPage() {
  const { data: incidents, error } = await getIncidents();

  return (
    <>
      <DemoBanner error={error} />
      <div className="card">
        <div className="card-header">
          <div className="card-title">รายการอุบัติการณ์ทั้งหมด</div>
          <span className="badge badge-red">
            {incidents.filter(i => ['E','F','G','H','I'].includes(i.severity)).length} รายการรุนแรง
          </span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>รหัส</th>
                <th>วันที่</th>
                <th>เหตุการณ์</th>
                <th>หน่วยงาน</th>
                <th>ประเภท</th>
                <th>ระดับ</th>
                <th>สถานะ RCA</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map(inc => (
                <tr key={inc.id}>
                  <td>
                    <Link href={`/rca?ir=${encodeURIComponent(inc.ir_code)}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                      {inc.ir_code}
                    </Link>
                  </td>
                  <td style={{ color: 'var(--text3)' }}>
                    {new Date(inc.occurred_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </td>
                  <td>{inc.title}</td>
                  <td style={{ color: 'var(--text3)' }}>{inc.unit_name ?? '—'}</td>
                  <td style={{ color: 'var(--text3)' }}>{categoryLabel[inc.category] ?? inc.category}</td>
                  <td><span className={`badge ${sevBadge(inc.severity)}`}>{inc.severity}</span></td>
                  <td><span className={`badge ${rcaBadge(inc.rca_status)}`}>{rcaLabel(inc.rca_status)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
