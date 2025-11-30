import { empresaService } from '../services/empresas/empresaService.js';
import { sunatCredencialesService } from '../services/sunat/sunatCredencialesService.js';
import { logger } from '../utils/logger.js';

export const EmpresaController = {
  list: async (req, res, next) => {
    try {
      const empresas = await empresaService.listEmpresas(req.query);

      res.json({
        success: true,
        data: empresas,
      });
    } catch (error) {
      logger.error('Error en listEmpresas controller', error);
      next(error);
    }
  },

  getById: async (req, res, next) => {
    try {
      const empresa = await empresaService.getEmpresaById(req.params.empresaId);

      res.json({
        success: true,
        data: empresa,
      });
    } catch (error) {
      logger.error('Error en getEmpresaById controller', error);
      next(error);
    }
  },

  create: async (req, res, next) => {
    try {
      const nuevaEmpresa = await empresaService.createEmpresa(req.body);

      res.status(201).json({
        success: true,
        message: 'Empresa creada correctamente',
        data: nuevaEmpresa,
      });
    } catch (error) {
      logger.error('Error en createEmpresa controller', error);
      next(error);
    }
  },

  update: async (req, res, next) => {
    try {
      const empresaActualizada = await empresaService.updateEmpresa(
        req.params.empresaId,
        req.body
      );

      res.json({
        success: true,
        message: 'Empresa actualizada correctamente',
        data: empresaActualizada,
      });
    } catch (error) {
      logger.error('Error en updateEmpresa controller', error);
      next(error);
    }
  },

  remove: async (req, res, next) => {
    try {
      await empresaService.deleteEmpresa(req.params.empresaId);

      res.json({
        success: true,
        message: 'Empresa eliminada correctamente',
      });
    } catch (error) {
      logger.error('Error en deleteEmpresa controller', error);
      next(error);
    }
  },

  getCredenciales: async (req, res, next) => {
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
      logger.error('Error en getCredenciales empresa controller', error);
      next(error);
    }
  },
};

