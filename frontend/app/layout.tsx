import type { Metadata } from 'next';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import './globals.css';

export const metadata: Metadata = {
  title: 'ระบบบริหารความเสี่ยง — Hospital Risk Management',
  description: 'Hospital Risk Management Dashboard with HRO & Compassionate RCA',
};

const themeBootstrap = `
(function(){try{if(localStorage.getItem('theme')==='light'){document.documentElement.classList.add('light');}}catch(e){}})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
        <Sidebar />
        <main className="main">
          <Topbar />
          <div className="content">{children}</div>
        </main>
      </body>
    </html>
  );
}
