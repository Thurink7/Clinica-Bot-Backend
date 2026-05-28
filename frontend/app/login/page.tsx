'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [loading, user, router]);

  function validate(): boolean {
    const next: { email?: string; password?: string } = {};
    const em = email.trim();
    if (!em) next.email = 'Informe o e-mail.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) next.email = 'E-mail inválido.';
    if (!password) next.password = 'Informe a senha.';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      await login(email, password);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!loading && user) return null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gradient-hero">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 gradient-hero opacity-90" />
      <div className="absolute inset-0 grid-pattern opacity-20" />
      <div className="absolute -right-32 top-0 h-96 w-96 rounded-full bg-[hsl(var(--primary-glow)/0.12)] blur-3xl" />
      <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-accent/15 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-lg flex-col px-6 py-10">
        <Link href="/" className="mb-10 flex items-center justify-center gap-2.5">
          <Image src="/logo1.png" alt="Clínica Agenda" width={40} height={40} className="h-10 w-10 rounded-xl shadow-md" />
          <span className="font-display text-xl font-bold text-primary">
            Clínica<span className="text-accent">Agenda</span>
          </span>
        </Link>

        <div className="glass flex-1 rounded-[1.75rem] border border-border/50 p-8 shadow-premium">
          <h1 className="font-display text-center text-2xl font-bold text-primary">Acesso ao painel</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Entre com o e-mail e a senha da sua clínica.
          </p>

          <form className="mt-8 space-y-4" onSubmit={onSubmit} noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm ${
                  fieldErrors.email ? 'border-red-300 bg-red-50/50' : 'border-input bg-background'
                }`}
                placeholder="clinica@email.com"
              />
              {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                Senha
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm ${
                  fieldErrors.password ? 'border-red-300 bg-red-50/50' : 'border-input bg-background'
                }`}
              />
              {fieldErrors.password && <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>}
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(224,80%,14%)] via-primary to-[hsl(217,91%,35%)] py-3 text-sm font-semibold text-primary-foreground shadow-elegant transition hover:shadow-glow disabled:opacity-60"
            >
              {submitting ? 'Entrando…' : 'Entrar'}
            </button>

            <p className="text-center text-sm text-muted-foreground">
              Ainda não é cliente?{' '}
              <Link href="/cadastro" className="font-semibold text-primary hover:text-accent">
                Fale conosco
              </Link>
            </p>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/" className="font-medium text-primary hover:underline">
            Voltar ao site
          </Link>
        </p>
      </div>
    </div>
  );
}
