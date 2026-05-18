import { ContatoRepository } from '../repositories/contatoRepository.js';

const contatoRepo = new ContatoRepository();

export async function postContato(req, res, next) {
  try {
    const { nomeClinica, nomeContato, email, telefone, cidade, mensagem } = req.body || {};
    if (!nomeClinica?.trim() || !nomeContato?.trim() || !email?.trim() || !telefone?.trim()) {
      const err = new Error('Preencha nome da clínica, seu nome, e-mail e telefone.');
      err.status = 400;
      throw err;
    }
    const em = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      const err = new Error('E-mail inválido.');
      err.status = 400;
      throw err;
    }
    const out = await contatoRepo.create({
      nomeClinica: String(nomeClinica).trim(),
      nomeContato: String(nomeContato).trim(),
      email: em,
      telefone: String(telefone).replace(/\D/g, ''),
      cidade: cidade ? String(cidade).trim() : null,
      mensagem: mensagem ? String(mensagem).trim() : null,
    });
    res.status(201).json({ ok: true, id: out.id, message: 'Recebemos seu contato. Em breve nossa equipe retorna.' });
  } catch (e) {
    next(e);
  }
}
