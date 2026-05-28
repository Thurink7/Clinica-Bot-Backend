'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { fetchJson } from '@/lib/api';

export default function CadastroPage() {
  const [nomeClinica, setNomeClinica] = useState('');
  const [nomeContato, setNomeContato] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cidade, setCidade] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const res = await fetchJson<{ message: string }>('/contato', {
        method: 'POST',
        body: JSON.stringify({
          nomeClinica: nomeClinica.trim(),
          nomeContato: nomeContato.trim(),
          email: email.trim(),
          telefone,
          cidade: cidade.trim() || null,
          mensagem: mensagem.trim() || null,
        }),
        skipAuth: true,
      });
      setSuccess(res.message || 'Mensagem enviada com sucesso!');
      setNomeClinica('');
      setNomeContato('');
      setEmail('');
      setTelefone('');
      setCidade('');
      setMensagem('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 gradient-hero opacity-90" />
      <div className="absolute inset-0 grid-pattern opacity-20" />
      
      <div className="absolute -right-32 top-0 h-96 w-96 rounded-full bg-[hsl(var(--primary-glow)/0.12)] blur-3xl" />
      <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-accent/15 blur-3xl" />

      <div className="relative mx-auto max-w-xl px-6 py-12">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <Image src="/logo1.png" alt="Clínica Agenda" width={40} height={40} className="h-10 w-10 rounded-xl shadow-md" />
          <span className="font-display text-xl font-bold text-primary">
            Clínica<span className="text-accent">Agenda</span>
          </span>
        </Link>

        <div className="glass rounded-[1.75rem] border border-border/50 p-8 shadow-premium">
          <h1 className="font-display text-center text-2xl font-bold text-primary">Aderir ao serviço</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Preencha o formulário e nossa equipe entrará em contato para apresentar a plataforma à sua clínica.
          </p>

          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <input
              required
              value={nomeClinica}
              onChange={(e) => setNomeClinica(e.target.value)}
              placeholder="Nome da clínica"
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
            />
            <input
              required
              value={nomeContato}
              onChange={(e) => setNomeContato(e.target.value)}
              placeholder="Seu nome"
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail"
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
              />
              <input
                required
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="Telefone (com DDD)"
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
              />
            </div>
            <input
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              placeholder="Cidade (opcional)"
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
            />
            <textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Conte um pouco sobre sua clínica e necessidades (opcional)"
              rows={4}
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
            />

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
            )}
            {success && (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-gradient-to-br from-[hsl(224,80%,14%)] via-primary to-[hsl(217,91%,35%)] py-3 text-sm font-semibold text-primary-foreground shadow-elegant disabled:opacity-60"
            >
              {saving ? 'Enviando…' : 'Enviar solicitação'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Já é cliente?{' '}
            <Link href="/login" className="font-semibold text-primary hover:text-accent">
              Acessar painel
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/" className="hover:underline">
            Voltar ao site
          </Link>
        </p>
      </div>
    </div>
  );
}
