import { ValidationError } from '../utils/errors.js';
import { validateRUC } from '../utils/helpers.js';

/**
 * Valida los datos de login de SUNAT
 */
export function validateSunatLogin(data) {
  const { ruc, usuario, clave } = data;

  if (!ruc) {
    throw new ValidationError('El RUC es requerido');
  }

  if (!validateRUC(ruc)) {
    throw new ValidationError('El RUC debe tener 11 dígitos');
  }

  if (!usuario) {
    throw new ValidationError('El usuario es requerido');
  }

  if (!clave) {
    throw new ValidationError('La clave es requerida');
  }

  return true;
}

/**
 * Valida parámetros de descarga
 */
export function validateDownloadParams(data) {
  const { mesInicio, añoInicio, mesFin, añoFin } = data;

  if (mesInicio && (mesInicio < 1 || mesInicio > 12)) {
    throw new ValidationError('El mes de inicio debe estar entre 1 y 12');
  }

  if (mesFin && (mesFin < 1 || mesFin > 12)) {
    throw new ValidationError('El mes de fin debe estar entre 1 y 12');
  }

  if (añoInicio && añoInicio < 2000) {
    throw new ValidationError('El año de inicio debe ser válido');
  }

  if (añoFin && añoFin < 2000) {
    throw new ValidationError('El año de fin debe ser válido');
  }

  return true;
}

