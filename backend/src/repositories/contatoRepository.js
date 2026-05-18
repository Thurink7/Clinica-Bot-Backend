import { createHybridRepository } from './hybrid/createHybridRepository.js';
import { ContatoRepositoryFirestore } from './firestore/contatoRepository.firestore.js';
import { ContatoRepositoryMongo } from './mongo/contatoRepository.mongo.js';

export const ContatoRepository = createHybridRepository(
  ContatoRepositoryFirestore,
  ContatoRepositoryMongo,
  ['create']
);
