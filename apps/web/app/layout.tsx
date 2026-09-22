import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="en">
      <body className="bg-[#0B0E11] text-[#EAECEF] min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
