import { getFirestore } from '../../config/firebase.js';

export class ConsultaRepositoryFirestore {
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

  async createWithId(id, data) {
    const payload = {
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
    };
    await this.col.doc(id).set(payload);
    return { id, ...payload };
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

  async listByDate(dateStr) {
    const snap = await this.col.where('data', '==', dateStr).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  async listByDateAndProfessional(dateStr, profissionalId) {
    const snap = await this.col
      .where('data', '==', dateStr)
      .where('profissionalId', '==', profissionalId)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  async listByDateRange(startDateStr, endDateStr) {
    const snap = await this.col
      .where('data', '>=', startDateStr)
      .where('data', '<=', endDateStr)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  async listFromDateByTelefone(dateMinStr, telefoneNorm) {
    const tel = String(telefoneNorm || '').replace(/\D/g, '');
    if (!tel) return [];
    const snap = await this.col.where('telefone', '==', tel).get();
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((r) => r.status !== 'cancelado' && String(r.data) >= dateMinStr)
      .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
  }

  async hasConflict(dateStr, hora, excludeId = null, profissionalId = null) {
    let q = this.col.where('data', '==', dateStr).where('hora', '==', hora);
    if (profissionalId) q = q.where('profissionalId', '==', profissionalId);
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

  async listPacientesAggregated() {
    const snap = await this.col.get();
    return this._aggregatePacientesFromDocs(snap.docs);
  }

  async listPacientesAggregatedByProfessional(profissionalId) {
    const snap = await this.col.where('profissionalId', '==', profissionalId).get();
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
          consultas: [],
        });
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
