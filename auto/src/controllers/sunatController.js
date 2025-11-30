import { sunatLogin } from '../services/sunat/sunatLogin.js';
import { descargarConstancias } from '../services/sunat/sunatDescarga.js';
import { logger } from '../utils/logger.js';

/**
 * Normaliza una fecha extrayendo solo DD/MM/YYYY (sin hora)
 */
function normalizarFecha(fecha) {
  if (!fecha) return null;
  // Si tiene hora, extraer solo la fecha
  const fechaParte = fecha.split(' ')[0];
  return fechaParte.trim();
}

/**
 * Normaliza un importe removiendo "S/." y espacios, dejando solo números y comas
 */
function normalizarImporte(importe) {
  if (!importe) return null;
  return importe
    .replace(/S\/\./g, '')
    .replace(/\s/g, '')
    .trim();
}

/**
 * Encuentra coincidencias entre arrays de importe y nps
 * Compara por fecha (sin hora) e importe normalizado
 */
function encontrarCoincidencias(importes, nps) {
  const coincidencias = [];

  if (!importes || !nps || !Array.isArray(importes) || !Array.isArray(nps)) {
    console.log('⚠️ Error: importes o nps no son arrays válidos');
    return coincidencias;
  }

  console.log(`🔍 Comparando ${importes.length} importes con ${nps.length} NPS...`);

  for (const itemImporte of importes) {
    const fechaImporte = normalizarFecha(itemImporte.fechaPres);
    const importeNormalizado = normalizarImporte(itemImporte.importe);

    if (!fechaImporte || !importeNormalizado) {
      console.log(`⚠️ Saltando importe inválido:`, itemImporte);
      continue;
    }

    // Buscar coincidencia en NPS
    for (const itemNps of nps) {
      const fechaNps = normalizarFecha(itemNps.fechaPres);
      const importeNpsNormalizado = normalizarImporte(itemNps.importe);

      if (!fechaNps || !importeNpsNormalizado) continue;

      // Comparar fecha e importe
      if (fechaImporte === fechaNps && importeNormalizado === importeNpsNormalizado) {
        coincidencias.push({
          fechaPres: fechaImporte,
          importe: {
            fechaPres: itemImporte.fechaPres,
            importe: itemImporte.importe
          },
          nps: {
            fechaPres: itemNps.fechaPres,
            importe: itemNps.importe
          }
        });
        console.log(`✅ Coincidencia encontrada: ${fechaImporte} - ${importeNormalizado}`);
        break; // Encontrada la coincidencia, pasar al siguiente importe
      }
    }
  }

  return coincidencias;
}

export const SunatController = {
  obtenerRentaDeclaracionesYPagos: async (req, res, next) => {
    try {
      const { ruc, usuario, clave } = req.body;
      logger.info('Iniciando login en SUNAT', { ruc });
      
      const result = await sunatLogin(ruc, usuario, clave);
      
      // Calcular coincidencias y guardar en array
      console.log('🔍 Iniciando búsqueda de coincidencias...');
      console.log('📊 Importes recibidos:', result.importePagado?.length || 0);
      console.log('📊 NPS recibidos:', result.nps?.length || 0);
      
      const coincidencias = encontrarCoincidencias(result.importePagado, result.nps);
      
      // Mostrar coincidencias en console.log
      console.log('========================================');
      console.log('COINCIDENCIAS ENCONTRADAS');
      console.log('========================================');
      console.log(JSON.stringify(coincidencias, null, 2));
      console.log('========================================');
      console.log(`Total de coincidencias: ${coincidencias.length}`);
      console.log('========================================');
      
      // Mantener la respuesta JSON original y agregar tributos
      res.status(200).json({
        success: true,
        message: 'Sesión iniciada correctamente, proceso ejecutandose',
        data: {
          renta: result.rentas,
          importe: result.importePagado,
          nps: result.nps,
          tributos: result.tributos || []
        }
      });
    } catch (error) {
      logger.error('Error en inicio de sesión', error);
      next(error);
    }
  },

  descargar: async (req, res, next) => {
    try {
      logger.info('Iniciando descarga de archivos');
      
      await descargarConstancias();
      
      res.json({
        success: true,
        message: 'Excel descargado correctamente',
      });
    } catch (error) {
      logger.error('Error al descargar Excel', error);
      next(error);
    }
  },

};
