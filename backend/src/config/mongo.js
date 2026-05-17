import { MongoClient } from 'mongodb';
import { logger } from '../utils/logger.js';

const DB_NAME = process.env.MONGO_DB_NAME || 'clinica';

let client = null;
let db = null;

export async function initMongo() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error(
      'MONGO_URI não configurado. Defina a connection string do MongoDB Atlas (database: clinica).'
    );
  }
  if (db) return db;

  client = new MongoClient(uri, {
    maxPoolSize: 10,
  });
  await client.connect();
  db = client.db(DB_NAME);
  await ensureIndexes(db);
  logger.info('mongo_connected', { database: DB_NAME });
  return db;
}

export function getMongoDb() {
  if (!db) {
    throw new Error('MongoDB não inicializado. Chame initMongo() no boot do servidor.');
  }
  return db;
}

export async function closeMongo() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

async function ensureIndexes(database) {
  await database.collection('users').createIndex({ email: 1 }, { unique: true, sparse: true });
  await database.collection('consultas').createIndex({ data: 1 });
  await database.collection('consultas').createIndex({ telefone: 1 });
  await database.collection('consultas').createIndex({ data: 1, hora: 1, profissionalId: 1 });
  await database.collection('consultas').createIndex({ status: 1 });
  await database.collection('profissionais').createIndex({ ativo: 1 });
  await database.collection('pacientes').createIndex({ telefone: 1 }, { unique: true });
}
