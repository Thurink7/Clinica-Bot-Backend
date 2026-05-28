import { getMongoDb } from '../../config/mongo.js';
import { generateLegacyId, toEntity } from './mongoDoc.js';

/** Coleção `users` no MongoDB (equivalente a admin_users no Firestore). */
export class AdminUserRepositoryMongo {
  constructor() {
    this.col = () => getMongoDb().collection('users');
  }

  async findByEmail(email) {
    const doc = await this.col().findOne({ email: String(email).toLowerCase().trim() });
    return toEntity(doc);
  }

  async getById(id) {
    const doc = await this.col().findOne({ $or: [{ _id: id }, { legacyId: id }] });
    return toEntity(doc);
  }

  async create({ email, passwordHash, nome = null }) {
    const id = generateLegacyId();
    return this.createWithId(id, { email, passwordHash, nome });
  }

  async createWithId(id, { email, passwordHash, nome = null }) {
    const payload = {
      email: String(email).toLowerCase().trim(),
      passwordHash,
      nome: nome || null,
      legacyId: id,
      createdAt: new Date().toISOString(),
    };
    await this.col().insertOne({ _id: id, ...payload });
    const { legacyId: _l, ...rest } = payload;
    return { id, ...rest };
  }
}
