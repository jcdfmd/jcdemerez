import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Aforismos — JC de Merez',
  description: 'Reflexiones breves, aforismos y notas.',
  icons: {
    icon: '/favicon.png',
  },
};

export default function AforismoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
