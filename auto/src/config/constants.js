// Constantes de la aplicación

export const SUNAT_URLS = {
  LOGIN_MENU_SOL: 'https://api-seguridad.sunat.gob.pe/v1/clientessol/59d39217-c025-4de5-b342-393b0f4630ab/oauth2/loginMenuSol?lang=es-PE&showDni=true&showLanguages=false&originalUrl=https://e-menu.sunat.gob.pe/cl-ti-itmenu2/AutenticaMenuInternetPlataforma.htm&state=rO0ABXQA701GcmNEbDZPZ28xODJOWWQ4aTNPT2krWUcrM0pTODAzTEJHTmtLRE1IT2pBQ2l2eW84em5lWjByM3RGY1BLT0tyQjEvdTBRaHNNUW8KWDJRQ0h3WmZJQWZyV0JBaGtTT0hWajVMZEg0Mm5ZdHlrQlFVaDFwMzF1eVl1V2tLS3ozUnVoZ1ovZisrQkZndGdSVzg1TXdRTmRhbAp1ek5OaXdFbG80TkNSK0E2NjZHeG0zNkNaM0NZL0RXa1FZOGNJOWZsYjB5ZXc3MVNaTUpxWURmNGF3dVlDK3pMUHdveHI2cnNIaWc1CkI3SkxDSnc9',
  LOGIN_MENU_SOL_2: 'https://api-seguridad.sunat.gob.pe/v1/clientessol/4f3b88b3-d9d6-402a-b85d-6a0bc857746a/oauth2/loginMenuSol?lang=es-PE&showDni=true&showLanguages=false&originalUrl=https://e-menu.sunat.gob.pe/cl-ti-itmenu/AutenticaMenuInternet.htm&state=rO0ABXNyABFqYXZhLnV0aWwuSGFzaE1hcAUH2sHDFmDRAwACRgAKbG9hZEZhY3RvckkACXRocmVzaG9sZHhwP0AAAAAAAAx3CAAAABAAAAADdAAEZXhlY3B0AAZwYXJhbXN0AEsqJiomL2NsLXRpLWl0bWVudS9NZW51SW50ZXJuZXQuaHRtJmI2NGQyNmE4YjVhZjA5MTkyM2IyM2I2NDA3YTFjMWRiNDFlNzMzYTZ0AANleGVweA==',
  E_MENU: 'https://e-menu.sunat.gob.pe',
};

export const SELECTORS = {
  LOGIN: {
    RUC: '#txtRuc',
    USUARIO: '#txtUsuario',
    CLAVE: '#txtContrasena',
    BTN_ACEPTAR: '#btnAceptar',
  },
  MENU: {
    CONSULTAS: 'text=Consultas',
    CONSULTAS_PRESENTACION_PAGO: 'text=Consultas de Presentación y Pago',
    CONSULTAS_DECLARACIONES_PAGOS: 'text=Consulta de Declaraciones y Pagos',
  },
  FRAME: {
    IFRAME_APPLICATION: 'iframeApplication',
    IFRAME_VCE: 'ifrVCE',
  },
  FORMULARIO: {
    NUM_FORMULARIO: '#s2id_numFormulario',
    PERIODO_TRIBUTARIO_1: '#periodo_tributario_1',
    PERIODO_TRIBUTARIO_2: '#periodo_tributario_2',
    RANGO_PERIODO_INICIO_ANIO: 'select[ng-model="consultaBean.rangoPeriodoTributarioInicioAnio"]',
    RANGO_PERIODO_FIN_ANIO: 'select[ng-model="consultaBean.rangoPeriodoTributarioFinAnio"]',
    BTN_BUSCAR: 'button:has-text("Buscar")',
  },
};

export const TIMEOUTS = {
  PAGE_LOAD: 10000,
  ELEMENT_WAIT: 10000,
  NAVIGATION: 5000,
  DOWNLOAD: 30000,
};

