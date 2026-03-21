import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Builder Insights Admin',
  description: 'Admin panel for Builder Insights - manage events, insights, and analytics',
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
