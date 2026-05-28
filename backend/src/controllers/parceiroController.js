import { ParceiroRepository } from '../repositories/parceiroRepository.js';
import { ProfessionalRepository } from '../repositories/professionalRepository.js';

const parceiroRepo = new ParceiroRepository();
const profRepo = new ProfessionalRepository();

export async function getParceirosBusca(req, res, next) {
  try {
    const lat = Number(req.query.lat || 0);
    const lng = Number(req.query.lng || 0);
    const maxDist = Number(req.query.maxDistanceKm || 50);

    if (!lat || !lng) {
      // Return all partners if no geolocation coordinates are passed
      const list = await parceiroRepo.listAll();
      return res.json(list);
    }

    const near = await parceiroRepo.listNear(lat, lng, maxDist);
    res.json(near);
  } catch (e) {
    next(e);
  }
}

export async function postParceiro(req, res, next) {
  try {
    const created = await parceiroRepo.create(req.body);
    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
}

export async function getParceiroDetails(req, res, next) {
  try {
    const { id } = req.params;
    const parceiro = await parceiroRepo.getById(id);
    if (!parceiro) {
      const err = new Error('Parceiro não encontrado');
      err.status = 404;
      throw err;
    }
    res.json(parceiro);
  } catch (e) {
    next(e);
  }
}
