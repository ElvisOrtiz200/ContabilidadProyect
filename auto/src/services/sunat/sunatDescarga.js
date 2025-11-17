import { sunatLogin } from './sunatLogin.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

/**
 * Servicio para descargar constancias de SUNAT
 */
export async function descargarConstancias() {
  try {
    logger.info('Iniciando descarga de constancias');
    await sunatLogin(
      config.sunat.ruc,
      config.sunat.usuario,
      config.sunat.clave
    );
    logger.info('Descarga de constancias completada');
  } catch (error) {
    logger.error('Error al descargar constancias', error);
    throw error;
  }
}
