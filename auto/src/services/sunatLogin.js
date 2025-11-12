import { chromium } from "playwright";

import path from "path";
import fs from "fs/promises";
import puppeteer from "puppeteer";

export async function sunatLogin(ruc, usuario, clave) {
  const browser = await chromium.launch({
    headless: false, // Mostrar navegador
    slowMo: 500, // Retraso visual (0.5s)
  });

  const context = await browser.newContext();
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

    const frames = page.frames();
    for (const frame of frames) {
      console.log("Frame name:", frame.name());
      console.log("Frame URL:", frame.url());
    }
  } catch (error) {
    console.error("❌ Error al navegar por el menú:", error.message);
  }

  // Mantener sesión abierta
  console.log("🕐 Manteniendo el navegador abierto...");
  await page.waitForTimeout(10000); // 10,000 segundos (~3 horas)
}
