import { createHybridRepository } from './hybrid/createHybridRepository.js';
import { ConsultaRepositoryFirestore } from './firestore/consultaRepository.firestore.js';
import { ConsultaRepositoryMongo } from './mongo/consultaRepository.mongo.js';

export const ConsultaRepository = createHybridRepository(
  ConsultaRepositoryFirestore,
  ConsultaRepositoryMongo,
  ['create', 'update', 'delete', 'deleteByPatient']
);
