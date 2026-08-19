'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { SessionUser } from '@/lib/auth';

const titles: Record<string, [string, string]> = {
  '/': ['แดชบอร์ด', 'ภาพรวมระบบบริหารความเสี่ยง'],
  '/incidents': ['รายการอุบัติการณ์', 'ทุกเหตุการณ์ที่บันทึกไว้'],
  '/rca': ['Root Cause Analysis', 'วิเคราะห์สาเหตุและติดตามมาตรการ'],
  '/rca/form': ['แบบฟอร์ม RCA', 'บันทึกและส่งออกแบบวิเคราะห์สาเหตุ'],
  '/matrix': ['Risk Matrix', 'ประเมินความเสี่ยงองค์กร'],
  '/cauti': ['CAUTI QuickAlert', 'เฝ้าระวังผู้ป่วยใส่ Foley catheter · alert เมื่อใส่เกิน 3 วัน'],
  '/actions': ['มาตรการแก้ไข', 'ติดตามความคืบหน้า'],
  '/report': ['E-SAFE · รายงานอุบัติการณ์ใหม่', 'Just Culture · Patient Safety First'],
  '/culture': ['วัฒนธรรมความปลอดภัย', 'HRO · Safety Culture · System Thinking'],
  '/compassion': ['Compassionate RCA', 'CANDOR Response · Trauma-Informed Care'],
  '/settings': ['ตั้งค่าระบบ', 'จัดการองค์กรและผู้ใช้'],
};

const ROLE_LABEL: Record<string, string> = {
  admin: 'ผู้ดูแลระบบ',
  editor: 'ผู้กรอกข้อมูล',
  viewer: 'ผู้ดูอย่างเดียว',
};

export function Topbar({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  const titleKey = Object.keys(titles)
    .filter(path => path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`))
    .sort((a, b) => b.length - a.length)[0] ?? '/';
  const [title, breadcrumb] = titles[titleKey];
  const [isLight, setIsLight] = useState(false);
  const canEdit = user?.role === 'admin' || user?.role === 'editor';

  useEffect(() => {
    setIsLight(document.documentElement.classList.contains('light'));
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    const next = !html.classList.contains('light');
    html.classList.toggle('light', next);
    localStorage.setItem('theme', next ? 'light' : 'dark');
    setIsLight(next);
  };

  const toggleSidebar = () => {
    document.body.classList.toggle('sidebar-open');
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="menu-toggle"
          onClick={toggleSidebar}
          aria-label="เปิดเมนู"
          type="button"
        >
          ☰
        </button>
        <span className="page-title">{title}</span>
        <span className="breadcrumb">{breadcrumb}</span>
      </div>
      <div className="topbar-right">
        <button
          className="tb-btn tb-btn-ghost"
          onClick={toggleTheme}
          title="เปลี่ยนธีม"
          style={{ fontSize: 15, padding: '7px 10px' }}
        >
          {isLight ? '☀️' : '🌙'}
        </button>
        {canEdit && (
          <Link href="/report" className="tb-btn tb-btn-primary report-btn">
            <span className="btn-full">+ รายงานใหม่</span>
            <span className="btn-short" aria-hidden="true">+</span>
          </Link>
        )}
        {user && (
          <div
            title={`${user.email} · ${ROLE_LABEL[user.role] ?? user.role}`}
            style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 4 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {user.picture && (
              <img
                src={user.picture}
                alt=""
                width={26}
                height={26}
                style={{ borderRadius: '50%', display: 'block' }}
                referrerPolicy="no-referrer"
              />
            )}
            <span className="user-name" style={{ fontSize: 12.5, lineHeight: 1.25 }}>
              {user.name ?? user.email}
              <br />
              <span style={{ color: 'var(--text3)', fontSize: 11 }}>{ROLE_LABEL[user.role] ?? user.role}</span>
            </span>
            <form action="/api/auth/logout" method="post">
              <button className="tb-btn tb-btn-ghost" type="submit" title="ออกจากระบบ" style={{ fontSize: 15, padding: '7px 10px' }}>
                ⏻
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
