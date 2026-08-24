import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth/context';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'LuxeEstate 3D — Immersive Real Estate Spatial Showcase',
  description: 'Interactive, collision-aware 3D property walkthrough platform for luxury real estate builders and sales teams.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans bg-slate-950 text-slate-100 antialiased selection:bg-sky-500 selection:text-white`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
