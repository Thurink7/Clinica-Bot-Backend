import { getMongoDb } from '../../config/mongo.js';
import { validarCpfBr } from '../../utils/cpf.js';
import { toEntity, toEntityList } from './mongoDoc.js';

function normTel(t) {
  return String(t || '').replace(/\D/g, '');
}

export class PacienteRepositoryMongo {
  constructor() {
    this.col = () => getMongoDb().collection('pacientes');
  }

  async upsert({ nome, telefone, cpf = null, dataNascimento = null }) {
    const tel = normTel(telefone);
    const v = validarCpfBr(cpf);
    if (!v.ok) {
      const err = new Error(v.message);
      err.status = 400;
      throw err;
    }
    if (!tel || !String(nome || '').trim()) {
      const err = new Error('Nome e telefone são obrigatórios');
      err.status = 400;
      throw err;
    }
    const payload = {
      telefone: tel,
      nome: String(nome).trim(),
      cpf: v.digits,
      dataNascimento: dataNascimento ? String(dataNascimento).trim() : null,
      legacyId: v.digits,
      updatedAt: new Date().toISOString(),
    };
    await this.col().updateOne({ _id: v.digits }, { $set: payload }, { upsert: true });
    return this.getByCpf(v.digits);
  }

  async getByCpf(cpf) {
    const v = validarCpfBr(cpf);
    if (!v.ok) return null;
    const doc = await this.col().findOne({ _id: v.digits });
    return toEntity(doc);
  }

  async getByTelefone(telefone) {
    const tel = normTel(telefone);
    if (!tel) return null;
    const doc = await this.col().findOne({ telefone: tel });
    return toEntity(doc);
  }

  async listAll() {
    const docs = await this.col().find({}).toArray();
    return toEntityList(docs);
  }

  async updateObservacoes(pacienteId, observacoes) {
    const v = validarCpfBr(pacienteId);
    const id = v.ok ? v.digits : String(pacienteId || '').replace(/\D/g, '');
    if (!id || id.length !== 11) {
      const err = new Error('CPF do paciente inválido');
      err.status = 400;
      throw err;
    }
    await this.col().updateOne(
      { _id: id },
      {
        $set: {
          observacoes: String(observacoes ?? ''),
          updatedAt: new Date().toISOString(),
          legacyId: id,
          cpf: id,
        },
      },
      { upsert: true }
    );
    return this.getByCpf(id);
  }
}
