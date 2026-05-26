'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const titles: Record<string, [string, string]> = {
  '/': ['แดชบอร์ด', 'ปีงบประมาณ 2568 · รพ.ตัวอย่าง'],
  '/incidents': ['รายการอุบัติการณ์', 'ทุกเหตุการณ์ที่บันทึกไว้'],
  '/rca': ['Root Cause Analysis', 'IR 2503000003 · ให้เลือดผิดคน'],
  '/matrix': ['Risk Matrix', 'ประเมินความเสี่ยงองค์กร'],
  '/actions': ['มาตรการแก้ไข', 'ติดตามความคืบหน้า'],
  '/report': ['รายงานอุบัติการณ์ใหม่', 'กรอกแบบฟอร์ม'],
  '/culture': ['วัฒนธรรมความปลอดภัย', 'HRO · Safety Culture · System Thinking'],
  '/compassion': ['Compassionate RCA', 'CANDOR Response · Trauma-Informed Care'],
  '/settings': ['ตั้งค่าระบบ', 'จัดการองค์กรและผู้ใช้'],
};

export function Topbar() {
  const pathname = usePathname();
  const [title, breadcrumb] = titles[pathname] || titles['/'];
  const [isLight, setIsLight] = useState(false);

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
        <button className="tb-btn tb-btn-ghost export-btn">⤓ ส่งออก</button>
        <Link href="/report" className="tb-btn tb-btn-primary report-btn">
          <span className="btn-full">+ รายงานใหม่</span>
          <span className="btn-short" aria-hidden="true">+</span>
        </Link>
      </div>
    </header>
  );
}
