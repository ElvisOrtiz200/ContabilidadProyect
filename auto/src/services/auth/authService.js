import { supabase, supabaseAuth } from '../../config/supabase.js';
import { createClient } from '@supabase/supabase-js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { AuthenticationError, NotFoundError } from '../../utils/errors.js';

/**
 * Servicio de autenticación usando Supabase
 */
class AuthService {
  /**
   * Inicia sesión con email y contraseña
   */
  async login(email, password) {
    try {
      const { data, error } = await supabaseAuth.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logger.warn('Error en login', { 
          email, 
          error: error.message,
          errorCode: error.status,
          errorDetails: error 
        });
        
        // Mensajes más específicos según el tipo de error
        if (error.message.includes('Invalid login credentials')) {
          throw new AuthenticationError('Email o contraseña incorrectos. Verifica tus credenciales.');
        }
        
        if (error.message.includes('Email not confirmed')) {
          throw new AuthenticationError('Por favor, confirma tu email antes de iniciar sesión.');
        }
        
        throw new AuthenticationError(`Error de autenticación: ${error.message}`);
      }

      if (!data.user) {
        throw new AuthenticationError('Usuario no encontrado');
      }
      
      // Verificar si el email está confirmado (solo en producción)
      // En desarrollo, permitir login sin confirmación si está configurado
      const requireEmailConfirmation = process.env.REQUIRE_EMAIL_CONFIRMATION !== 'false';
      if (requireEmailConfirmation && !data.user.email_confirmed_at) {
        logger.warn('Intento de login con email no confirmado', { email, userId: data.user.id });
        throw new AuthenticationError('Por favor, confirma tu email antes de iniciar sesión.');
      }

      // Obtener perfil del usuario
      const perfil = await this.getPerfil(data.user.id);
      
      // Obtener empresas del usuario
      const empresas = await this.getEmpresasUsuario(data.user.id);

      logger.info('Login exitoso', { userId: data.user.id, email });

      return {
        user: {
          id: data.user.id,
          email: data.user.email,
          ...perfil,
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
        },
        empresas,
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      logger.error('Error en login', error);
      throw new AuthenticationError('Error al iniciar sesión');
    }
  }

  /**
   * Registra un nuevo usuario
   */
  async register(email, password, nombres, telefono) {
    try {
      // Crear usuario en auth.users
      const { data: authData, error: authError } = await supabaseAuth.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined,
        }
      });

      if (authError) {
        logger.warn('Error al registrar usuario', { email, error: authError.message });
        throw new AuthenticationError(authError.message);
      }

      if (!authData.user) {
        throw new AuthenticationError('Error al crear usuario');
      }
      
      // Si tenemos service role key, auto-confirmar el email inmediatamente
      if (config.supabase.serviceRoleKey && !authData.user.email_confirmed_at) {
        try {
          const supabaseAdmin = createClient(
            config.supabase.url,
            config.supabase.serviceRoleKey
          );
          
          // Actualizar usuario para confirmar email
          const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            authData.user.id,
            { email_confirm: true }
          );
          
          if (updateError) {
            logger.warn('No se pudo auto-confirmar email', { 
              error: updateError.message,
              userId: authData.user.id 
            });
          } else {
            logger.info('Email auto-confirmado para usuario', { userId: authData.user.id });
            // Actualizar el objeto authData para reflejar la confirmación
            authData.user.email_confirmed_at = new Date().toISOString();
          }
        } catch (adminError) {
          logger.warn('Error al auto-confirmar email', { 
            error: adminError.message,
            userId: authData.user.id 
          });
        }
      } else if (!authData.user.email_confirmed_at) {
        logger.warn('Usuario creado pero email no confirmado. El usuario debe confirmar su email.', {
          userId: authData.user.id,
          email: authData.user.email
        });
      }

      // Crear perfil en public.perfiles
      const { error: perfilError } = await supabase
        .from('perfiles')
        .insert({
          id: authData.user.id,
          nombres,
          telefono,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (perfilError) {
        logger.error('Error al crear perfil', perfilError);
        // Intentar eliminar el usuario de auth si falla la creación del perfil
        if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
          try {
            const supabaseAdmin = createClient(
              config.supabase.url,
              config.supabase.serviceRoleKey
            );
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          } catch (deleteError) {
            logger.error('Error al eliminar usuario después de fallo en perfil', deleteError);
          }
        }
        throw new AuthenticationError('Error al crear perfil de usuario');
      }

      logger.info('Usuario registrado exitosamente', { userId: authData.user.id, email });

      return {
        user: {
          id: authData.user.id,
          email: authData.user.email,
          nombres,
          telefono,
        },
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      logger.error('Error en registro', error);
      throw new AuthenticationError('Error al registrar usuario');
    }
  }

  /**
   * Obtiene el perfil de un usuario
   */
  async getPerfil(userId) {
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        logger.warn('Error al obtener perfil', { userId, error: error.message });
        return null;
      }

      return data;
    } catch (error) {
      logger.error('Error al obtener perfil', error);
      return null;
    }
  }

  /**
   * Obtiene las empresas asociadas a un usuario
   */
  async getEmpresasUsuario(userId) {
    try {
      const { data, error } = await supabase
        .from('empresa_usuarios')
        .select(`
          *,
          empresas (
            id,
            ruc,
            nombre_comercial,
            industria,
            direccion,
            pais,
            activo
          )
        `)
        .eq('usuario_id', userId)
        .eq('estado', 'activo');

      if (error) {
        logger.warn('Error al obtener empresas del usuario', { userId, error: error.message });
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Error al obtener empresas del usuario', error);
      return [];
    }
  }

  /**
   * Verifica y obtiene información del usuario desde el token
   */
  async verifyToken(accessToken) {
    try {
      const { data: { user }, error } = await supabaseAuth.auth.getUser(accessToken);

      if (error || !user) {
        throw new AuthenticationError('Token inválido o expirado');
      }

      const perfil = await this.getPerfil(user.id);
      const empresas = await this.getEmpresasUsuario(user.id);

      return {
        user: {
          id: user.id,
          email: user.email,
          ...perfil,
        },
        empresas,
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      logger.error('Error al verificar token', error);
      throw new AuthenticationError('Error al verificar token');
    }
  }

  /**
   * Refresca el token de acceso
   */
  async refreshToken(refreshToken) {
    try {
      const { data, error } = await supabaseAuth.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error || !data.session) {
        throw new AuthenticationError('Error al refrescar token');
      }

      return {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      logger.error('Error al refrescar token', error);
      throw new AuthenticationError('Error al refrescar token');
    }
  }

  /**
   * Cierra sesión
   */
  async logout(accessToken) {
    try {
      const { error } = await supabaseAuth.auth.signOut();

      if (error) {
        logger.warn('Error al cerrar sesión', error);
      }

      logger.info('Sesión cerrada exitosamente');
      return true;
    } catch (error) {
      logger.error('Error al cerrar sesión', error);
      throw new AuthenticationError('Error al cerrar sesión');
    }
  }

  /**
   * Reenvía el email de confirmación
   */
  async resendConfirmationEmail(email) {
    try {
      const { data, error } = await supabaseAuth.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        logger.warn('Error al reenviar email de confirmación', { email, error: error.message });
        throw new AuthenticationError(error.message);
      }

      logger.info('Email de confirmación reenviado', { email });
      return { success: true, message: 'Email de confirmación enviado' };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      logger.error('Error al reenviar email de confirmación', error);
      throw new AuthenticationError('Error al reenviar email de confirmación');
    }
  }

  /**
   * Confirma el email de un usuario usando el token (para cuando el usuario hace clic en el enlace)
   */
  async confirmEmail(token) {
    try {
      const { data, error } = await supabaseAuth.auth.verifyOtp({
        token_hash: token,
        type: 'email',
      });

      if (error) {
        logger.warn('Error al confirmar email', { error: error.message });
        throw new AuthenticationError('Token de confirmación inválido o expirado');
      }

      logger.info('Email confirmado exitosamente', { userId: data.user?.id });
      return { success: true, user: data.user };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      logger.error('Error al confirmar email', error);
      throw new AuthenticationError('Error al confirmar email');
    }
  }

  /**
   * Obtiene los roles y permisos de un usuario para una empresa específica
   */
  async getRolesPermisos(usuarioId, empresaId) {
    try {
      // Obtener relación usuario-empresa
      const { data: empresaUsuario, error: empresaError } = await supabase
        .from('empresa_usuarios')
        .select('rol')
        .eq('usuario_id', usuarioId)
        .eq('empresa_id', empresaId)
        .eq('estado', 'activo')
        .single();

      if (empresaError || !empresaUsuario) {
        return null;
      }

      // Obtener rol y permisos
      const { data: rolData, error: rolError } = await supabase
        .from('roles')
        .select(`
          *,
          rol_permisos (
            permisos
          )
        `)
        .eq('id', empresaUsuario.rol)
        .single();

      if (rolError || !rolData) {
        return null;
      }

      return {
        rol: rolData,
        permisos: rolData.rol_permisos?.permisos || null,
      };
    } catch (error) {
      logger.error('Error al obtener roles y permisos', error);
      return null;
    }
  }
}

export const authService = new AuthService();
