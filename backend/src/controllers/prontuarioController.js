import { ProntuarioRepository } from '../repositories/prontuarioRepository.js';
import { ClienteRepository } from '../repositories/clienteRepository.js';

const prontuarioRepo = new ProntuarioRepository();
const clienteRepo = new ClienteRepository();

export async function postProntuario(req, res, next) {
  try {
    const { clienteCpf, clienteNome, clienteTelefone, diagnostico, prescricao, resultados, profissionalId } = req.body;
    const parceiroId = req.user?.parceiroId || 'default';

    if (!clienteCpf || !diagnostico) {
      const err = new Error('CPF do cliente e diagnóstico são obrigatórios');
      err.status = 400;
      throw err;
    }

    // Ensure client exists or is created in DB
    await clienteRepo.getOrCreate(clienteCpf, {
      nome: clienteNome || 'Paciente',
      telefone: clienteTelefone || '',
    });

    const created = await prontuarioRepo.create({
      clienteCpf,
      parceiroId,
      profissionalId,
      diagnostico,
      prescricao,
      resultados: resultados || [],
    });

    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
}

export async function getProntuariosByCliente(req, res, next) {
  try {
    const { cpf } = req.params;
    const cleanCpf = String(cpf || '').replace(/\D/g, '');
    
    // If user is a partner, they can only view history. If they are the client, they view their own.
    // In multi-tenant, if req.user is populated, we can also filter or log access.
    const list = await prontuarioRepo.listByClienteCpf(cleanCpf);
    res.json(list);
  } catch (e) {
    next(e);
  }
}

export async function getResultadosExames(req, res, next) {
  try {
    const { cpf } = req.params;
    const cleanCpf = String(cpf || '').replace(/\D/g, '');
    
    const list = await prontuarioRepo.listByClienteCpf(cleanCpf);
    // Extract exam results from all medical records
    const exams = [];
    list.forEach(item => {
      if (item.resultados && Array.isArray(item.resultados)) {
        item.resultados.forEach(exam => {
          exams.push({
            prontuarioId: item.id,
            dataProntuario: item.dataProntuario,
            parceiroId: item.parceiroId,
            ...exam
          });
        });
      }
    });
    
    res.json(exams);
  } catch (e) {
    next(e);
  }
}
