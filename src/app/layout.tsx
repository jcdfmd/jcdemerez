import type { Metadata } from 'next';
import './globals.css';
import { Analytics } from '@vercel/analytics/react';

export const metadata: Metadata = {
  title: 'JC de Merez',
  description: 'Nulla die sine aphorismus. Página personal de JC de Merez.',
  icons: {
    icon: '/favicon.png',
  },
  openGraph: {
    title: 'JC de Merez',
    description: 'Nulla die sine aphorismus.',
    url: 'https://jcdemerez.com',
    siteName: 'JC de Merez',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
