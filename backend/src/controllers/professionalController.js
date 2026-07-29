import { ProfessionalService } from '../services/professionalService.js';

const service = new ProfessionalService();

export async function postProfissional(req, res, next) {
  try {
    const out = await service.cadastrar(req.body || {});
    res.status(201).json(out);
  } catch (e) {
    next(e);
  }
}

export async function getProfissionais(req, res, next) {
  try {
    const list = await service.listar();
    res.json(list);
  } catch (e) {
    next(e);
  }
}

export async function patchProfissionalAtivo(req, res, next) {
  try { res.json(await service.atualizarAtivo(req.params.id, req.body?.ativo)); } catch (e) { next(e); }
}

export async function deleteProfissional(req, res, next) {
  try { res.json(await service.excluir(req.params.id)); } catch (e) { next(e); }
}

export async function getServicos(req, res, next) {
  try {
    const list = await service.listarServicos();
    res.json(list);
  } catch (e) {
    next(e);
  }
}

