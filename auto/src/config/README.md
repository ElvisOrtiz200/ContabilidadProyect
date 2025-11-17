# Configuración

Esta carpeta contiene toda la configuración centralizada de la aplicación.

## Archivos

- `index.js`: Configuración principal que carga variables de entorno y exporta un objeto `config` con todas las configuraciones.
- `constants.js`: Constantes de la aplicación como URLs, selectores CSS, y timeouts.

## Uso

```javascript
import { config } from '../config/index.js';
import { SUNAT_URLS, SELECTORS } from '../config/constants.js';
```

