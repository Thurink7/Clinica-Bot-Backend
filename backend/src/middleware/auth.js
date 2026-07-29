import { AuthService } from '../services/authService.js';

const authService = new AuthService();

export async function requireAuth(req, res, next) {
  try {
    const user = await authService.userFromBearer(req.headers.authorization);
    if (!user) {
      const err = new Error('Sessão inválida ou expirada');
      err.status = 401;
      return next(err);
    }
    req.user = user;
    next();
  } catch (e) {
    next(e);
  }
}

/** Identifica o parceiro quando há token, sem bloquear o portal público. */
export async function optionalAuth(req, res, next) {
  try {
    const authorization = req.headers.authorization;
    if (authorization) {
      const user = await authService.userFromBearer(authorization);
      if (!user) {
        const err = new Error('Sessão inválida ou expirada');
        err.status = 401;
        return next(err);
      }
      req.user = user;
    }
    next();
  } catch (e) {
    next(e);
  }
}
