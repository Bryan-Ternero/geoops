import type { Metadata } from 'next';
import { Manrope, Fraunces, JetBrains_Mono } from 'next/font/google';

import './globals.css';

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
});

const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'GeoOps · Control Operacional Minero',
  description:
    'Control de horómetro en tiempo real, validación multi-regla de despachos mineros y mantenimiento predictivo.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${manrope.variable} ${fraunces.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full bg-canvas text-ink">{children}</body>
    </html>
  );
}
