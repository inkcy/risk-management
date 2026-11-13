'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { FloatingRiskChat } from './FloatingRiskChat';
import type { SessionUser } from '@/lib/auth';
import { ChatScopeContext } from './ChatScope';

/** หน้า /login ไม่ต้องมี sidebar/topbar — เลือกจาก pathname ฝั่ง client */
export function AppShell({ user, children, selectedUnitName, selectedUnitId }: { user: SessionUser | null; children: React.ReactNode; selectedUnitName?: string | null; selectedUnitId?: number | null }) {
  const pathname = usePathname();

  if (pathname === '/login') return <>{children}</>;

  return (
    <ChatScopeContext.Provider value={user ? `${user.id}:${selectedUnitId ?? 0}` : null}>
      <Sidebar user={user} />
      <main className="main">
        <Topbar user={user} selectedUnitName={selectedUnitName} />
        <div className="content">{children}</div>
      </main>
      {user && <FloatingRiskChat />}
    </ChatScopeContext.Provider>
  );
}
