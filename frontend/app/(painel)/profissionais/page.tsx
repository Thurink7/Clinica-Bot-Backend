'use client';

import { useEffect, useState } from 'react';
import type { Profissional } from '@/lib/api';
import { fetchJson } from '@/lib/api';

function onlyDigits(s: string) {
  return s.replace(/\D/g, '');
}

function validateEmail(em: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.trim());
}

export default function ProfissionaisPage() {
  const [list, setList] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [diasTrabalho, setDiasTrabalho] = useState<number[]>([1, 2, 3, 4, 5]);
  const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson<Profissional[]>('/profissionais');
      setList(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function validate(): boolean {
    const fe: Record<string, string> = {};
    if (!nome.trim()) fe.nome = 'Informe o nome completo.';
    if (!especialidade.trim()) fe.especialidade = 'Informe a especialidade.';
    const tel = onlyDigits(telefone);
    if (tel.length < 10) fe.telefone = 'Telefone inválido (mín. 10 dígitos).';
    if (!validateEmail(email)) fe.email = 'E-mail inválido.';
    setFieldErrors(fe);
    return Object.keys(fe).length === 0;
  }

  async function cadastrar() {
    setError(null);
    setSuccess(null);
    if (!validate()) return;

    setSaving(true);
    try {
      await fetchJson<Profissional>('/profissionais', {
        method: 'POST',
        body: JSON.stringify({
          nome: nome.trim(),
          especialidade: especialidade.trim(),
          telefone: onlyDigits(telefone),
          email: email.trim().toLowerCase(),
          diasTrabalho,
        }),
      });
      setSuccess('Profissional cadastrado com sucesso.');
      setNome('');
      setEspecialidade('');
      setTelefone('');
      setEmail('');
      setFieldErrors({});
      setDiasTrabalho([1, 2, 3, 4, 5]);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function alterarAtivo(p: Profissional) {
    try { await fetchJson(`/profissionais/${p.id}/ativo`, { method: 'PATCH', body: JSON.stringify({ ativo: !p.ativo }) }); await load(); } catch (e) { setError((e as Error).message); }
  }

  async function excluir(p: Profissional) {
    if (!window.confirm(`Excluir ${p.nome}? Esta ação não pode ser desfeita.`)) return;
    try { await fetchJson(`/profissionais/${p.id}`, { method: 'DELETE' }); await load(); } catch (e) { setError((e as Error).message); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-secondary">Profissionais</h1>
          <p className="text-sm text-slate-600">
            Cadastre a equipe da clínica — dados alimentam filtros e integrações.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-brand-muted"
        >
          Atualizar lista
        </button>
      </div>

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{success}</div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-brand-secondary">Novo profissional</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">Nome completo</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Dra. Maria Souza"
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
                fieldErrors.nome ? 'border-red-300 bg-red-50/40' : 'border-slate-200'
              }`}
            />
            {fieldErrors.nome && <p className="mt-1 text-xs text-red-600">{fieldErrors.nome}</p>}
          </div>
          <div className="sm:col-span-2">
            <span className="block text-sm font-medium text-slate-700">Dias de atendimento</span>
            <div className="mt-2 flex flex-wrap gap-2">{dias.map((dia, index) => <label key={dia} className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm ${diasTrabalho.includes(index) ? 'border-brand-primary bg-brand-light text-brand-secondary' : 'border-slate-200 text-slate-600'}`}><input type="checkbox" className="sr-only" checked={diasTrabalho.includes(index)} onChange={() => setDiasTrabalho((current) => current.includes(index) ? current.filter((d) => d !== index) : [...current, index].sort())} />{dia}</label>)}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Especialidade</label>
            <input
              type="text"
              value={especialidade}
              onChange={(e) => setEspecialidade(e.target.value)}
              placeholder="Ex.: Cardiologia"
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
                fieldErrors.especialidade ? 'border-red-300 bg-red-50/40' : 'border-slate-200'
              }`}
            />
            {fieldErrors.especialidade && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.especialidade}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Telefone</label>
            <input
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(11) 98765-4321"
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
                fieldErrors.telefone ? 'border-red-300 bg-red-50/40' : 'border-slate-200'
              }`}
            />
            {fieldErrors.telefone && <p className="mt-1 text-xs text-red-600">{fieldErrors.telefone}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@clinica.com.br"
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
                fieldErrors.email ? 'border-red-300 bg-red-50/40' : 'border-slate-200'
              }`}
            />
            {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={cadastrar}
            disabled={saving}
            className="rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-secondary disabled:opacity-50"
          >
            {saving ? 'Cadastrando…' : 'Cadastrar'}
          </button>
          <p className="text-xs text-slate-500">
            A especialidade também é usada como serviço no fluxo de agendamento (nome padronizado em maiúsculas).
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-brand-secondary">Equipe cadastrada</h2>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-brand-muted" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center text-slate-500">
            Nenhum profissional cadastrado.
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {list.map((p) => (
              <li
                key={p.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-50"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-slate-900">{p.nome}</div>
                    {(p.especialidade || (p.servicos || [])[0]) && (
                      <p className="mt-1 text-sm text-brand-secondary">
                        {p.especialidade || (p.servicos || [])[0]}
                      </p>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      p.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {p.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <dl className="mt-3 space-y-1 text-sm text-slate-600">
                  {p.telefone && (
                    <div>
                      <dt className="inline font-medium text-slate-500">Tel.: </dt>
                      <dd className="inline">{p.telefone}</dd>
                    </div>
                  )}
                  {p.email && (
                    <div>
                      <dt className="inline font-medium text-slate-500">E-mail: </dt>
                      <dd className="inline break-all">{p.email}</dd>
                    </div>
                  )}
                </dl>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(p.servicos || []).map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-brand-light px-2.5 py-1 text-xs font-medium text-brand-secondary"
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-500">Atende: {(p.diasTrabalho || [1, 2, 3, 4, 5]).map((d) => dias[d]).join(', ')}</p>
                <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3"><button onClick={() => alterarAtivo(p)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">{p.ativo ? 'Tornar inativo' : 'Tornar ativo'}</button><button onClick={() => excluir(p)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50">Excluir</button></div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
