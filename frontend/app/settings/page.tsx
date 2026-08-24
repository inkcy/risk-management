import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { AccountProfile } from '@/components/AccountProfile';
import { UserAdmin } from '@/components/UserAdmin';

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login?error=expired');

  return (
    <>
      <AccountProfile user={user} />
      {user.role === 'admin' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">ผู้ใช้และสิทธิ์การเข้าถึง</div>
          </div>
          <div className="card-body">
            <UserAdmin currentUserId={user.id} />
          </div>
        </div>
      )}
    </>
  );
}
