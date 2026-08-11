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
  themeColor: '#0a0d14',
};

const themeBootstrap = `
(function(){try{if(localStorage.getItem('theme')==='light'){document.documentElement.classList.add('light');}}catch(e){}})();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  return (
    <html lang="th">
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
