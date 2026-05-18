'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebaseAuth';
import type { ClinicConfig, Consulta } from '@/lib/api';
import { fetchJson } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { MonthCalendar } from '@/components/consultas/MonthCalendar';
import { generateSlotsForDay } from '@/lib/slotsClient';

type SlotRow = {
  hora: string;
  consulta?: Consulta;
  livre: boolean;
};

function formatarDataLabel(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

export default function ConsultasPage() {
  const [date, setDate] = useState(() => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  });
  const [list, setList] = useState<Consulta[]>([]);
  const [cfg, setCfg] = useState<ClinicConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nomePaciente, setNomePaciente] = useState('');
  const [telefone, setTelefone] = useState('');
  const [hora, setHora] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth() + 1);
  const [monthConsultas, setMonthConsultas] = useState<Consulta[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const c = await fetchJson<ClinicConfig>('/config');
        if (!cancelled) setCfg(c);
      } catch {
        if (!cancelled) setCfg(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const slotsDoDia = useMemo(() => {
    if (!cfg) return [];
    return generateSlotsForDay(date, cfg);
  }, [cfg, date]);

  const consultaByHora = useMemo(() => {
    const m = new Map<string, Consulta>();
    for (const c of list) m.set(c.hora, c);
    return m;
  }, [list]);

  const timeline: SlotRow[] = useMemo(() => {
    const rows: SlotRow[] = slotsDoDia.map((horaSlot) => {
      const consulta = consultaByHora.get(horaSlot);
      return {
        hora: horaSlot,
        consulta,
        livre: !consulta || consulta.status === 'cancelado',
      };
    });
    const seen = new Set(slotsDoDia);
    for (const c of list) {
      if (!seen.has(c.hora)) {
        rows.push({ hora: c.hora, consulta: c, livre: c.status === 'cancelado' });
      }
    }
    rows.sort((a, b) => a.hora.localeCompare(b.hora));
    return rows;
  }, [slotsDoDia, consultaByHora, list]);

  async function criarConsulta() {
    setError(null);
    setSuccess(null);
    if (!nomePaciente || !telefone || !date || !hora) {
      setError('Preencha nome, telefone, data e hora para criar a consulta.');
      return;
    }
    setSaving(true);
    try {
      await fetchJson<Consulta>('/agendar', {
        method: 'POST',
        body: JSON.stringify({ nomePaciente, telefone, data: date, hora }),
      });
      setSuccess('Consulta criada com sucesso.');
      setNomePaciente('');
      setTelefone('');
      setHora('');
      const data = await fetchJson<Consulta[]>(`/consultas?data=${encodeURIComponent(date)}`);
      setList(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function excluirConsulta(id: string) {
    const ok = window.confirm('Deseja realmente excluir esta consulta?');
    if (!ok) return;
    setError(null);
    setSuccess(null);
    setDeletingId(id);
    try {
      await fetchJson<{ id: string; deleted: boolean }>(`/consultas/${id}`, {
        method: 'DELETE',
      });
      setSuccess('Consulta excluída com sucesso.');
      setList((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    setLoading(true);
    const firestore = getFirebaseDb();
    if (firestore) {
      const q = query(collection(firestore, 'consultas'), where('data', '==', date));
      return onSnapshot(
        q,
        (snap) => {
          const rows: Consulta[] = [];
          snap.forEach((doc) => rows.push({ id: doc.id, ...(doc.data() as Omit<Consulta, 'id'>) }));
          rows.sort((a, b) => a.hora.localeCompare(b.hora));
          setList(rows);
          setError(null);
          setLoading(false);
        },
        (e) => {
          setError(e.message);
          setLoading(false);
        }
      );
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await fetchJson<Consulta[]>(`/consultas?data=${encodeURIComponent(date)}`);
        if (!cancelled) setList(data);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    const id = setInterval(async () => {
      try {
        const data = await fetchJson<Consulta[]>(`/consultas?data=${encodeURIComponent(date)}`);
        setList(data);
      } catch {
        /* ignore */
      }
    }, 8000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [date]);

  useEffect(() => {
    const lastDay = new Date(viewYear, viewMonth, 0).getDate();
    const pad = (n: number) => String(n).padStart(2, '0');
    const de = `${viewYear}-${pad(viewMonth)}-01`;
    const ate = `${viewYear}-${pad(viewMonth)}-${pad(lastDay)}`;
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchJson<Consulta[]>(
          `/consultas?de=${encodeURIComponent(de)}&ate=${encodeURIComponent(ate)}`
        );
        if (!cancelled) setMonthConsultas(rows);
      } catch {
        if (!cancelled) setMonthConsultas([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewYear, viewMonth]);

  const daysWithConsultas = useMemo(() => {
    const s = new Set<string>();
    for (const c of monthConsultas) {
      if (c.status !== 'cancelado') s.add(c.data);
    }
    return s;
  }, [monthConsultas]);

  function handleChangeMonth(year: number, month: number) {
    setViewYear(year);
    setViewMonth(month);
  }

  function handleSelectDate(iso: string) {
    setDate(iso);
    const [y, m] = iso.split('-').map(Number);
    if (y && m) {
      setViewYear(y);
      setViewMonth(m);
    }
  }

  function rowStyles(row: SlotRow): string {
    const c = row.consulta;
    if (!c) return 'border-slate-200 bg-brand-muted text-slate-600';
    if (c.status === 'cancelado') return 'border-red-200 bg-red-50 text-red-900';
    if (c.status === 'confirmado') return 'border-brand-primary/40 bg-brand-light text-brand-secondary';
    return 'border-slate-200 bg-white text-slate-800';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-secondary">Consultas</h1>
        <p className="text-sm text-slate-600">Horários do expediente, status e novos agendamentos.</p>
      </div>

      <MonthCalendar
        selectedDate={date}
        onSelectDate={handleSelectDate}
        daysWithConsultas={daysWithConsultas}
        viewYear={viewYear}
        viewMonth={viewMonth}
        onChangeMonth={handleChangeMonth}
      />

      <div className="flex flex-wrap gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded border border-brand-primary/50 bg-brand-light" />
          Confirmado
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded border border-slate-300 bg-brand-muted" />
          Livre
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded border border-red-200 bg-red-50" />
          Cancelado
        </span>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-brand-secondary">Nova consulta</h2>
        <p className="mb-4 text-sm text-slate-500">A consulta será criada para a data selecionada acima.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            type="text"
            value={nomePaciente}
            onChange={(e) => setNomePaciente(e.target.value)}
            placeholder="Nome do paciente"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="Telefone"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={criarConsulta}
            disabled={saving}
            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-secondary disabled:opacity-50"
          >
            {saving ? 'Criando…' : 'Criar consulta'}
          </button>
        </div>
      </section>

      {success && <p className="text-sm text-emerald-600">{success}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-base font-semibold text-brand-secondary">Calendário horizontal do dia</h2>
          <p className="mt-0.5 text-sm capitalize text-slate-500">{formatarDataLabel(date)}</p>
          {!cfg && <p className="mt-1 text-xs text-slate-500">Carregando expediente para montar os horários…</p>}
        </div>
        {loading ? (
          <div className="space-y-2 p-4">
            <div className="h-24 animate-pulse rounded-lg bg-brand-muted" />
          </div>
        ) : timeline.length === 0 ? (
          <div className="px-4 py-10 text-center text-slate-500">
            Nenhum horário neste dia (fora do expediente ou feriado configurado).
          </div>
        ) : (
          <div className="overflow-x-auto p-3">
            <div className="flex min-w-max gap-2 pb-1">
              {timeline.map((row) => (
                <div
                  key={row.hora}
                  className={`flex w-[118px] shrink-0 flex-col rounded-xl border-2 p-2 shadow-sm transition ${rowStyles(row)}`}
                >
                  <div className="mb-1.5 border-b border-slate-200/70 pb-1 text-center text-xs font-bold tracking-wide">
                    {row.hora}
                  </div>
                  <div className="flex min-h-[72px] flex-1 flex-col gap-1 text-xs">
                    {row.consulta && row.consulta.status !== 'cancelado' ? (
                      <>
                        <span className="line-clamp-2 font-medium leading-tight">{row.consulta.nomePaciente}</span>
                        <span className="truncate opacity-80">{row.consulta.telefone}</span>
                        <StatusBadge status={row.consulta.status} />
                      </>
                    ) : row.consulta?.status === 'cancelado' ? (
                      <>
                        <span className="line-clamp-2 line-through opacity-80">{row.consulta.nomePaciente}</span>
                        <StatusBadge status="cancelado" />
                        <span className="text-[10px] leading-tight text-red-800">Livre</span>
                      </>
                    ) : (
                      <span className="mt-1 text-center text-[11px] text-slate-500">Livre</span>
                    )}
                  </div>
                  {row.consulta && (
                    <button
                      type="button"
                      onClick={() => excluirConsulta(row.consulta!.id)}
                      disabled={deletingId === row.consulta!.id}
                      className="mt-2 rounded-md border border-red-200 bg-white px-1.5 py-1 text-[10px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingId === row.consulta!.id ? '…' : 'Excluir'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
