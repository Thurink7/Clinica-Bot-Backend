'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/consultas', label: 'Consultas' },
  { href: '/pacientes', label: 'Pacientes' },
  { href: '/profissionais', label: 'Profissionais' },
  { href: '/configuracoes', label: 'Configurações' },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  function signOut() {
    logout();
    router.replace('/login');
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/90 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-brand-secondary">
          <Image src="/logo1.png" alt="Clínica Agenda" width={32} height={32} className="h-8 w-8 shrink-0 rounded-lg object-contain" />
          Clínica Agenda
        </Link>
        <nav className="flex flex-1 flex-wrap items-center justify-end gap-2 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-1.5 transition ${
                pathname === l.href || (l.href === '/consultas' && pathname.startsWith('/consultas'))
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-slate-600 hover:bg-brand-muted hover:text-brand-secondary'
              }`}
            >
              {l.label}
            </Link>
          ))}
          {user && (
            <button
              type="button"
              onClick={signOut}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
            >
              Sair
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
