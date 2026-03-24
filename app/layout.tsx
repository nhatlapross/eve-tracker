import type { Metadata } from 'next';
import { Exo_2, Share_Tech_Mono } from 'next/font/google';
import { SuiProviders } from '@/components/sui-provider';
import './globals.css';

const exo2 = Exo_2({
  subsets: ['latin'],
  weight: ['300', '400', '600', '700', '900'],
  variable: '--font-heading',
});

const shareTechMono = Share_Tech_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'EVE Frontier — Industry & Resource Tracker',
  description: 'Track resources, plan industry routes, and dominate the frontier',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${exo2.variable} ${shareTechMono.variable}`}>
      <body><SuiProviders>{children}</SuiProviders></body>
    </html>
  );
}
