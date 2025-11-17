import { authService } from '../services/auth/authService.js';
import { logger } from '../utils/logger.js';

export const AuthController = {
  /**
   * Inicia sesión con email y contraseña
   */
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // Validar que se envíen los datos requeridos
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email y contraseña son requeridos',
          errors: {
            email: !email ? 'El email es requerido' : undefined,
            password: !password ? 'La contraseña es requerida' : undefined,
          },
        });
      }

      logger.info('Intento de login', { email });

      const result = await authService.login(email, password);

      // Respuesta exitosa con toda la información necesaria para el frontend
      res.status(200).json({
        success: true,
        message: 'Inicio de sesión exitoso',
        data: {
          user: result.user,
          token: result.session.access_token,
          refreshToken: result.session.refresh_token,
          expiresAt: result.session.expires_at,
          empresas: result.empresas || [],
        },
      });
    } catch (error) {
      logger.error('Error en login', error);
      next(error);
    }
  },

  /**
   * Registra un nuevo usuario
   */
  register: async (req, res, next) => {
    try {
      const { email, password, nombres, telefono } = req.body;
      
      logger.info('Intento de registro', { email });

      const result = await authService.register(email, password, nombres, telefono);

      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente. Por favor, confirma tu email.',
        data: {
          user: result.user,
          // Nota: En el registro, Supabase puede requerir confirmación de email
          requiresEmailConfirmation: true,
        },
      });
    } catch (error) {
      logger.error('Error en registro', error);
      next(error);
    }
  },

  /**
   * Obtiene información del usuario actual
   */
  me: async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
      }

      res.json({
        success: true,
        data: {
          user: req.user,
          empresas: req.userEmpresas,
        },
      });
    } catch (error) {
      logger.error('Error al obtener información del usuario', error);
      next(error);
    }
  },

  /**
   * Refresca el token de acceso
   */
  refresh: async (req, res, next) => {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        return res.status(400).json({
          success: false,
          message: 'refresh_token es requerido',
        });
      }

      const result = await authService.refreshToken(refresh_token);

      res.json({
        success: true,
        message: 'Token refrescado exitosamente',
        data: result,
      });
    } catch (error) {
      logger.error('Error al refrescar token', error);
      next(error);
    }
  },

  /**
   * Reenvía el email de confirmación
   */
  resendConfirmation: async (req, res, next) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'El email es requerido',
        });
      }

      logger.info('Solicitud de reenvío de email de confirmación', { email });

      const result = await authService.resendConfirmationEmail(email);

      res.json({
        success: true,
        message: 'Email de confirmación enviado. Revisa tu bandeja de entrada.',
        data: result,
      });
    } catch (error) {
      logger.error('Error al reenviar email de confirmación', error);
      next(error);
    }
  },

  /**
   * Cierra sesión
   */
  logout: async (req, res, next) => {
    try {
      const accessToken = req.accessToken;

      if (accessToken) {
        await authService.logout(accessToken);
      }

      res.json({
        success: true,
        message: 'Sesión cerrada exitosamente',
      });
    } catch (error) {
      logger.error('Error al cerrar sesión', error);
      next(error);
    }
  },
};

