import type { Metadata } from 'next';
import { Noto_Sans_JP } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-noto-sans-jp',
});

export const metadata: Metadata = {
  title: '相談支援システム',
  description: '障害福祉相談支援管理システム',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={`${notoSansJP.variable} font-sans antialiased bg-gray-50`}>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 ml-64 flex flex-col min-h-screen min-w-0">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
