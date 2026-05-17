import { getMongoDb } from '../../config/mongo.js';

export class SessionRepositoryMongo {
  constructor() {
    this.col = () => getMongoDb().collection('whatsapp_sessoes');
  }

  async get(telefone) {
    const doc = await this.col().findOne({ _id: telefone });
    if (!doc) return null;
    const { _id, legacyId, ...data } = doc;
    return data;
  }

  async set(telefone, data) {
    await this.col().updateOne(
      { _id: telefone },
      {
        $set: {
          ...data,
          legacyId: telefone,
          updatedAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    );
  }

  async clear(telefone) {
    await this.col().deleteOne({ _id: telefone });
  }
}
