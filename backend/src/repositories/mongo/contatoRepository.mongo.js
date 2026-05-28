import { getMongoDb } from '../../config/mongo.js';
import { generateLegacyId } from './mongoDoc.js';

export class ContatoRepositoryMongo {
  constructor() {
    this.col = () => getMongoDb().collection('contatos');
  }

  async create(data) {
    const id = generateLegacyId();
    const payload = {
      ...data,
      status: 'novo',
      legacyId: id,
      createdAt: new Date().toISOString(),
    };
    await this.col().insertOne({ _id: id, ...payload });
    const { legacyId: _l, ...rest } = payload;
    return { id, ...rest };
  }

  async createWithId(id, data) {
    const payload = { ...data, status: 'novo', legacyId: id, createdAt: new Date().toISOString() };
    await this.col().insertOne({ _id: id, ...payload });
    const { legacyId: _l, ...rest } = payload;
    return { id, ...rest };
  }
}
