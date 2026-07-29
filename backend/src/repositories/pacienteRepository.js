import { createHybridRepository } from './hybrid/createHybridRepository.js';
import { PacienteRepositoryFirestore } from './firestore/pacienteRepository.firestore.js';
import { PacienteRepositoryMongo } from './mongo/pacienteRepository.mongo.js';

export const PacienteRepository = createHybridRepository(
  PacienteRepositoryFirestore,
  PacienteRepositoryMongo,
  ['upsert', 'updateObservacoes', 'delete']
);
