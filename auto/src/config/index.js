import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Configuración del servidor
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
  },

  // Configuración de SUNAT
  sunat: {
    ruc: process.env.SUNAT_RUC,
    usuario: process.env.SUNAT_USER,
    clave: process.env.SUNAT_PASS,
    loginUrl: process.env.SUNAT_LOGIN_URL || 'https://api-seguridad.sunat.gob.pe/v1/clientessol/59d39217-c025-4de5-b342-393b0f4630ab/oauth2/loginMenuSol',
  },

  // Configuración de Playwright
  browser: {
    headless: process.env.BROWSER_HEADLESS === 'true' || false,
    slowMo: parseInt(process.env.BROWSER_SLOW_MO) || 500,
    timeout: parseInt(process.env.BROWSER_TIMEOUT) || 30000,
  },

  // Rutas de archivos
  paths: {
    downloads: './descargas',
    session: './session.json',
    logs: './logs',
  },

  // Configuración de Supabase
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  // Configuración de JWT
  jwt: {
    secret: process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // Configuración de CORS
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
  },
};

