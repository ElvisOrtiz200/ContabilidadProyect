import { createClient } from '@supabase/supabase-js';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

/**
 * Cliente de Supabase para operaciones de base de datos
 */
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

/**
 * Cliente de Supabase para operaciones de autenticación (solo anon key)
 */
export const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * Verifica la conexión con Supabase
 */
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('empresas').select('count').limit(1);
    if (error) {
      logger.warn('Error al conectar con Supabase:', error.message);
      return false;
    }
    logger.info('Conexión con Supabase establecida correctamente');
    return true;
  } catch (error) {
    logger.error('Error al verificar conexión con Supabase', error);
    return false;
  }
}

