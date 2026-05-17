import { getMongoDb } from '../../config/mongo.js';
import { defaultClinicConfig } from '../../utils/slots.js';

const DOC_ID = 'clinica';

export class ConfigRepositoryMongo {
  constructor() {
    this.col = () => getMongoDb().collection('configuracoes');
  }

  async get() {
    const doc = await this.col().findOne({ _id: DOC_ID });
    if (!doc) {
      const def = defaultClinicConfig();
      await this.col().insertOne({ _id: DOC_ID, ...def, legacyId: DOC_ID });
      return def;
    }
    const { _id, legacyId, ...data } = doc;
    return data;
  }

  async update(partial) {
    await this.col().updateOne(
      { _id: DOC_ID },
      { $set: { ...partial, legacyId: DOC_ID } },
      { upsert: true }
    );
    return this.get();
  }
}
