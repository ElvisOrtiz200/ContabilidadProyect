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


export function calcularRango6MesesDesdeHoy() {
  const hoy = new Date();

  // Mes y año finales (mes actual)
  let mFin = hoy.getMonth() + 1; // getMonth() va de 0 a 11
  let yFin = hoy.getFullYear();

  // Calcular 6 meses atrás (incluyendo mes actual → restar 5)
  let mInicio = mFin - 5;
  let yInicio = yFin;

  // Ajustar si cruza al año anterior
  if (mInicio <= 0) {
    mInicio = 12 + mInicio;
    yInicio = yFin - 1;
  }

  // Formateo
  const mesInicio = String(mInicio).padStart(2, "0");
  const mesFinFmt = String(mFin).padStart(2, "0");

  return {
    mesInicio,
    añoInicio: String(yInicio),
    mesFin: mesFinFmt,
    añoFin: String(yFin)
  };
}

export function generarMesesDelRango(rango) {
  const meses = [];

  let año = parseInt(rango.añoInicio);
  let mes = parseInt(rango.mesInicio);

  const añoFin = parseInt(rango.añoFin);
  const mesFin = parseInt(rango.mesFin);

  while (año < añoFin || (año === añoFin && mes <= mesFin)) {
    meses.push({
      mes: mes.toString().padStart(2, "0"),
      año: año.toString()
    });

    mes++;
    if (mes > 12) {
      mes = 1;
      año++;
    }
  }

  return meses;
}

export const obtenerTablaCompleta = async (frame, selectorTabla) => {
  return await frame.$$eval(`${selectorTabla} tbody tr`, filas =>
    filas.map(fila => {
      const celdas = [...fila.querySelectorAll("td")];
      return celdas.map(td => td.innerText.trim());
    })
  );
};

export const extraerColumnas = (tabla, indices) => {
  return tabla.map(fila =>
    indices.map(i => fila[i] ?? null)
  );
};






