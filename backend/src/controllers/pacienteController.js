import { PacienteRepository } from '../repositories/pacienteRepository.js';

const pacienteRepo = new PacienteRepository();

export async function postCadastroPaciente(req, res, next) {
  try {
    const out = await pacienteRepo.upsert(req.body || {});
    res.status(201).json(out);
  } catch (e) {
    next(e);
  }
}

export async function patchPacienteObservacoes(req, res, next) {
  try {
    const pacienteId = req.body?.cpf || req.body?.pacienteId || req.body?.telefone;
    const observacoes = req.body?.observacoes;
    const out = await pacienteRepo.updateObservacoes(pacienteId, observacoes);
    res.json(out);
  } catch (e) {
    next(e);
  }
}
