import { getFirestore } from '../config/firebase.js';

export class ClienteRepository {
  constructor(db = getFirestore()) {
    this.db = db;
    this.col = this.db.collection('clientes');
  }

  normalizeCpf(cpf) {
    return String(cpf || '').replace(/\D/g, '');
  }

  async getOrCreate(cpfRaw, data = {}) {
    const cpf = this.normalizeCpf(cpfRaw);
    if (!cpf) {
      throw new Error('CPF é obrigatório');
    }
    const docRef = this.col.doc(cpf);
    const snap = await docRef.get();
    if (snap.exists) {
      return { id: snap.id, ...snap.data() };
    }
    const payload = {
      cpf,
      nome: data.nome || 'Cliente sem nome',
      telefone: data.telefone || '',
      email: data.email || '',
      createdAt: new Date().toISOString(),
    };
    await docRef.set(payload);
    return { id: cpf, ...payload };
  }

  async getByCpf(cpfRaw) {
    const cpf = this.normalizeCpf(cpfRaw);
    if (!cpf) return null;
    const snap = await this.col.doc(cpf).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() };
  }

  async update(cpfRaw, partial) {
    const cpf = this.normalizeCpf(cpfRaw);
    await this.col.doc(cpf).set(partial, { merge: true });
    return this.getByCpf(cpf);
  }
}
