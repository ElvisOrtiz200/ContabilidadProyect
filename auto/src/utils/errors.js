/**
 * Utilidades para manejo de errores
 */

export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400);
    this.details = details;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Error de autenticación') {
    super(message, 401);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') {
    super(message, 404);
  }
}

export const handleError = (error, req, res, next) => {
  const statusCode = error.statusCode || 500;
  const message = error.isOperational ? error.message : 'Error interno del servidor';

  // Respuesta estructurada para el frontend
  const response = {
    success: false,
    message,
    ...(error.details && { errors: error.details }),
    ...(process.env.NODE_ENV === 'development' && { 
      stack: error.stack,
      error: error.message 
    }),
  };

  res.status(statusCode).json(response);
};

