import { getFirestore } from '../../config/firebase.js';

export class ProfessionalRepositoryFirestore {
  constructor(db = getFirestore()) {
    this.db = db;
    this.col = this.db.collection('profissionais');
  }

  async create(data) {
    const payload = {
      ...data,
      ativo: data.ativo !== false,
      createdAt: new Date().toISOString(),
    };
    const ref = await this.col.add(payload);
    return { id: ref.id, ...payload };
  }

  async createWithId(id, data) {
    const payload = {
      ...data,
      ativo: data.ativo !== false,
      createdAt: data.createdAt || new Date().toISOString(),
    };
    await this.col.doc(id).set(payload);
    return { id, ...payload };
  }

  async listActive() {
    const snap = await this.col.where('ativo', '==', true).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  async getById(id) {
    const snap = await this.col.doc(id).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() };
  }
}
