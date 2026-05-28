import { getFirestore } from '../../config/firebase.js';

export class SessionRepositoryFirestore {
  constructor(db = getFirestore()) {
    this.db = db;
    this.col = this.db.collection('whatsapp_sessoes');
  }

  async get(telefone) {
    const snap = await this.col.doc(telefone).get();
    return snap.exists ? snap.data() : null;
  }

  async set(telefone, data) {
    await this.col.doc(telefone).set(
      { ...data, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  }

  async clear(telefone) {
    await this.col.doc(telefone).delete();
  }
}
