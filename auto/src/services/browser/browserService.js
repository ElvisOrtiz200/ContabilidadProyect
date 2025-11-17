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
      });

      this.context = await this.browser.newContext({
        acceptDownloads: true,
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

