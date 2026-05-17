import { getFirestore } from '../../config/firebase.js';

function normTel(t) {
  return String(t || '').replace(/\D/g, '');
}

export class PacienteRepositoryFirestore {
  constructor(db = getFirestore()) {
    this.db = db;
    this.col = this.db.collection('pacientes');
  }

  async upsert({ nome, telefone, cpf = null, dataNascimento = null }) {
    const tel = normTel(telefone);
    if (!tel || !String(nome || '').trim()) {
      const err = new Error('Nome e telefone são obrigatórios');
      err.status = 400;
      throw err;
    }
    const cpfDigits = cpf ? String(cpf).replace(/\D/g, '') : null;
    const payload = {
      telefone: tel,
      nome: String(nome).trim(),
      cpf: cpfDigits && cpfDigits.length === 11 ? cpfDigits : null,
      dataNascimento: dataNascimento ? String(dataNascimento).trim() : null,
      updatedAt: new Date().toISOString(),
    };
    await this.col.doc(tel).set(payload, { merge: true });
    const snap = await this.col.doc(tel).get();
    return { id: tel, ...snap.data() };
  }

  async getByTelefone(telefone) {
    const tel = normTel(telefone);
    if (!tel) return null;
    const snap = await this.col.doc(tel).get();
    if (!snap.exists) return null;
    return { id: tel, ...snap.data() };
  }

  async listAll() {
    const snap = await this.col.get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  async updateObservacoes(telefone, observacoes) {
    const tel = normTel(telefone);
    if (!tel) {
      const err = new Error('Telefone inválido');
      err.status = 400;
      throw err;
    }
    await this.col.doc(tel).set(
      { observacoes: String(observacoes ?? ''), updatedAt: new Date().toISOString() },
      { merge: true }
    );
    return this.getByTelefone(tel);
  }
}
