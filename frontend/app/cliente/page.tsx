'use client';

import { useState, useEffect } from 'react';
import { fetchJson } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';

type Partner = {
  id: string;
  nome: string;
  lat: number;
  lng: number;
  descricao?: string;
  telefone?: string;
  especialidades?: string[];
  distanceKm?: number;
};

type Appointment = {
  id: string;
  nomePaciente: string;
  telefone: string;
  cpf: string;
  data: string;
  hora: string;
  status: 'agendado' | 'confirmado' | 'cancelado';
  profissionalId?: string | null;
  servico?: string | null;
  parceiroId: string;
};

type Record = {
  id: string;
  clienteCpf: string;
  diagnostico: string;
  prescricao: string;
  resultados: { nomeExame: string; dataExame: string; resultadoDesc: string }[];
  dataProntuario: string;
  parceiroId: string;
};

export default function ClienteMobilePortal() {
  const [cpf, setCpf] = useState('');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [isLogged, setIsLogged] = useState(false);
  const [activeTab, setActiveTab] = useState<'busca' | 'agenda' | 'resultados'>('busca');

  // Search/Geo state
  const [partners, setPartners] = useState<Partner[]>([]);
  const [searchingNear, setSearchingNear] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);

  // Appt lists
  const [myAppts, setMyAppts] = useState<Appointment[]>([]);
  const [myRecords, setMyRecords] = useState<Record[]>([]);

  // Schedule form state
  const [selectedDocId, setSelectedDocId] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [scheduling, setScheduling] = useState(false);

  // Fake default partners in case database has none initially
  const defaultPartnersList: Partner[] = [
    { id: '1', nome: 'Clínica Saúde & Vida', lat: -23.55052, lng: -46.633308, descricao: 'Clínica geral e exames laboratoriais', especialidades: ['Cardiologia', 'Clínico Geral'], telefone: '1199999999' },
    { id: '2', nome: 'Hospital São Lucas', lat: -23.55952, lng: -46.643308, descricao: 'Pronto atendimento e consultas integradas', especialidades: ['Ortopedia', 'Pediatria'], telefone: '1188888888' },
    { id: '3', nome: 'Centro de Diagnósticos ProMater', lat: -23.54152, lng: -46.623308, descricao: 'Resultados rápidos e exames de imagem', especialidades: ['Ultrassonografia', 'Exames de Sangue'], telefone: '1177777777' }
  ];

  const formatCpf = (v: string) => {
    return v
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      alert('CPF inválido. Digite os 11 dígitos.');
      return;
    }
    // Set logged state and fetch data
    setIsLogged(true);
    fetchClientData(cleanCpf);
  };

  const fetchClientData = async (clientCpf: string) => {
    try {
      // Get appointments and records
      const [appts, records] = await Promise.all([
        fetchJson<Appointment[]>(`/pacientes/${clientCpf}/agendamentos`).catch(() => []),
        fetchJson<Record[]>(`/pacientes/${clientCpf}/prontuarios`).catch(() => [])
      ]);
      setMyAppts(appts);
      setMyRecords(records);
    } catch (err) {
      console.error(err);
    }
  };

  // Find clinics by Geolocation
  const handleFindClinics = () => {
    setSearchingNear(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          try {
            const data = await fetchJson<Partner[]>(`/parceiros/busca?lat=${lat}&lng=${lng}`);
            setPartners(data.length > 0 ? data : defaultPartnersList.map(p => ({ ...p, distanceKm: 2.4 })));
          } catch (e) {
            // fallback if api error or local test
            setPartners(defaultPartnersList.map(p => ({ ...p, distanceKm: 1.8 })));
          } finally {
            setSearchingNear(false);
          }
        },
        () => {
          // fallback if geolocation denied
          setPartners(defaultPartnersList.map(p => ({ ...p, distanceKm: 3.5 })));
          setSearchingNear(false);
        }
      );
    } else {
      setPartners(defaultPartnersList.map(p => ({ ...p, distanceKm: 4.2 })));
      setSearchingNear(false);
    }
  };

  useEffect(() => {
    if (isLogged) {
      handleFindClinics();
    }
  }, [isLogged]);

  // Load slots when date or clinic is selected
  useEffect(() => {
    if (!selectedPartner || !selectedDate) return;
    (async () => {
      try {
        const data = await fetchJson<{ horarios: string[] }>(
          `/slots?data=${selectedDate}&parceiroId=${selectedPartner.id}${selectedDocId ? `&profissionalId=${selectedDocId}` : ''}`
        );
        setAvailableSlots(data.horarios);
      } catch {
        // Fallback slots
        setAvailableSlots(['09:00', '10:00', '11:00', '14:00', '15:00', '16:00']);
      }
    })();
  }, [selectedPartner, selectedDate, selectedDocId]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner || !selectedDate || !selectedTime) {
      alert('Selecione parceiro, data e horário');
      return;
    }
    setScheduling(true);
    try {
      const payload = {
        nomePaciente: nome || 'Paciente Portador CPF',
        telefone: telefone || '11999999999',
        cpf: cpf.replace(/\D/g, ''),
        data: selectedDate,
        hora: selectedTime,
        parceiroId: selectedPartner.id,
        profissionalId: selectedDocId || null,
        servico: selectedService || null
      };

      await fetchJson('/agendar', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      alert('Consulta agendada com sucesso!');
      setSelectedPartner(null);
      setSelectedDate('');
      setSelectedTime('');
      // Reload lists
      fetchClientData(cpf.replace(/\D/g, ''));
      setActiveTab('agenda');
    } catch (err) {
      alert('Erro ao agendar: ' + (err as Error).message);
    } finally {
      setScheduling(false);
    }
  };

  const handleCancelAppt = async (apptId: string) => {
    if (!confirm('Deseja realmente cancelar esta consulta?')) return;
    try {
      await fetchJson(`/cancelar`, {
        method: 'PUT',
        body: JSON.stringify({ id: apptId })
      });
      alert('Consulta cancelada!');
      fetchClientData(cpf.replace(/\D/g, ''));
    } catch (err) {
      alert('Erro ao cancelar: ' + (err as Error).message);
    }
  };

  if (!isLogged) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        {/* Mobile Mockup Wrapper */}
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[680px]">
          {/* Top Speaker / Camera Notch */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-black rounded-full flex items-center justify-center">
            <div className="w-12 h-1 bg-slate-800 rounded-full" />
          </div>

          <div className="mt-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-brand-primary to-brand-secondary rounded-2xl flex items-center justify-center text-3xl shadow-lg">
              🏥
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Portal do Paciente</h2>
              <p className="text-xs text-slate-400 mt-1">Marque consultas, veja exames e localize atendimento.</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 flex-1 mt-8 justify-center flex flex-col">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Seu CPF</label>
              <input
                type="text"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(formatCpf(e.target.value))}
                maxLength={14}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-white font-medium focus:outline-none focus:border-brand-primary text-center tracking-widest"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Seu Nome Completo</label>
              <input
                type="text"
                placeholder="Ex: João da Silva"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-primary text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Telefone (WhatsApp)</label>
              <input
                type="tel"
                placeholder="11999999999"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-primary text-sm"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-95 text-white py-3.5 rounded-xl font-bold shadow-md shadow-brand-primary/20 transition-all mt-4"
            >
              Entrar no Portal
            </button>
          </form>

          {/* Bottom Bar indicator */}
          <div className="w-24 h-1 bg-slate-700 rounded-full mx-auto mt-6" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      {/* Mobile Mockup Wrapper */}
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col justify-between min-h-[680px] relative">
        
        {/* Notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-black rounded-full flex items-center justify-center z-20">
          <div className="w-12 h-1 bg-slate-800 rounded-full" />
        </div>

        {/* Header */}
        <div className="bg-slate-950 px-5 pt-7 pb-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">👋</span>
            <div className="leading-tight">
              <div className="text-xs text-slate-500">Paciente</div>
              <div className="text-sm font-bold text-white max-w-[120px] truncate">{nome || 'Usuário'}</div>
            </div>
          </div>
          <button
            onClick={() => setIsLogged(false)}
            className="text-xs text-red-400 font-semibold bg-red-950/40 border border-red-900/30 px-2.5 py-1.5 rounded-lg"
          >
            Sair
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[500px]">
          {activeTab === 'busca' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Unidades Próximas</h3>
                <button
                  onClick={handleFindClinics}
                  className="text-xs text-brand-primary font-bold hover:underline"
                >
                  {searchingNear ? 'Buscando...' : '📍 Atualizar Geo'}
                </button>
              </div>

              {selectedPartner ? (
                /* Booking Flow Form */
                <form onSubmit={handleBook} className="bg-slate-950 p-4 border border-slate-800 rounded-2xl space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-bold text-sm">{selectedPartner.nome}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{selectedPartner.descricao}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPartner(null)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Voltar
                    </button>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Especialidade/Serviço
                      </label>
                      <select
                        value={selectedService}
                        onChange={(e) => setSelectedService(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                      >
                        <option value="">Clínico Geral</option>
                        {selectedPartner.especialidades?.map((sp) => (
                          <option key={sp} value={sp}>
                            {sp}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Data da Consulta
                      </label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                        required
                      />
                    </div>

                    {selectedDate && (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Horários Disponíveis
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {availableSlots.map((time) => (
                            <button
                              key={time}
                              type="button"
                              onClick={() => setSelectedTime(time)}
                              className={`py-2 rounded-lg text-xs font-semibold text-center border transition-all ${
                                selectedTime === time
                                  ? 'bg-brand-primary border-brand-primary text-white'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                              }`}
                            >
                              {time}
                            </button>
                          ))}
                          {availableSlots.length === 0 && (
                            <div className="col-span-3 text-[10px] text-amber-500 text-center py-2">
                              Nenhum horário livre nesta data.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={scheduling}
                    className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary text-white py-2.5 rounded-lg font-bold text-xs shadow-md mt-2"
                  >
                    {scheduling ? 'Confirmando...' : 'Confirmar Agendamento'}
                  </button>
                </form>
              ) : (
                /* Partner/Clinic cards list */
                <div className="space-y-3">
                  {partners.map((p) => (
                    <div
                      key={p.id}
                      className="bg-slate-950 border border-slate-850 rounded-2xl p-4 space-y-3 hover:border-slate-750 transition"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-white text-sm">{p.nome}</h4>
                          <span className="text-[10px] text-brand-primary font-bold bg-brand-muted/10 px-2 py-0.5 rounded-md mt-1 inline-block">
                            📍 {p.distanceKm ? `${p.distanceKm.toFixed(1)} km de você` : 'Próximo'}
                          </span>
                        </div>
                        <button
                          onClick={() => setSelectedPartner(p)}
                          className="bg-brand-primary text-white text-[11px] font-bold px-3 py-1.5 rounded-lg"
                        >
                          Agendar
                        </button>
                      </div>
                      <p className="text-xs text-slate-400">{p.descricao}</p>
                      <div className="flex flex-wrap gap-1">
                        {p.especialidades?.map((sp) => (
                          <span key={sp} className="text-[9px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                            {sp}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {partners.length === 0 && (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      Buscando parceiros mais próximos...
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'agenda' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Meus Agendamentos</h3>
              
              {myAppts.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
                  Você não possui nenhuma consulta marcada.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {myAppts.map((a) => (
                    <div key={a.id} className="bg-slate-950 border border-slate-850 rounded-2xl p-3.5 flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-xs font-bold text-white">Consulta Médica</h4>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {a.data} às {a.hora}
                          </div>
                          {a.servico && (
                            <span className="text-[9px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded-md mt-1 inline-block border border-slate-800">
                              {String(a.servico).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <StatusBadge status={a.status} />
                      </div>

                      {a.status !== 'cancelado' && (
                        <div className="mt-3 pt-2.5 border-t border-slate-900 flex justify-end">
                          <button
                            onClick={() => handleCancelAppt(a.id)}
                            className="text-[10px] font-bold text-red-400 bg-red-950/20 border border-red-900/20 px-2 py-1 rounded"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'resultados' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Resultados e Prontuário</h3>

              {myRecords.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
                  Nenhum histórico médico disponível no momento.
                </div>
              ) : (
                <div className="space-y-3">
                  {myRecords.map((r) => (
                    <div key={r.id} className="bg-slate-950 border border-slate-850 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-center text-[10px] text-slate-500">
                        <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-400">
                          Data: {r.dataProntuario}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Laudo/Recomendação</span>
                        <p className="text-xs text-white mt-1 leading-relaxed">{r.diagnostico}</p>
                      </div>

                      {r.prescricao && (
                        <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-850">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Prescrição</span>
                          <p className="text-xs text-brand-secondary font-medium mt-0.5">{r.prescricao}</p>
                        </div>
                      )}

                      {r.resultados && r.resultados.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Exames Laudados</span>
                          <div className="grid gap-2">
                            {r.resultados.map((ex, idx) => (
                              <div key={idx} className="bg-slate-900 border border-slate-850 rounded-xl p-2.5 flex flex-col">
                                <span className="text-xs font-bold text-white">{ex.nomeExame}</span>
                                <span className="text-[11px] text-emerald-400 mt-0.5">{ex.resultadoDesc}</span>
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
          )}
        </div>

        {/* Tab Navigation Menu */}
        <div className="bg-slate-950 border-t border-slate-800 p-2.5 flex items-center justify-around z-10">
          <button
            onClick={() => setActiveTab('busca')}
            className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${
              activeTab === 'busca' ? 'text-brand-primary' : 'text-slate-500'
            }`}
          >
            <span className="text-lg">📍</span>
            <span>Clínicas</span>
          </button>
          
          <button
            onClick={() => setActiveTab('agenda')}
            className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${
              activeTab === 'agenda' ? 'text-brand-primary' : 'text-slate-500'
            }`}
          >
            <span className="text-lg">📅</span>
            <span>Agendamento</span>
          </button>
          
          <button
            onClick={() => setActiveTab('resultados')}
            className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${
              activeTab === 'resultados' ? 'text-brand-primary' : 'text-slate-500'
            }`}
          >
            <span className="text-lg">📄</span>
            <span>Laudos</span>
          </button>
        </div>

        {/* Home Indicator */}
        <div className="w-24 h-1 bg-slate-700 rounded-full mx-auto my-2" />
      </div>
    </div>
  );
}
