import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
const club = localFont({
  src: [
    { path: '../public/fonts/dm-sans-400.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/dm-sans-500.woff2', weight: '500', style: 'normal' },
    { path: '../public/fonts/dm-sans-600.woff2', weight: '600', style: 'normal' },
    { path: '../public/fonts/dm-sans-700.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--club-font',
});
export const metadata: Metadata = {
  title: 'Twentyone — Blackjack by Srikar Veluvali',
  description:
    'Multiplayer blackjack made by Srikar Veluvali. Create a private room, invite your friends, and play with an AI or player dealer.',
  authors: [{ name: 'Srikar Veluvali' }],
  creator: 'Srikar Veluvali',
  applicationName: 'Twentyone',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={club.variable}>
      <body>{children}</body>
    </html>
  );
}
