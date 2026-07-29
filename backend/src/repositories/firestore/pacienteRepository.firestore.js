import { getFirestore } from '../../config/firebase.js';
import { validarCpfBr } from '../../utils/cpf.js';

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
    const v = validarCpfBr(cpf);
    if (!v.ok) {
      const err = new Error(v.message);
      err.status = 400;
      throw err;
    }
    if (!tel || !String(nome || '').trim()) {
      const err = new Error('Nome e telefone são obrigatórios');
      err.status = 400;
      throw err;
    }
    const payload = {
      telefone: tel,
      nome: String(nome).trim(),
      cpf: v.digits,
      dataNascimento: dataNascimento ? String(dataNascimento).trim() : null,
      updatedAt: new Date().toISOString(),
    };
    await this.col.doc(v.digits).set(payload, { merge: true });
    const snap = await this.col.doc(v.digits).get();
    return { id: v.digits, ...snap.data() };
  }

  async getByCpf(cpf) {
    const v = validarCpfBr(cpf);
    if (!v.ok) return null;
    const snap = await this.col.doc(v.digits).get();
    if (!snap.exists) return null;
    return { id: v.digits, ...snap.data() };
  }

  async getByTelefone(telefone) {
    const tel = normTel(telefone);
    if (!tel) return null;
    const snap = await this.col.where('telefone', '==', tel).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  async listAll() {
    const snap = await this.col.get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  async updateObservacoes(pacienteId, observacoes) {
    const v = validarCpfBr(pacienteId);
    const id = v.ok ? v.digits : String(pacienteId || '').replace(/\D/g, '');
    if (!id || id.length !== 11) {
      const err = new Error('CPF do paciente inválido');
      err.status = 400;
      throw err;
    }
    await this.col.doc(id).set(
      { observacoes: String(observacoes ?? ''), updatedAt: new Date().toISOString() },
      { merge: true }
    );
    return this.getByCpf(id);
  }

  async delete(id) {
    await this.col.doc(String(id)).delete();
    return { id, deleted: true };
  }
}
