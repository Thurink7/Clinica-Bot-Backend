import { createHybridRepository } from './hybrid/createHybridRepository.js';
import { SessionRepositoryFirestore } from './firestore/sessionRepository.firestore.js';
import { SessionRepositoryMongo } from './mongo/sessionRepository.mongo.js';

export const SessionRepository = createHybridRepository(
  SessionRepositoryFirestore,
  SessionRepositoryMongo,
  ['set', 'clear']
);
