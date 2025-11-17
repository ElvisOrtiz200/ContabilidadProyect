import { ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Middleware: valida credenciales de login
 */
export const validateAuthLogin = (req, res, next) => {
  try {
    validateAuthLoginPayload(req.body);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware: valida datos de registro
 */
export const validateAuthRegister = (req, res, next) => {
  try {
    validateAuthRegisterPayload(req.body);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Valida los datos de login (helper)
 */
function validateAuthLoginPayload(data) {
  const { email, password } = data || {};
  logger.info('Intento de login', { email });
  if (!email) {
    throw new ValidationError('El email es requerido');
  }

  if (!isValidEmail(email)) {
    throw new ValidationError('El email no es válido');
  }

  if (!password) {
    throw new ValidationError('La contraseña es requerida');
  }

  if (password.length < 6) {
    throw new ValidationError('La contraseña debe tener al menos 6 caracteres');
  }

  return true;
}

/**
 * Valida los datos de registro (helper)
 */
function validateAuthRegisterPayload(data) {
  const { email, password, nombres, telefono } = data || {};

  if (!email) {
    throw new ValidationError('El email es requerido');
  }

  if (!isValidEmail(email)) {
    throw new ValidationError('El email no es válido');
  }

  if (!password) {
    throw new ValidationError('La contraseña es requerida');
  }

  if (password.length < 6) {
    throw new ValidationError('La contraseña debe tener al menos 6 caracteres');
  }

  if (!nombres) {
    throw new ValidationError('Los nombres son requeridos');
  }

  if (nombres.trim().length < 2) {
    throw new ValidationError('Los nombres deben tener al menos 2 caracteres');
  }

  if (!telefono) {
    throw new ValidationError('El teléfono es requerido');
  }

  if (!isValidPhone(telefono)) {
    throw new ValidationError('El teléfono no es válido');
  }

  return true;
}

/**
 * Valida formato de email
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida formato de teléfono (básico)
 */
function isValidPhone(phone) {
  // Acepta números con o sin caracteres especiales
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 8;
}

