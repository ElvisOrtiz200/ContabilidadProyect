import { supabase } from '../../config/supabase.js';
import { logger } from '../../utils/logger.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio para CRUD de empresas
 */
class EmpresaService {
  /**
   * Lista empresas con filtros opcionales
   */
  async listEmpresas({ activo } = {}) {
    try {
      let query = supabase
        .from('empresas')
        .select('*')
        .order('created_at', { ascending: false });

      if (typeof activo !== 'undefined') {
        const boolValue = activo === 'true' || activo === true;
        query = query.eq('activo', boolValue);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error al listar empresas', error);
        throw new ValidationError('No se pudieron obtener las empresas');
      }

      return data || [];
    } catch (error) {
      logger.error('Error inesperado al listar empresas', error);
      throw error;
    }
  }

  /**
   * Obtiene una empresa por ID
   */
  async getEmpresaById(empresaId) {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('empresa_id', empresaId)
        .single();

      if (error) {
        logger.warn('Empresa no encontrada', { empresaId, error: error.message });
        throw new NotFoundError('Empresa no encontrada');
      }

      return data;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error al obtener empresa', error);
      throw new ValidationError('No se pudo obtener la empresa');
    }
  }

  /**
   * Crea una empresa
   */
  async createEmpresa(payload) {
    this.validateEmpresaPayload(payload, { isUpdate: false });

    try {
      const { data, error } = await supabase
        .from('empresas')
        .insert({
          ruc: payload.ruc,
          nombre_comercial: payload.nombre_comercial,
          industria: payload.industria,
          direccion: payload.direccion,
          pais: payload.pais,
          activo: payload.activo ?? true,
          created_at: payload.created_at || new Date().toISOString(),
          sunat_id: payload.sunat_id || null,
          estadoEmpresa: typeof payload.estadoEmpresa === 'boolean' ? payload.estadoEmpresa : null,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error al crear empresa', error);
        throw new ValidationError(error.message);
      }

      return data;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Error inesperado al crear empresa', error);
      throw new ValidationError('No se pudo crear la empresa');
    }
  }

  /**
   * Actualiza una empresa existente
   */
  async updateEmpresa(empresaId, payload) {
    this.validateEmpresaPayload(payload, { isUpdate: true });

    try {
      // Verificar que exista
      await this.getEmpresaById(empresaId);

      const fields = this.filterUpdatableFields(payload);

      if (!Object.keys(fields).length) {
        throw new ValidationError('No se proporcionaron campos para actualizar');
      }

      const { data, error } = await supabase
        .from('empresas')
        .update(fields)
        .eq('empresa_id', empresaId)
        .select()
        .single();

      if (error) {
        logger.error('Error al actualizar empresa', error);
        throw new ValidationError(error.message);
      }

      return data;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      logger.error('Error inesperado al actualizar empresa', error);
      throw new ValidationError('No se pudo actualizar la empresa');
    }
  }

  /**
   * Elimina una empresa por ID
   */
  async deleteEmpresa(empresaId) {
    try {
      // Verificar existencia
      await this.getEmpresaById(empresaId);

      const { error } = await supabase
        .from('empresas')
        .delete()
        .eq('empresa_id', empresaId);

      if (error) {
        logger.error('Error al eliminar empresa', error);
        throw new ValidationError('No se pudo eliminar la empresa');
      }

      return true;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      logger.error('Error inesperado al eliminar empresa', error);
      throw new ValidationError('No se pudo eliminar la empresa');
    }
  }

  /**
   * Valida payloads de creación/actualización
   */
  validateEmpresaPayload(payload = {}, { isUpdate } = { isUpdate: false }) {
    const requiredFields = ['ruc', 'nombre_comercial', 'industria', 'direccion', 'pais'];

    if (!isUpdate) {
      const missing = requiredFields.filter((field) => !payload[field]);
      if (missing.length) {
        throw new ValidationError('Faltan campos requeridos', missing);
      }
    }
  }

  filterUpdatableFields(payload = {}) {
    const allowed = [
      'ruc',
      'nombre_comercial',
      'industria',
      'direccion',
      'pais',
      'activo',
      'sunat_id',
      'estadoEmpresa',
    ];

    return Object.entries(payload).reduce((acc, [key, value]) => {
      if (allowed.includes(key) && typeof value !== 'undefined') {
        acc[key] = value;
      }
      return acc;
    }, {});
  }
}

export const empresaService = new EmpresaService();

