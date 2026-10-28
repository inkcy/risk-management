import { Fragment } from 'react';
import { getStats } from '@/lib/api';
import { DemoBanner } from '@/components/DemoBanner';
import { RiskMatrixAssessment } from '@/components/RiskMatrixAssessment';

export const dynamic = 'force-dynamic';

function cellClass(l: number, c: number) {
  const score = l * c;
  if (score >= 15) return 'mx-crit';
  if (score >= 10) return 'mx-high';
  if (score >= 5) return 'mx-med';
  return 'mx-low';
}

const consequenceLabels = ['น้อยมาก', 'น้อย', 'ปานกลาง', 'มาก', 'มากมาย'];
const likelihoodLabels = ['แทบไม่เกิด', 'นานๆ ครั้ง', 'บางครั้ง', 'บ่อย', 'เป็นประจำ'];

const scoreBadge = (s: number) =>
  s >= 15 ? 'badge-red' : s >= 10 ? 'badge-red' : s >= 5 ? 'badge-amber' : 'badge-green';

const scoreLabel = (s: number) =>
  s >= 15 ? 'วิกฤต' : s >= 10 ? 'สูง' : s >= 5 ? 'ปานกลาง' : 'ต่ำ';

export default async function MatrixPage() {
  const { data: stats, error } = await getStats();
  const events = stats.risk_top5;

  const eventsMap = new Map<string, number>();
  events.forEach(e => {
    const key = `${e.likelihood}-${e.consequence}`;
    eventsMap.set(key, (eventsMap.get(key) ?? 0) + 1);
  });

  return (
    <>
      <DemoBanner error={error} />

      <RiskMatrixAssessment />

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><div className="card-title">Risk Matrix — โอกาสเกิด × ความรุนแรง</div></div>
          <div className="card-body">
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 16 }}>● = อุบัติการณ์ในทะเบียนความเสี่ยง Top 5</div>
            <div className="matrix-wrap">
              <div className="mx-label"></div>
              {consequenceLabels.map((l, i) => (
                <div key={i} className="mx-col-label">{l}<br />{i + 1}</div>
              ))}

              {[5, 4, 3, 2, 1].map(l => (
                <Fragment key={l}>
                  <div className="mx-label" style={{ fontSize: 9 }}>{likelihoodLabels[l - 1]} {l}</div>
                  {[1, 2, 3, 4, 5].map(c => {
                    const hasEvent = eventsMap.has(`${l}-${c}`);
                    return (
                      <div key={`${l}-${c}`} className={`mx-cell ${cellClass(l, c)} ${hasEvent ? 'has-event' : ''}`}>
                        {l * c}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
              <Legend color="rgba(62,207,142,0.1)" border="rgba(62,207,142,0.3)" label="ต่ำ (1–5)" />
              <Legend color="rgba(245,165,36,0.12)" border="rgba(245,165,36,0.3)" label="ปานกลาง" />
              <Legend color="rgba(226,81,74,0.1)" border="rgba(226,81,74,0.3)" label="สูง" />
              <Legend color="rgba(226,81,74,0.2)" border="rgba(226,81,74,0.5)" label="วิกฤต" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">ความเสี่ยงสูงสุด Top 5</div></div>
          <div className="card-body">
            {events.map(e => (
              <div key={e.id} className="incident-item">
                <div className="inc-dot" style={{
                  background: e.score >= 15 ? 'var(--red)' : e.score >= 10 ? 'var(--red)' : e.score >= 5 ? 'var(--amber)' : 'var(--accent)',
                }}></div>
                <div className="inc-body">
                  <div className="inc-title">{e.title}</div>
                  <div className="inc-meta">โอกาสเกิด {e.likelihood} × ความรุนแรง {e.consequence} = คะแนน {e.score}</div>
                </div>
                <span className={`badge ${scoreBadge(e.score)}`}>{scoreLabel(e.score)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function Legend({ color, border, label }: { color: string; border: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text3)' }}>
      <div style={{ width: 10, height: 10, borderRadius: 2, background: color, border: `1px solid ${border}` }} />
      {label}
    </div>
  );
}
