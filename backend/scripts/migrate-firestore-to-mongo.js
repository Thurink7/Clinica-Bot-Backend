/**
 * Migração Firestore → MongoDB (coleção clinica).
 *
 * Uso:
 *   node scripts/migrate-firestore-to-mongo.js
 *
 * Requer: credenciais Firebase (Admin) + MONGO_URI no .env
 * Saída: logs no console + pasta scripts/migration-export/ (JSON de backup)
 */
import 'dotenv/config';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initFirebase, getFirestore } from '../src/config/firebase.js';
import { initMongo, getMongoDb, closeMongo } from '../src/config/mongo.js';
import { logger } from '../src/utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXPORT_DIR = join(__dirname, 'migration-export');

const COLLECTION_MAP = [
  { firestore: 'admin_users', mongo: 'users' },
  { firestore: 'consultas', mongo: 'consultas' },
  { firestore: 'profissionais', mongo: 'profissionais' },
  { firestore: 'pacientes', mongo: 'pacientes' },
  { firestore: 'configuracoes', mongo: 'configuracoes' },
  { firestore: 'whatsapp_sessoes', mongo: 'whatsapp_sessoes' },
];

function toMongoDoc(firestoreId, data) {
  const { id: _drop, ...rest } = data;
  return {
    _id: firestoreId,
    legacyId: firestoreId,
    ...rest,
  };
}

async function exportCollection(firestore, name) {
  const snap = await firestore.collection(name).get();
  const rows = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
  return rows;
}

async function importToMongo(db, mongoName, rows) {
  const col = db.collection(mongoName);
  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const { id, ...data } = row;
    const doc = toMongoDoc(id, data);
    try {
      await col.replaceOne({ _id: doc._id }, doc, { upsert: true });
      inserted += 1;
    } catch (e) {
      logger.warn('migrate_doc_failed', { collection: mongoName, id, message: e.message });
      skipped += 1;
    }
  }
  return { inserted, skipped };
}

async function main() {
  logger.info('migrate_start', { exportDir: EXPORT_DIR });

  initFirebase();
  await initMongo();

  const firestore = getFirestore();
  const mongo = getMongoDb();

  await mkdir(EXPORT_DIR, { recursive: true });

  const summary = {};

  for (const { firestore: fsName, mongo: mongoName } of COLLECTION_MAP) {
    logger.info('migrate_collection', { firestore: fsName, mongo: mongoName });

    const rows = await exportCollection(firestore, fsName);
    const exportPath = join(EXPORT_DIR, `${mongoName}.json`);
    await writeFile(exportPath, JSON.stringify(rows, null, 2), 'utf8');
    logger.info('migrate_exported', { file: exportPath, count: rows.length });

    const { inserted, skipped } = await importToMongo(mongo, mongoName, rows);
    summary[mongoName] = { exported: rows.length, inserted, skipped };
    logger.info('migrate_imported', { collection: mongoName, inserted, skipped });
  }

  logger.info('migrate_complete', summary);
  console.log('\n✅ Migração concluída:\n', JSON.stringify(summary, null, 2));
  console.log(`\nBackups JSON em: ${EXPORT_DIR}`);
  console.log('\nPróximos passos sugeridos:');
  console.log('  1. DB_READ=firestore DB_WRITE=dual  (validar escrita dupla)');
  console.log('  2. DB_READ=mongo DB_WRITE=dual      (validar leitura Mongo)');
  console.log('  3. DB_READ=mongo DB_WRITE=mongo     (cutover)');
  console.log('  Rollback: DB_READ=firestore DB_WRITE=firestore\n');

  await closeMongo();
}

main().catch((e) => {
  console.error('❌ Migração falhou:', e.message);
  process.exit(1);
});
