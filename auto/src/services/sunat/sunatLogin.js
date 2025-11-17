import { browserService } from '../browser/browserService.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { saveSession, loadSession, wait } from '../../utils/helpers.js';
import { SUNAT_URLS, SELECTORS, TIMEOUTS } from '../../config/constants.js';

/**
 * Servicio para realizar login en SUNAT
 */
export async function sunatLogin(ruc, usuario, clave) {
  let browser = null;
  let context = null;

  try {
    // Inicializar navegador
    const browserInstance = await browserService.launch();
    browser = browserInstance.browser;
    context = browserInstance.context;

    const page = await context.newPage();

    // Ir a la página de login
    logger.info('Navegando a página de login de SUNAT');
    await page.goto(SUNAT_URLS.LOGIN_MENU_SOL);

    // Completar formulario
    await page.fill(SELECTORS.LOGIN.RUC, ruc);
    await page.fill(SELECTORS.LOGIN.USUARIO, usuario);
    await page.fill(SELECTORS.LOGIN.CLAVE, clave);
    await page.click(SELECTORS.LOGIN.BTN_ACEPTAR);

    // Esperar redirección o validación de login
    await wait(TIMEOUTS.PAGE_LOAD);

    // Guardar cookies después del login
    const cookies = await context.cookies();
    await saveSession(cookies);
    logger.info('Sesión guardada en session.json');

    // Verificar sesión activa
    if (page.url().includes(SUNAT_URLS.E_MENU)) {
      logger.info('Inicio de sesión exitoso');
    } else {
      logger.warn('No se detectó inicio de sesión. URL actual:', { url: page.url() });
    }

    // Restaurar cookies guardadas (si existen)
    const savedCookies = await loadSession();
    if (savedCookies) {
      await context.addCookies(savedCookies);
      logger.info('Cookies restauradas correctamente');
    }

    // Navegación dentro del menú
    await navigateMenu(page, context, ruc, usuario, clave);

    // Mantener sesión abierta
    logger.info('Manteniendo el navegador abierto...');
    await wait(10000);

  } catch (error) {
    logger.error('Error en sunatLogin', error);
    throw error;
  } finally {
    // El navegador se mantiene abierto según el código original
    // Si se necesita cerrar, descomentar:
    // if (browser) await browser.close();
  }
}

/**
 * Navega por el menú de SUNAT
 */
async function navigateMenu(page, context, ruc, usuario, clave) {
  try {
    await page.click(SELECTORS.MENU.CONSULTAS);
    logger.info("Se hizo clic en 'Consultas'");

    await page.click(SELECTORS.MENU.CONSULTAS_PRESENTACION_PAGO);
    logger.info("Se hizo clic en 'Consultas de Presentación y Pago'");

    await page.click(SELECTORS.MENU.CONSULTAS_DECLARACIONES_PAGOS);
    logger.info("Se hizo clic en 'Consultas de Declaraciones y Pagos'");

    await handleConsultaDeclaraciones(page);

    // Parte 2: Segunda sesión
    logger.info('---------------------------------------------------------------');
    logger.info('-----------------------PARTE 2------------------------');
    await handleSegundaSesion(context, ruc, usuario, clave);

  } catch (error) {
    logger.error('Error al navegar por el menú', error);
    throw error;
  }
}

/**
 * Maneja la consulta de declaraciones
 */
async function handleConsultaDeclaraciones(page) {
  try {
    await wait(5000);

    // Buscar frame
    const frames = page.frames();
    logger.debug('FRAMES DETECTADOS:', { 
      frames: frames.map(f => ({ name: f.name(), url: f.url() }))
    });

    const frame = frames.find(
      f => f.name() === SELECTORS.FRAME.IFRAME_APPLICATION || 
           f.url().includes('consultaDeclaracionInternetprincipal')
    );

    if (!frame) {
      throw new Error('No se encontró el iframe esperado.');
    }

    logger.info('Frame encontrado:', { name: frame.name(), url: frame.url() });

    // Formulario
    await frame.click('#s2id_numFormulario .select2-search-choice-close');
    logger.info('Se eliminó la etiqueta Todos');

    await frame.click('#s2id_numFormulario .select2-input');
    await frame.fill('#s2id_numFormulario .select2-input', 'IGV');
    await frame.click('.select2-results li:has-text("IGV")');
    await frame.click('body', { position: { x: 5, y: 5 } });
    logger.info('Se seleccionó la etiqueta de IGV');

    // Fecha
    const mesInicio = '02';
    const añoInicio = '2025';
    const mesFin = '02';
    const añoFin = '2025';

    logger.info(`Seleccionando mes ${mesInicio} y año ${añoInicio}`);

    await frame.waitForSelector(SELECTORS.FORMULARIO.PERIODO_TRIBUTARIO_1, { 
      timeout: TIMEOUTS.ELEMENT_WAIT 
    });
    await frame.selectOption(SELECTORS.FORMULARIO.PERIODO_TRIBUTARIO_1, mesInicio);
    
    await frame.waitForSelector(SELECTORS.FORMULARIO.RANGO_PERIODO_INICIO_ANIO, { 
      timeout: TIMEOUTS.ELEMENT_WAIT 
    });
    await frame.selectOption(SELECTORS.FORMULARIO.RANGO_PERIODO_INICIO_ANIO, añoInicio);

    await frame.waitForSelector(SELECTORS.FORMULARIO.PERIODO_TRIBUTARIO_2, { 
      timeout: TIMEOUTS.ELEMENT_WAIT 
    });
    await frame.selectOption(SELECTORS.FORMULARIO.PERIODO_TRIBUTARIO_2, mesFin);
    
    await frame.waitForSelector(SELECTORS.FORMULARIO.RANGO_PERIODO_FIN_ANIO, { 
      timeout: TIMEOUTS.ELEMENT_WAIT 
    });
    await frame.selectOption(SELECTORS.FORMULARIO.RANGO_PERIODO_FIN_ANIO, añoFin);

    logger.info('Mes y año seleccionados correctamente');

    await frame.waitForSelector(SELECTORS.FORMULARIO.BTN_BUSCAR, { 
      timeout: TIMEOUTS.ELEMENT_WAIT 
    });
    await frame.click(SELECTORS.FORMULARIO.BTN_BUSCAR);
    logger.info('Clic en botón Buscar realizado correctamente');

    await wait(2000);

    await frame.click('a[ng-click="mostrarDetalle(constancia);"]');
    logger.info('Se hizo clic en el Detalle');

    await wait(1000);

    const valorRenta = await frame.textContent(
      'tr:has-text("Total deuda tributaria") td.text-right.ng-binding:last-child'
    );

    logger.info('Total deuda tributaria (Renta):', { valor: valorRenta?.trim() });

  } catch (error) {
    logger.error('Error al seleccionar mes o año', error);
    throw error;
  }
}

/**
 * Maneja la segunda sesión de SUNAT
 */
async function handleSegundaSesion(context, ruc, usuario, clave) {
  const page2 = await context.newPage();

  try {
    await page2.goto(SUNAT_URLS.LOGIN_MENU_SOL_2);

    // Completar formulario
    await page2.fill(SELECTORS.LOGIN.RUC, ruc);
    await page2.fill(SELECTORS.LOGIN.USUARIO, usuario);
    await page2.fill(SELECTORS.LOGIN.CLAVE, clave);
    await page2.click(SELECTORS.LOGIN.BTN_ACEPTAR);

    await wait(5000);

    const frames = page2.frames();
    logger.debug('FRAMES DETECTADOS:', { 
      frames: frames.map(f => ({ name: f.name(), url: f.url() }))
    });

    const frame = frames.find(f => f.name() === SELECTORS.FRAME.IFRAME_VCE);

    if (frame) {
      await frame.waitForSelector('button:has-text("Finalizar")', { timeout: 5000 });
      await frame.click("text=Finalizar");
      logger.info("Se hizo clic en 'Finalizar'");

      await frame.waitForSelector('button:has-text("Continuar sin confirmar")', { timeout: 5000 });
      await frame.click("text=Continuar sin confirmar");
      logger.info("Se hizo clic en 'Continuar sin confirmar'");
    }

    // Navegación adicional
    await page2.click("text=Mis declaraciones informativas");
    logger.info("Se hizo clic en 'Mis declaraciones informativas'");

    await page2.click("text=Consulto mis declaraciones y pagos");
    logger.info("Se hizo clic en 'Consulto mis declaraciones y pagos'");

    await page2.click("text=Declaraciones y pagos");
    logger.info("Se hizo clic en 'Declaraciones y pagos'");

    await page2.click("text=Consulta general");
    logger.info("Se hizo clic en 'Consulta general'");

    await page2.selectOption('select[name="importepagado"]', '2');
    logger.info("Se seleccionó el importe pagado");

    // Fecha (PERIODO TRIBUTARIO)
    const mesDesde = '02';
    const añoDesde = '2025';
    const mesHasta = '02';
    const añoHasta = '2025';

    await page2.selectOption('select[name="mdesde"]', mesDesde);
    await page2.selectOption('select[name="adesde"]', añoDesde);
    await page2.selectOption('select[name="mhasta"]', mesHasta);
    await page2.selectOption('select[name="ahasta"]', añoHasta);

    if (frame) {
      await frame.click(SELECTORS.FORMULARIO.BTN_BUSCAR);
      logger.info("Clic en botón Buscar realizado correctamente");
    }

    await page2.click('button.aOpcionInicio');
    logger.info("Clic en botón Ir a Inicio");

    // Navegación adicional
    await page2.click("text=Mis declaraciones informativas");
    logger.info("Se hizo clic en 'Mis declaraciones informativas'");

    await page2.click("text=Presento mis declaraciones y pagos");
    logger.info("Se hizo clic en 'Presento mis declaraciones y pagos'");

    await page2.click("text=Declarativas");
    logger.info("Se hizo clic en 'Declarativas'");

    await page2.click("text=Consulta de NPS");
    logger.info("Se hizo clic en 'Consulta de NPS'");

  } catch (error) {
    logger.error('Error en segunda sesión', error);
    throw error;
  }
}
