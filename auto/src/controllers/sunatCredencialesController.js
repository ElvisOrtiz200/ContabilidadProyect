import { sunatCredencialesService } from '../services/sunat/sunatCredencialesService.js';
import { logger } from '../utils/logger.js';

export const SunatCredencialesController = {
  list: async (req, res, next) => {
    try {
      const credenciales = await sunatCredencialesService.list(req.query);

      res.json({
        success: true,
        data: credenciales,
      });
    } catch (error) {
      logger.error('Error en list sunat_credenciales', error);
      next(error);
    }
  },

  getById: async (req, res, next) => {
    try {
      const credencial = await sunatCredencialesService.getById(req.params.sunatId);

      res.json({
        success: true,
        data: credencial,
      });
    } catch (error) {
      logger.error('Error en getById sunat_credenciales', error);
      next(error);
    }
  },

  create: async (req, res, next) => {
    try {
      const created = await sunatCredencialesService.create(req.body);

      res.status(201).json({
        success: true,
        message: 'Credenciales SUNAT creadas correctamente',
        data: created,
      });
    } catch (error) {
      logger.error('Error en create sunat_credenciales', error);
      next(error);
    }
  },

  update: async (req, res, next) => {
    try {
      const updated = await sunatCredencialesService.update(req.params.sunatId, req.body);

      res.json({
        success: true,
        message: 'Credenciales SUNAT actualizadas correctamente',
        data: updated,
      });
    } catch (error) {
      logger.error('Error en update sunat_credenciales', error);
      next(error);
    }
  },

  remove: async (req, res, next) => {
    try {
      await sunatCredencialesService.remove(req.params.sunatId);

      res.json({
        success: true,
        message: 'Credenciales SUNAT eliminadas correctamente',
      });
    } catch (error) {
      logger.error('Error en remove sunat_credenciales', error);
      next(error);
    }
  },

  getByEmpresaId: async (req, res, next) => {
    try {
      const credencial = await sunatCredencialesService.getByEmpresaId(req.params.empresaId);

      if (!credencial) {
        return res.json({
          success: true,
          message: 'La empresa no tiene credenciales SUNAT asociadas',
          data: null,
        });
      }

      res.json({
        success: true,
        data: credencial,
      });
    } catch (error) {
      logger.error('Error en getByEmpresaId sunat_credenciales', error);
      next(error);
    }
  },
};


