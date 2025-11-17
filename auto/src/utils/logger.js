import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/index.js';

/**
 * Logger simple para la aplicación
 */
class Logger {
  constructor() {
    this.logDir = config.paths.logs;
    this.ensureLogDirectory();
  }

  async ensureLogDirectory() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Error al crear directorio de logs:', error);
    }
  }

  getLogFileName() {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `app-${date}.log`);
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data && { data }),
    };
    return JSON.stringify(logEntry);
  }

  async writeToFile(message) {
    try {
      const logFile = this.getLogFileName();
      await fs.appendFile(logFile, message + '\n');
    } catch (error) {
      console.error('Error al escribir en archivo de log:', error);
    }
  }

  info(message, data = null) {
    const logMessage = this.formatMessage('INFO', message, data);
    console.log(`[INFO] ${message}`, data || '');
    this.writeToFile(logMessage);
  }

  error(message, error = null) {
    const logMessage = this.formatMessage('ERROR', message, {
      error: error?.message,
      stack: error?.stack,
    });
    console.error(`[ERROR] ${message}`, error || '');
    this.writeToFile(logMessage);
  }

  warn(message, data = null) {
    const logMessage = this.formatMessage('WARN', message, data);
    console.warn(`[WARN] ${message}`, data || '');
    this.writeToFile(logMessage);
  }

  debug(message, data = null) {
    if (config.server.env === 'development') {
      const logMessage = this.formatMessage('DEBUG', message, data);
      console.debug(`[DEBUG] ${message}`, data || '');
      this.writeToFile(logMessage);
    }
  }
}

export const logger = new Logger();

