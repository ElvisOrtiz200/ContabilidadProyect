import { browserService } from '../browser/browserService.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { saveSession, loadSession, wait, calcularRango6MesesDesdeHoy, generarMesesDelRango } from '../../utils/helpers.js';
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

    const rango = calcularRango6MesesDesdeHoy();

    // Navegación dentro del menú
    const resultados =await navigateMenu(page, rango);


    // Parte 2: Segunda sesión
    logger.info('---------------------------------------------------------------');
    logger.info('-----------------------PARTE 2------------------------');
    await sunatLoginSesion2(context, ruc, usuario, clave, rango);


    // Parte 3: Tercera sesión
    logger.info('---------------------------------------------------------------');
    logger.info('-----------------------PARTE 3------------------------');
    await consultaNPSSesion3(context);

    // Mantener sesión abierta
    logger.info('Manteniendo el navegador abierto...');
    await wait(10000);

    console.log(resultados);

    return resultados;

  } catch (error) {
    logger.error('Error en sunatLogin', error);
    throw error;
  } finally {
    // El navegador se mantiene abierto según el código original
    // Si se necesita cerrar, descomentar:
    // if (browser) await browser.close();
  }
}

async function navigateMenu(page, rango) {
  try {
    await page.click(SELECTORS.MENU.CONSULTAS);
    logger.info("Se hizo clic en 'Consultas'");

    await page.click(SELECTORS.MENU.CONSULTAS_PRESENTACION_PAGO);
    logger.info("Se hizo clic en 'Consultas de Presentación y Pago'");

    await page.click(SELECTORS.MENU.CONSULTAS_DECLARACIONES_PAGOS);
    logger.info("Se hizo clic en 'Consultas de Declaraciones y Pagos'");

    const resultados = await handleConsultaDeclaraciones(page, rango);

    return resultados;
    
  } catch (error) {
    logger.error('Error al navegar por el menú', error);
    throw error;
  }
}

async function handleConsultaDeclaraciones(page, rango) {
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

    const resultados = [];
    const meses = generarMesesDelRango(rango);

    for (const periodo of meses) {
      logger.info(`📅 Procesando mes ${periodo.mes}/${periodo.año} ...`);

      // 👉 Seleccionar mes INICIO
      await frame.waitForSelector(SELECTORS.FORMULARIO.PERIODO_TRIBUTARIO_1);
      await frame.selectOption(SELECTORS.FORMULARIO.PERIODO_TRIBUTARIO_1, periodo.mes);

      await frame.waitForSelector(SELECTORS.FORMULARIO.RANGO_PERIODO_INICIO_ANIO);
      await frame.selectOption(SELECTORS.FORMULARIO.RANGO_PERIODO_INICIO_ANIO, periodo.año);

      // 👉 Seleccionar mes FIN (igual al inicio porque es mensual)
      await frame.waitForSelector(SELECTORS.FORMULARIO.PERIODO_TRIBUTARIO_2);
      await frame.selectOption(SELECTORS.FORMULARIO.PERIODO_TRIBUTARIO_2, periodo.mes);

      await frame.waitForSelector(SELECTORS.FORMULARIO.RANGO_PERIODO_FIN_ANIO);
      await frame.selectOption(SELECTORS.FORMULARIO.RANGO_PERIODO_FIN_ANIO, periodo.año);

      logger.info(`✔ Mes seleccionado: ${periodo.mes}/${periodo.año}`);

      // 👉 BOTÓN BUSCAR
      await frame.waitForSelector(SELECTORS.FORMULARIO.BTN_BUSCAR);
      await frame.click(SELECTORS.FORMULARIO.BTN_BUSCAR);

      logger.info('🔍 Se hizo clic en Buscar');

      await wait(2000);

      // LOCALIZADOR del botón Detalle (puede haber varios en DOM)
      const detalleLocator = frame.locator('a[ng-click="mostrarDetalle(constancia);"]');
      const totalDetalles = await detalleLocator.count();

      if (totalDetalles === 0) {
        logger.warn(`No existe el elemento detalle en DOM para ${periodo.mes}/${periodo.año}. Continuando...`);
        break; // o 'break' si quieres terminar todo el proceso
      }

      // Buscar el primer botón que esté realmente VISIBLE
      let botonVisible = null;
      for (let i = 0; i < totalDetalles; i++) {
        const item = detalleLocator.nth(i);
        // isVisible() devuelve true si el elemento está renderizado y visible
        const visible = await item.isVisible().catch(() => false);
        if (visible) {
          botonVisible = item;
          break;
        }
      }

      if (!botonVisible) {
        // El elemento existe en el DOM pero todos están ocultos -> no hay resultado
        logger.warn(`El/los elementos detalle existen pero están ocultos para ${periodo.mes}/${periodo.año}. Continuando...`);
        continue; // pasa al siguiente mes
      }

      // Si llegamos aquí, tenemos un botón visible: hacer click seguro
      try {
        await botonVisible.scrollIntoViewIfNeeded();
        await botonVisible.click({ timeout: 8000 });
        logger.info(`Se hizo clic en Detalle para ${periodo.mes}/${periodo.año}`);
      } catch (err) {
        logger.warn(`No se pudo clicar detalle para ${periodo.mes}/${periodo.año} (se ocultó o no está interactivo).`, { err: err.message });
        continue; // opción segura: seguir con el siguiente mes
      }

      // pequeño wait para que cargue el detalle
      await wait(1000);

      // ahora leer el valor (siempre que el detalle se haya mostrado)
      const valorRenta = await frame.textContent(
        'tr:has-text("Total deuda tributaria") td.text-right.ng-binding:last-child'
      );

      const valorFinal = valorRenta ? valorRenta.trim() : null;

      // puede que valorRenta sea null/undefined si la tabla no apareció
      logger.info(`Total deuda tributaria (${periodo.mes}/${periodo.año}):`, { valor: valorRenta?.trim() ?? 'SIN VALOR' });

      await frame.click('button[ng-click="closeModal()"]');

      // Guardar en array de resultados
      resultados.push({
        mes: periodo.mes,
        año: periodo.año,
        renta: valorFinal,
      });
    }

    return {
      rentas: resultados,
    };

  } catch (error) {
    logger.error('Error al seleccionar mes o año', error);
    throw error;
  }
}

async function navigateMenuSesion2(page2, rango) {
  try {
    await wait(5000);

    const frames = page2.frames();
    logger.debug('FRAMES DETECTADOS:', {
      frames: frames.map(f => ({ name: f.name(), url: f.url() }))
    });

    const frame = frames.find(f => f.name() === SELECTORS.FRAME.IFRAME_VCE);

    if (frame) {

      const textos = [
        "Finalizar",
        "Continuar sin confirmar",
        "Ver más tarde"
      ];

      let hizoAlgo = false;

      for (const texto of textos) {
        console.log(`\n🔍 Buscando botón visible: "${texto}"`);

        // Filtrar botones que realmente sean visibles
        const botonesVisibles = frame.locator(
          `//button[normalize-space(.)="${texto}" and not(contains(@style,"display:none"))]`
        ).filter({ hasText: texto });

        const count = await botonesVisibles.count();
        console.log(`➡️ Botones visibles encontrados: ${count}`);

        if (count > 0) {

          for (let i = 0; i < count; i++) {
            const btn = botonesVisibles.nth(i);

            try {
              console.log(`🟦 Haciendo clic en "${texto}" (#${i + 1})`);
              await btn.waitFor({ state: "visible", timeout: 5000 });
              await btn.click({ timeout: 5000 });

              // esperar a que el DOM cambie antes de buscar otro botón
              await frame.waitForTimeout(1000);
            } catch (err) {
              console.log(`⚠️ No se pudo clicar botón #${i + 1} (probablemente se ocultó).`);
            }
          }

          hizoAlgo = true;
        }
      }

      if (!hizoAlgo) {
        console.log("⚠️ No se encontró ningún botón válido para hacer clic.");
      }
    }

    // Navegación adicional
    await page2.click(SELECTORS.MENU2.DECLARACIONES);
    logger.info("Se hizo clic en 'Mis declaraciones informativas'");

    const li = page2.locator('#nivel2_12_8');
    await li.scrollIntoViewIfNeeded();
    await li.click();

    const li2 = page2.locator('#nivel3_12_8_1');
    await li2.scrollIntoViewIfNeeded();
    await li2.click();

    const li3 = page2.locator('#nivel4_12_8_1_1_2');
    await li3.scrollIntoViewIfNeeded();
    await li3.click();

    await handleSegundaSesion(page2, rango);


  } catch (error) {
    logger.error('Error al navegar por el menú', error);
    throw error;
  }
}

async function sunatLoginSesion2(context, ruc, usuario, clave, rango) {
  try {
    const page2 = await context.newPage();

    await page2.goto(SUNAT_URLS.LOGIN_MENU_SOL_2);

    // Completar formulario
    await page2.fill(SELECTORS.LOGIN.RUC, ruc);
    await page2.fill(SELECTORS.LOGIN.USUARIO, usuario);
    await page2.fill(SELECTORS.LOGIN.CLAVE, clave);
    await page2.click(SELECTORS.LOGIN.BTN_ACEPTAR);

    await navigateMenuSesion2(page2, rango);
    await navegarMenuConsultaNPSSesion3(page2, rango);

  } catch (error) {
    logger.error('Error al iniciar en la sesion 2', error);
    throw error;
  }
}


async function navegarMenuConsultaNPSSesion3(page2) {
  try {

    await wait(5000);

    await page2.click('button.aOpcionInicio');
    logger.info("Clic en botón Ir a Inicio");

    const btnEmpresa = page2.locator('#divOpcionServicio2');
    await btnEmpresa.click();
    logger.info("Clic en botón Empresas");

    // Navegación adicional

    await page2.click(SELECTORS.MENU2.DECLARACIONES);
    logger.info("Se hizo clic en 'Mis declaraciones informativas'");

    const li = page2.locator('#nivel2_12_1');
    await li.scrollIntoViewIfNeeded();
    await li.click();

    const li2 = page2.locator('#nivel3_12_1_1');
    await li2.scrollIntoViewIfNeeded();
    await li2.click();

    const li3 = page2.locator('#nivel4_12_1_1_1_7');
    await li3.scrollIntoViewIfNeeded();
    await li3.click();

  } catch (error) {
    logger.error('Error al iniciar en la sesion 3', error);
    throw error;
  }
}


async function handleSegundaSesion(page2, rango) {
  try {

    await wait(5000);

    const frames = page2.frames();
    logger.debug('FRAMES DETECTADOS:', {
      frames: frames.map(f => ({ name: f.name(), url: f.url() }))
    });

    const frame2 = frames.find(f => f.name() === SELECTORS.FRAME.IFRAME_APPLICATION);

    if (!frame2) {
      console.log("❌ No se encontró el iframe:", SELECTORS.FRAME.IFRAME_APPLICATION);

      console.log("📌 Iframes encontrados:");
      for (const f of frames) console.log(" -", f.name());

      throw new Error("IFRAME_APPLICATION no existe en esta página");
    }

    console.log("➡️ Iframe encontrado:", frame2.name());

    await frame2.waitForSelector('select[name="importepagado"]', { timeout: 10000 });

    await frame2.selectOption('select[name="importepagado"]', '2');

    logger.info("Se seleccionó el importe pagado");

    await frame2.selectOption('select[name="mdesde"]', rango.mesInicio);
    await frame2.selectOption('select[name="adesde"]', rango.añoInicio);
    await frame2.selectOption('select[name="mhasta"]', rango.mesFin);
    await frame2.selectOption('select[name="ahasta"]', rango.añoFin);

    if (frame2) {
      await frame2.click(SELECTORS.FORMULARIO.BTN_BUSCAR);
      logger.info("Clic en botón Buscar realizado correctamente");
    }

  } catch (error) {
    logger.error('Error en segunda sesión', error);
    throw error;
  }
}


