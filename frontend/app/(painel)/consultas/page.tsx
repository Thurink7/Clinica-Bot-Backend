'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Profissional } from '@/lib/api';
import { fetchJson } from '@/lib/api';

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function isCpfValid(value: string) {
  const cpf = onlyDigits(value);
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (length: number) => {
    const sum = cpf.slice(0, length).split('').reduce((total, n, index) => total + Number(n) * (length + 1 - index), 0);
    return ((sum * 10) % 11) % 10;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function NovaConsultaPage() {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [nomePaciente, setNomePaciente] = useState('');
  const [telefone, setTelefone] = useState('');
  const [servico, setServico] = useState('');
  const [profissionalId, setProfissionalId] = useState('');
  const [data, setData] = useState(today);
  const [hora, setHora] = useState('');
  const [cpf, setCpf] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [horarios, setHorarios] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<Profissional[]>('/profissionais').then(setProfissionais).catch((e) => setError((e as Error).message));
  }, []);

  const servicos = useMemo(() => [...new Set(profissionais.flatMap((p) => p.servicos || []).filter(Boolean))].sort(), [profissionais]);
  const medicosDisponiveis = useMemo(
    () => profissionais.filter((p) => p.ativo && (!servico || (p.servicos || []).some((s) => s.toUpperCase() === servico.toUpperCase()))),
    [profissionais, servico]
  );

  useEffect(() => {
    if (!profissionalId || !data) {
      setHorarios([]);
      setHora('');
      return;
    }
    let cancelled = false;
    setLoadingSlots(true);
    setHora('');
    fetchJson<{ horarios: string[] }>(`/slots?data=${encodeURIComponent(data)}&profissionalId=${encodeURIComponent(profissionalId)}`)
      .then((result) => !cancelled && setHorarios(result.horarios))
      .catch((e) => !cancelled && setError((e as Error).message))
      .finally(() => !cancelled && setLoadingSlots(false));
    return () => { cancelled = true; };
  }, [data, profissionalId]);

  function selectServico(value: string) {
    setServico(value);
    setProfissionalId('');
    setHora('');
  }

  async function criarConsulta() {
    setError(null);
    setSuccess(null);
    if (!nomePaciente.trim() || onlyDigits(telefone).length < 10 || !servico || !profissionalId || !data || !hora || !dataNascimento) {
      setError('Preencha todos os campos obrigatórios para agendar.');
      return;
    }
    if (!isCpfValid(cpf)) {
      setError('Informe um CPF válido.');
      return;
    }
    setSaving(true);
    try {
      await fetchJson('/agendar', {
        method: 'POST',
        body: JSON.stringify({ nomePaciente: nomePaciente.trim(), telefone: onlyDigits(telefone), servico, profissionalId, data, hora, cpf: onlyDigits(cpf), dataNascimento }),
      });
      setSuccess('Consulta criada com sucesso.');
      setNomePaciente(''); setTelefone(''); setServico(''); setProfissionalId(''); setHora(''); setCpf(''); setDataNascimento('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-secondary">Nova consulta</h1>
        <p className="text-sm text-slate-600">Cadastre o paciente e escolha o profissional, a data e o horário.</p>
      </div>
      {success && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</p>}
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome do paciente"><input value={nomePaciente} onChange={(e) => setNomePaciente(e.target.value)} className="input" placeholder="Nome completo" /></Field>
          <Field label="Telefone"><input type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} className="input" placeholder="(11) 99999-9999" /></Field>
          <Field label="Serviço médico"><select value={servico} onChange={(e) => selectServico(e.target.value)} className="input"><option value="">Selecione o serviço</option>{servicos.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
          <Field label="Médico disponível"><select value={profissionalId} disabled={!servico} onChange={(e) => setProfissionalId(e.target.value)} className="input disabled:bg-slate-100"><option value="">{servico ? 'Selecione o médico' : 'Escolha primeiro o serviço'}</option>{medicosDisponiveis.map((p) => <option key={p.id} value={p.id}>{p.nome}{p.especialidade ? ` — ${p.especialidade}` : ''}</option>)}</select></Field>
          <Field label="Data"><input type="date" min={today()} value={data} onChange={(e) => setData(e.target.value)} className="input" /></Field>
          <Field label="Horário"><select value={hora} disabled={!profissionalId || loadingSlots} onChange={(e) => setHora(e.target.value)} className="input disabled:bg-slate-100"><option value="">{loadingSlots ? 'Carregando horários…' : 'Selecione o horário'}</option>{horarios.map((h) => <option key={h} value={h}>{h}</option>)}</select></Field>
          <Field label="CPF"><input inputMode="numeric" value={cpf} onChange={(e) => setCpf(e.target.value)} className="input" placeholder="000.000.000-00" /></Field>
          <Field label="Data de nascimento"><input type="date" max={today()} value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} className="input" /></Field>
        </div>
        <button type="button" onClick={criarConsulta} disabled={saving} className="mt-6 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-secondary disabled:opacity-50">{saving ? 'Criando…' : 'Criar consulta'}</button>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-slate-700"><span className="mb-1 block">{label}</span>{children}</label>;
}
