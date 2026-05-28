import { getFirestore } from '../config/firebase.js';

export class ProntuarioRepository {
  constructor(db = getFirestore()) {
    this.db = db;
    this.col = this.db.collection('prontuarios');
  }

  async create(data) {
    const payload = {
      clienteCpf: String(data.clienteCpf || '').replace(/\D/g, ''),
      parceiroId: data.parceiroId || 'default',
      profissionalId: data.profissionalId || null,
      diagnostico: data.diagnostico || '',
      prescricao: data.prescricao || '',
      resultados: data.resultados || [], // e.g. [{ exames: '...', data: '...' }]
      dataProntuario: data.dataProntuario || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };
    const ref = await this.col.add(payload);
    return { id: ref.id, ...payload };
  }

  async listByClienteCpf(cpfRaw) {
    const cpf = String(cpfRaw || '').replace(/\D/g, '');
    if (!cpf) return [];
    const snap = await this.col.where('clienteCpf', '==', cpf).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  async listByParceiroAndCliente(parceiroId, cpfRaw) {
    const cpf = String(cpfRaw || '').replace(/\D/g, '');
    if (!cpf) return [];
    const snap = await this.col
      .where('parceiroId', '==', parceiroId)
      .where('clienteCpf', '==', cpf)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
}
