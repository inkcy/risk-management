import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { dbConfigured, query } from '@/lib/db';
import { ensureRiskSubmissions } from '@/lib/riskSubmissions';
import { UnitRiskProfiles } from '@/components/UnitRiskProfiles';

export const dynamic = 'force-dynamic';

type SnapshotRisk = { id: number; unit_id: number; year: number; quarter: number; category: 'clinical' | 'nonclinical'; title: string; occurrence_count: number; impact: number; source_title: string | null; source_analysis_level: 'green' | 'yellow' | 'orange' | 'red' | null };
type Snapshot = { unitName: string; risks: SnapshotRisk[] };

export default async function SubmittedRiskProfilePage({ searchParams }: { searchParams: Promise<{ unit?: string; year?: string; quarter?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect('/login?next=%2Frisk-profile');
  if (user.role !== 'admin') redirect('/risk-profile');
  if (!dbConfigured()) return <div className="card" style={{ padding: 18 }}>ต้องเชื่อมต่อฐานข้อมูลเพื่อดู Risk Profile ที่ส่ง</div>;
  const params = await searchParams;
  const unitId = Number(params.unit), year = Number(params.year), quarter = Number(params.quarter);
  if (!Number.isSafeInteger(unitId) || unitId < 1 || !Number.isInteger(year) || year < 2500 || year > 2700 || !Number.isInteger(quarter) || quarter < 1 || quarter > 4) return <div className="card" style={{ padding: 18 }}>ข้อมูลหน่วยงาน ปี หรือไตรมาสไม่ถูกต้อง</div>;
  try {
    await ensureRiskSubmissions();
    const result = await query<{ submitted_at: string; snapshot: Snapshot | null }>('SELECT submitted_at::text, snapshot FROM risk_profile_submissions WHERE unit_id=$1 AND year=$2 AND quarter=$3', [unitId, year, quarter]);
    const submission = result.rows[0];
    if (!submission) return <div className="card" style={{ padding: 18 }}>ไม่พบการส่ง Risk Profile ในช่วงที่เลือก <a href="/risk-profile">กลับไปหน้าติดตาม</a></div>;
    const snapshot = submission.snapshot;
    return <>
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <a href="/risk-profile">← กลับไปหน้าติดตาม</a>
        <h2>Risk Profile ที่ยืนยันส่ง</h2>
        <p>ปีงบประมาณ {year} · ไตรมาส {quarter} · ส่งเมื่อ {new Date(submission.submitted_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}</p>
        {snapshot ? <p>ข้อมูลสำเนา ณ เวลาที่ส่ง · ดูได้อย่างเดียว</p> : <p role="status">รายการนี้ส่งก่อนระบบเริ่มเก็บสำเนา จึงไม่มีข้อมูล ณ เวลาที่ส่งให้เรียกดู</p>}
      </div>
      {snapshot && <UnitRiskProfiles units={[{ id: unitId, name: snapshot.unitName }]} risks={snapshot.risks} canLogout={false} initialPeriod={{ unitId, year, quarter }} readOnly />}
    </>;
  } catch (error) {
    console.error('risk submission snapshot load failed:', error);
    return <div className="announcement-error" role="alert">ไม่สามารถโหลดสำเนา Risk Profile ได้ กรุณาลองใหม่</div>;
  }
}
