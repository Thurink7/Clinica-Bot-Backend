import { getFirestore } from '../config/firebase.js';
import { defaultClinicConfig } from '../utils/slots.js';

const DOC_ID = 'clinica';

export class ConfigRepository {
  constructor(db = getFirestore()) {
    this.db = db;
    this.col = this.db.collection('configuracoes');
  }

  async get(parceiroId = 'default') {
    const docId = parceiroId || 'default';
    const snap = await this.col.doc(docId).get();
    if (!snap.exists) {
      const def = defaultClinicConfig();
      await this.col.doc(docId).set(def);
      return def;
    }
    return snap.data();
  }

  async update(partial, parceiroId = 'default') {
    const docId = parceiroId || 'default';
    const ref = this.col.doc(docId);
    await ref.set(partial, { merge: true });
    return this.get(docId);
  }
}
