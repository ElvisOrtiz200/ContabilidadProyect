import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/index.js';

/**
 * Funciones auxiliares generales
 */

/**
 * Asegura que un directorio exista
 */
export async function ensureDirectory(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    throw new Error(`Error al crear directorio ${dirPath}: ${error.message}`);
  }
}

/**
 * Guarda cookies de sesión
 */
export async function saveSession(cookies) {
  try {
    await ensureDirectory(path.dirname(config.paths.session));
    await fs.writeFile(
      config.paths.session,
      JSON.stringify(cookies, null, 2)
    );
    return true;
  } catch (error) {
    throw new Error(`Error al guardar sesión: ${error.message}`);
  }
}

/**
 * Carga cookies de sesión guardadas
 */
export async function loadSession() {
  try {
    const sessionData = await fs.readFile(config.paths.session, 'utf8');
    return JSON.parse(sessionData);
  } catch (error) {
    return null;
  }
}

/**
 * Valida formato de RUC peruano
 */
export function validateRUC(ruc) {
  if (!ruc || typeof ruc !== 'string') {
    return false;
  }
  // RUC debe tener 11 dígitos
  return /^\d{11}$/.test(ruc);
}

/**
 * Formatea fecha para SUNAT (MM/YYYY)
 */
export function formatDateForSunat(date) {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return { month, year };
}

/**
 * Espera un tiempo determinado (wrapper para setTimeout con Promise)
 */
export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

