import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AfterGap | Same stock, three wrappers, live gap.',
  description:
    'Compare the same US name across bStocks, Ondo, and xStocks on BSC, show the cash-hours vs overnight gap, and let a user buy the best live spot route in plain English.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="bg-[#07070A] text-[#F5F5F4] min-h-screen antialiased flex flex-col selection:bg-[#F5C542]/20 selection:text-[#F5C542]">
        {children}
      </body>
    </html>
  );
}
