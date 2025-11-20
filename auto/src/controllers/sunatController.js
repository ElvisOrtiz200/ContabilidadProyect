import { sunatLogin } from '../services/sunat/sunatLogin.js';
import { descargarConstancias } from '../services/sunat/sunatDescarga.js';
import { logger } from '../utils/logger.js';

export const SunatController = {
  obtenerRentaDeclaracionesYPagos: async (req, res, next) => {
    try {
      const { ruc, usuario, clave } = req.body;
      logger.info('Iniciando login en SUNAT', { ruc });
      
      const result = await sunatLogin(ruc, usuario, clave);
      console.log(result);
      res.status(200).json({
        success: true,
        message: 'Sesión iniciada correctamente, proceso ejecutandose',
        data: {
          renta: result.rentas,
          importe: result.importePagado
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
