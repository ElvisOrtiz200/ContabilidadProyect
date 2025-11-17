import { authService } from '../../services/auth/authService.js';
import { AuthenticationError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

/**
 * Middleware para autenticar usuarios mediante token de Supabase
 */
export const authenticate = async (req, res, next) => {
  try {
    // Obtener token del header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Token de autenticación requerido');
    }

    const accessToken = authHeader.substring(7); // Remover "Bearer "

    // Verificar token y obtener información del usuario
    const userData = await authService.verifyToken(accessToken);

    // Agregar información del usuario al request
    req.user = userData.user;
    req.userEmpresas = userData.empresas;
    req.accessToken = accessToken;

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return next(error);
    }
    logger.error('Error en middleware de autenticación', error);
    next(new AuthenticationError('Error de autenticación'));
  }
};

/**
 * Middleware opcional: autentica si hay token, pero no falla si no existe
 */
export const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const accessToken = authHeader.substring(7);
      const userData = await authService.verifyToken(accessToken);
      req.user = userData.user;
      req.userEmpresas = userData.empresas;
      req.accessToken = accessToken;
    }

    next();
  } catch (error) {
    // Si falla la autenticación opcional, simplemente continuar sin usuario
    next();
  }
};

