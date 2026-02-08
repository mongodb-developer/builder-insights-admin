import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DevRel Insights Admin',
  description: 'Admin panel for DevRel Insights - Manage events, insights, and analytics',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
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
