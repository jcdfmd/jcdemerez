import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Biblioteca — JC de Merez',
  description: 'Biblioteca personal de JC de Merez.',
  icons: {
    icon: '/favicon.png',
  },
};

export default function BibliotecaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
