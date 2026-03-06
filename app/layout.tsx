import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OpStream Content Hub',
  description: 'AI-powered content generation for OpStream features',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
