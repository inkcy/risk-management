import { Announcements } from '@/components/Announcements';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getSessionUser();
  return (
    <>
      <div className="home-banner">
        {/* ใช้ภาพเดิมเต็มสัดส่วนเพื่อให้เห็นอาคารและแนวชายฝั่งครบ */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hospital-background.jpg"
          alt="ภาพวาดโรงพยาบาลสมเด็จพระบรมราชเทวี ณ ศรีราชา ริมทะเล"
          fetchPriority="high"
        />
      </div>
      <Announcements isAdmin={user?.role === 'admin'} />
    </>
  );
}
