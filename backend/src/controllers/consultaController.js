import { ConsultaService } from '../services/consultaService.js';
import { ConfigRepository } from '../repositories/configRepository.js';
import { ConsultaRepository } from '../repositories/consultaRepository.js';

const service = new ConsultaService();
const consultaRepo = new ConsultaRepository();

export async function postAgendar(req, res, next) {
  try {
    const parceiroId = req.user?.parceiroId || req.body?.parceiroId || 'default';
    const out = await service.agendar({
      ...req.body,
      parceiroId,
    });
    res.status(201).json(out);
  } catch (e) {
    next(e);
  }
}

export async function getConsultas(req, res, next) {
  try {
    const { data, de, ate } = req.query;
    const parceiroId = req.user?.parceiroId || req.query?.parceiroId || null;
    const list = await service.listar({ data, de, ate, parceiroId });
    res.json(list);
  } catch (e) {
    next(e);
  }
}

export async function putCancelar(req, res, next) {
  try {
    const id = req.body?.id || req.query?.id;
    const out = await service.cancelar(id);
    res.json(out);
  } catch (e) {
    next(e);
  }
}

export async function patchStatus(req, res, next) {
  try {
    const { id, status } = req.body;
    const out = await service.atualizarStatus(id, status);
    res.json(out);
  } catch (e) {
    next(e);
  }
}

export async function deleteConsulta(req, res, next) {
  try {
    const id = req.params?.id || req.body?.id || req.query?.id;
    const out = await service.excluir(id);
    res.json(out);
  } catch (e) {
    next(e);
  }
}

export async function getSlots(req, res, next) {
  try {
    const { data, profissionalId, parceiroId } = req.query;
    if (!data) {
      const err = new Error('Query data (YYYY-MM-DD) obrigatória');
      err.status = 400;
      throw err;
    }
    const livres = await service.horariosDisponiveis(data, profissionalId || null, parceiroId || null);
    res.json({ data, horarios: livres });
  } catch (e) {
    next(e);
  }
}

const configRepo = new ConfigRepository();

export async function getConfig(req, res, next) {
  try {
    const parceiroId = req.user?.parceiroId || req.query?.parceiroId || 'default';
    const cfg = await configRepo.get(parceiroId);
    res.json(cfg);
  } catch (e) {
    next(e);
  }
}

export async function putConfig(req, res, next) {
  try {
    const parceiroId = req.user?.parceiroId || req.body?.parceiroId || 'default';
    const cfg = await configRepo.update(req.body, parceiroId);
    res.json(cfg);
  } catch (e) {
    next(e);
  }
}

export async function getPacientes(req, res, next) {
  try {
    const profissionalId = req.query?.profissionalId
      ? String(req.query.profissionalId)
      : null;
    const parceiroId = req.user?.parceiroId || null;
    const list = profissionalId
      ? await consultaRepo.listPacientesAggregatedByProfessional(profissionalId, parceiroId)
      : await consultaRepo.listPacientesAggregated(parceiroId);
    res.json(list);
  } catch (e) {
    next(e);
  }
}

export async function getClientAgendamentos(req, res, next) {
  try {
    const { cpf } = req.params;
    const list = await consultaRepo.listByCpf(cpf);
    res.json(list);
  } catch (e) {
    next(e);
  }
}
