import { getMongoDb } from '../../config/mongo.js';
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
    if (!tel || !String(nome || '').trim()) {
      const err = new Error('Nome e telefone são obrigatórios');
      err.status = 400;
      throw err;
    }
    const cpfDigits = cpf ? String(cpf).replace(/\D/g, '') : null;
    const payload = {
      telefone: tel,
      nome: String(nome).trim(),
      cpf: cpfDigits && cpfDigits.length === 11 ? cpfDigits : null,
      dataNascimento: dataNascimento ? String(dataNascimento).trim() : null,
      legacyId: tel,
      updatedAt: new Date().toISOString(),
    };
    await this.col().updateOne({ _id: tel }, { $set: payload }, { upsert: true });
    return this.getByTelefone(tel);
  }

  async getByTelefone(telefone) {
    const tel = normTel(telefone);
    if (!tel) return null;
    const doc = await this.col().findOne({ _id: tel });
    return toEntity(doc);
  }

  async listAll() {
    const docs = await this.col().find({}).toArray();
    return toEntityList(docs);
  }

  async updateObservacoes(telefone, observacoes) {
    const tel = normTel(telefone);
    if (!tel) {
      const err = new Error('Telefone inválido');
      err.status = 400;
      throw err;
    }
    await this.col().updateOne(
      { _id: tel },
      {
        $set: {
          observacoes: String(observacoes ?? ''),
          updatedAt: new Date().toISOString(),
          legacyId: tel,
          telefone: tel,
        },
      },
      { upsert: true }
    );
    return this.getByTelefone(tel);
  }
}
