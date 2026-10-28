import { Announcements } from '@/components/Announcements';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getSessionUser();
  return <Announcements isAdmin={user?.role === 'admin'} />;
}
