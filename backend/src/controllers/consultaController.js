import { ConsultaService } from '../services/consultaService.js';
import { ConfigRepository } from '../repositories/configRepository.js';
import { ConsultaRepository } from '../repositories/consultaRepository.js';
import { PacienteRepository } from '../repositories/pacienteRepository.js';

const service = new ConsultaService();
const consultaRepo = new ConsultaRepository();
const pacienteRepo = new PacienteRepository();

async function buildPacientesMerged(profissionalId) {
  const agregados = profissionalId
    ? await consultaRepo.listPacientesAggregatedByProfessional(profissionalId)
    : await consultaRepo.listPacientesAggregated();
  const cadastros = await pacienteRepo.listAll();
  const cadByTel = new Map(cadastros.map((c) => [String(c.telefone).replace(/\D/g, ''), c]));
  const map = new Map();
  for (const a of agregados) {
    const tel = String(a.telefone).replace(/\D/g, '');
    const cad = cadByTel.get(tel) || {};
    const cpf = cad.cpf || cad.id || null;
    const key = cpf || `tel:${tel}`;
    map.set(key, {
      id: cpf || tel,
      telefone: tel,
      nome: (cad.nome && String(cad.nome).trim()) || a.nome,
      cpf: cpf,
      dataNascimento: cad.dataNascimento ?? null,
      observacoes: cad.observacoes ?? null,
      consultas: a.consultas,
    });
  }
  if (!profissionalId) {
    for (const c of cadastros) {
      const cpf = c.cpf || c.id;
      const key = cpf || `tel:${String(c.telefone).replace(/\D/g, '')}`;
      if (!map.has(key)) {
        map.set(key, {
          id: cpf || c.id,
          telefone: String(c.telefone).replace(/\D/g, ''),
          nome: c.nome,
          cpf: cpf ?? null,
          dataNascimento: c.dataNascimento ?? null,
          observacoes: c.observacoes ?? null,
          consultas: [],
        });
      }
    }
  }
  return [...map.values()].sort((x, y) => String(x.nome).localeCompare(String(y.nome), 'pt-BR'));
}

export async function postAgendar(req, res, next) {
  try {
    const out = await service.agendar(req.body);
    res.status(201).json(out);
  } catch (e) {
    next(e);
  }
}

export async function getConsultas(req, res, next) {
  try {
    const { data, de, ate } = req.query;
    const list = await service.listar({ data, de, ate });
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
    const { data } = req.query;
    if (!data) {
      const err = new Error('Query data (YYYY-MM-DD) obrigatória');
      err.status = 400;
      throw err;
    }
    const livres = await service.horariosDisponiveis(data);
    res.json({ data, horarios: livres });
  } catch (e) {
    next(e);
  }
}

const configRepo = new ConfigRepository();

export async function getConfig(req, res, next) {
  try {
    const cfg = await configRepo.get();
    res.json(cfg);
  } catch (e) {
    next(e);
  }
}

export async function putConfig(req, res, next) {
  try {
    const cfg = await configRepo.update(req.body);
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
    const list = await buildPacientesMerged(profissionalId);
    res.json(list);
  } catch (e) {
    next(e);
  }
}
