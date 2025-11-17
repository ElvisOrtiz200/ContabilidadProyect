import express from 'express';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { testSupabaseConnection } from './config/supabase.js';
import authRouter from './routes/authRouter.js';
import sunatRouter from './routes/sunatRouter.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { requestLogger } from './middlewares/logger.js';
import { corsMiddleware } from './middlewares/cors.js';

const app = express();

// Middlewares globales
app.use(corsMiddleware); // CORS debe ir primero
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Rutas públicas
app.use('/auth', authRouter);

// Rutas protegidas
app.use('/sunat', sunatRouter);

// Ruta de salud
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.server.env,
  });
});

// Manejo de errores
app.use(notFoundHandler);
app.use(errorHandler);

// Iniciar servidor
const PORT = config.server.port;
app.listen(PORT, async () => {
  logger.info(`Servidor corriendo en puerto ${PORT}`);
  logger.info(`Ambiente: ${config.server.env}`);
  
  // Verificar conexión con Supabase
  if (config.supabase.url) {
    await testSupabaseConnection();
  } else {
    logger.warn('Variables de Supabase no configuradas');
  }
});

export default app;
