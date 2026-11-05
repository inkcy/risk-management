import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { dbConfigured, query } from '@/lib/db';
import { getRiskUnit } from '@/lib/riskUnitAuth';
import { SmartRiskProfile, type SmartRisk } from '@/components/SmartRiskProfile';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function SmartRiskProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect('/login?next=%2Fsmart-risk-profile');
  if (!dbConfigured()) return <div className="card" style={{ padding: 24 }}>ต้องเชื่อมต่อฐานข้อมูลเพื่อใช้งาน Smart Risk Profile</div>;
  try {
    const admin = user.role === 'admin';
    const unit = admin ? null : await getRiskUnit(user.id);
    if (!admin && !unit) return <div className="card" style={{ padding: 24 }}>กรุณาเข้าสู่ระบบหน่วยงานก่อนดูข้อมูล <Link href="/risk-profile">ไปที่ Risk Profile</Link></div>;
    const units = admin
      ? (await query<{ id: number; name: string }>('SELECT id, name FROM risk_units WHERE active ORDER BY name')).rows
      : [unit!];
    const { rows } = await query<SmartRisk>(
      `SELECT r.id, r.unit_id, u.name AS unit_name, r.year, r.quarter, r.category, r.title, r.occurrence_count, r.impact
       FROM unit_risks r JOIN risk_units u ON u.id=r.unit_id
       WHERE u.active AND ($1::boolean OR r.unit_id=$2)
       ORDER BY r.year DESC, r.quarter DESC, r.id DESC`, [admin, unit?.id ?? null],
    );
    return <SmartRiskProfile units={units} risks={rows} aiEnabled={!!process.env.GEMINI_API_KEY?.trim()} />;
  } catch {
    return <div className="announcement-error" role="alert">ไม่สามารถโหลด Smart Risk Profile ได้ กรุณาลองใหม่อีกครั้ง</div>;
  }
}
