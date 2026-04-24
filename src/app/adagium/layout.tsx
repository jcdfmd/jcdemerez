import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Adagium — JC de Merez',
  description: 'Reflexiones breves, aforismos y notas.',
  icons: {
    icon: '/favicon.png',
  },
};

export default function AdagiumLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

