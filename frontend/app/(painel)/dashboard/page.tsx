'use client';

import { useConsultasHoje } from '@/lib/useConsultasHoje';
import { StatusBadge } from '@/components/StatusBadge';

function IconClipboard() {
  return (
    <svg className="h-5 w-5 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg className="h-5 w-5 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconX() {
  return (
    <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconPercent() {
  return (
    <svg className="h-5 w-5 text-brand-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}

export default function DashboardPage() {
  const { list, error, loading, date } = useConsultasHoje();

  const total = list.length;
  const confirmadas = list.filter((c) => c.status === 'confirmado').length;
  const canceladas = list.filter((c) => c.status === 'cancelado').length;
  const ativas = list.filter((c) => c.status !== 'cancelado').length;
  const taxaComparecimento =
    ativas > 0 ? Math.round((confirmadas / ativas) * 100) : total > 0 ? Math.round((confirmadas / Math.max(total, 1)) * 100) : 0;

  const proximas = [...list]
    .filter((c) => c.status !== 'cancelado')
    .sort((a, b) => a.hora.localeCompare(b.hora))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-secondary">Dashboard</h1>
          <p className="text-sm text-slate-600">Visão rápida das consultas de hoje ({date})</p>
        </div>
        <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-medium text-brand-secondary">
          Atualização automática
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-brand-muted" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Consultas do dia" value={total} icon={<IconClipboard />} ring="brand" />
            <StatCard title="Confirmadas" value={confirmadas} icon={<IconCheck />} ring="brand" />
            <StatCard title="Canceladas" value={canceladas} icon={<IconX />} ring="rose" />
            <StatCard
              title="Taxa de comparecimento"
              value={`${taxaComparecimento}%`}
              subtitle="Confirmadas sobre consultas ativas"
              icon={<IconPercent />}
              ring="brand"
            />
          </div>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-base font-semibold text-brand-secondary">Distribuição do dia</h2>
              <p className="mb-4 text-xs text-slate-500">Proporção entre confirmadas, agendadas e canceladas.</p>
              <DashboardDonut
                slices={[
                  { label: 'Confirmadas', value: confirmadas, color: '#2563EB' },
                  { label: 'Agendadas', value: list.filter((c) => c.status === 'agendado').length, color: '#94a3b8' },
                  { label: 'Canceladas', value: canceladas, color: '#f87171' },
                ]}
              />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-base font-semibold text-brand-secondary">Volume por status</h2>
              <p className="mb-4 text-xs text-slate-500">Comparativo numérico das consultas de hoje.</p>
              <DashboardBars
                items={[
                  { label: 'Total', value: total, color: '#1E40AF' },
                  { label: 'Confirmadas', value: confirmadas, color: '#2563EB' },
                  { label: 'Agendadas', value: list.filter((c) => c.status === 'agendado').length, color: '#64748b' },
                  { label: 'Canceladas', value: canceladas, color: '#ef4444' },
                ]}
              />
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-brand-muted/40 p-4 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-brand-secondary">
              Próximas consultas de hoje
            </h2>
            {proximas.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma consulta ativa para hoje.</p>
            ) : (
              <ul className="space-y-2">
                {proximas.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-slate-100"
                  >
                    <div className="text-sm">
                      <span className="font-medium text-slate-900">{c.hora}</span>
                      <span className="mx-2 text-slate-400">·</span>
                      <span>{c.nomePaciente}</span>
                      <span className="ml-2 text-slate-500">{c.telefone}</span>
                    </div>
                    <StatusBadge status={c.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function DashboardDonut({
  slices,
}: {
  slices: { label: string; value: number; color: string }[];
}) {
  const rawSum = slices.reduce((a, s) => a + s.value, 0);
  if (rawSum === 0) {
    return <p className="text-center text-sm text-slate-500">Sem consultas hoje para montar o gráfico.</p>;
  }
  const sum = rawSum;
  const cx = 90;
  const cy = 90;
  const r = 56;
  const inner = 34;
  let angle = -Math.PI / 2;
  const paths: { d: string; color: string; label: string; value: number }[] = [];
  for (const s of slices) {
    if (s.value <= 0) continue;
    const frac = s.value / sum;
    const a2 = angle + frac * Math.PI * 2;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    const x2 = cx + r * Math.cos(a2);
    const y2 = cy + r * Math.sin(a2);
    const large = frac > 0.5 ? 1 : 0;
    const xi = cx + inner * Math.cos(a2);
    const yi = cy + inner * Math.sin(a2);
    const xo = cx + inner * Math.cos(angle);
    const yo = cy + inner * Math.sin(angle);
    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi} ${yi} A ${inner} ${inner} 0 ${large} 0 ${xo} ${yo} Z`;
    paths.push({ d, color: s.color, label: s.label, value: s.value });
    angle = a2;
  }
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
      <svg viewBox="0 0 180 180" className="h-44 w-44 shrink-0">
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill={p.color} stroke="white" strokeWidth="1" />
        ))}
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="#1e293b" fontSize="13" fontWeight="700">
          {sum}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" fill="#64748b" fontSize="9">
          consultas
        </text>
      </svg>
      <ul className="space-y-2 text-sm">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="text-slate-700">
              {s.label}: <strong>{s.value}</strong>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DashboardBars({ items }: { items: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  const w = 220;
  const rowH = 28;
  const barH = 14;
  return (
    <svg viewBox={`0 0 ${w + 40} ${items.length * rowH + 8}`} className="h-auto w-full max-w-md">
      {items.map((it, i) => {
        const y = 12 + i * rowH;
        const bw = (it.value / max) * w;
        return (
          <g key={it.label}>
            <text x={0} y={y + barH - 2} fontSize="11" fill="#64748b">
              {it.label}
            </text>
            <rect x={72} y={y} width={w} height={barH} rx={4} fill="#f1f5f9" />
            <rect x={72} y={y} width={bw} height={barH} rx={4} fill={it.color} />
            <text x={74 + w + 6} y={y + barH - 1} fontSize="12" fontWeight="600" fill="#0f172a">
              {it.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  ring,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  ring: 'brand' | 'rose';
}) {
  const ringClass =
    ring === 'rose' ? 'ring-red-100 hover:ring-red-200' : 'ring-brand-light hover:ring-brand-primary/30';
  return (
    <div
      className={`rounded-xl bg-white p-5 shadow-sm ring-1 transition ${ringClass}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm text-slate-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-brand-secondary">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>
        <div className="rounded-lg bg-brand-muted p-2">{icon}</div>
      </div>
    </div>
  );
}
