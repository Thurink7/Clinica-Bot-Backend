import { randomBytes } from 'node:crypto';

/** Gera ID compatível com documentos legados do Firestore (~20 caracteres). */
export function generateLegacyId() {
  return randomBytes(10).toString('hex');
}

export function toEntity(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  const id = doc.legacyId != null ? String(doc.legacyId) : String(_id);
  return { id, ...rest };
}

export function toEntityList(docs) {
  return docs.map((d) => toEntity(d));
}

export function stripIdForInsert(data) {
  const { id, ...rest } = data;
  return rest;
}
