import { PacienteRepository } from '../repositories/pacienteRepository.js';
import { ConsultaRepository } from '../repositories/consultaRepository.js';

const pacienteRepo = new PacienteRepository();
const consultaRepo = new ConsultaRepository();

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

export async function deletePaciente(req, res, next) {
  try {
    const paciente = await pacienteRepo.getByCpf(req.params.id);
    await consultaRepo.deleteByPatient(req.params.id, paciente?.telefone);
    res.json(await pacienteRepo.delete(req.params.id));
  } catch (e) { next(e); }
}
