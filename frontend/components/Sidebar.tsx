'use client';

import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import type { SessionUser } from '@/lib/auth';

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
      { href: '/', icon: '⬡', label: 'แดชบอร์ด' },
      { href: '/incidents', icon: '⚠', label: 'อุบัติการณ์' },
      { href: '/rca', icon: '◎', label: 'การวิเคราะห์ RCA' },
      { href: '/rca/form', icon: '▤', label: 'แบบฟอร์ม RCA' },
      { href: '/matrix', icon: '▦', label: 'Risk Matrix' },
      { href: '/risk-profile', icon: '▤', label: 'Risk Profile' },
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
      { href: '/culture', icon: '❖', label: 'วัฒนธรรมความปลอดภัย' },
      { href: '/compassion', icon: '♡', label: 'Compassionate RCA' },
    ],
  },
];

const allHrefs = [...groups.flatMap(g => g.items.map(i => i.href)), '/settings'];

export function Sidebar({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  const canEdit = user?.role === 'admin' || user?.role === 'editor';
  const isAdmin = user?.role === 'admin';
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
        <div className="logo-mark">
          <div className="logo-icon" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none" focusable="false">
              <path d="M16 3.4 26 7.6v7.2c0 6.3-4.1 11.1-10 13.8C10.1 25.9 6 21.1 6 14.8V7.6l10-4.2Z" fill="white" fillOpacity=".96" />
              <path d="M11.3 16.1h3.1v-3.2h3.2v3.2h3.1v3.1h-3.1v3.2h-3.2v-3.2h-3.1v-3.1Z" fill="currentColor" />
            </svg>
          </div>
          <div className="logo-name"><span>Risk</span><strong>Guard</strong></div>
        </div>
        <div className="logo-sub">HOSPITAL RISK MANAGEMENT</div>
      </Link>
      <nav className="nav">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="nav-group-label">{g.label}</div>
            {g.items.filter(it => (it.href !== '/report' || canEdit) && (it.href !== '/incidents' || isAdmin)).map((it) => (
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
