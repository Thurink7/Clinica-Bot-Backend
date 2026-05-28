import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';

export const metadata: Metadata = {
  title: 'Clínica Agenda — Reduza faltas e automatize sua clínica',
  description:
    'Plataforma B2B para clínicas: agendamentos automáticos, lembretes inteligentes via WhatsApp e mais pacientes atendidos.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
