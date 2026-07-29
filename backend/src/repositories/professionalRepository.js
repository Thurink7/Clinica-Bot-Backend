import { createHybridRepository } from './hybrid/createHybridRepository.js';
import { ProfessionalRepositoryFirestore } from './firestore/professionalRepository.firestore.js';
import { ProfessionalRepositoryMongo } from './mongo/professionalRepository.mongo.js';

export const ProfessionalRepository = createHybridRepository(
  ProfessionalRepositoryFirestore,
  ProfessionalRepositoryMongo,
  ['create', 'update', 'delete']
);
