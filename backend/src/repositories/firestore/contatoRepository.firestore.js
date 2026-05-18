import { getFirestore } from '../../config/firebase.js';

export class ContatoRepositoryFirestore {
  constructor(db = getFirestore()) {
    this.col = db.collection('contatos');
  }

  async create(data) {
    const payload = {
      ...data,
      status: 'novo',
      createdAt: new Date().toISOString(),
    };
    const ref = await this.col.add(payload);
    return { id: ref.id, ...payload };
  }
}
