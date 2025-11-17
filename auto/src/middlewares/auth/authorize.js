import { authService } from '../../services/auth/authService.js';
import { AuthenticationError, NotFoundError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

/**
 * Middleware para verificar que el usuario pertenece a una empresa
 */
export const requireEmpresa = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Usuario no autenticado');
    }

    // Obtener empresaId de params, query o body
    const empresaId = req.params.empresaId || req.query.empresaId || req.body.empresaId;

    if (!empresaId) {
      throw new NotFoundError('ID de empresa requerido');
    }

    // Verificar que el usuario pertenece a la empresa
    const tieneAcceso = req.userEmpresas?.some(
      (eu) => eu.empresas?.id === empresaId && eu.estado === 'activo'
    );

    if (!tieneAcceso) {
      throw new AuthenticationError('No tienes acceso a esta empresa');
    }

    // Obtener roles y permisos del usuario para esta empresa
    const rolesPermisos = await authService.getRolesPermisos(req.user.id, empresaId);
    req.userRol = rolesPermisos?.rol || null;
    req.userPermisos = rolesPermisos?.permisos || null;
    req.empresaId = empresaId;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware para verificar permisos específicos
 */
export const requirePermission = (permisoRequerido) => {
  return async (req, res, next) => {
    try {
      if (!req.userPermisos) {
        throw new AuthenticationError('No tienes permisos para esta acción');
      }

      // Parsear permisos (asumiendo que son un string separado por comas o un array)
      const permisos = Array.isArray(req.userPermisos)
        ? req.userPermisos
        : req.userPermisos.split(',').map((p) => p.trim());

      if (!permisos.includes(permisoRequerido)) {
        throw new AuthenticationError(`Permiso requerido: ${permisoRequerido}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware para verificar que el usuario tiene un rol específico
 */
export const requireRole = (rolRequerido) => {
  return async (req, res, next) => {
    try {
      if (!req.userRol) {
        throw new AuthenticationError('No tienes un rol asignado');
      }

      if (req.userRol.nombre !== rolRequerido) {
        throw new AuthenticationError(`Rol requerido: ${rolRequerido}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware para verificar que el usuario es administrador de la empresa
 */
export const requireAdmin = async (req, res, next) => {
  try {
    if (!req.userRol) {
      throw new AuthenticationError('No tienes un rol asignado');
    }

    // Asumiendo que el rol de administrador se llama 'admin' o 'administrador'
    const esAdmin = ['admin', 'administrador', 'administrator'].includes(
      req.userRol.nombre.toLowerCase()
    );

    if (!esAdmin) {
      throw new AuthenticationError('Se requiere rol de administrador');
    }

    next();
  } catch (error) {
    next(error);
  }
};

