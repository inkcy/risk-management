import { getRcaPage, categoryLabel } from '@/lib/api';
import { DemoBanner } from '@/components/DemoBanner';

export const dynamic = 'force-dynamic';

const hroDimensions = [
  { key: 'hro_sensitivity', label: 'Sensitivity to operation' },
  { key: 'hro_deference', label: 'Deference to expertise' },
  { key: 'hro_reluctance', label: 'Reluctance to simplify' },
  { key: 'hro_preoccupation', label: 'Preoccupation with failure' },
  { key: 'hro_resilience', label: 'Commitment to resilience' },
] as const;

const causeGroupLabels: Record<string, string> = {
  people: 'บุคลากร',
  system: 'ระบบงาน',
  environment: 'สิ่งแวดล้อม',
  management: 'การจัดการ',
};

function scoreColor(n: number) {
  if (n >= 60) return 'var(--green)';
  if (n >= 30) return 'var(--amber)';
  return 'var(--red)';
}

const sevBadge = (s: string) =>
  ['E', 'F', 'G', 'H', 'I'].includes(s) ? 'badge-red'
  : ['C', 'D'].includes(s) ? 'badge-amber' : 'badge-blue';

const actionStatus = (s: string) =>
  s === 'done' ? { cls: 'done', icon: '✓', wrap: 'icon-wrap-green', badge: 'badge-green', label: 'เสร็จแล้ว' }
  : s === 'in_progress' ? { cls: 'wip', icon: '⬡', wrap: 'icon-wrap-amber', badge: 'badge-amber', label: 'กำลังดำเนินการ' }
  : { cls: 'plan', icon: '❄', wrap: 'icon-wrap-blue', badge: 'badge-blue', label: 'วางแผนแล้ว' };

export default async function RcaPage({ searchParams }: { searchParams: Promise<{ ir?: string }> }) {
  const params = await searchParams;
  const { data: bundle, error } = await getRcaPage(params.ir);

  const { incident, case: rca, timeline, causes } = bundle;

  if (!incident) {
    return (
      <>
        <DemoBanner error={error} />
        <div className="card"><div className="card-body">ไม่พบเคสสำหรับวิเคราะห์ RCA</div></div>
      </>
    );
  }

  const groupedCauses = (['people', 'system', 'environment', 'management'] as const).map(g => ({
    group: g,
    items: causes.filter(c => c.category === g),
  }));

  const relatedActions = bundle.actions;

  const exportHref = `/api/rca/${encodeURIComponent(incident.ir_code)}/export`;

  return (
    <>
      <DemoBanner error={error} />

      <div className="glow-card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
              Root Cause Analysis
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{incident.ir_code} — {incident.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              {new Date(incident.occurred_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
              {' · '}{incident.unit_name ?? '—'}{' · '}{categoryLabel[incident.category] ?? incident.category}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
            <span className={`badge ${sevBadge(incident.severity)}`} style={{ fontSize: 13, padding: '6px 12px' }}>
              ระดับ {incident.severity}
            </span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <a
                href={`/rca/form?ir=${encodeURIComponent(incident.ir_code)}`}
                className="tb-btn tb-btn-primary"
              >
                ▤ กรอกแบบฟอร์ม RCA
              </a>
              <a href={exportHref} className="tb-btn tb-btn-ghost" download>
                ⤓ ส่งออก Word
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><div className="card-title">ลำดับเหตุการณ์</div></div>
          <div className="card-body" style={{ paddingTop: 12 }}>
            <div className="tl">
              {timeline.map((t, i) => (
                <div key={t.id} className="tl-row">
                  <div className="tl-time-col">
                    <div className="tl-time-text">
                      {new Date(t.occurred_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </div>
                  </div>
                  <div className="tl-spine-col">
                    <div className="tl-circle" style={{
                      background: t.severity_tag === 'bad' ? 'var(--red)'
                                : t.severity_tag === 'warn' ? 'var(--amber)' : 'var(--green)',
                    }}></div>
                    {i < timeline.length - 1 && (
                      <div className="tl-vline" style={{
                        background: t.severity_tag === 'bad' ? 'rgba(226,81,74,0.2)'
                                  : t.severity_tag === 'warn' ? 'rgba(245,165,36,0.2)' : 'rgba(62,207,142,0.2)',
                      }}></div>
                    )}
                  </div>
                  <div className={`tl-card ${t.severity_tag === 'bad' ? 'bad' : t.severity_tag === 'warn' ? 'warn' : ''}`}>
                    <div className="tl-event-title">{t.event_title}</div>
                    <div className="tl-event-detail">{t.event_detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">ปัจจัยสนับสนุน (Swiss Cheese)</div></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {groupedCauses.map(g => (
                <div key={g.group}>
                  <div className="sub-label">{causeGroupLabels[g.group]}</div>
                  <div className="cause-row">
                    {g.items.map(c => (
                      <span key={c.id} className={`cause-pill ${c.is_hot ? 'hot' : ''}`}>{c.label}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {rca && (
            <div className="card">
              <div className="card-header"><div className="card-title">ประเมิน HRO 5 มิติ</div></div>
              <div className="card-body">
                <div className="hro-row">
                  {hroDimensions.map(d => {
                    const val = (rca as unknown as Record<string, number | null>)[d.key] ?? 0;
                    return (
                      <div key={d.key}>
                        <div className="hro-top">
                          <span className="hro-name">{d.label}</span>
                          <span style={{ fontSize: 11, color: scoreColor(val) }}>{val}%</span>
                        </div>
                        <div className="hro-track">
                          <div className="hro-fill-bar" style={{ width: `${val}%`, background: scoreColor(val) }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {relatedActions.length > 0 && (
        <div className="card" style={{ marginTop: 0 }}>
          <div className="card-header"><div className="card-title">มาตรการแก้ไข {relatedActions.length} รายการ</div></div>
          <div className="card-body">
            <div className="action-grid">
              {relatedActions.map(a => {
                const s = actionStatus(a.status);
                return (
                  <div key={a.id} className={`action-card ${s.cls}`}>
                    <div className={`action-icon-wrap ${s.wrap}`}>{s.icon}</div>
                    <div className="action-title">{a.title}</div>
                    <div className="action-desc">{a.description}</div>
                    <div className="action-footer">
                      <span className={`badge ${s.badge}`}>{s.label}</span>
                      <span style={{ fontSize: 10, color: 'var(--text3)' }}>{a.due_date ?? '—'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
