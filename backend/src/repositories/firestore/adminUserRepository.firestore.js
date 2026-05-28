import { getFirestore } from '../../config/firebase.js';

export class AdminUserRepositoryFirestore {
  constructor(db = getFirestore()) {
    this.db = db;
    this.col = this.db.collection('admin_users');
  }

  async findByEmail(email) {
    const snap = await this.col.where('email', '==', email).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  async getById(id) {
    const ref = await this.col.doc(id).get();
    if (!ref.exists) return null;
    return { id: ref.id, ...ref.data() };
  }

  async create({ email, passwordHash, nome = null }) {
    const payload = {
      email: String(email).toLowerCase().trim(),
      passwordHash,
      nome: nome || null,
      createdAt: new Date().toISOString(),
    };
    const ref = await this.col.add(payload);
    return { id: ref.id, ...payload };
  }

  async createWithId(id, { email, passwordHash, nome = null }) {
    const payload = {
      email: String(email).toLowerCase().trim(),
      passwordHash,
      nome: nome || null,
      createdAt: new Date().toISOString(),
    };
    await this.col.doc(id).set(payload);
    return { id, ...payload };
  }
}
