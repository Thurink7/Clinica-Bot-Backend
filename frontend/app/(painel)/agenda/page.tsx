'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Consulta } from '@/lib/api';
import { fetchJson } from '@/lib/api';
import { MonthCalendar } from '@/components/consultas/MonthCalendar';
import { StatusBadge } from '@/components/StatusBadge';

function isoToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

export default function AgendaPage() {
  const [date, setDate] = useState(isoToday);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth() + 1);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [monthConsultas, setMonthConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reagendar, setReagendar] = useState<Consulta | null>(null);
  const [novaData, setNovaData] = useState('');
  const [novaHora, setNovaHora] = useState('');
  const [reagendando, setReagendando] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchJson<Consulta[]>(`/consultas?data=${encodeURIComponent(date)}`)
      .then((rows) => !cancelled && setConsultas(rows.sort((a, b) => a.hora.localeCompare(b.hora))))
      .catch((e) => !cancelled && setError((e as Error).message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [date]);

  useEffect(() => {
    const lastDay = new Date(viewYear, viewMonth, 0).getDate();
    const pad = (value: number) => String(value).padStart(2, '0');
    fetchJson<Consulta[]>(`/consultas?de=${viewYear}-${pad(viewMonth)}-01&ate=${viewYear}-${pad(viewMonth)}-${pad(lastDay)}`)
      .then(setMonthConsultas)
      .catch((e) => setError((e as Error).message));
  }, [viewYear, viewMonth]);

  const daysWithConsultas = useMemo(() => new Set(monthConsultas.filter((c) => c.status !== 'cancelado').map((c) => c.data)), [monthConsultas]);

  function selectDate(iso: string) {
    setDate(iso);
    const [year, month] = iso.split('-').map(Number);
    setViewYear(year); setViewMonth(month);
  }

  async function excluir(id: string) {
    if (!window.confirm('Deseja realmente excluir esta consulta?')) return;
    setDeletingId(id); setError(null);
    try {
      await fetchJson(`/consultas/${id}`, { method: 'DELETE' });
      setConsultas((current) => current.filter((c) => c.id !== id));
      setMonthConsultas((current) => current.filter((c) => c.id !== id));
    } catch (e) {
      setError((e as Error).message);
    } finally { setDeletingId(null); }
  }

  async function confirmarReagendamento() {
    if (!reagendar || !novaData || !novaHora) return;
    setReagendando(true); setError(null);
    try {
      const updated = await fetchJson<Consulta>(`/consultas/${reagendar.id}/reagendar`, { method: 'PATCH', body: JSON.stringify({ data: novaData, hora: novaHora }) });
      setConsultas((rows) => rows.filter((c) => c.id !== updated.id));
      setMonthConsultas((rows) => rows.map((c) => c.id === updated.id ? updated : c));
      setReagendar(null);
      if (updated.data === date) setConsultas((rows) => [...rows.filter((c) => c.id !== updated.id), updated].sort((a, b) => a.hora.localeCompare(b.hora)));
    } catch (e) { setError((e as Error).message); } finally { setReagendando(false); }
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-brand-secondary">Agenda</h1><p className="text-sm text-slate-600">Selecione um dia no calendário para consultar os horários agendados.</p></div>
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
        <MonthCalendar selectedDate={date} onSelectDate={selectDate} daysWithConsultas={daysWithConsultas} viewYear={viewYear} viewMonth={viewMonth} onChangeMonth={(year, month) => { setViewYear(year); setViewMonth(month); }} />
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-lg font-semibold text-brand-secondary">Horários do dia</h2><p className="mt-1 capitalize text-sm text-slate-500">{formatDate(date)}</p></div>
          {loading ? <div className="space-y-3 p-5"><div className="h-20 animate-pulse rounded-lg bg-brand-muted" /><div className="h-20 animate-pulse rounded-lg bg-brand-muted" /></div> : consultas.length === 0 ? <p className="p-10 text-center text-sm text-slate-500">Nenhuma consulta agendada para este dia.</p> : <ul className="divide-y divide-slate-100">{consultas.map((consulta) => <li key={consulta.id} className="flex gap-4 p-4"><time className="w-14 pt-0.5 text-base font-bold text-brand-secondary">{consulta.hora}</time><div className="min-w-0 flex-1"><p className="font-semibold text-slate-800">{consulta.nomePaciente}</p><p className="truncate text-sm text-slate-500">{consulta.telefone}{consulta.servico ? ` · ${consulta.servico}` : ''}</p>{consulta.status !== 'cancelado' && <div className="mt-2"><StatusBadge status={consulta.status} /></div>}</div><div className="flex shrink-0 flex-col gap-2"><button type="button" onClick={() => { setReagendar(consulta); setNovaData(consulta.data); setNovaHora(consulta.hora); }} className="rounded-md border border-brand-primary/30 px-2 py-1 text-xs font-medium text-brand-secondary hover:bg-brand-muted">Reagendar</button><button type="button" onClick={() => excluir(consulta.id)} disabled={deletingId === consulta.id} className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">{deletingId === consulta.id ? 'Excluindo…' : 'Excluir'}</button></div></li>)}</ul>}
        </section>
      </div>
      {reagendar && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"><div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"><h2 className="text-lg font-bold text-brand-secondary">Reagendar consulta</h2><p className="mt-1 text-sm text-slate-600">{reagendar.nomePaciente}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm">Data<input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} className="input mt-1" /></label><label className="text-sm">Horário<input type="time" value={novaHora} onChange={(e) => setNovaHora(e.target.value)} className="input mt-1" /></label></div><div className="mt-5 flex justify-end gap-2"><button onClick={() => setReagendar(null)} className="rounded-lg px-3 py-2 text-sm">Cancelar</button><button onClick={confirmarReagendamento} disabled={reagendando} className="rounded-lg bg-brand-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{reagendando ? 'Salvando…' : 'Confirmar'}</button></div></div></div>}
    </div>
  );
}
