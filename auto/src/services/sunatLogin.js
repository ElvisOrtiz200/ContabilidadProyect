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
    downloadsPath: "./descargas",
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

      // 📅 Fecha
      const mesInicio = '01';
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

      await page.waitForTimeout(5000);

      await frame.waitForSelector('button:has-text("EXCEL")', { timeout: 10000 });
      const [download] = await Promise.all([
        page.waitForEvent("download"), // Espera la descarga
        frame.click('button:has-text("EXCEL")') // Clic que inicia la descarga
      ]);

      // 💾 Guardar archivo en carpeta personalizada
      const filePath = `./descargas/${download.suggestedFilename()}`;
      await download.saveAs(filePath);

      console.log(`✅ Excel descargado correctamente en: ${filePath}`);

    } catch (error) {
      console.error("❌ Error al seleccionar mes o año:", error.message);
    }

  } catch (error) {
    console.error("❌ Error al navegar por el menú:", error.message);
  }

  // Mantener sesión abierta
  console.log("🕐 Manteniendo el navegador abierto...");
  await page.waitForTimeout(10000); // 10,000 segundos (~3 horas)
}
