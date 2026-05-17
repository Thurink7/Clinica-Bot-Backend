import { createHybridRepository } from './hybrid/createHybridRepository.js';
import { ConfigRepositoryFirestore } from './firestore/configRepository.firestore.js';
import { ConfigRepositoryMongo } from './mongo/configRepository.mongo.js';

export const ConfigRepository = createHybridRepository(
  ConfigRepositoryFirestore,
  ConfigRepositoryMongo,
  ['update']
);
