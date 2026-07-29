import { ConsultaRepository } from '../repositories/consultaRepository.js';
import { ConfigRepository } from '../repositories/configRepository.js';
import { ClienteRepository } from '../repositories/clienteRepository.js';
import { ProfessionalRepository } from '../repositories/professionalRepository.js';
import { generateSlotsForDay } from '../utils/slots.js';
import { combineLocal } from '../utils/datetime.js';
import { sendWhatsAppText } from './whatsappProvider.js';
import { logger } from '../utils/logger.js';

const VALID_STATUS = new Set(['agendado', 'confirmado', 'cancelado']);

export class ConsultaService {
  constructor(
    consultas = new ConsultaRepository(),
    config = new ConfigRepository(),
    clientes = new ClienteRepository(),
    profissionais = new ProfessionalRepository()
  ) {
    this.consultas = consultas;
    this.config = config;
    this.clientes = clientes;
    this.profissionais = profissionais;
  }

  async agendar(
    { nomePaciente, telefone, data, hora, profissionalId = null, servico = null, parceiroId = null, cpf = null, dataNascimento = null },
    opts = {}
  ) {
    if (!nomePaciente || !telefone || !data || !hora) {
      const err = new Error('Campos obrigatórios: nomePaciente, telefone, data, hora');
      err.status = 400;
      throw err;
    }

    const cfg = await this.config.get(parceiroId);
    if (profissionalId) await this.validarProfissionalNoDia(profissionalId, data);
    const slots = generateSlotsForDay(data, cfg);
    if (!slots.includes(hora)) {
      const err = new Error('Horário inválido ou fora do expediente');
      err.status = 409;
      throw err;
    }

    const conflict = await this.consultas.hasConflict(data, hora, null, profissionalId, parceiroId);
    if (conflict) {
      const err = new Error('Horário já ocupado');
      err.status = 409;
      throw err;
    }

    let clientData = null;
    if (cpf) {
      clientData = await this.clientes.getOrCreate(cpf, {
        nome: nomePaciente,
        telefone: String(telefone).replace(/\D/g, ''),
      });
    }

    const row = {
      nomePaciente: String(nomePaciente).trim(),
      telefone: String(telefone).replace(/\D/g, ''),
      cpf: clientData ? clientData.cpf : (cpf || null),
      dataNascimento: dataNascimento ? String(dataNascimento).slice(0, 10) : null,
      parceiroId: parceiroId || 'default',
      data,
      hora,
      profissionalId: profissionalId || null,
      servico: servico ? String(servico).trim().toUpperCase() : null,
      status: 'agendado',
      reminder24hSent: false,
      reminder3hSent: false,
    };

    const created = await this.consultas.create(row);
    logger.info('consulta_criada', { id: created.id, data, hora, parceiroId });

    const shouldNotify = opts.notify !== false;
    if (shouldNotify) {
      try {
        await sendWhatsAppText(
          row.telefone,
          `Consulta agendada para ${data} às ${hora}. Status: agendado. Para cancelar, responda CANCELAR ${created.id}`
        );
      } catch (e) {
        logger.warn('whatsapp_pos_agendar', { message: e.message });
      }
    }

    return created;
  }

  async listar({ data, de, ate, parceiroId = null } = {}) {
    if (data) return this.consultas.listByDate(data, parceiroId);
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const s =
      de ||
      `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const e =
      ate ||
      `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    return this.consultas.listByDateRange(s, e, parceiroId);
  }

  async cancelar(id) {
    if (!id) {
      const err = new Error('id obrigatório');
      err.status = 400;
      throw err;
    }
    const cur = await this.consultas.getById(id);
    if (!cur) {
      const err = new Error('Consulta não encontrada');
      err.status = 404;
      throw err;
    }
    await this.consultas.update(id, { status: 'cancelado' });
    return this.consultas.getById(id);
  }

  async atualizarStatus(id, status) {
    if (!VALID_STATUS.has(status)) {
      const err = new Error('status inválido');
      err.status = 400;
      throw err;
    }
    const cur = await this.consultas.getById(id);
    if (!cur) {
      const err = new Error('Consulta não encontrada');
      err.status = 404;
      throw err;
    }
    return this.consultas.update(id, { status });
  }

  async excluir(id) {
    if (!id) {
      const err = new Error('id obrigatório');
      err.status = 400;
      throw err;
    }
    const cur = await this.consultas.getById(id);
    if (!cur) {
      const err = new Error('Consulta não encontrada');
      err.status = 404;
      throw err;
    }
    return this.consultas.delete(id);
  }

  async horariosDisponiveis(dataStr, profissionalId = null, parceiroId = null) {
    if (profissionalId) {
      try { await this.validarProfissionalNoDia(profissionalId, dataStr); } catch { return []; }
    }
    const cfg = await this.config.get(parceiroId);
    const slots = generateSlotsForDay(dataStr, cfg);
    const ocupadas = profissionalId
      ? await this.consultas.listByDateAndProfessional(dataStr, profissionalId, parceiroId)
      : await this.consultas.listByDate(dataStr, parceiroId);
    const taken = new Set(
      ocupadas.filter((c) => c.status !== 'cancelado').map((c) => c.hora)
    );
    return slots.filter((h) => !taken.has(h));
  }

  async reagendar(id, data, hora) {
    const cur = await this.consultas.getById(id);
    if (!cur) { const err = new Error('Consulta não encontrada'); err.status = 404; throw err; }
    const cfg = await this.config.get(cur.parceiroId || null);
    if (!generateSlotsForDay(data, cfg).includes(hora)) { const err = new Error('Horário inválido ou fora do expediente'); err.status = 409; throw err; }
    if (cur.profissionalId) await this.validarProfissionalNoDia(cur.profissionalId, data);
    if (await this.consultas.hasConflict(data, hora, id, cur.profissionalId || null, cur.parceiroId || null)) { const err = new Error('Horário já ocupado'); err.status = 409; throw err; }
    return this.consultas.update(id, { data, hora });
  }

  async validarProfissionalNoDia(profissionalId, data) {
    const profissional = await this.profissionais.getById(profissionalId);
    if (!profissional || profissional.ativo === false) {
      const err = new Error('Profissional indisponível'); err.status = 409; throw err;
    }
    const days = profissional.diasTrabalho || [1, 2, 3, 4, 5];
    const day = new Date(`${data}T12:00:00`).getDay();
    if (!days.includes(day)) {
      const err = new Error('Profissional não atende neste dia'); err.status = 409; throw err;
    }
  }

  /**
   * Próximos N dias úteis (conforme cfg.diasUteis) com ao menos um horário livre no expediente.
   * Ignora fins de semana / dias fora de diasUteis e dias sem slots (feriado/fechado).
   */
  async proximosSlotsResumo(nDiasUteis = 5, parceiroId = null) {
    const cfg = await this.config.get(parceiroId);
    const setDow = new Set(cfg.diasUteis ?? [1, 2, 3, 4, 5]);
    const out = [];
    let addDays = 0;
    const maxScan = 90;
    const base = new Date();
    base.setHours(12, 0, 0, 0);
    while (out.length < nDiasUteis && addDays < maxScan) {
      const cur = new Date(base);
      cur.setDate(base.getDate() + addDays);
      addDays += 1;
      const dow = cur.getDay();
      if (!setDow.has(dow)) continue;
      const pad = (n) => String(n).padStart(2, '0');
      const ds = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`;
      const slots = generateSlotsForDay(ds, cfg);
      if (!slots.length) continue;
      const livres = await this.horariosDisponiveis(ds, null, parceiroId);
      if (livres.length) out.push({ data: ds, horarios: livres });
    }
    return out;
  }

  /** Próximos N dias úteis com slots, começando no dia seguinte a `aposData` (YYYY-MM-DD). */
  async proximosSlotsResumoApos(aposDataIso, nDiasUteis = 5, parceiroId = null) {
    const cfg = await this.config.get(parceiroId);
    const setDow = new Set(cfg.diasUteis ?? [1, 2, 3, 4, 5]);
    const out = [];
    const base = new Date(String(aposDataIso || '').slice(0, 10) + 'T12:00:00');
    if (Number.isNaN(base.getTime())) return [];
    base.setDate(base.getDate() + 1);
    let addDays = 0;
    const maxScan = 90;
    while (out.length < nDiasUteis && addDays < maxScan) {
      const cur = new Date(base);
      cur.setDate(base.getDate() + addDays);
      addDays += 1;
      const dow = cur.getDay();
      if (!setDow.has(dow)) continue;
      const pad = (n) => String(n).padStart(2, '0');
      const ds = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`;
      const slots = generateSlotsForDay(ds, cfg);
      if (!slots.length) continue;
      const livres = await this.horariosDisponiveis(ds, null, parceiroId);
      if (livres.length) out.push({ data: ds, horarios: livres });
    }
    return out;
  }

  async listarConsultasReagendar(telefone) {
    const tel = String(telefone || '').replace(/\D/g, '');
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const ds = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    return this.consultas.listFromDateByTelefone(ds, tel);
  }

  appointmentDateTime(consulta) {
    return combineLocal(consulta.data, consulta.hora);
  }
}
