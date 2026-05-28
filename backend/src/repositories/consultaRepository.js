import { getFirestore } from '../config/firebase.js';

export class ConsultaRepository {
  constructor(db = getFirestore()) {
    this.db = db;
    this.col = this.db.collection('consultas');
  }

  async create(data) {
    const ref = await this.col.add({
      ...data,
      createdAt: new Date().toISOString(),
    });
    return { id: ref.id, ...data };
  }

  async getById(id) {
    const snap = await this.col.doc(id).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() };
  }

  async update(id, partial) {
    await this.col.doc(id).set(partial, { merge: true });
    return this.getById(id);
  }

  async delete(id) {
    await this.col.doc(id).delete();
    return { id, deleted: true };
  }

  /** Consultas em uma data (YYYY-MM-DD) */
  async listByDate(dateStr, parceiroId = null) {
    let q = this.col.where('data', '==', dateStr);
    if (parceiroId) q = q.where('parceiroId', '==', parceiroId);
    const snap = await q.get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  /** Consultas em uma data por profissional */
  async listByDateAndProfessional(dateStr, profissionalId, parceiroId = null) {
    let q = this.col
      .where('data', '==', dateStr)
      .where('profissionalId', '==', profissionalId);
    if (parceiroId) q = q.where('parceiroId', '==', parceiroId);
    const snap = await q.get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  async listByDateRange(startDateStr, endDateStr, parceiroId = null) {
    let q = this.col
      .where('data', '>=', startDateStr)
      .where('data', '<=', endDateStr);
    if (parceiroId) q = q.where('parceiroId', '==', parceiroId);
    const snap = await q.get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  /**
   * Verifica conflito: mesmo dia/hora e status ativo.
   * Se profissionalId for informado, o conflito é somente dentro do profissional.
   */
  async hasConflict(dateStr, hora, excludeId = null, profissionalId = null, parceiroId = null) {
    let q = this.col.where('data', '==', dateStr).where('hora', '==', hora);
    if (profissionalId) q = q.where('profissionalId', '==', profissionalId);
    if (parceiroId) q = q.where('parceiroId', '==', parceiroId);
    const snap = await q.get();
    for (const doc of snap.docs) {
      if (excludeId && doc.id === excludeId) continue;
      const s = doc.data().status;
      if (s !== 'cancelado') return true;
    }
    return false;
  }

  async listAllForReminders() {
    const statuses = ['agendado', 'confirmado'];
    const out = [];
    for (const st of statuses) {
      const snap = await this.col.where('status', '==', st).get();
      snap.docs.forEach((d) => out.push({ id: d.id, ...d.data() }));
    }
    return out;
  }

  async listByCpf(cpfRaw) {
    const cpf = String(cpfRaw || '').replace(/\D/g, '');
    if (!cpf) return [];
    const snap = await this.col.where('cpf', '==', cpf).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  async listPacientesAggregated(parceiroId = null) {
    let q = this.col;
    if (parceiroId) q = q.where('parceiroId', '==', parceiroId);
    const snap = await q.get();
    return this._aggregatePacientesFromDocs(snap.docs);
  }

  async listPacientesAggregatedByProfessional(profissionalId, parceiroId = null) {
    let q = this.col.where('profissionalId', '==', profissionalId);
    if (parceiroId) q = q.where('parceiroId', '==', parceiroId);
    const snap = await q.get();
    return this._aggregatePacientesFromDocs(snap.docs);
  }

  _aggregatePacientesFromDocs(docs) {
    const byPhone = new Map();
    docs.forEach((doc) => {
      const row = doc.data();
      const phone = row.telefone;
      if (!phone) return;
      if (!byPhone.has(phone)) {
        byPhone.set(phone, {
          telefone: phone,
          nome: row.nomePaciente,
          cpf: row.cpf || row.clienteCpf || '',
          consultas: [],
        });
      }
      // If we find a cpf later in the records, populate it
      if (row.cpf || row.clienteCpf) {
        byPhone.get(phone).cpf = row.cpf || row.clienteCpf;
      }
      byPhone.get(phone).consultas.push({
        id: doc.id,
        data: row.data,
        hora: row.hora,
        status: row.status,
        profissionalId: row.profissionalId || null,
        servico: row.servico || null,
      });
    });
    return [...byPhone.values()].sort((a, b) => a.nome.localeCompare(b.nome));
  }
}
