import { chromium } from "playwright";

import path from "path";
import fs from "fs/promises";
import puppeteer from "puppeteer";

export async function sunatLogin(ruc, usuario, clave) {
  const browser = await chromium.launch({
    headless: false, // Mostrar navegador
    slowMo: 500, // Retraso visual (0.5s)
  });

  const context = await browser.newContext({
    acceptDownloads: true,
    // downloadsPath: "./descargas",
  });
  const page = await context.newPage();

  // Ir a la página de login
  await page.goto(
    "https://api-seguridad.sunat.gob.pe/v1/clientessol/59d39217-c025-4de5-b342-393b0f4630ab/oauth2/loginMenuSol?lang=es-PE&showDni=true&showLanguages=false&originalUrl=https://e-menu.sunat.gob.pe/cl-ti-itmenu2/AutenticaMenuInternetPlataforma.htm&state=rO0ABXQA701GcmNEbDZPZ28xODJOWWQ4aTNPT2krWUcrM0pTODAzTEJHTmtLRE1IT2pBQ2l2eW84em5lWjByM3RGY1BLT0tyQjEvdTBRaHNNUW8KWDJRQ0h3WmZJQWZyV0JBaGtTT0hWajVMZEg0Mm5ZdHlrQlFVaDFwMzF1eVl1V2tLS3ozUnVoZ1ovZisrQkZndGdSVzg1TXdRTmRhbAp1ek5OaXdFbG80TkNSK0E2NjZHeG0zNkNaM0NZL0RXa1FZOGNJOWZsYjB5ZXc3MVNaTUpxWURmNGF3dVlDK3pMUHdveHI2cnNIaWc1CkI3SkxDSnc9"
  );

  // Completar formulario
  await page.fill("#txtRuc", ruc);
  await page.fill("#txtUsuario", usuario);
  await page.fill("#txtContrasena", clave);
  await page.click("#btnAceptar");

  // Esperar redirección o validación de login
  await page.waitForTimeout(10000);

  // Guardar cookies después del login
  const cookies = await context.cookies();
  await fs.writeFile("session.json", JSON.stringify(cookies, null, 2));
  console.log("✅ Sesión guardada en session.json");

  // Verificar sesión activa
  if (page.url().includes("e-menu.sunat.gob.pe")) {
    console.log("✅ Inicio de sesión exitoso");
  } else {
    console.warn("⚠️ No se detectó inicio de sesión. URL actual:", page.url());
  }

  // --- 🔁 Uso de cookies guardadas (si vuelves a abrir sesión) ---
  const sessionPath = path.resolve("session.json");
  const savedCookies = JSON.parse(await fs.readFile(sessionPath, "utf8"));
  await context.addCookies(savedCookies);
  console.log("🍪 Cookies restauradas correctamente");

  // --- 🧭 Navegación dentro del menú ---
  try {
    await page.click("text=Consultas");
    console.log("🧭 Se hizo clic en 'Consultas'");

    await page.click("text=Consultas de Presentación y Pago");
    console.log("📄 Se hizo clic en 'Consultas de Presentación y Pago'");

    await page.click("text=Consulta de Declaraciones y Pagos");
    console.log("💾 Se hizo clic en 'Consultas de Declaraciones y Pagos'");

    // await page.click("text=Buscar");
    // console.log("💾 Se hizo clic en 'Buscar'");


    try {
      // 🕓 Esperar que cargue todo el DOM
      await page.waitForTimeout(5000);

      // 🔍 Mostrar todos los frames para confirmar cuál contiene los selects
      const frames = page.frames();
      console.log("🧭 FRAMES DETECTADOS:");
      frames.forEach(f => console.log("👉", f.name(), "-", f.url()));

      // 🧩 Buscar frame por nombre o parte de la URL
      const frame = frames.find(f => f.name() === 'iframeApplication' || f.url().includes('consultaDeclaracionInternetprincipal'));

      if (!frame) {
        throw new Error("❌ No se encontró el iframe esperado.");
      }

      console.log("✅ Frame encontrado:", frame.name(), frame.url());

      //Formulario
      await frame.click('#s2id_numFormulario .select2-search-choice-close');
      console.log("💾 Se elimino la etiqueta Todos");

      await frame.click('#s2id_numFormulario .select2-input');
      await frame.fill('#s2id_numFormulario .select2-input', 'IGV');
      await frame.click('.select2-results li:has-text("IGV")');
      await frame.click('body', { position: { x: 5, y: 5 } });
      console.log("💾 Se selecciono la etiqueta de IGV");

      // 📅 Fecha
      const mesInicio = '02';
      const añoInicio = '2025';

      const mesFin = '02';
      const añoFin = '2025';

      console.log(`🗓️ Seleccionando mes ${mesInicio} y año actual`);

      // 🕓 Esperar los selects dentro del frame
      await frame.waitForSelector("#periodo_tributario_1", { timeout: 10000 });
      await frame.selectOption("#periodo_tributario_1", mesInicio);
      await frame.waitForSelector('select[ng-model="consultaBean.rangoPeriodoTributarioInicioAnio"]', { timeout: 10000 });
      await frame.selectOption('select[ng-model="consultaBean.rangoPeriodoTributarioInicioAnio"]', añoInicio);

      await frame.waitForSelector("#periodo_tributario_2", { timeout: 10000 });
      await frame.selectOption("#periodo_tributario_2", mesFin);
      await frame.waitForSelector('select[ng-model="consultaBean.rangoPeriodoTributarioFinAnio"]', { timeout: 10000 });
      await frame.selectOption('select[ng-model="consultaBean.rangoPeriodoTributarioFinAnio"]', añoFin);

      console.log("✅ Mes y año seleccionados correctamente");

      await frame.waitForSelector('button:has-text("Buscar")', { timeout: 10000 });
      await frame.click('button:has-text("Buscar")');
      console.log("🔍 Clic en botón Buscar realizado correctamente");

      await page.waitForTimeout(2000);

      // await frame.waitForSelector('button:has-text("EXCEL")', { timeout: 10000 });
      // const [download] = await Promise.all([
      //   page.waitForEvent("download"), // Espera la descarga
      //   frame.click('button:has-text("EXCEL")') // Clic que inicia la descarga
      // ]);

      // // 💾 Guardar archivo en carpeta personalizada
      // const filePath = `./descargas/${download.suggestedFilename()}`;
      // await download.saveAs(filePath);

      // console.log(`✅ Excel descargado correctamente en: ${filePath}`);

      await frame.click('a[ng-click="mostrarDetalle(constancia);"]');
      console.log("🔍 Se hizo clic en el Detalle");

      await page.waitForTimeout(1000);

      const valorRenta = await frame.textContent(
        'tr:has-text("Total deuda tributaria") td.text-right.ng-binding:last-child'
      );

      console.log("💰 Total deuda tributaria (Renta):", valorRenta.trim());

    } catch (error) {
      console.error("❌ Error al seleccionar mes o año:", error.message);
    }

    // --------------------------PARTE DOS-----------------------------------------
    console.log("---------------------------------------------------------------");
    console.log("-----------------------PARTE 2------------------------");
    const page2 = await context.newPage();

    await page2.goto(
      "https://api-seguridad.sunat.gob.pe/v1/clientessol/4f3b88b3-d9d6-402a-b85d-6a0bc857746a/oauth2/loginMenuSol?lang=es-PE&showDni=true&showLanguages=false&originalUrl=https://e-menu.sunat.gob.pe/cl-ti-itmenu/AutenticaMenuInternet.htm&state=rO0ABXNyABFqYXZhLnV0aWwuSGFzaE1hcAUH2sHDFmDRAwACRgAKbG9hZEZhY3RvckkACXRocmVzaG9sZHhwP0AAAAAAAAx3CAAAABAAAAADdAAEZXhlY3B0AAZwYXJhbXN0AEsqJiomL2NsLXRpLWl0bWVudS9NZW51SW50ZXJuZXQuaHRtJmI2NGQyNmE4YjVhZjA5MTkyM2IyM2I2NDA3YTFjMWRiNDFlNzMzYTZ0AANleGVweA=="
    );

    // Completar formulario
    await page2.fill("#txtRuc", ruc);
    await page2.fill("#txtUsuario", usuario);
    await page2.fill("#txtContrasena", clave);
    await page2.click("#btnAceptar");

    // Esperar redirección o validación de login
    await page2.waitForTimeout(5000);

    try {
      const frames = page2.frames();
      console.log("🧭 FRAMES DETECTADOS:");
      frames.forEach(f => console.log("👉", f.name(), "-", f.url()));

      const frame = frames.find(f => f.name() === 'ifrVCE');

      await frame.waitForSelector('button:has-text("Finalizar")', { timeout: 5000 });
      await frame.click("text=Finalizar");
      console.log("🧭 Se hizo clic en 'Finalizar'");

      await frame.waitForSelector('button:has-text("Continuar sin confirmar")', { timeout: 5000 });
      await frame.click("text=Continuar sin confirmar");
      console.log("🧭 Se hizo clic en 'Continuar sin confirmar'");

      // ------------------------------------------------------------------------
      await page2.click("text=Mis declaraciones informativas");
      console.log("🧭 Se hizo clic en 'Mis declaraciones informativas'");

      await page2.click("text=Consulto mis declaraciones y pagos");
      console.log("📄 Se hizo clic en 'Consulto mis declaraciones y pagos'");

      await page2.click("text=Declaraciones y pagos");
      console.log("💾 Se hizo clic en 'Declaraciones y pagos'");

      await page2.click("text=Declaraciones y pagos");
      console.log("💾 Se hizo clic en 'Declaraciones y pagos'");

      await page2.click("text=Consulta general");
      console.log("💾 Se hizo clic en 'Consulta general'");

      await page.selectOption('select[name="importepagado"]', '2');
      console.log("💾 Se seleccionó el importe pagado");

      // 📅 Fecha (PERIODO TRIBUTARIO)
      const mesDesde = '02';
      const añoDesde = '2025';

      const mesHasta = '02';
      const añoHasta = '2025';

      await page.selectOption('select[name="mdesde"]', mesDesde);
      await page.selectOption('select[name="adesde"]', añoDesde);

      await page.selectOption('select[name="mhasta"]', mesHasta);
      await page.selectOption('select[name="ahasta"]', añoHasta);

      await frame.click('button:has-text("Buscar")');
      console.log("🔍 Clic en botón Buscar realizado correctamente");

      // ------------------------------------------------------------------------

      await page2.click("text=Mis declaraciones informativas");
      console.log("🧭 Se hizo clic en 'Mis declaraciones informativas'");

      await page2.click("text=Presento mis declaraciones y pagos");
      console.log("📄 Se hizo clic en 'Presento mis declaraciones y pagos'");

      await page2.click("text=Declarativas");
      console.log("💾 Se hizo clic en 'Declarativas'");

      await page2.click("text=Consulta de NPS");
      console.log("🧭 Se hizo clic en 'Consulta de NPS'");

    } catch (error) {
      console.error("❌ Error al seleccionar mes o año:", error.message);
    }
    //-----------------------------------------------------------------------------

  } catch (error) {
    console.error("❌ Error al navegar por el menú:", error.message);
  }

  // Mantener sesión abierta
  console.log("🕐 Manteniendo el navegador abierto...");
  await page.waitForTimeout(10000); // 10,000 segundos (~3 horas)
}
