import { getSessionUser } from '@/lib/auth';
import { dbConfigured, query } from '@/lib/db';
import { getRiskUnit } from '@/lib/riskUnitAuth';
import { RiskUnitAdmin } from '@/components/RiskUnitAdmin';
import { RiskUnitLogin } from '@/components/RiskUnitLogin';
import { UnitRiskProfiles } from '@/components/UnitRiskProfiles';
import { redirect } from 'next/navigation';
import { departmentAccess } from '@/lib/departmentAccess';
import { RiskSubmissionOverview } from '@/components/RiskSubmissionOverview';
import { RiskSubmissionForm } from '@/components/RiskSubmissionForm';
import { loadRiskSubmissions } from '@/lib/riskSubmissions';
import { SupervisorAdmin } from '@/components/SupervisorAdmin';
import { DepartmentCodeAccess } from '@/components/DepartmentCodeAccess';

export const dynamic = 'force-dynamic';

export default async function RiskProfilePage({ searchParams }: { searchParams: Promise<{ unit?: string; year?: string; quarter?: string }> }) {
  if (!dbConfigured()) return <div className="card" style={{ padding: 18 }}>ต้องเชื่อมต่อฐานข้อมูลเพื่อใช้งาน Risk Profile</div>;
  const user = await getSessionUser();
  if (!user) redirect('/login?next=%2Frisk-profile');
  try {
    const admin = user.role === 'admin';
    const currentUnit = admin ? null : await getRiskUnit(user.id);
    if (!admin && !currentUnit) return <RiskUnitLogin />;
    const submissions = await loadRiskSubmissions(admin ? null : currentUnit!.id);
    if (departmentAccess(user) === 'staff') return <div className="card" style={{ padding: 18 }}>Risk Profile และการยืนยันส่งสำหรับหัวหน้างานขึ้นไป</div>;
    const adminUnits = admin ? (await query<{ id: number; name: string; username: string }>('SELECT id, name, username FROM risk_units WHERE active ORDER BY name')).rows : [];
    const adminUnit = adminUnits.find(unit => unit.name.trim().toLowerCase() === 'admin');
    const submissionUnit = adminUnit ?? adminUnits[0];
    const pending = admin ? (await query<{ id: number; name: string; username: string; requester: string | null }>(`SELECT r.id, r.name, r.username, COALESCE(u.email, u.name) AS requester FROM risk_units r LEFT JOIN users u ON u.id=r.requested_by WHERE NOT r.active AND r.requested_by IS NOT NULL ORDER BY r.created_at`)).rows : [];
    const units = admin ? adminUnits : [currentUnit!];
    const params = await searchParams;
    const unitId = Number(params.unit), year = Number(params.year), quarter = Number(params.quarter);
    const selectedPeriod = admin && units.some(unit => unit.id === unitId) && Number.isInteger(year) && year >= 2500 && year <= 2700 && Number.isInteger(quarter) && quarter >= 1 && quarter <= 4
      ? { unitId, year, quarter } : undefined;
    const risks = await query<{ id: number; unit_id: number; year: number; quarter: number; category: 'clinical' | 'nonclinical'; title: string; occurrence_count: number; impact: number; source_title: string | null; source_analysis_level: 'green' | 'yellow' | 'orange' | 'red' | null }>(
      'SELECT id, unit_id, year, quarter, category, title, occurrence_count, impact, source_title, source_analysis_level FROM unit_risks WHERE ($1::boolean OR unit_id=$2) ORDER BY created_at DESC', [admin, currentUnit?.id ?? null],
    );
    return <>{admin ? <><RiskUnitAdmin units={adminUnits} pending={pending} /><SupervisorAdmin units={adminUnits} /><DepartmentCodeAccess units={adminUnits} /><RiskSubmissionOverview units={adminUnits.filter(unit => unit.name.trim().toLowerCase() !== 'dev')} risks={risks.rows} submissions={submissions} />{submissionUnit && <RiskSubmissionForm unit={submissionUnit} submissions={submissions} selectableUnits={adminUnits} />}</> : departmentAccess(user) === 'supervisor' && <RiskSubmissionForm unit={currentUnit!} submissions={submissions} />}<UnitRiskProfiles units={units} risks={risks.rows} canLogout={!admin} initialPeriod={selectedPeriod} defaultUnitId={adminUnit?.id} /></>;
  } catch (err) {
    console.error('risk profile load failed:', err);
    return <div className="announcement-error" role="alert">ไม่สามารถโหลด Risk Profile ได้ กรุณาตรวจสอบฐานข้อมูล</div>;
  }
}
