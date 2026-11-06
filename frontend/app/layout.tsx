import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { getSessionUser } from '@/lib/auth';
import { dbConfigured } from '@/lib/db';
import './globals.css';

export const metadata: Metadata = {
  title: 'ระบบบริหารความเสี่ยง — Hospital Risk Management',
  description: 'Hospital Risk Management Dashboard with HRO & Compassionate RCA',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#dff2f8',
};

// ธีมสว่างเป็นค่าเริ่มต้น — ใส่คลาสก่อน paint แรกเพื่อไม่ให้จอกระพริบเป็นสีเข้ม
const themeBootstrap = `
(function(){try{if(localStorage.getItem('theme')!=='dark'){document.documentElement.classList.add('light');}}catch(e){document.documentElement.classList.add('light');}})();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, headerStore] = await Promise.all([getSessionUser(), headers()]);
  const pathname = headerStore.get('x-risk-pathname') ?? '';

  // cookie อาจยังมีลายเซ็นถูกต้อง แต่ session ใน DB หมดอายุหรือบัญชีถูกระงับแล้ว
  if (dbConfigured() && pathname !== '/login' && !user) {
    redirect('/login?error=expired');
  }

  return (
    // themeBootstrap เติมคลาส light ลงบน <html> ก่อน React hydrate ทำให้ไม่ตรงกับ HTML ฝั่ง server เสมอ
    // ตั้งใจให้เป็นแบบนี้เพื่อกันจอกระพริบ จึงบอก React ให้ข้ามการเทียบเฉพาะ element นี้
    <html lang="th" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>
        <AppShell user={user}>{children}</AppShell>
      </body>
    </html>
  );
}
