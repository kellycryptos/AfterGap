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
