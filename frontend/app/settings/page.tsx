import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { UserAdmin } from '@/components/UserAdmin';

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (user?.role !== 'admin') redirect('/');

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">ผู้ใช้และสิทธิ์การเข้าถึง</div>
      </div>
      <div className="card-body">
        <UserAdmin currentUserId={user.id} />
      </div>
    </div>
  );
}
