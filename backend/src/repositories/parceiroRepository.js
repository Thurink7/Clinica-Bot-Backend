import { getFirestore } from '../config/firebase.js';

export class ParceiroRepository {
  constructor(db = getFirestore()) {
    this.db = db;
    this.col = this.db.collection('parceiros');
  }

  async create(data) {
    const payload = {
      ...data,
      lat: Number(data.lat || 0),
      lng: Number(data.lng || 0),
      createdAt: new Date().toISOString(),
    };
    const ref = await this.col.add(payload);
    return { id: ref.id, ...payload };
  }

  async listAll() {
    const snap = await this.col.get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  async getById(id) {
    const snap = await this.col.doc(id).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() };
  }

  async listNear(lat, lng, maxDistanceKm = 50) {
    const all = await this.listAll();
    // Simple Haversine distance helper
    const getDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371; // Radius of the earth in km
      const dLat = (lat2 - lat1) * (Math.PI / 180);
      const dLon = (lon2 - lon1) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
          Math.cos(lat2 * (Math.PI / 180)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    return all
      .map((p) => ({
        ...p,
        distanceKm: getDistance(lat, lng, p.lat, p.lng),
      }))
      .filter((p) => p.distanceKm <= maxDistanceKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }
}
