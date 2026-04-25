import type { Metadata } from 'next';
import './globals.css';
import { Analytics } from '@vercel/analytics/react';
import { CSPostHogProvider } from './providers';
import LayoutShell from './LayoutShell';

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
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Inline script to set dark/light BEFORE first paint to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var h = new Date().getHours();
                if (h >= 19 || h < 7) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        <CSPostHogProvider>
          <LayoutShell>
            {children}
          </LayoutShell>
          <Analytics />
        </CSPostHogProvider>
      </body>
    </html>
  );
}
