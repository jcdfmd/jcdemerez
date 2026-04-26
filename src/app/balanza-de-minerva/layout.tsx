import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'La Balanza de Minerva — JC de Merez',
  description: 'La Balanza de Minerva. JC de Merez.',
  icons: {
    icon: '/favicon.png',
  },
};

export default function BalanzaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
