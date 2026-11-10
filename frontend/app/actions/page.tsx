import { getSessionUser } from '@/lib/auth';
import { loadRcaLessons, loadRcaLessonYears } from '@/lib/rcaLessons';
import { RcaLessons } from '@/components/RcaLessons';

export const dynamic = 'force-dynamic';

export default async function RcaLessonsPage() {
  const user = await getSessionUser();
  try {
    const lessons = await loadRcaLessons();
    const years = await loadRcaLessonYears();
    return <RcaLessons lessons={lessons} years={years} canEdit={user?.role === 'admin'} />;
  } catch (error) {
    console.error('load RCA lessons failed', error);
    return <div className="announcement-error" role="alert">โหลดบทเรียนไม่สำเร็จ กรุณาลองอีกครั้ง</div>;
  }
}
