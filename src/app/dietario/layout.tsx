import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dietario — JC de Merez',
  description: 'Reflexiones, entradas de diario y notas personales.',
  icons: {
    icon: '/favicon.png',
  },
};

export default function DietarioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
