import { getSessionUser } from '@/lib/auth';
import { dbConfigured, query } from '@/lib/db';
import { getRiskUnit } from '@/lib/riskUnitAuth';
import { RiskUnitAdmin } from '@/components/RiskUnitAdmin';
import { RiskUnitLogin } from '@/components/RiskUnitLogin';
import { UnitRiskProfiles } from '@/components/UnitRiskProfiles';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function RiskProfilePage() {
  if (!dbConfigured()) return <div className="card" style={{ padding: 18 }}>ต้องเชื่อมต่อฐานข้อมูลเพื่อใช้งาน Risk Profile</div>;
  const user = await getSessionUser();
  if (!user) redirect('/login?next=%2Frisk-profile');
  try {
    const admin = user.role === 'admin';
    const currentUnit = admin ? null : await getRiskUnit(user.id);
    if (!admin && !currentUnit) return <RiskUnitLogin />;
    const adminUnits = admin ? (await query<{ id: number; name: string; username: string }>('SELECT id, name, username FROM risk_units WHERE active ORDER BY name')).rows : [];
    const units = admin ? adminUnits : [currentUnit!];
    const risks = await query<{ id: number; unit_id: number; year: number; quarter: number; category: 'clinical' | 'nonclinical'; title: string; occurrence_count: number; impact: number }>(
      'SELECT id, unit_id, year, quarter, category, title, occurrence_count, impact FROM unit_risks WHERE ($1::boolean OR unit_id=$2) ORDER BY created_at DESC', [admin, currentUnit?.id ?? null],
    );
    return <>{admin && <RiskUnitAdmin units={adminUnits} />}<UnitRiskProfiles units={units} risks={risks.rows} canLogout={!admin} /></>;
  } catch (err) {
    console.error('risk profile load failed:', err);
    return <div className="announcement-error" role="alert">ไม่สามารถโหลด Risk Profile ได้ กรุณาตรวจสอบฐานข้อมูล</div>;
  }
}
