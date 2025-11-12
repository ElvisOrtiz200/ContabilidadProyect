import { chromium } from "playwright";
import fs from 'fs/promises'
import path from "path";
import { sunatLogin } from "./sunatLogin.js";

export async function descargarConstancias() {
//   const cookies = JSON.parse(await fs.readFile("/session.json", "utf8"));
  await sunatLogin(process.env.SUNAT_RUC, process.env.SUNAT_USER, process.env.SUNAT_PASS);
//   const browser = await chromium.launch({ headless: false });
//   const context = await browser.newContext();
//   await context.addCookies(cookies);
//   const page = await context.newPage();

    // await page.goto("https://e-menu.sunat.gob.pe/cl-ti-itmenu2/MenuInternetPlataforma.htm?pestana=*&agrupacion=*&exe=55.1.1.1.1");

    // await page.waitForTimeout(3000);
    // await page.click("text = Consultas");
    // await page.click("text = Consultas de Presentación y Pago");
    // await page.click("text = Consultas de Declaraciones y Pagos");

}
