/**
 * Controle de leitura/escrita para migração Firestore → MongoDB.
 *
 * DB_READ=firestore|mongo     (padrão: firestore)
 * DB_WRITE=firestore|mongo|dual (padrão: firestore)
 *
 * Exemplos:
 *   Migração paralela:  DB_READ=firestore DB_WRITE=dual
 *   Cutover leitura:    DB_READ=mongo DB_WRITE=dual
 *   Só MongoDB:         DB_READ=mongo DB_WRITE=mongo
 *   Rollback:           DB_READ=firestore DB_WRITE=firestore
 */
export function getDatabaseMode() {
  const read = (process.env.DB_READ || 'firestore').toLowerCase();
  const write = (process.env.DB_WRITE || process.env.DB_READ || 'firestore').toLowerCase();

  const readIsMongo = read === 'mongo' || read === 'mongodb';
  const writeIsMongo = write === 'mongo' || write === 'mongodb';
  const writeIsDual = write === 'dual' || write === 'both';

  const useMongo = readIsMongo || writeIsMongo || writeIsDual;
  const useFirestore = !readIsMongo || writeIsDual || write === 'firestore';

  return {
    read: readIsMongo ? 'mongo' : 'firestore',
    write: writeIsDual ? 'dual' : writeIsMongo ? 'mongo' : 'firestore',
    useMongo,
    useFirestore: useFirestore || writeIsDual || (!readIsMongo && !writeIsMongo),
  };
}

export function needsFirebaseInit() {
  return getDatabaseMode().useFirestore;
}

export function needsMongoInit() {
  return getDatabaseMode().useMongo;
}
