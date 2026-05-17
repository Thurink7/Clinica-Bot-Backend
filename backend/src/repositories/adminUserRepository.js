import { createHybridRepository } from './hybrid/createHybridRepository.js';
import { AdminUserRepositoryFirestore } from './firestore/adminUserRepository.firestore.js';
import { AdminUserRepositoryMongo } from './mongo/adminUserRepository.mongo.js';

export const AdminUserRepository = createHybridRepository(
  AdminUserRepositoryFirestore,
  AdminUserRepositoryMongo,
  ['create']
);
