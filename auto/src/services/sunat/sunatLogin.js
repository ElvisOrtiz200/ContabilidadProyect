import { browserService } from '../browser/browserService.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { saveSession, loadSession, wait, calcularRango6MesesDesdeHoy, generarMesesDelRango, obtenerTablaCompleta, extraerColumnas } from '../../utils/helpers.js';
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
    const resultados = await navigateMenu(page, rango);


    // Parte 2: Segunda sesión
    logger.info('---------------------------------------------------------------');
    logger.info('-----------------------PARTE 2------------------------');
    const resulImporte = await sunatLoginSesion2(context, ruc, usuario, clave, rango);

    // Mantener sesión abierta
    logger.info('Manteniendo el navegador abierto...');
    await wait(10000);

    console.log(resultados);

    return {
      rentas: resultados,
      importePagado: resulImporte.importe,
      nps: resulImporte.nps,
      tributos: resulImporte.tributos || []
    };


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

    return resultados;

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

    const resulImporte = await handleSegundaSesion(page2, rango);

    return resulImporte;

  } catch (error) {
    logger.error('Error al navegar por el menú', error);
    throw error;
  }
}

/**
 * Normaliza una fecha extrayendo solo DD/MM/YYYY (sin hora)
 */
function normalizarFechaServicio(fecha) {
  if (!fecha) return null;
  const fechaParte = fecha.split(' ')[0];
  return fechaParte.trim();
}

/**
 * Normaliza un importe removiendo "S/." y espacios
 */
function normalizarImporteServicio(importe) {
  if (!importe) return null;
  return importe
    .replace(/S\/\./g, '')
    .replace(/\s/g, '')
    .trim();
}

/**
 * Calcula coincidencias entre importes y NPS
 */
function calcularCoincidenciasServicio(importes, nps) {
  const coincidencias = [];

  if (!importes || !nps || !Array.isArray(importes) || !Array.isArray(nps)) {
    return coincidencias;
  }

  for (const itemImporte of importes) {
    const fechaImporte = normalizarFechaServicio(itemImporte.fechaPres);
    const importeNormalizado = normalizarImporteServicio(itemImporte.importe);

    if (!fechaImporte || !importeNormalizado) continue;

    for (const itemNps of nps) {
      const fechaNps = normalizarFechaServicio(itemNps.fechaPres);
      const importeNpsNormalizado = normalizarImporteServicio(itemNps.importe);

      if (!fechaNps || !importeNpsNormalizado) continue;

      if (fechaImporte === fechaNps && importeNormalizado === importeNpsNormalizado) {
        coincidencias.push({
          fechaPres: fechaImporte,
          importe: {
            fechaPres: itemImporte.fechaPres,
            importe: itemImporte.importe
          },
          nps: {
            fechaPres: itemNps.fechaPres,
            importe: itemNps.importe
          }
        });
        break;
      }
    }
  }

  return coincidencias;
}

/**
 * Extrae los tributos, periodos y montos de la página del NPS
 */
async function extraerTributosYMontos(page2) {
  try {
    await wait(2000); // Esperar a que cargue completamente
    
    const frames = page2.frames();
    const frame = frames.find(f => f.name() === SELECTORS.FRAME.IFRAME_APPLICATION);
    
    if (!frame) {
      logger.warn('⚠️ No se encontró el frame para extraer tributos');
      return [];
    }

    await frame.waitForSelector("table", { timeout: 10000 });

    // Buscar todas las tablas que contengan información de tributos
    const tributos = await frame.$$eval("table", tables => {
      const resultados = [];
      
      for (const table of tables) {
        // Buscar encabezados para identificar la estructura
        const headers = table.querySelectorAll("thead tr th, tbody tr:first-child th");
        const headerTexts = Array.from(headers).map(h => h.textContent?.trim().toLowerCase() || '');
        
        const rows = table.querySelectorAll("tbody tr");
        
        for (const row of rows) {
          const cells = row.querySelectorAll("td");
          
          if (cells.length === 0) continue; // Saltar filas sin celdas
          
          // Intentar identificar columnas por encabezados
          let periodoIdx = -1;
          let tributoIdx = -1;
          let montoIdx = -1;
          
          // Buscar índices de columnas por texto de encabezado
          headerTexts.forEach((text, idx) => {
            if (text.includes('periodo') || text.includes('período')) periodoIdx = idx;
            if (text.includes('tributo') || text.includes('concepto') || text.includes('descripción')) tributoIdx = idx;
            if (text.includes('monto') || text.includes('importe') || text.includes('total')) montoIdx = idx;
          });
          
          // Si no se encontraron encabezados, intentar por posición común
          if (periodoIdx === -1 && tributoIdx === -1 && montoIdx === -1) {
            // Estructura común: Periodo (0) | Tributo (1) | Monto (2)
            if (cells.length >= 3) {
              periodoIdx = 0;
              tributoIdx = 2;
              montoIdx = 5;
            } else if (cells.length === 2) {
              tributoIdx = 0;
              montoIdx = 1;
            }
          }
          
          // Extraer valores
          let periodo = null;
          let tributo = null;
          let monto = null;
          
          if (periodoIdx >= 0 && cells[periodoIdx]) {
            periodo = cells[periodoIdx].textContent?.trim() || null;
          }
          
          if (tributoIdx >= 0 && cells[tributoIdx]) {
            tributo = cells[tributoIdx].textContent?.trim() || null;
          }
          
          if (montoIdx >= 0 && cells[montoIdx]) {
            monto = cells[montoIdx].textContent?.trim() || null;
          }
          
          // Si no se encontró por índices, intentar por contenido
          if (!tributo || !monto) {
            // Buscar cualquier celda que parezca un monto
            for (let i = 0; i < cells.length; i++) {
              const text = cells[i].textContent?.trim() || '';
              if (text.includes("S/.") || (text.match(/\d/) && text.match(/[,.]/))) {
                if (!monto) monto = text;
                // La celda anterior probablemente sea el tributo
                if (i > 0 && !tributo) {
                  tributo = cells[i - 1].textContent?.trim() || null;
                }
                // La celda antes del tributo puede ser el periodo
                if (i > 1 && !periodo) {
                  const posiblePeriodo = cells[i - 2].textContent?.trim() || '';
                  if (posiblePeriodo.includes('/') || posiblePeriodo.match(/\d{4}/)) {
                    periodo = posiblePeriodo;
                  }
                }
                break;
              }
            }
          }
          
          // Validar y agregar si tiene tributo y monto
          if (tributo && monto && (monto.includes("S/.") || monto.match(/\d/))) {
            // Limpiar periodo si no es válido
            if (periodo && !periodo.includes('/') && !periodo.match(/\d{4}/)) {
              periodo = null;
            }
            
            resultados.push({
              periodo: periodo || null,
              tributo: tributo,
              monto: monto
            });
          }
        }
      }
      
      return resultados;
    });

    // Filtrar duplicados basándose en periodo, tributo y monto
    const tributosUnicos = [];
    const vistos = new Set();
    
    for (const tributo of tributos) {
      const clave = `${tributo.periodo || 'null'}-${tributo.tributo}-${tributo.monto}`;
      if (!vistos.has(clave)) {
        vistos.add(clave);
        tributosUnicos.push(tributo);
      }
    }
    
    logger.info(`📊 Extraídos ${tributos.length} tributos de la página NPS (${tributosUnicos.length} únicos después de filtrar duplicados)`);
    if (tributosUnicos.length > 0) {
      logger.info(`📋 Ejemplo de tributo extraído:`, tributosUnicos[0]);
    }
    return tributosUnicos;

  } catch (error) {
    logger.error('Error al extraer tributos y montos:', error);
    return [];
  }
}

/**
 * Busca y hace click en los NPS que coinciden con los importes
 * Procesa cada coincidencia una por una, extrae tributos y regresa
 */
async function hacerClickEnNPSCoincidentes(page2, frame, coincidencias) {
  const todosLosTributos = [];
  
  try {
    if (!coincidencias || coincidencias.length === 0) {
      logger.info('No hay coincidencias para hacer click');
      return todosLosTributos;
    }

    logger.info(`🔍 Procesando ${coincidencias.length} coincidencias en la tabla NPS...`);
    logger.info(`📋 Lista de coincidencias a procesar:`, coincidencias.map((c, idx) => `${idx + 1}. Monto: ${c.nps.importe}`));

    // Procesar cada coincidencia una por una
    for (let i = 0; i < coincidencias.length; i++) {
      const coincidencia = coincidencias[i];
      const montoBuscado = normalizarImporteServicio(coincidencia.nps.importe);
      
      logger.info(`\n📋 ========================================`);
      logger.info(`📋 Procesando coincidencia ${i + 1}/${coincidencias.length}: Monto ${coincidencia.nps.importe}`);
      logger.info(`📋 ========================================`);

      try {
        // Esperar un momento antes de buscar el frame (especialmente después del primer regreso)
        if (i > 0) {
          logger.info(`⏳ Esperando antes de buscar tabla para coincidencia ${i + 1}...`);
          await wait(3000); // Esperar más tiempo después de regresar
        }
        
        // Obtener el frame actualizado después de cada regreso
        let frameActual = null;
        let intentos = 0;
        const maxIntentos = 5;
        
        while (!frameActual && intentos < maxIntentos) {
          const frames = page2.frames();
          frameActual = frames.find(f => f.name() === SELECTORS.FRAME.IFRAME_APPLICATION);
          
          if (!frameActual) {
            intentos++;
            logger.warn(`⚠️ Intento ${intentos}/${maxIntentos}: No se encontró el frame, esperando...`);
            await wait(2000);
          }
        }
        
        if (!frameActual) {
          logger.error('❌ No se encontró el frame después de múltiples intentos');
          continue;
        }
        
        logger.info(`✅ Frame encontrado, esperando a que la tabla esté disponible...`);
        // Esperar a que la tabla esté disponible y recargada
        await frameActual.waitForSelector("table tbody tr", { timeout: 15000 });
        await wait(2000); // Esperar adicional para asegurar que la tabla esté completamente cargada
        logger.info(`✅ Tabla disponible, buscando coincidencia...`);

        // Buscar la tabla que contiene "NPS" en su texto
        logger.info(`🔍 Buscando tabla de NPS...`);
        const todasLasTablas = await frameActual.$$("table");
        logger.info(`📊 Encontradas ${todasLasTablas.length} tablas en el frame`);
        
        let tablaNPSIndex = -1;
        
        for (let j = 0; j < todasLasTablas.length; j++) {
          const texto = await todasLasTablas[j].textContent();
          if (texto && texto.includes("NPS") && texto.includes("Monto")) {
            tablaNPSIndex = j;
            logger.info(`✅ Tabla de NPS encontrada en índice ${j}`);
            break;
          }
        }

        if (tablaNPSIndex === -1) {
          logger.error('❌ No se encontró la tabla de NPS después de buscar en todas las tablas');
          // Intentar buscar de otra manera
          logger.info(`🔍 Intentando búsqueda alternativa de tabla NPS...`);
          const tablaAlternativa = await frameActual.$('table:has-text("NPS")');
          if (tablaAlternativa) {
            logger.info(`✅ Tabla encontrada con método alternativo`);
          } else {
            logger.error('❌ No se pudo encontrar la tabla de NPS con ningún método');
            continue;
          }
        }

        // Obtener todas las filas de la tabla NPS (obtenerlas de nuevo para asegurar que estén actualizadas)
        const tablaNPS = todasLasTablas[tablaNPSIndex];
        const filas = await tablaNPS.$$("tbody tr");
        logger.info(`📊 Encontradas ${filas.length} filas en la tabla NPS`);

        let encontrado = false;

        for (const fila of filas) {
          try {
            // Obtener las celdas de la fila
            const celdas = await fila.$$("td");
            
            if (celdas.length < 4) continue;

            // Obtener el monto de la columna 4 (índice 3) - columna "Monto"
            const montoCelda = celdas[3];
            const montoTexto = await montoCelda.textContent();
            const montoNormalizado = normalizarImporteServicio(montoTexto);

            if (!montoNormalizado) continue;

            // Verificar si este monto coincide con la coincidencia actual
            if (montoNormalizado === montoBuscado) {
              logger.info(`✅ Encontrada fila con monto coincidente: ${montoTexto} (buscado: ${montoBuscado})`);
              // Obtener el link de NPS de la primera columna (índice 0)
              const celdaNPS = celdas[0];
              const linkNPS = await celdaNPS.$("a");
              
              if (linkNPS) {
                const numeroNPS = await linkNPS.textContent();
                logger.info(`✅ Coincidencia encontrada! Haciendo click en NPS: ${numeroNPS?.trim()} - Monto: ${montoTexto}`);
                
                // Verificar si este NPS ya fue procesado (para evitar duplicados)
                const yaProcesado = todosLosTributos.some(t => t.numeroNPS === numeroNPS?.trim());
                if (yaProcesado) {
                  logger.warn(`⚠️ Este NPS (${numeroNPS?.trim()}) ya fue procesado, saltando...`);
                  encontrado = true;
                  break;
                }
                
                try {
                  await linkNPS.scrollIntoViewIfNeeded();
                  await linkNPS.click({ timeout: 5000 });
                  await wait(4000); // Esperar a que cargue la página del NPS
                  logger.info(`✅ Click realizado exitosamente en NPS: ${numeroNPS?.trim()}`);
                  
                  // Extraer tributos y montos de la página del NPS
                  logger.info(`📊 Extrayendo tributos y montos del NPS: ${numeroNPS?.trim()}`);
                  const tributos = await extraerTributosYMontos(page2);
                  
                  if (tributos.length > 0) {
                    todosLosTributos.push({
                      numeroNPS: numeroNPS?.trim(),
                      monto: montoTexto,
                      tributos: tributos
                    });
                    logger.info(`✅ Extraídos ${tributos.length} tributos del NPS: ${numeroNPS?.trim()}`);
                  } else {
                    logger.warn(`⚠️ No se encontraron tributos en el NPS: ${numeroNPS?.trim()}`);
                    // Agregar entrada vacía para mantener el registro
                    todosLosTributos.push({
                      numeroNPS: numeroNPS?.trim(),
                      monto: montoTexto,
                      tributos: []
                    });
                  }
                  
                  encontrado = true;
                  
                  // Regresar usando page2.goBack() - Método más confiable que simula la flecha de atrás
                  logger.info(`⬅️ ========================================`);
                  logger.info(`⬅️ INICIANDO PROCESO DE REGRESO`);
                  logger.info(`⬅️ ========================================`);
                  
                  // Esperar un momento después de extraer tributos
                  await wait(2000);
                  
                  let regresoExitoso = false;
                  
                  // Método 1: Usar page2.goBack() - Simula la flecha de atrás del navegador (MÁS CONFIABLE)
                  try {
                    logger.info(`🔍 Método 1: Regresando usando page2.goBack() (simula flecha de atrás)...`);
                    await page2.goBack();
                    await wait(5000); // Esperar a que regrese completamente
                    logger.info(`✅ Regresado usando page2.goBack()`);
                    regresoExitoso = true;
                  } catch (goBackError) {
                    logger.warn(`⚠️ page2.goBack() falló: ${goBackError.message}, intentando método alternativo...`);
                  }
                  
                  // Método 2: Ejecutar history.go(-1) en la página principal (fallback)
                  if (!regresoExitoso) {
                    try {
                      logger.info('🔍 Método 2: Ejecutando history.go(-1) en página principal...');
                      await page2.evaluate(() => {
                        if (window.history && window.history.go) {
                          window.history.go(-1);
                        }
                      });
                      await wait(5000);
                      logger.info(`✅ Regresado usando history.go(-1) en página`);
                      regresoExitoso = true;
                    } catch (historyError) {
                      logger.warn('⚠️ Error con history.go(-1) en página:', historyError.message);
                    }
                  }
                  
                  // Método 3: Ejecutar history.go(-1) en el frame (fallback adicional)
                  if (!regresoExitoso) {
                    try {
                      logger.info('🔍 Método 3: Ejecutando history.go(-1) en el frame...');
                      const framesDespues = page2.frames();
                      const frameDespues = framesDespues.find(f => f.name() === SELECTORS.FRAME.IFRAME_APPLICATION);
                      
                      if (frameDespues) {
                        await frameDespues.evaluate(() => {
                          if (window.history && window.history.go) {
                            window.history.go(-1);
                          }
                        });
                        await wait(5000);
                        logger.info(`✅ Regresado usando history.go(-1) en frame`);
                        regresoExitoso = true;
                      }
                    } catch (historyError) {
                      logger.warn('⚠️ Error con history.go(-1) en frame:', historyError.message);
                    }
                  }
                  
                  if (regresoExitoso) {
                    logger.info(`✅ Regresado a la tabla. Esperando a que se recargue completamente...`);
                    // Esperar más tiempo para asegurar que la tabla se haya recargado completamente
                    await wait(4000);
                    
                    // Verificar que estamos de vuelta en la tabla
                    const framesVerificacion = page2.frames();
                    const frameVerificacion = framesVerificacion.find(f => f.name() === SELECTORS.FRAME.IFRAME_APPLICATION);
                    if (frameVerificacion) {
                      try {
                        await frameVerificacion.waitForSelector("table tbody tr", { timeout: 15000 });
                        logger.info(`✅ Tabla recargada correctamente`);
                      } catch (waitError) {
                        logger.warn('⚠️ La tabla no se recargó correctamente:', waitError.message);
                      }
                    } else {
                      logger.warn('⚠️ No se encontró el frame después de regresar');
                    }
                  } else {
                    logger.error('❌ ERROR CRÍTICO: No se pudo regresar con ningún método');
                  }
                  
                  logger.info(`⬅️ ========================================`);
                  logger.info(`⬅️ PROCESO DE REGRESO COMPLETADO`);
                  logger.info(`⬅️ ========================================`);
                  logger.info(`✅ Continuando con siguiente coincidencia...`);
                  
                  break; // Salir del loop de filas para procesar la siguiente coincidencia
                } catch (clickError) {
                  logger.warn(`⚠️ Error al hacer click en NPS ${numeroNPS?.trim()}:`, clickError.message);
                  // Intentar regresar aunque haya error usando page2.goBack()
                  try {
                    logger.info(`⬅️ Intentando regresar después del error...`);
                    await page2.goBack();
                    await wait(3000);
                    logger.info(`✅ Regresado después del error`);
                  } catch (backError) {
                    logger.warn('⚠️ Error al regresar:', backError.message);
                  }
                }
              } else {
                logger.warn(`⚠️ No se encontró el link de NPS para el monto: ${montoTexto}`);
              }
            }
          } catch (error) {
            logger.warn('Error al procesar fila de tabla:', error.message);
            continue;
          }
        }

        if (!encontrado) {
          logger.warn(`⚠️ No se encontró el NPS con monto ${coincidencia.nps.importe} en la tabla`);
          // Agregar entrada vacía para mantener el registro
          todosLosTributos.push({
            numeroNPS: null,
            monto: coincidencia.nps.importe,
            tributos: []
          });
        } else {
          logger.info(`✅ Coincidencia ${i + 1} procesada exitosamente`);
        }

      } catch (error) {
        logger.error(`❌ Error al procesar coincidencia ${i + 1}:`, error.message);
        logger.error(`❌ Stack trace:`, error.stack);
        
        // Intentar regresar aunque haya error para no bloquear las siguientes coincidencias
        try {
          await wait(1000);
          logger.info(`⬅️ Intentando regresar después del error usando page2.goBack()...`);
          await page2.goBack();
          await wait(3000);
          logger.info(`✅ Regresado después del error. Continuando con siguiente coincidencia...`);
        } catch (backError) {
          logger.warn('⚠️ Error al regresar después del error:', backError.message);
        }
        
        // Agregar entrada vacía para mantener el registro de esta coincidencia
        todosLosTributos.push({
          numeroNPS: null,
          monto: coincidencia.nps.importe,
          tributos: [],
          error: error.message
        });
        
        continue; // Continuar con la siguiente coincidencia
      }
    }
    
    logger.info(`\n✅ ========================================`);
    logger.info(`✅ Proceso completado. Total de coincidencias procesadas: ${todosLosTributos.length}/${coincidencias.length}`);
    logger.info(`✅ ========================================`);

    logger.info(`\n✅ Proceso completado. Se procesaron ${coincidencias.length} coincidencias. Total de tributos extraídos: ${todosLosTributos.length}`);
    return todosLosTributos;

  } catch (error) {
    logger.error('Error al hacer click en NPS coincidentes:', error);
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

    const resulImporte = await navigateMenuSesion2(page2, rango);
    const resulNPS = await navegarMenuConsultaNPSSesion3(page2, rango, resulImporte);

    return {
      importe: resulImporte,
      nps: resulNPS.nps || resulNPS,
      tributos: resulNPS.tributos || []
    };

  } catch (error) {
    logger.error('Error al iniciar en la sesion 2', error);
    throw error;
  }
}


async function navegarMenuConsultaNPSSesion3(page2, rango, resulImporte = []) {
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

    // Parte 3: Tercera sesión
    logger.info('---------------------------------------------------------------');
    logger.info('-----------------------PARTE 3------------------------');
    
    // Primero obtener los NPS
    const resulNPS = await consultaNPSSesion3(page2);
    
    // Calcular coincidencias
    const coincidencias = calcularCoincidenciasServicio(resulImporte, resulNPS);
    
    // Si hay coincidencias, hacer click en los NPS correspondientes y extraer tributos
    let tributosExtraidos = [];
    if (coincidencias.length > 0) {
      logger.info(`🔍 Encontradas ${coincidencias.length} coincidencias, haciendo click en NPS...`);
      const frames = page2.frames();
      const frame = frames.find(f => f.name() === SELECTORS.FRAME.IFRAME_APPLICATION);
      
      if (frame) {
        tributosExtraidos = await hacerClickEnNPSCoincidentes(page2, frame, coincidencias);
      } else {
        logger.warn('⚠️ No se encontró el frame para hacer click en NPS');
      }
    } else {
      logger.info('ℹ️ No se encontraron coincidencias para hacer click');
    }

    return {
      nps: resulNPS,
      tributos: tributosExtraidos
    };

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

    const resultados = [];

    if (frame2) {
      await frame2.click(SELECTORS.FORMULARIO.BTN_BUSCAR);
      logger.info("Clic en botón Buscar realizado correctamente");

      await frame2.waitForSelector("#tblDetalleDeclPagos tbody tr", { timeout: 15000 });


      const tabla = await obtenerTablaCompleta(frame2, "#tblDetalleDeclPagos");

      const columnas = extraerColumnas(tabla, [5, 9]); // indices de fecha e importe

      for (const fila of columnas) {
        resultados.push({
          fechaPres: fila[0], // primera columna
          importe: fila[1],   // segunda columna
        });
      }
    }

    return resultados;

  } catch (error) {
    logger.error('Error en segunda sesión', error);
    throw error;
  }
}

async function consultaNPSSesion3(page2) {
  try {
    await wait(5000);

    const frames = page2.frames();
    logger.debug('FRAMES DETECTADOS:', {
      frames: frames.map(f => ({ name: f.name(), url: f.url() }))
    });

    const frame = frames.find(f => f.name() === SELECTORS.FRAME.IFRAME_APPLICATION);

    if (frame) {

      // const tablas = await frame.$$eval("table", tables =>
      //   tables.map((t, i) => ({
      //     index: i,
      //     rows: t.querySelectorAll("tr").length,
      //     html: t.outerHTML.substring(0, 150) // preview
      //   }))
      // );

      // console.log("📌 Tablas encontradas:", tablas);

      await frame.waitForSelector("table tbody tr", { timeout: 15000 });

      const tabla = await frame.$$eval("table", tables => {
        const t = tables.find(tbl => tbl.innerText.includes("NPS"));
        if (!t) return [];

        return [...t.querySelectorAll("tbody tr")].map(row =>
          [...row.querySelectorAll("td")].map(td => td.innerText.trim())
        );
      });

      const columnas = extraerColumnas(tabla, [1, 3]); // indices de fecha e importe

      const filasUtiles = columnas.filter(fila => {
        const fecha = fila[0];
        const monto = fila[1];

        return (
          fecha &&
          monto &&
          fecha.includes("/") &&       // debe parecer una fecha
          monto.includes("S/.")        // debe ser un monto válido
        );
      });

      const resultados = filasUtiles.map(fila => ({
        fechaPres: fila[0],
        importe: fila[1]
      }));

      console.log("📌 Resultados finales:", resultados);

      return resultados;
    }

  } catch (error) {
    logger.error('Error en consulta NPS sesión 3', error);
    throw error;
  }
}
