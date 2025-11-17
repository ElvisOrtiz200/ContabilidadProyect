import { handleError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Middleware para manejo centralizado de errores
 */
export const errorHandler = (err, req, res, next) => {
  logger.error('Error en la aplicación', err);
  handleError(err, req, res, next);
};

/**
 * Middleware para manejar rutas no encontradas
 */
export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Ruta no encontrada: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

