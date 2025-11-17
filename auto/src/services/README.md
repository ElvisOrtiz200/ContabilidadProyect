# Servicios

Esta carpeta contiene los servicios de negocio de la aplicación.

## Estructura

- `sunat/`: Servicios relacionados con SUNAT
  - `sunatLogin.js`: Maneja el login y navegación en SUNAT
  - `sunatDescarga.js`: Maneja la descarga de archivos
  
- `browser/`: Servicios relacionados con el navegador
  - `browserService.js`: Gestiona instancias del navegador Playwright

## Principios

- Cada servicio debe tener una responsabilidad única
- Los servicios no deben depender directamente de Express
- Usar el logger para registrar operaciones importantes
- Manejar errores apropiadamente y lanzarlos para que los controladores los manejen

