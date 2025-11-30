import { supabase } from '../../config/supabase.js';
import { logger } from '../../utils/logger.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio para CRUD de sunat_credenciales
 */
class SunatCredencialesService {
  /**
   * Lista credenciales, opcionalmente filtradas por regimen o empresa
   * Incluye información de la empresa relacionada
   */
  async list({ regimen, empresa_id } = {}) {
    try {
      let query = supabase
        .from('sunat_credenciales')
        .select('*')
        .order('created_at', { ascending: false });

      if (regimen) {
        query = query.eq('regimen', regimen);
      }

      if (empresa_id) {
        // Buscar empresa y usar su sunat_id para filtrar
        const { data: empresa, error: empresaError } = await supabase
          .from('empresas')
          .select('sunat_id')
          .eq('empresa_id', empresa_id)
          .single();

        if (empresaError || !empresa?.sunat_id) {
          throw new NotFoundError('No se encontró empresa o no tiene sunat_id asociado');
        }

        query = query.eq('sunat_id', empresa.sunat_id);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error al listar sunat_credenciales', error);
        throw new ValidationError('No se pudieron obtener las credenciales');
      }

      // Para cada credencial, obtener la empresa relacionada
      const credencialesConEmpresa = await Promise.all(
        (data || []).map(async (credencial) => {
          const { data: empresas, error: empresaError } = await supabase
            .from('empresas')
            .select('empresa_id, ruc, nombre_comercial, industria, direccion, pais, activo, estadoEmpresa')
            .eq('sunat_id', credencial.sunat_id);

          return {
            ...credencial,
            empresa: empresas && empresas.length > 0 ? empresas[0] : null,
          };
        })
      );

      return credencialesConEmpresa;
    } catch (error) {
      logger.error('Error inesperado al listar sunat_credenciales', error);
      throw error;
    }
  }

  /**
   * Obtiene credencial por sunat_id
   * Incluye información de la empresa relacionada
   */
  async getById(sunatId) {
    try {
      const { data, error } = await supabase
        .from('sunat_credenciales')
        .select('*')
        .eq('sunat_id', sunatId)
        .single();

      if (error || !data) {
        logger.warn('SUNAT credencial no encontrada', { sunatId, error: error?.message });
        throw new NotFoundError('Credencial SUNAT no encontrada');
      }

      // Obtener empresa relacionada
      const { data: empresas, error: empresaError } = await supabase
        .from('empresas')
        .select('empresa_id, ruc, nombre_comercial, industria, direccion, pais, activo, estadoEmpresa')
        .eq('sunat_id', sunatId);

      return {
        ...data,
        empresa: empresas && empresas.length > 0 ? empresas[0] : null,
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error al obtener sunat_credencial', error);
      throw new ValidationError('No se pudo obtener la credencial');
    }
  }

  /**
   * Obtiene credenciales por empresa_id
   * Útil para obtener las credenciales de una empresa específica
   */
  async getByEmpresaId(empresaId) {
    try {
      // Primero obtener la empresa para obtener su sunat_id
      const { data: empresa, error: empresaError } = await supabase
        .from('empresas')
        .select('sunat_id')
        .eq('empresa_id', empresaId)
        .single();

      if (empresaError || !empresa) {
        throw new NotFoundError('Empresa no encontrada');
      }

      if (!empresa.sunat_id) {
        // La empresa no tiene credenciales asociadas
        return null;
      }

      // Obtener la credencial usando el sunat_id
      return await this.getById(empresa.sunat_id);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error al obtener credencial por empresa_id', error);
      throw new ValidationError('No se pudo obtener la credencial de la empresa');
    }
  }

  /**
   * Crea nuevas credenciales
   * Si se proporciona empresa_id, actualiza automáticamente la empresa con el sunat_id
   */
  async create(payload) {
    this.validatePayload(payload, { isUpdate: false });

    try {
      const { data, error } = await supabase
        .from('sunat_credenciales')
        .insert({
          usuario: payload.usuario,
          clave_encriptada: payload.clave_encriptada,
          regimen: payload.regimen || null,
          fecha_afiliacion: payload.fecha_afiliacion || null,
          // created_at tiene default now() en la tabla
        })
        .select()
        .single();

      if (error) {
        logger.error('Error al crear sunat_credenciales', error);
        throw new ValidationError(error.message);
      }

      // Si se proporcionó empresa_id, actualizar la empresa automáticamente
      if (payload.empresa_id && data?.sunat_id) {
        try {
          const { error: updateError } = await supabase
            .from('empresas')
            .update({ sunat_id: data.sunat_id })
            .eq('empresa_id', payload.empresa_id);

          if (updateError) {
            logger.warn('Error al vincular empresa con credencial', {
              empresa_id: payload.empresa_id,
              sunat_id: data.sunat_id,
              error: updateError.message
            });
            // No lanzamos error, solo logueamos, para que la credencial se cree igual
          } else {
            logger.info('Empresa vinculada automáticamente con credencial', {
              empresa_id: payload.empresa_id,
              sunat_id: data.sunat_id
            });
          }
        } catch (linkError) {
          logger.error('Error inesperado al vincular empresa', linkError);
          // No lanzamos error, solo logueamos
        }
      }

      return data;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Error inesperado al crear sunat_credenciales', error);
      throw new ValidationError('No se pudieron crear las credenciales');
    }
  }

  /**
   * Actualiza credenciales existentes
   */
  async update(sunatId, payload) {
    this.validatePayload(payload, { isUpdate: true });

    try {
      await this.getById(sunatId);

      const fields = this.filterUpdatableFields(payload);

      if (!Object.keys(fields).length) {
        throw new ValidationError('No se proporcionaron campos para actualizar');
      }

      const { data, error } = await supabase
        .from('sunat_credenciales')
        .update({
          ...fields,
          update_at: new Date().toISOString(),
        })
        .eq('sunat_id', sunatId)
        .select()
        .single();

      if (error) {
        logger.error('Error al actualizar sunat_credenciales', error);
        throw new ValidationError(error.message);
      }

      return data;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error inesperado al actualizar sunat_credenciales', error);
      throw new ValidationError('No se pudieron actualizar las credenciales');
    }
  }

  /**
   * Elimina credenciales por sunat_id
   */
  async remove(sunatId) {
    try {
      await this.getById(sunatId);

      const { error } = await supabase
        .from('sunat_credenciales')
        .delete()
        .eq('sunat_id', sunatId);

      if (error) {
        logger.error('Error al eliminar sunat_credenciales', error);
        throw new ValidationError('No se pudieron eliminar las credenciales');
      }

      return true;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error inesperado al eliminar sunat_credenciales', error);
      throw new ValidationError('No se pudieron eliminar las credenciales');
    }
  }

  validatePayload(payload = {}, { isUpdate } = { isUpdate: false }) {
    const required = ['usuario', 'clave_encriptada'];

    if (!isUpdate) {
      const missing = required.filter((f) => !payload[f]);
      if (missing.length) {
        throw new ValidationError('Faltan campos requeridos', missing);
      }
    }
  }

  filterUpdatableFields(payload = {}) {
    const allowed = ['usuario', 'clave_encriptada', 'regimen', 'fecha_afiliacion'];

    return Object.entries(payload).reduce((acc, [key, value]) => {
      if (allowed.includes(key) && typeof value !== 'undefined') {
        acc[key] = value;
      }
      return acc;
    }, {});
  }
}

export const sunatCredencialesService = new SunatCredencialesService();


