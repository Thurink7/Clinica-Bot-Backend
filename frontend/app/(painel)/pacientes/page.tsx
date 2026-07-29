'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PacienteRow, Profissional } from '@/lib/api';
import { fetchJson } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';

type Prontuario = {
  id: string;
  clienteCpf: string;
  parceiroId: string;
  profissionalId: string | null;
  diagnostico: string;
  prescricao: string;
  resultados: { nomeExame: string; dataExame: string; resultadoDesc: string }[];
  dataProntuario: string;
};

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

  // Register Patient form state
  const [cadNome, setCadNome] = useState('');
  const [cadTel, setCadTel] = useState('');
  const [cadCpf, setCadCpf] = useState('');
  const [cadNasc, setCadNasc] = useState('');
  const [cadSaving, setCadSaving] = useState(false);
  const [cadMsg, setCadMsg] = useState<string | null>(null);

  // Link CPF inline state
  const [editingCpfPhone, setEditingCpfPhone] = useState<string | null>(null);
  const [tempCpf, setTempCpf] = useState('');

  // Observations Modal State (from branch)
  const [obsPaciente, setObsPaciente] = useState<PacienteRow | null>(null);
  const [obsDraft, setObsDraft] = useState('');
  const [obsSaving, setObsSaving] = useState(false);

  // Advanced Prontuarios Modal State (our SaaS features)
  const [selectedPaciente, setSelectedPaciente] = useState<PacienteRow | null>(null);
  const [prontuarios, setProntuarios] = useState<Prontuario[]>([]);
  const [loadingProntuarios, setLoadingProntuarios] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // New Prontuario Form State
  const [diagnostico, setDiagnostico] = useState('');
  const [prescricao, setPrescricao] = useState('');
  const [formDocId, setFormDocId] = useState('');
  const [newExameNome, setNewExameNome] = useState('');
  const [newExameDesc, setNewExameDesc] = useState('');
  const [examesList, setExamesList] = useState<{ nomeExame: string; dataExame: string; resultadoDesc: string }[]>([]);

  const filtered = list.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const cleanQ = q.replace(/\D/g, '');
    return (
      p.nome.toLowerCase().includes(q) ||
      p.telefone.includes(q) ||
      (p.cpf && p.cpf.includes(cleanQ))
    );
  });

  const proById = new Map(profissionais.map((p) => [p.id, p]));

  const load = useCallback(async () => {
    setError(null);
    try {
      const [pros, pacientes] = await Promise.all([
        fetchJson<Profissional[]>('/profissionais'),
        fetchJson<PacienteRow[]>(
          profissionalId
            ? `/pacientes?profissionalId=${encodeURIComponent(profissionalId)}`
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
    load();
  }, [load]);

  useEffect(() => {
    if (obsPaciente) {
      setObsDraft(obsPaciente.observacoes || '');
    }
  }, [obsPaciente]);

  const cadastrarPaciente = async (e: React.FormEvent) => {
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
      setCadMsg('Paciente cadastrado com sucesso!');
      await load();
    } catch (err) {
      setCadMsg((err as Error).message);
    } finally {
      setCadSaving(false);
    }
  };

  const handleLinkCpf = async (paciente: PacienteRow) => {
    const cleanCpf = tempCpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      alert('CPF inválido (deve conter 11 dígitos)');
      return;
    }
    try {
      await fetchJson('/pacientes/cadastro', {
        method: 'POST',
        body: JSON.stringify({
          nome: paciente.nome,
          telefone: paciente.telefone.replace(/\D/g, ''),
          cpf: cleanCpf,
        }),
      });
      alert('CPF associado com sucesso!');
      setEditingCpfPhone(null);
      setTempCpf('');
      await load();
    } catch (e) {
      alert('Erro: ' + (e as Error).message);
    }
  };

  const excluirPaciente = async (paciente: PacienteRow) => {
    if (!paciente.cpf) { setError('Só é possível excluir um paciente com CPF vinculado.'); return; }
    if (!window.confirm(`Excluir o cadastro de ${paciente.nome}?`)) return;
    try {
      await fetchJson(`/pacientes/${paciente.cpf}`, { method: 'DELETE' });
      setList((rows) => rows.filter((p) => p.cpf !== paciente.cpf));
    } catch (e) { setError((e as Error).message); }
  };

  const handleOpenProntuarios = async (paciente: PacienteRow) => {
    const cpf = paciente.cpf || tempCpf || '';
    if (!cpf) {
      alert('É necessário associar um CPF antes de ver o histórico médico');
      return;
    }
    setSelectedPaciente(paciente);
    setLoadingProntuarios(true);
    setError(null);
    setProntuarios([]);
    try {
      const data = await fetchJson<Prontuario[]>(`/pacientes/${cpf}/prontuarios`);
      setProntuarios(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingProntuarios(false);
    }
  };

  const salvarObservacoes = async () => {
    if (!obsPaciente) return;
    setObsSaving(true);
    try {
      await fetchJson('/pacientes/observacoes', {
        method: 'PATCH',
        body: JSON.stringify({
          cpf: obsPaciente.cpf || obsPaciente.id,
          observacoes: obsDraft,
        }),
      });
      setObsPaciente(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setObsSaving(false);
    }
  };

  const handleAddExame = () => {
    if (!newExameNome || !newExameDesc) return;
    setExamesList([
      ...examesList,
      {
        nomeExame: newExameNome,
        resultadoDesc: newExameDesc,
        dataExame: new Date().toISOString().split('T')[0],
      },
    ]);
    setNewExameNome('');
    setNewExameDesc('');
  };

  const handleSaveProntuario = async () => {
    if (!selectedPaciente || !selectedPaciente.cpf) return;
    if (!diagnostico) {
      alert('Diagnóstico é obrigatório');
      return;
    }
    try {
      const payload = {
        clienteCpf: selectedPaciente.cpf,
        clienteNome: selectedPaciente.nome,
        clienteTelefone: selectedPaciente.telefone,
        diagnostico,
        prescricao,
        resultados: examesList,
        profissionalId: formDocId || null,
      };

      await fetchJson('/parceiros/prontuarios', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      alert('Prontuário salvo com sucesso!');
      setDiagnostico('');
      setPrescricao('');
      setFormDocId('');
      setExamesList([]);
      setShowAddForm(false);

      const data = await fetchJson<Prontuario[]>(`/pacientes/${selectedPaciente.cpf}/prontuarios`);
      setProntuarios(data);
    } catch (e) {
      alert('Erro ao salvar prontuário: ' + (e as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-secondary">Pacientes</h1>
          <p className="text-sm text-slate-600">
            Cadastro independente, prontuários de parceiros e exames estruturados ligados por CPF.
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
              className="bg-transparent text-sm font-medium text-slate-800 focus:outline-none"
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
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm sm:w-72 focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>
      </div>

      {/* Cadastrar Paciente Form */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-bold text-brand-secondary">Cadastrar Paciente</h2>
          <p className="text-xs text-slate-500">Registre os dados do paciente com vínculo de CPF.</p>
        </div>
        <form onSubmit={cadastrarPaciente} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">Nome completo</label>
            <input
              type="text"
              value={cadNome}
              onChange={(e) => setCadNome(e.target.value)}
              placeholder="Nome"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">Telefone (com DDD)</label>
            <input
              type="text"
              value={cadTel}
              onChange={(e) => setCadTel(e.target.value)}
              placeholder="Telefone"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">CPF (apenas números)</label>
            <input
              type="text"
              value={cadCpf}
              onChange={(e) => setCadCpf(e.target.value)}
              placeholder="CPF"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">Data de Nascimento</label>
            <input
              type="date"
              value={cadNasc}
              onChange={(e) => setCadNasc(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={cadSaving}
            className="w-full rounded-lg bg-brand-primary py-2 text-sm font-semibold text-white hover:bg-brand-secondary disabled:opacity-50"
          >
            {cadSaving ? 'Salvando…' : 'Salvar cadastro'}
          </button>
        </form>
        {cadMsg && <p className="text-sm font-medium text-brand-primary">{cadMsg}</p>}
      </section>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {/* Grid List */}
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((p) => (
          <div
            key={p.telefone}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md flex flex-col justify-between"
          >
            <div>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-900 text-lg">{p.nome}</div>
                  <div className="text-sm text-slate-500">
                    CPF: {p.cpf ? formatCpfDisplay(p.cpf) : 'Sem CPF vinculado'} · Tel: {p.telefone}
                  </div>
                  {p.dataNascimento && (
                    <p className="mt-1 text-xs text-slate-500 font-medium">
                      Nasc.: {formatIsoDateBR(p.dataNascimento)}
                    </p>
                  )}
                </div>
                <span className="rounded-full bg-brand-muted px-3 py-1 text-xs font-semibold text-brand-secondary">
                  {p.consultas.length} consulta(s)
                </span>
              </div>

              {p.consultas.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Visitas</h4>
                  <ul className="space-y-1.5 text-sm">
                    {p.consultas.slice(0, 3).map((c) => (
                      <li key={c.id} className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-700">
                          {c.data} {c.hora}
                        </span>
                        {(c.profissionalId || c.servico) && (
                          <span className="text-slate-500 text-xs">
                            — {c.profissionalId ? `Dr(a). ${proById.get(c.profissionalId)?.nome || '—'}` : '—'}
                            {c.servico ? ` · ${String(c.servico).toUpperCase()}` : ''}
                          </span>
                        )}
                        <StatusBadge status={c.status} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              {editingCpfPhone === p.telefone ? (
                <div className="flex items-center gap-1.5 w-full">
                  <input
                    type="text"
                    placeholder="CPF (11 dígitos)"
                    value={tempCpf}
                    onChange={(e) => setTempCpf(e.target.value)}
                    className="border border-slate-200 rounded px-2.5 py-1 text-xs w-full focus:ring-1 focus:ring-brand-primary"
                  />
                  <button
                    onClick={() => handleLinkCpf(p)}
                    className="bg-brand-secondary text-white text-xs px-2.5 py-1.5 rounded hover:bg-opacity-90 font-medium"
                  >
                    Vincular
                  </button>
                  <button
                    onClick={() => setEditingCpfPhone(null)}
                    className="text-slate-400 hover:text-slate-650 text-xs"
                  >
                    Fechar
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    {!p.cpf && (
                      <button
                        onClick={() => {
                          setEditingCpfPhone(p.telefone);
                          setTempCpf('');
                        }}
                        className="text-brand-secondary hover:text-brand-primary text-xs font-semibold underline"
                      >
                        Vincular CPF
                      </button>
                    )}
                    <button
                      onClick={() => setObsPaciente(p)}
                      className="text-slate-500 hover:text-slate-800 text-xs font-semibold underline"
                    >
                      ✏️ Obs
                    </button>
                    {p.cpf && <button onClick={() => excluirPaciente(p)} className="text-red-600 hover:text-red-800 text-xs font-semibold underline">Excluir</button>}
                  </div>
                  
                  {p.cpf && (
                    <button
                      onClick={() => handleOpenProntuarios(p)}
                      className="bg-brand-primary text-white text-xs font-bold px-3 py-2 rounded-lg shadow-sm hover:bg-opacity-90"
                    >
                      🔬 Prontuários & Exames
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Observations Simple Modal */}
      {obsPaciente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-brand-secondary">Observações Clínicas</h3>
              <button onClick={() => setObsPaciente(null)} className="text-slate-400 hover:text-slate-600 text-xl">
                &times;
              </button>
            </div>
            <textarea
              value={obsDraft}
              onChange={(e) => setObsDraft(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"
              placeholder="Alergias, preferências, observações médicas..."
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setObsPaciente(null)}
                className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg text-sm font-semibold"
              >
                Voltar
              </button>
              <button
                onClick={salvarObservacoes}
                disabled={obsSaving}
                className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-opacity-90"
              >
                {obsSaving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Prontuarios Modal Overlay */}
      {selectedPaciente && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{selectedPaciente.nome}</h3>
                <p className="text-sm text-slate-500">CPF: {formatCpfDisplay(selectedPaciente.cpf)}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedPaciente(null);
                  setShowAddForm(false);
                }}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-bold text-brand-secondary">Histórico de Prontuários</h4>
                {!showAddForm && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-emerald-600 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-emerald-700 transition"
                  >
                    + Novo Prontuário
                  </button>
                )}
              </div>

              {showAddForm && (
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                  <h5 className="font-bold text-slate-800 text-sm">Adicionar Prontuário</h5>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Médico Responsável</label>
                      <select
                        value={formDocId}
                        onChange={(e) => setFormDocId(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg p-2 bg-white text-sm focus:outline-none"
                      >
                        <option value="">Selecione o Profissional</option>
                        {profissionais.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Diagnóstico</label>
                    <textarea
                      value={diagnostico}
                      onChange={(e) => setDiagnostico(e.target.value)}
                      placeholder="Descrição detalhada do diagnóstico"
                      rows={3}
                      className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Prescrição</label>
                    <textarea
                      value={prescricao}
                      onChange={(e) => setPrescricao(e.target.value)}
                      placeholder="Medicamentos ou orientações"
                      rows={2}
                      className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none"
                    />
                  </div>

                  <div className="border-t border-slate-200 pt-3">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Anexar Resultados de Exames</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Nome do Exame"
                        value={newExameNome}
                        onChange={(e) => setNewExameNome(e.target.value)}
                        className="border border-slate-200 rounded-lg p-2 text-xs w-1/2 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Resultado"
                        value={newExameDesc}
                        onChange={(e) => setNewExameDesc(e.target.value)}
                        className="border border-slate-200 rounded-lg p-2 text-xs w-1/2 focus:outline-none"
                      />
                      <button
                        onClick={handleAddExame}
                        type="button"
                        className="bg-brand-secondary text-white px-3 rounded-lg hover:bg-opacity-95 text-xs font-bold"
                      >
                        Adicionar
                      </button>
                    </div>
                    {examesList.length > 0 && (
                      <ul className="bg-white rounded-lg p-2 border border-slate-100 space-y-1">
                        {examesList.map((ex, index) => (
                          <li key={index} className="text-xs text-slate-650 flex justify-between py-1 border-b border-slate-100">
                            <span><strong>{ex.nomeExame}</strong>: {ex.resultadoDesc}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="text-slate-500 hover:text-slate-700 text-sm font-medium px-4 py-2"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveProntuario}
                      className="bg-brand-primary text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-opacity-90"
                    >
                      Salvar Prontuário
                    </button>
                  </div>
                </div>
              )}

              {loadingProntuarios ? (
                <div className="text-center py-8 text-slate-550">Carregando...</div>
              ) : prontuarios.length === 0 ? (
                <div className="text-center py-8 text-slate-400 border border-dashed rounded-xl border-slate-200">
                  Nenhum prontuário médico registrado para este CPF.
                </div>
              ) : (
                <div className="space-y-4">
                  {prontuarios.map((pr) => (
                    <div key={pr.id} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          Data: {pr.dataProntuario}
                        </span>
                        <span>
                          Médico: {pr.profissionalId ? proById.get(pr.profissionalId)?.nome || '—' : 'Clínico Geral'}
                        </span>
                      </div>
                      <div>
                        <h6 className="text-xs font-bold text-slate-450 uppercase">Diagnóstico</h6>
                        <p className="text-sm text-slate-800 mt-1">{pr.diagnostico}</p>
                      </div>
                      {pr.prescricao && (
                        <div>
                          <h6 className="text-xs font-bold text-slate-450 uppercase">Prescrição</h6>
                          <p className="text-sm text-brand-secondary bg-brand-muted/40 p-2 rounded-lg mt-1">
                            {pr.prescricao}
                          </p>
                        </div>
                      )}
                      {pr.resultados && pr.resultados.length > 0 && (
                        <div>
                          <h6 className="text-xs font-bold text-slate-450 uppercase mb-1">Exames</h6>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {pr.resultados.map((ex, idx) => (
                              <div key={idx} className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 text-xs text-emerald-800">
                                <div className="font-bold">{ex.nomeExame}</div>
                                <div className="mt-1">{ex.resultadoDesc}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end">
              <button
                onClick={() => {
                  setSelectedPaciente(null);
                  setShowAddForm(false);
                }}
                className="bg-slate-200 text-slate-700 text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-slate-350"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
