'use client';

import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import type { SessionUser } from '@/lib/auth';
import { departmentAccess } from '@/lib/departmentAccess';

const ROLE_LABEL: Record<string, string> = {
  admin: 'ผู้ดูแลระบบ',
  editor: 'ผู้กรอกข้อมูล',
  viewer: 'ผู้ดูอย่างเดียว',
};

/**
 * จุดหมุนเล็ก ๆ ที่ขึ้นทันทีที่กดเมนู แล้วหายไปเมื่อหน้าใหม่มาถึง
 * ต้องอยู่ "ข้างใน" <Link> เท่านั้น useLinkStatus ถึงจะรู้สถานะของลิงก์นั้น
 */
function NavPending() {
  const { pending } = useLinkStatus();
  return pending ? <span className="nav-spinner" aria-hidden="true" /> : null;
}

const groups: { label: string; items: { href: string; icon: string; label: string; badge?: string }[] }[] = [
  {
    label: 'หลัก',
    items: [
      { href: '/home', icon: '⌂', label: 'หน้าหลัก' },
      { href: '/dashboard', icon: '⬡', label: 'แดชบอร์ด' },
      { href: '/incidents', icon: '⚠', label: 'อุบัติการณ์' },
      { href: '/rca', icon: '◎', label: 'การวิเคราะห์ RCA' },
      { href: '/rca/form', icon: '▤', label: 'แบบฟอร์ม RCA' },
      { href: '/risk-profile', icon: '▤', label: 'Risk Profile' },
      { href: '/smart-risk-profile', icon: '◈', label: 'Smart Risk Profile' },
    ],
  },
  {
    label: 'การจัดการ',
    items: [
      { href: '/actions', icon: '✓', label: 'มาตรการแก้ไข' },
      { href: '/report', icon: '+', label: 'รายงานอุบัติการณ์ใหม่' },
    ],
  },
  {
    label: 'Safety Culture Survey',
    items: [
      { href: '/culture', icon: '❖', label: 'HSCS' },
      { href: '/compassion', icon: '♡', label: 'Compassionate RCA' },
    ],
  },
];

const allHrefs = [...groups.flatMap(g => g.items.map(i => i.href)), '/settings'];

export function Sidebar({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  const canEdit = user?.role === 'admin' || user?.role === 'editor';
  const isAdmin = user?.role === 'admin';
  const access = departmentAccess(user);
  // เลือกเมนูที่ตรงกับ path มากที่สุด เพื่อไม่ให้ /rca และ /rca/form ถูกไฮไลต์พร้อมกัน
  const matches = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`));
  const bestMatch = allHrefs.filter(matches).sort((a, b) => b.length - a.length)[0];
  const isActive = (href: string) => href === bestMatch;

  useEffect(() => {
    document.body.classList.remove('sidebar-open');
  }, [pathname]);

  const closeSidebar = () => document.body.classList.remove('sidebar-open');

  return (
    <>
      <div className="sidebar-backdrop" onClick={closeSidebar} aria-hidden="true" />
      <aside className="sidebar">
      <Link href="/" className="logo" aria-label="RiskGuard หน้าแรก">
        <img className="logo-image" src="/safety-chart-logo.png" alt="โรงพยาบาลสมเด็จพระบรมราชเทวี ณ ศรีราชา สภากาชาดไทย" />
      </Link>
      <nav className="nav">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="nav-group-label">{g.label}</div>
            {g.items.filter(it => (it.href !== '/report' || canEdit) && (it.href !== '/incidents' || isAdmin) && (it.href !== '/risk-profile' || access !== 'staff')).map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className={`nav-item ${isActive(it.href) ? 'active' : ''}`}
              >
                <span className="nav-icon">{it.icon}</span> {it.label}
                {it.badge && <span className="nav-badge">{it.badge}</span>}
                <NavPending />
              </Link>
            ))}
          </div>
        ))}
        {user && <div style={{ marginTop: 8 }}>
          <Link href="/settings" className={`nav-item ${isActive('/settings') ? 'active' : ''}`}>
            <span className="nav-icon">⚙</span> {isAdmin ? 'ตั้งค่าระบบ' : 'บัญชีของฉัน'}
            <NavPending />
          </Link>
        </div>}
      </nav>
      {user && (
        <div className="sidebar-footer">
          <div className="user-row">
            <div className="user-avatar">{(user.name ?? user.email).trim().slice(0, 2)}</div>
            <div style={{ minWidth: 0 }}>
              <div className="user-name">{user.name ?? user.email}</div>
              <div className="user-role">{ROLE_LABEL[user.role] ?? user.role}</div>
            </div>
          </div>
        </div>
      )}
    </aside>
    </>
  );
}
