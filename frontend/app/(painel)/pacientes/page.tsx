'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PacienteRow, Profissional } from '@/lib/api';
import { fetchJson } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';

function formatCpfDisplay(cpf: string | null | undefined) {
  if (!cpf || cpf.length !== 11) return cpf || '—';
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

function formatIsoDateBR(iso: string | null | undefined) {
  if (!iso) return '?';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export default function PacientesPage() {
  const [list, setList] = useState<PacienteRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [profissionalId, setProfissionalId] = useState<string>('');

  const [cadNome, setCadNome] = useState('');
  const [cadTel, setCadTel] = useState('');
  const [cadCpf, setCadCpf] = useState('');
  const [cadNasc, setCadNasc] = useState('');
  const [cadSaving, setCadSaving] = useState(false);
  const [cadMsg, setCadMsg] = useState<string | null>(null);

  const [prontuario, setProntuario] = useState<PacienteRow | null>(null);
  const [obsDraft, setObsDraft] = useState('');
  const [obsSaving, setObsSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [pros, pacientes] = await Promise.all([
        fetchJson<Profissional[]>('/profissionais'),
        fetchJson<PacienteRow[]>(
          profissionalId
            — `/pacientes?profissionalId=${encodeURIComponent(profissionalId)}`
            : '/pacientes'
        ),
      ]);
      setProfissionais(pros);
      setList(pacientes);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [profissionalId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch {
        if (!cancelled) {
          /* error já em load */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    if (prontuario) {
      setObsDraft(prontuario.observacoes || '');
    }
  }, [prontuario]);

  const filtered = list.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      p.nome.toLowerCase().includes(q) ||
      p.telefone.includes(q) ||
      (p.cpf && p.cpf.includes(q.replace(/\D/g, '')))
    );
  });

  const proById = new Map(profissionais.map((p) => [p.id, p]));

  async function cadastrarPaciente(e: React.FormEvent) {
    e.preventDefault();
    setCadMsg(null);
    const cpfDigits = cadCpf.replace(/\D/g, '');
    if (!cadNome.trim() || !cadTel.trim() || cpfDigits.length !== 11) {
      setCadMsg('Preencha nome, telefone e CPF válido (11 dígitos).');
      return;
    }
    setCadSaving(true);
    try {
      await fetchJson('/pacientes/cadastro', {
        method: 'POST',
        body: JSON.stringify({
          nome: cadNome.trim(),
          telefone: cadTel.replace(/\D/g, ''),
          cpf: cpfDigits,
          dataNascimento: cadNasc || null,
        }),
      });
      setCadNome('');
      setCadTel('');
      setCadCpf('');
      setCadNasc('');
      setCadMsg('Paciente cadastrado/atualizado com sucesso.');
      await load();
    } catch (err) {
      setCadMsg((err as Error).message);
    } finally {
      setCadSaving(false);
    }
  }

  async function salvarObservacoes() {
    if (!prontuario) return;
    setObsSaving(true);
    try {
      await fetchJson('/pacientes/observacoes', {
        method: 'PATCH',
        body: JSON.stringify({
          cpf: prontuario.cpf || prontuario.id,
          observacoes: obsDraft,
        }),
      });
      await load();
      setProntuario((prev) => (prev — { ...prev, observacoes: obsDraft } : null));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setObsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-secondary">Pacientes</h1>
          <p className="text-sm text-slate-600">
            Cadastro independente de consultas; o histórico de consultas aparece como informação adicional do paciente.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="w-full rounded-lg border border-slate-200 bg-brand-muted px-3 py-2 sm:w-72">
            <label className="mr-2 text-sm text-slate-600">Médico</label>
            <select
              value={profissionalId}
              onChange={(e) => {
                setError(null);
                setProfissionalId(e.target.value);
              }}
              className="bg-transparent text-sm"
            >
              <option value="">Todos</option>
              {profissionais.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, telefone ou CPF"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm sm:w-72"
          />
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-brand-secondary">Cadastrar paciente</h2>
        <p className="mb-4 text-sm text-slate-500">
          Registro pr?prio do paciente na cl?nica (n?o cria consulta). Consultas continuam sendo agendadas em Consultas ou
          pelo bot.
        </p>
        <form onSubmit={cadastrarPaciente} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            type="text"
            value={cadNome}
            onChange={(e) => setCadNome(e.target.value)}
            placeholder="Nome completo"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="tel"
            value={cadTel}
            onChange={(e) => setCadTel(e.target.value)}
            placeholder="Telefone (com DDD)"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={cadCpf}
            onChange={(e) => setCadCpf(e.target.value)}
            placeholder="CPF (obrigatório)"
            required
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={cadNasc}
            onChange={(e) => setCadNasc(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={cadSaving}
            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-secondary disabled:opacity-50"
          >
            {cadSaving — 'Salvando…' : 'Salvar cadastro'}
          </button>
        </form>
        {cadMsg && <p className="mt-3 text-sm text-slate-700">{cadMsg}</p>}
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-4">
        {filtered.map((p) => (
          <div
            key={p.id || p.cpf || p.telefone}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-slate-900">{p.nome}</div>
                <div className="text-sm text-slate-500">
                  ID (CPF): {formatCpfDisplay(p.cpf || p.id)} · Tel: {p.telefone}
                </div>
                {p.dataNascimento && (
                  <p className="mt-1 text-xs text-slate-500">Nasc.: {formatIsoDateBR(p.dataNascimento)}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-brand-muted px-2.5 py-1 text-xs text-slate-600">
                  {p.consultas.length} consulta(s) no histórico
                </span>
                <button
                  type="button"
                  onClick={() => setProntuario(p)}
                  className="rounded-lg bg-brand-secondary px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-primary"
                >
                  Prontuário
                </button>
              </div>
            </div>
            {p.consultas.length > 0 && (
              <ul className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-sm">
                {p.consultas.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-2">
                    <span>
                      {c.data} {c.hora}
                    </span>
                    {(c.profissionalId || c.servico) && (
                      <span className="text-slate-500">
                        — {c.profissionalId — `Dr(a). ${proById.get(c.profissionalId)?.nome || '—'}` : 'Dr(a). ?'}
                        {c.servico — ` — ${String(c.servico).toUpperCase()}` : ''}
                      </span>
                    )}
                    <StatusBadge status={c.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {filtered.length === 0 && !error && (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            Nenhum paciente encontrado.
          </p>
        )}
      </div>

      {prontuario && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
            role="dialog"
            aria-labelledby="prontuario-titulo"
          >
            <div className="mb-4 flex items-start justify-between gap-2">
              <h2 id="prontuario-titulo" className="text-lg font-bold text-brand-secondary">
                Prontuário
              </h2>
              <button
                type="button"
                onClick={() => setProntuario(null)}
                className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
              >
                Fechar
              </button>
            </div>
            <dl className="space-y-2 border-b border-slate-100 pb-4 text-sm">
              <div>
                <dt className="text-xs font-medium text-slate-500">Nome</dt>
                <dd className="font-medium text-slate-900">{prontuario.nome}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Telefone</dt>
                <dd>{prontuario.telefone}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">CPF</dt>
                <dd>{formatCpfDisplay(prontuario.cpf)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Data de nascimento</dt>
                <dd>{formatIsoDateBR(prontuario.dataNascimento)}</dd>
              </div>
            </dl>
            <div className="mt-4">
              <label className="mb-1 block text-xs font-medium text-slate-600">Observa??es cl?nicas / administrativas</label>
              <textarea
                value={obsDraft}
                onChange={(e) => setObsDraft(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Registre evolu??o, alergias, prefer?ncias de contato?"
              />
              <button
                type="button"
                onClick={salvarObservacoes}
                disabled={obsSaving}
                className="mt-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-secondary disabled:opacity-50"
              >
                {obsSaving — 'Salvando…' : 'Salvar observa??es'}
              </button>
            </div>
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold text-brand-secondary">Consultas registradas</h3>
              {prontuario.consultas.length === 0 — (
                <p className="text-sm text-slate-500">Nenhuma consulta vinculada a este telefone ainda.</p>
              ) : (
                <ul className="max-h-40 space-y-2 overflow-y-auto text-sm">
                  {prontuario.consultas.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-md bg-brand-muted/50 px-2 py-1.5">
                      <span>
                        {c.data} {c.hora}
                      </span>
                      <StatusBadge status={c.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
