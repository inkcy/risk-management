'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import type { SessionUser } from '@/lib/auth';

/** หน้า /login ไม่ต้องมี sidebar/topbar — เลือกจาก pathname ฝั่ง client */
export function AppShell({ user, children, selectedUnitName }: { user: SessionUser | null; children: React.ReactNode; selectedUnitName?: string | null }) {
  const pathname = usePathname();

  if (pathname === '/login') return <>{children}</>;

  return (
    <>
      <Sidebar user={user} />
      <main className="main">
        <Topbar user={user} selectedUnitName={selectedUnitName} />
        <div className="content">{children}</div>
      </main>
    </>
  );
}
