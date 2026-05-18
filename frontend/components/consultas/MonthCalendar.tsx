'use client';

import { useMemo } from 'react';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

type Props = {
  selectedDate: string;
  onSelectDate: (iso: string) => void;
  daysWithConsultas: Set<string>;
  viewYear: number;
  viewMonth: number;
  onChangeMonth: (year: number, month: number) => void;
};

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toIso(y: number, m: number, d: number) {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function MonthCalendar({
  selectedDate,
  onSelectDate,
  daysWithConsultas,
  viewYear,
  viewMonth,
  onChangeMonth,
}: Props) {
  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth - 1, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
    const out: { day: number | null; iso: string | null }[] = [];
    for (let i = 0; i < startPad; i++) out.push({ day: null, iso: null });
    for (let d = 1; d <= daysInMonth; d++) {
      out.push({ day: d, iso: toIso(viewYear, viewMonth, d) });
    }
    return out;
  }, [viewYear, viewMonth]);

  function prevMonth() {
    if (viewMonth === 1) onChangeMonth(viewYear - 1, 12);
    else onChangeMonth(viewYear, viewMonth - 1);
  }

  function nextMonth() {
    if (viewMonth === 12) onChangeMonth(viewYear + 1, 1);
    else onChangeMonth(viewYear, viewMonth + 1);
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={prevMonth}
          className="rounded-lg border border-border px-2.5 py-1 text-sm text-primary hover:bg-secondary"
          aria-label="Mês anterior"
        >
          ‹
        </button>
        <h3 className="text-sm font-semibold text-primary">
          {MONTHS[viewMonth - 1]} {viewYear}
        </h3>
        <button
          type="button"
          onClick={nextMonth}
          className="rounded-lg border border-border px-2.5 py-1 text-sm text-primary hover:bg-secondary"
          aria-label="Próximo mês"
        >
          ›
        </button>
      </div>
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell.iso) return <span key={`e-${i}`} className="aspect-square" />;
          const hasConsulta = daysWithConsultas.has(cell.iso);
          const isSelected = cell.iso === selectedDate;
          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => onSelectDate(cell.iso!)}
              className={`aspect-square rounded-lg text-sm font-medium transition ${
                isSelected
                  ? 'ring-2 ring-primary ring-offset-1'
                  : ''
              } ${
                hasConsulta
                  ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                  : 'bg-transparent text-foreground hover:bg-muted'
              }`}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-emerald-100 ring-1 ring-emerald-300" />
          Com consultas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded ring-1 ring-border" />
          Livre
        </span>
      </div>
    </div>
  );
}
