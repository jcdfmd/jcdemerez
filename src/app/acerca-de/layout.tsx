import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Acerca de — JC de Merez',
  description: 'Acerca de JC de Merez.',
  icons: {
    icon: '/favicon.png',
  },
};

export default function AcercaDeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
