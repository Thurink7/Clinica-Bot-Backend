import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AdminUserRepository } from '../repositories/adminUserRepository.js';

const JWT_EXP = '7d';

function jwtSecret() {
  const s = process.env.JWT_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET obrigatório em produção');
  }
  return 'dev-only-insecure-jwt-secret-change-me';
}

export class AuthService {
  constructor(repo = new AdminUserRepository()) {
    this.repo = repo;
  }

  async login(emailRaw, passwordRaw) {
    const email = String(emailRaw || '')
      .trim()
      .toLowerCase();
    const password = String(passwordRaw || '');
    if (!email || !password) {
      const err = new Error('E-mail e senha são obrigatórios');
      err.status = 400;
      throw err;
    }

    const user = await this.repo.findByEmail(email);
    if (!user || !user.passwordHash) {
      const err = new Error('E-mail ou senha incorretos');
      err.status = 401;
      throw err;
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      const err = new Error('E-mail ou senha incorretos');
      err.status = 401;
      throw err;
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, parceiroId: user.parceiroId || null },
      jwtSecret(),
      { expiresIn: JWT_EXP }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        nome: user.nome || null,
        parceiroId: user.parceiroId || null,
      },
    };
  }

  /** @returns {Promise<{ id: string, email: string, nome: string | null, parceiroId: string | null } | null>} */
  async userFromBearer(authHeader) {
    const raw = String(authHeader || '');
    const m = raw.match(/^Bearer\s+(.+)$/i);
    if (!m) return null;
    try {
      const decoded = jwt.verify(m[1], jwtSecret());
      const id = decoded.sub;
      if (!id) return null;
      const user = await this.repo.getById(id);
      if (!user || !user.email) return null;
      return {
        id: user.id,
        email: user.email,
        nome: user.nome || null,
        parceiroId: user.parceiroId || decoded.parceiroId || null,
      };
    } catch {
      return null;
    }
  }
}
