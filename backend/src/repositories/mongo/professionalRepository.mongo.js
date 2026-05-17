import { getMongoDb } from '../../config/mongo.js';
import { generateLegacyId, toEntity, toEntityList } from './mongoDoc.js';

export class ProfessionalRepositoryMongo {
  constructor() {
    this.col = () => getMongoDb().collection('profissionais');
  }

  async create(data) {
    const id = generateLegacyId();
    return this.createWithId(id, data);
  }

  async createWithId(id, data) {
    const payload = {
      ...data,
      ativo: data.ativo !== false,
      legacyId: id,
      createdAt: data.createdAt || new Date().toISOString(),
    };
    await this.col().insertOne({ _id: id, ...payload });
    const { legacyId: _l, ...rest } = payload;
    return { id, ...rest };
  }

  async listActive() {
    const docs = await this.col().find({ ativo: true }).toArray();
    return toEntityList(docs);
  }

  async getById(id) {
    const doc = await this.col().findOne({ $or: [{ _id: id }, { legacyId: id }] });
    return toEntity(doc);
  }
}
