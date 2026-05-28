import { getFirestore } from '../config/firebase.js';

export class AdminUserRepository {
  constructor(db = getFirestore()) {
    this.db = db;
    this.col = this.db.collection('admin_users');
  }

  /**
   * @param {string} email normalizado (lowercase)
   */
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
}
