import { chromium } from 'playwright';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

/**
 * Servicio para manejar instancias del navegador
 */
class BrowserService {
  constructor() {
    this.browser = null;
    this.context = null;
  }

  /**
   * Inicializa el navegador
   */
  async launch() {
    try {
      this.browser = await chromium.launch({
        headless: config.browser.headless,
        slowMo: config.browser.slowMo,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
        ],
      });

      this.context = await this.browser.newContext({
        acceptDownloads: true,
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale: 'es-PE',
        timezoneId: 'America/Lima',
        permissions: ['geolocation'],
        extraHTTPHeaders: {
          'Accept-Language': 'es-PE,es;q=0.9,en;q=0.8',
        },
      });

      // Ocultar propiedades que delatan automatización
      await this.context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });
        
        // Ocultar chrome object
        window.chrome = {
          runtime: {},
        };
        
        // Sobrescribir permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );
      });

      logger.info('Navegador iniciado correctamente');
      return { browser: this.browser, context: this.context };
    } catch (error) {
      logger.error('Error al iniciar navegador', error);
      throw error;
    }
  }

  /**
   * Crea una nueva página
   */
  async newPage() {
    if (!this.context) {
      await this.launch();
    }
    return await this.context.newPage();
  }

  /**
   * Cierra el navegador
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      logger.info('Navegador cerrado');
    }
  }

  /**
   * Obtiene el contexto actual
   */
  getContext() {
    return this.context;
  }

  /**
   * Obtiene el navegador actual
   */
  getBrowser() {
    return this.browser;
  }
}

export const browserService = new BrowserService();

