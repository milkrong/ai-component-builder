import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Component Builder',
  description: 'Build React components using AI with DouBao integration',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
