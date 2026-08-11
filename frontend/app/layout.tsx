import type { Metadata, Viewport } from 'next';
import { AppShell } from '@/components/AppShell';
import { getSessionUser } from '@/lib/auth';
import './globals.css';

export const metadata: Metadata = {
  title: 'ระบบบริหารความเสี่ยง — Hospital Risk Management',
  description: 'Hospital Risk Management Dashboard with HRO & Compassionate RCA',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f5f6fc',
};

// ธีมสว่างเป็นค่าเริ่มต้น — ใส่คลาสก่อน paint แรกเพื่อไม่ให้จอกระพริบเป็นสีเข้ม
const themeBootstrap = `
(function(){try{if(localStorage.getItem('theme')!=='dark'){document.documentElement.classList.add('light');}}catch(e){document.documentElement.classList.add('light');}})();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  return (
    // themeBootstrap เติมคลาส light ลงบน <html> ก่อน React hydrate ทำให้ไม่ตรงกับ HTML ฝั่ง server เสมอ
    // ตั้งใจให้เป็นแบบนี้เพื่อกันจอกระพริบ จึงบอก React ให้ข้ามการเทียบเฉพาะ element นี้
    <html lang="th" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600&family=IBM+Plex+Sans+Thai:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>
        <AppShell user={user}>{children}</AppShell>
      </body>
    </html>
  );
}
