import cors from 'cors';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * Configuración de CORS para permitir peticiones del frontend
 */
const corsOptions = {
  origin: function (origin, callback) {
    // En desarrollo, permitir cualquier origen
    if (config.server.env === 'development') {
      callback(null, true);
      return;
    }

    // En producción, verificar orígenes permitidos
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'];

    // Permitir requests sin origen (Postman, mobile apps, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn('Intento de acceso desde origen no permitido', { origin });
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true, // Permitir cookies y headers de autenticación
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization'], // Headers que el frontend puede leer
};

export const corsMiddleware = cors(corsOptions);

