import Link from 'next/link';
import { getStats, getActions, getIncidents, categoryLabel } from '@/lib/api';
import { BarChart } from '@/components/BarChart';
import { DemoBanner } from '@/components/DemoBanner';
import { SafetyDashboard } from '@/components/SafetyDashboard';
import { loadSafety } from '@/lib/safety';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const thaiMonth: Record<string, string> = {
  '01': 'ม.ค.', '02': 'ก.พ.', '03': 'มี.ค.', '04': 'เม.ย.',
  '05': 'พ.ค.', '06': 'มิ.ย.', '07': 'ก.ค.', '08': 'ส.ค.',
  '09': 'ก.ย.', '10': 'ต.ค.', '11': 'พ.ย.', '12': 'ธ.ค.',
};

const sevBadge = (s: string) =>
  ['E', 'F', 'G', 'H', 'I'].includes(s) ? 'badge-red'
  : ['C', 'D'].includes(s) ? 'badge-amber' : 'badge-blue';

export default async function DashboardPage() {
  const [safety, user] = await Promise.all([loadSafety(), getSessionUser()]);
  const safetyDashboard = (
    <SafetyDashboard initial={safety.data} initialRevision={safety.revision} canEdit={user?.role === 'admin'} loadError={safety.error} />
  );

  // Keep incident summaries and details out of the viewer's server response.
  if (user?.role !== 'admin' && user?.role !== 'editor') {
    return safetyDashboard;
  }

  const [{ data: stats, error: statsErr }, { data: actions }, { data: incidents }] = await Promise.all([
    getStats(),
    getActions(),
    getIncidents(),
  ]);

  const recent = incidents.slice(0, 3);
  const remainingAction = actions.find(a => a.status === 'in_progress');
  const overallProgress = actions.length > 0
    ? Math.round(actions.reduce((sum, action) => sum + action.progress, 0) / actions.length)
    : 0;
  const now = new Date();
  const fiscalYear = now.getFullYear() + 543 + (now.getMonth() >= 9 ? 1 : 0);

  const monthly = stats.by_month.map(m => ({
    label: thaiMonth[m.ym.split('-')[1]] || m.ym,
    value: m.count,
  }));

  const categoryColors: Record<string, string> = {
    medication: 'var(--red)',
    communication: '#a088f8',
    fall: 'var(--accent)',
    blood: 'var(--amber)',
    procedure: 'var(--green)',
    other: 'var(--text2)',
  };

  const maxCategory = Math.max(...stats.by_category.map(c => c.count), 1);

  return (
    <>
      <DemoBanner error={statsErr} />
      {safetyDashboard}

      <div className="stats-row">
        <div className="stat-card blue">
          <div className="stat-label">อุบัติการณ์ทั้งหมด</div>
          <div className="stat-val">{stats.totals.incidents}</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">ระดับ E–I รุนแรง</div>
          <div className="stat-val">{stats.totals.severe}</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-label">RCA รอดำเนินการ</div>
          <div className="stat-val">{stats.totals.rca_pending}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">มาตรการแก้ไขเสร็จ</div>
          <div className="stat-val">{stats.totals.actions_done}</div>
        </div>
      </div>

      <div className="grid-13">
        <div className="card">
          <div className="card-header">
            <div className="card-title">อุบัติการณ์รายเดือน</div>
            <span className="badge badge-blue">ปีงบประมาณ {fiscalYear}</span>
          </div>
          <div className="card-body">
            <BarChart data={monthly} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">เหตุการณ์ด่วน</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className="notif-dot"></div>
              <span style={{ fontSize: 12.6, color: 'var(--text3)' }}>{recent.length} รายการ</span>
            </div>
          </div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            {recent.map(inc => (
              <Link key={inc.id} href={`/rca?ir=${encodeURIComponent(inc.ir_code)}`} className="incident-item" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className={`inc-dot ${['E','F','G','H','I'].includes(inc.severity) ? 'red' : ['C','D'].includes(inc.severity) ? 'amber' : ''}`}
                     style={!['E','F','G','H','I','C','D'].includes(inc.severity) ? { background: 'var(--accent)' } : undefined}></div>
                <div className="inc-id">
                  {inc.ir_code}<br />
                  {new Date(inc.occurred_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                </div>
                <div className="inc-body">
                  <div className="inc-title">{inc.title}</div>
                  <div className="inc-meta">{inc.unit_name} · {categoryLabel[inc.category] ?? inc.category}</div>
                </div>
                <div className="inc-right"><span className={`badge ${sevBadge(inc.severity)}`}>{inc.severity}</span></div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><div className="card-title">ประเภทอุบัติการณ์</div></div>
          <div className="card-body">
            {stats.by_category.map(c => (
              <div className="progress-item" key={c.category}>
                <div className="prog-header">
                  <span className="prog-name">{categoryLabel[c.category] ?? c.category}</span>
                  <span className="prog-count">{c.count}</span>
                </div>
                <div className="prog-bar">
                  <div className="prog-fill" style={{
                    width: `${(c.count / maxCategory) * 100}%`,
                    background: categoryColors[c.category] ?? 'var(--accent)',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">สถานะมาตรการแก้ไขทั้งหมด</div></div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 29.9, fontWeight: 600, color: 'var(--green)' }}>{stats.totals.actions_done}</div>
                <div style={{ fontSize: 12.6, color: 'var(--text3)', marginTop: 2 }}>เสร็จแล้ว</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 29.9, fontWeight: 600, color: 'var(--amber)' }}>{stats.totals.actions_in_progress}</div>
                <div style={{ fontSize: 12.6, color: 'var(--text3)', marginTop: 2 }}>กำลังดำเนินการ</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 29.9, fontWeight: 600, color: 'var(--accent)' }}>{stats.totals.actions_planned}</div>
                <div style={{ fontSize: 12.6, color: 'var(--text3)', marginTop: 2 }}>วางแผนแล้ว</div>
              </div>
            </div>
            <div className="progress-item">
              <div className="prog-header"><span className="prog-name">ความคืบหน้าโดยรวม</span><span className="prog-count">{overallProgress}%</span></div>
              <div className="prog-bar" style={{ height: 8 }}>
                <div className="prog-fill" style={{ width: `${overallProgress}%`, background: 'var(--green)' }}></div>
              </div>
            </div>
            {remainingAction && (
              <div style={{ marginTop: 16, fontSize: 12.6, color: 'var(--text3)', lineHeight: 1.6 }}>
                คงเหลือ &quot;{remainingAction.title}&quot; — กำหนดเสร็จ {remainingAction.due_date ?? '—'}
              </div>
            )}
          </div>
        </div>
      </div>

    </>
  );
}
