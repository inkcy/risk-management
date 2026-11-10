import { getSessionUser } from '@/lib/auth';
import { loadRcaLessons } from '@/lib/rcaLessons';
import { RcaLessons } from '@/components/RcaLessons';

export const dynamic = 'force-dynamic';

export default async function RcaLessonsPage() {
  const user = await getSessionUser();
  try {
    const lessons = await loadRcaLessons();
    return <RcaLessons lessons={lessons} canEdit={user?.role === 'admin'} />;
  } catch (error) {
    console.error('load RCA lessons failed', error);
    return <div className="announcement-error" role="alert">โหลดบทเรียนไม่สำเร็จ กรุณาลองอีกครั้ง</div>;
  }
}
