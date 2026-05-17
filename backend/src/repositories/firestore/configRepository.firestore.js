import { getFirestore } from '../../config/firebase.js';
import { defaultClinicConfig } from '../../utils/slots.js';

const DOC_ID = 'clinica';

export class ConfigRepositoryFirestore {
  constructor(db = getFirestore()) {
    this.db = db;
    this.col = this.db.collection('configuracoes');
  }

  async get() {
    const snap = await this.col.doc(DOC_ID).get();
    if (!snap.exists) {
      const def = defaultClinicConfig();
      await this.col.doc(DOC_ID).set(def);
      return def;
    }
    return snap.data();
  }

  async update(partial) {
    const ref = this.col.doc(DOC_ID);
    await ref.set(partial, { merge: true });
    return this.get();
  }
}
