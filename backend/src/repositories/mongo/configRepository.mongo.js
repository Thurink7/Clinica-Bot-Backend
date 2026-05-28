import { getMongoDb } from '../../config/mongo.js';
import { defaultClinicConfig } from '../../utils/slots.js';

const DOC_ID = 'clinica';

export class ConfigRepositoryMongo {
  constructor() {
    this.col = () => getMongoDb().collection('configuracoes');
  }

  async get(parceiroId = 'default') {
    const docId = parceiroId || 'default';
    const doc = await this.col().findOne({ _id: docId });
    if (!doc) {
      const def = defaultClinicConfig();
      await this.col().insertOne({ _id: docId, ...def, legacyId: docId });
      return def;
    }
    const { _id, legacyId, ...data } = doc;
    return data;
  }

  async update(partial, parceiroId = 'default') {
    const docId = parceiroId || 'default';
    await this.col().updateOne(
      { _id: docId },
      { $set: { ...partial, legacyId: docId } },
      { upsert: true }
    );
    return this.get(docId);
  }
}
