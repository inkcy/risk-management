'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const groups: { label: string; items: { href: string; icon: string; label: string; badge?: string }[] }[] = [
  {
    label: 'หลัก',
    items: [
      { href: '/', icon: '⬡', label: 'แดชบอร์ด' },
      { href: '/incidents', icon: '⚠', label: 'อุบัติการณ์', badge: '3' },
      { href: '/rca', icon: '◎', label: 'การวิเคราะห์ RCA' },
      { href: '/matrix', icon: '▦', label: 'Risk Matrix' },
    ],
  },
  {
    label: 'การจัดการ',
    items: [
      { href: '/actions', icon: '✓', label: 'มาตรการแก้ไข' },
      { href: '/report', icon: '+', label: 'รายงานใหม่' },
    ],
  },
  {
    label: 'วัฒนธรรมและจิตวิญญาณ',
    items: [
      { href: '/culture', icon: '❖', label: 'วัฒนธรรมความปลอดภัย' },
      { href: '/compassion', icon: '♡', label: 'Compassionate RCA' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  useEffect(() => {
    document.body.classList.remove('sidebar-open');
  }, [pathname]);

  const closeSidebar = () => document.body.classList.remove('sidebar-open');

  return (
    <>
      <div className="sidebar-backdrop" onClick={closeSidebar} aria-hidden="true" />
      <aside className="sidebar">
      <div className="logo">
        <div className="logo-mark">
          <div className="logo-icon">RM</div>
          <div className="logo-name">RiskGuard</div>
        </div>
        <div className="logo-sub">ระบบบริหารความเสี่ยง</div>
      </div>
      <nav className="nav">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="nav-group-label">{g.label}</div>
            {g.items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className={`nav-item ${isActive(it.href) ? 'active' : ''}`}
              >
                <span className="nav-icon">{it.icon}</span> {it.label}
                {it.badge && <span className="nav-badge">{it.badge}</span>}
              </Link>
            ))}
          </div>
        ))}
        <div style={{ marginTop: 8 }}>
          <Link href="/settings" className={`nav-item ${isActive('/settings') ? 'active' : ''}`}>
            <span className="nav-icon">⚙</span> ตั้งค่า
          </Link>
        </div>
      </nav>
      <div className="sidebar-footer">
        <div className="user-row">
          <div className="user-avatar">วส</div>
          <div>
            <div className="user-name">วสันต์ รักษ์ชาติ</div>
            <div className="user-role">ผู้จัดการความเสี่ยง</div>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
}
