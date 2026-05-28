import { getDatabaseMode } from '../../config/databaseMode.js';
import { logger } from '../../utils/logger.js';

function collectMethods(RepoClass) {
  const names = new Set();
  let proto = RepoClass.prototype;
  while (proto && proto !== Object.prototype) {
    Object.getOwnPropertyNames(proto).forEach((n) => {
      if (n !== 'constructor' && typeof proto[n] === 'function' && !n.startsWith('_')) {
        names.add(n);
      }
    });
    proto = Object.getPrototypeOf(proto);
  }
  return [...names];
}

/**
 * Cria classe de repositório que delega leitura ao backend primário (DB_READ)
 * e replica escritas no secundário quando DB_WRITE=dual.
 */
export function createHybridRepository(FirestoreRepo, MongoRepo, writeMethods = []) {
  const writeSet = new Set(writeMethods);
  const methodNames = [
    ...new Set([...collectMethods(FirestoreRepo), ...collectMethods(MongoRepo)]),
  ];

  class HybridRepository {
    constructor() {
      const mode = getDatabaseMode();
      this._mode = mode;
      this._firestore = mode.useFirestore ? new FirestoreRepo() : null;
      this._mongo = mode.useMongo ? new MongoRepo() : null;
      this._primary = mode.read === 'mongo' ? this._mongo : this._firestore;
      this._secondary =
        mode.write === 'dual' ? (mode.read === 'mongo' ? this._firestore : this._mongo) : null;

      if (!this._primary) {
        throw new Error(
          `Repositório híbrido sem backend primário (DB_READ=${mode.read}). Verifique MONGO_URI / Firebase.`
        );
      }
    }

    async _mirrorWrite(method, args, primaryResult) {
      if (!this._secondary || !writeSet.has(method)) return;
      try {
        if (method === 'create' && primaryResult?.id) {
          if (typeof this._secondary.createWithId === 'function') {
            await this._secondary.createWithId(primaryResult.id, args[0] ?? {});
          } else {
            await this._secondary.create({ ...args[0], id: primaryResult.id });
          }
        } else if (method === 'upsert' && primaryResult?.id) {
          await this._secondary.upsert({ ...args[0], telefone: primaryResult.telefone ?? primaryResult.id });
        } else {
          await this._secondary[method](...args);
        }
      } catch (e) {
        logger.warn('dual_write_secondary_failed', {
          method,
          message: e?.message || String(e),
        });
      }
    }
  }

  for (const name of methodNames) {
    HybridRepository.prototype[name] = async function (...args) {
      const result = await this._primary[name](...args);
      await this._mirrorWrite(name, args, result);
      return result;
    };
  }

  return HybridRepository;
}
