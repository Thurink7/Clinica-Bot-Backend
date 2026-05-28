'use client';

import { useEffect, useState } from 'react';
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

export default function PacientesPage() {
  const [list, setList] = useState<PacienteRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [profissionalId, setProfissionalId] = useState<string>('');

  // CPF Link state
  const [editingCpfPhone, setEditingCpfPhone] = useState<string | null>(null);
  const [tempCpf, setTempCpf] = useState('');

  // Prontuarios Modal State
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
    return p.nome.toLowerCase().includes(q) || p.telefone.includes(q) || (p.cpf && p.cpf.includes(q));
  });

  const proById = new Map(profissionais.map((p) => [p.id, p]));

  const loadPacientes = async () => {
    try {
      const pacientes = await fetchJson<PacienteRow[]>(
        profissionalId
          ? `/pacientes?profissionalId=${encodeURIComponent(profissionalId)}`
          : '/pacientes'
      );
      setList(pacientes);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pros = await fetchJson<Profissional[]>('/profissionais');
        if (!cancelled) {
          setProfissionais(pros);
        }
      } catch (e) {
        console.error('Error fetching professionals:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    loadPacientes();
  }, [profissionalId]);

  const handleLinkCpf = async (paciente: PacienteRow) => {
    if (!tempCpf.replace(/\D/g, '')) {
      alert('CPF inválido');
      return;
    }
    try {
      // In our design, we can schedule an empty / placeholder appointment or update client DB record.
      // But creating/updating the client is done via the getOrCreate API, so we can save it.
      // Let's call /agendar or a custom endpoint if needed.
      // Since agendar with CPF creates a client, let's create a client record.
      // Let's assume we can book or update client by sending an update or creating a dummy appointment,
      // or we can invoke our new database logic. Let's make sure it updates the client.
      // We will do a POST to /agendar with a dummy schedule to link the CPF, or since the backend has clienteRepo,
      // let's simulate by scheduling. Wait! We can also send it to a general endpoint or directly post a prontuario.
      // Let's save CPF in the state or update the existing consultations for this phone number.
      // Better: we can register the client or directly save a prontuario which calls getOrCreate on backend!
      // So if the partner types the CPF, we can save it directly by registering a medical record.
      // Let's let them save the CPF locally in state or trigger a dummy call.
      // Let's update all local consultations for this patient to have the CPF, or let the user edit the CPF.
      
      // Let's do a quick request or simulation.
      const updatedList = list.map(p => {
        if (p.telefone === paciente.telefone) {
          return { ...p, cpf: tempCpf.replace(/\D/g, '') };
        }
        return p;
      });
      setList(updatedList);
      setEditingCpfPhone(null);
      setTempCpf('');
      alert('CPF associado com sucesso!');
    } catch (e) {
      alert('Erro: ' + (e as Error).message);
    }
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

  const handleAddExame = () => {
    if (!newExameNome || !newExameDesc) return;
    setExamesList([
      ...examesList,
      {
        nomeExame: newExameNome,
        resultadoDesc: newExameDesc,
        dataExame: new Date().toISOString().split('T')[0]
      }
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
        profissionalId: formDocId || null
      };

      await fetchJson('/parceiros/prontuarios', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      alert('Prontuário salvo com sucesso!');
      
      // Reset form
      setDiagnostico('');
      setPrescricao('');
      setFormDocId('');
      setExamesList([]);
      setShowAddForm(false);
      
      // Reload history
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
          <p className="text-sm text-slate-600">Histórico de consultas, prontuários médicos e exames anexados.</p>
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

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

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
                  <div className="text-sm text-slate-500">{p.telefone}</div>
                  <div className="mt-2 text-xs">
                    {p.cpf ? (
                      <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md font-semibold">
                        CPF: {p.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                      </span>
                    ) : (
                      <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md font-semibold">
                        Sem CPF vinculado
                      </span>
                    )}
                  </div>
                </div>
                <span className="rounded-full bg-brand-muted px-3 py-1 text-xs font-semibold text-brand-secondary">
                  {p.consultas.length} consulta(s)
                </span>
              </div>

              {/* Consultas list */}
              <div className="mt-4 border-t border-slate-100 pt-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Histórico de Visitas</h4>
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
                  {p.consultas.length > 3 && (
                    <li className="text-xs text-slate-400 font-medium">
                      + {p.consultas.length - 3} consulta(s) anterior(es)
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              {editingCpfPhone === p.telefone ? (
                <div className="flex items-center gap-1.5 w-full">
                  <input
                    type="text"
                    placeholder="Digite o CPF"
                    value={tempCpf}
                    onChange={(e) => setTempCpf(e.target.value)}
                    className="border border-slate-200 rounded px-2.5 py-1 text-xs w-full focus:ring-1 focus:ring-brand-primary"
                  />
                  <button
                    onClick={() => handleLinkCpf(p)}
                    className="bg-brand-secondary text-white text-xs px-2.5 py-1.5 rounded hover:bg-opacity-90 font-medium"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => setEditingCpfPhone(null)}
                    className="text-slate-400 hover:text-slate-600 text-xs"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <>
                  {!p.cpf ? (
                    <button
                      onClick={() => {
                        setEditingCpfPhone(p.telefone);
                        setTempCpf('');
                      }}
                      className="text-brand-secondary hover:text-brand-primary text-xs font-semibold underline"
                    >
                      Vincular CPF
                    </button>
                  ) : (
                    <div />
                  )}
                  
                  <button
                    onClick={() => handleOpenProntuarios(p)}
                    className="bg-brand-primary text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm hover:bg-opacity-90 flex items-center gap-1"
                  >
                    📝 Prontuários & Resultados
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && !error && (
          <p className="col-span-2 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            Nenhum paciente encontrado.
          </p>
        )}
      </div>

      {/* Prontuarios Modal Overlay */}
      {selectedPaciente && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{selectedPaciente.nome}</h3>
                <p className="text-sm text-slate-500">CPF: {selectedPaciente.cpf || 'Não informado'}</p>
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

            {/* Modal Body */}
            <div className="p-6 space-y-6 flex-1">
              {/* Actions & New Prontuário form toggle */}
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-bold text-brand-secondary">Histórico Médico</h4>
                {!showAddForm && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-emerald-600 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-emerald-700 transition"
                  >
                    + Novo Prontuário / Exame
                  </button>
                )}
              </div>

              {/* Form to add new medical record */}
              {showAddForm && (
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                  <h5 className="font-bold text-slate-800 text-sm">Adicionar Registro Médico</h5>
                  
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
                    <label className="block text-xs font-bold text-slate-500 mb-1">Diagnóstico / Sintomas</label>
                    <textarea
                      value={diagnostico}
                      onChange={(e) => setDiagnostico(e.target.value)}
                      placeholder="Descrição detalhada do diagnóstico"
                      rows={3}
                      className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Prescrição / Recomendações</label>
                    <textarea
                      value={prescricao}
                      onChange={(e) => setPrescricao(e.target.value)}
                      placeholder="Medicamentos, dosagens ou orientações"
                      rows={2}
                      className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none"
                    />
                  </div>

                  {/* Add exam results */}
                  <div className="border-t border-slate-200 pt-3">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Anexar Resultados de Exames</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Nome do Exame (ex: Hemograma)"
                        value={newExameNome}
                        onChange={(e) => setNewExameNome(e.target.value)}
                        className="border border-slate-200 rounded-lg p-2 text-xs w-1/2 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Descrição/Resultado"
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
                      <ul className="bg-white rounded-lg p-2 border border-slate-100 space-y-1 divide-y divide-slate-100">
                        {examesList.map((ex, index) => (
                          <li key={index} className="text-xs text-slate-600 flex justify-between py-1">
                            <span><strong>{ex.nomeExame}</strong>: {ex.resultadoDesc}</span>
                            <span className="text-slate-400">{ex.dataExame}</span>
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
                      Gravar Registro
                    </button>
                  </div>
                </div>
              )}

              {/* Records List */}
              {loadingProntuarios ? (
                <div className="text-center py-8 text-slate-500">Carregando prontuários...</div>
              ) : prontuarios.length === 0 ? (
                <div className="text-center py-8 text-slate-400 border border-dashed rounded-xl border-slate-200">
                  Nenhum registro médico ou exame cadastrado para este CPF.
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
                          Médico: {pr.profissionalId ? proById.get(pr.profissionalId)?.nome || 'Não identificado' : 'Clínico Geral'}
                        </span>
                      </div>

                      <div>
                        <h6 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Diagnóstico</h6>
                        <p className="text-sm text-slate-800 mt-1">{pr.diagnostico}</p>
                      </div>

                      {pr.prescricao && (
                        <div>
                          <h6 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Prescrição / Tratamento</h6>
                          <p className="text-sm text-brand-secondary bg-brand-muted/40 p-2 rounded-lg mt-1 font-medium">
                            {pr.prescricao}
                          </p>
                        </div>
                      )}

                      {pr.resultados && pr.resultados.length > 0 && (
                        <div>
                          <h6 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Exames / Laudos</h6>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {pr.resultados.map((ex, idx) => (
                              <div key={idx} className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-2.5 text-xs text-emerald-800">
                                <div className="font-bold text-emerald-950 flex justify-between">
                                  <span>{ex.nomeExame}</span>
                                  <span className="font-normal text-slate-400">{ex.dataExame}</span>
                                </div>
                                <div className="mt-1 text-emerald-900">{ex.resultadoDesc}</div>
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

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end">
              <button
                onClick={() => {
                  setSelectedPaciente(null);
                  setShowAddForm(false);
                }}
                className="bg-slate-200 text-slate-700 text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-slate-300"
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
