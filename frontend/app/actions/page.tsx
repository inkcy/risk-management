import { getActions } from '@/lib/api';
import { DemoBanner } from '@/components/DemoBanner';

export const dynamic = 'force-dynamic';

const statusBadge: Record<string, string> = {
  done: 'badge-green',
  in_progress: 'badge-amber',
  planned: 'badge-blue',
  overdue: 'badge-red',
};

const statusLabel: Record<string, string> = {
  done: 'เสร็จแล้ว',
  in_progress: 'กำลังดำเนินการ',
  planned: 'วางแผนแล้ว',
  overdue: 'เกินกำหนด',
};

const progressColor = (p: number) => p >= 100 ? 'var(--green)' : p >= 50 ? 'var(--accent)' : 'var(--amber)';

export default async function ActionsPage() {
  const { data: actions, error } = await getActions();
  const summary = {
    done: actions.filter(a => a.status === 'done').length,
    in_progress: actions.filter(a => a.status === 'in_progress').length,
    planned: actions.filter(a => a.status === 'planned').length,
    overdue: actions.filter(a => a.status === 'overdue').length,
  };

  return (
    <>
      <DemoBanner error={error} />

      <div className="stats-row">
        <div className="stat-card green">
          <div className="stat-label">เสร็จแล้ว</div>
          <div className="stat-val">{summary.done}</div>
          <div className="stat-change down">{actions.length > 0 ? Math.round(summary.done / actions.length * 100) : 0}% ของทั้งหมด</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-label">กำลังดำเนินการ</div>
          <div className="stat-val">{summary.in_progress}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">วางแผนแล้ว</div>
          <div className="stat-val">{summary.planned}</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">เกินกำหนด</div>
          <div className="stat-val">{summary.overdue}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">รายการมาตรการแก้ไขทั้งหมด</div></div>
        <div className="card-body" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>มาตรการ</th>
                <th>เคส</th>
                <th>ผู้รับผิดชอบ</th>
                <th>กำหนดเสร็จ</th>
                <th>ความคืบหน้า</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {actions.map(a => (
                <tr key={a.id}>
                  <td>{a.title}</td>
                  <td style={{ color: 'var(--text3)' }}>{a.ir_code ?? '—'}</td>
                  <td style={{ color: 'var(--text3)' }}>{a.owner ?? '—'}</td>
                  <td style={{ color: 'var(--text3)' }}>{a.due_date ?? '—'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 4, background: 'var(--bg4)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${a.progress}%`, height: '100%', background: progressColor(a.progress), borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 10, color: progressColor(a.progress) }}>{a.progress}%</span>
                    </div>
                  </td>
                  <td><span className={`badge ${statusBadge[a.status] ?? 'badge-blue'}`}>{statusLabel[a.status] ?? a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
