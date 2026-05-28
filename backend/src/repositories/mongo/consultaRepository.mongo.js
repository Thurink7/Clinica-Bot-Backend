import { getMongoDb } from '../../config/mongo.js';
import { generateLegacyId, toEntity, toEntityList } from './mongoDoc.js';

export class ConsultaRepositoryMongo {
  constructor() {
    this.col = () => getMongoDb().collection('consultas');
  }

  async create(data) {
    const id = generateLegacyId();
    return this.createWithId(id, data);
  }

  async createWithId(id, data) {
    const payload = {
      ...data,
      legacyId: id,
      createdAt: data.createdAt || new Date().toISOString(),
    };
    await this.col().insertOne({ _id: id, ...payload });
    const { legacyId: _l, ...rest } = payload;
    return { id, ...rest };
  }

  async getById(id) {
    const doc = await this.col().findOne({ $or: [{ _id: id }, { legacyId: id }] });
    return toEntity(doc);
  }

  async update(id, partial) {
    await this.col().updateOne({ $or: [{ _id: id }, { legacyId: id }] }, { $set: partial });
    return this.getById(id);
  }

  async delete(id) {
    await this.col().deleteOne({ $or: [{ _id: id }, { legacyId: id }] });
    return { id, deleted: true };
  }

  async listByDate(dateStr, parceiroId = null) {
    const query = { data: dateStr };
    if (parceiroId) query.parceiroId = parceiroId;
    const docs = await this.col().find(query).toArray();
    return toEntityList(docs);
  }

  async listByDateAndProfessional(dateStr, profissionalId, parceiroId = null) {
    const query = { data: dateStr, profissionalId };
    if (parceiroId) query.parceiroId = parceiroId;
    const docs = await this.col().find(query).toArray();
    return toEntityList(docs);
  }

  async listByDateRange(startDateStr, endDateStr, parceiroId = null) {
    const query = { data: { $gte: startDateStr, $lte: endDateStr } };
    if (parceiroId) query.parceiroId = parceiroId;
    const docs = await this.col().find(query).toArray();
    return toEntityList(docs);
  }

  async listFromDateByTelefone(dateMinStr, telefoneNorm) {
    const tel = String(telefoneNorm || '').replace(/\D/g, '');
    if (!tel) return [];
    const docs = await this.col().find({ telefone: tel }).toArray();
    return toEntityList(docs)
      .filter((r) => r.status !== 'cancelado' && String(r.data) >= dateMinStr)
      .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
  }

  async listByCpf(cpfRaw) {
    const cpf = String(cpfRaw || '').replace(/\D/g, '');
    if (!cpf) return [];
    const docs = await this.col().find({ cpf }).toArray();
    return toEntityList(docs);
  }

  async hasConflict(dateStr, hora, excludeId = null, profissionalId = null, parceiroId = null) {
    const filter = { data: dateStr, hora, status: { $ne: 'cancelado' } };
    if (profissionalId) filter.profissionalId = profissionalId;
    if (parceiroId) filter.parceiroId = parceiroId;
    const docs = await this.col().find(filter).toArray();
    for (const doc of docs) {
      const entity = toEntity(doc);
      if (excludeId && entity.id === excludeId) continue;
      return true;
    }
    return false;
  }

  async listAllForReminders() {
    const docs = await this.col()
      .find({ status: { $in: ['agendado', 'confirmado'] } })
      .toArray();
    return toEntityList(docs);
  }

  async listPacientesAggregated(parceiroId = null) {
    const query = {};
    if (parceiroId) query.parceiroId = parceiroId;
    const docs = await this.col().find(query).toArray();
    return this._aggregatePacientesFromEntities(toEntityList(docs));
  }

  async listPacientesAggregatedByProfessional(profissionalId, parceiroId = null) {
    const query = { profissionalId };
    if (parceiroId) query.parceiroId = parceiroId;
    const docs = await this.col().find(query).toArray();
    return this._aggregatePacientesFromEntities(toEntityList(docs));
  }

  _aggregatePacientesFromEntities(rows) {
    const byPhone = new Map();
    for (const row of rows) {
      const phone = row.telefone;
      if (!phone) continue;
      if (!byPhone.has(phone)) {
        byPhone.set(phone, {
          telefone: phone,
          nome: row.nomePaciente,
          cpf: row.cpf || row.clienteCpf || '',
          consultas: [],
        });
      }
      if (row.cpf || row.clienteCpf) {
        byPhone.get(phone).cpf = row.cpf || row.clienteCpf;
      }
      byPhone.get(phone).consultas.push({
        id: row.id,
        data: row.data,
        hora: row.hora,
        status: row.status,
        profissionalId: row.profissionalId || null,
        servico: row.servico || null,
      });
    }
    return [...byPhone.values()].sort((a, b) => a.nome.localeCompare(b.nome));
  }
}
