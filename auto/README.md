# Proyecto de Automatización SUNAT

Sistema de automatización para interactuar con el portal de SUNAT utilizando Playwright.

## 📁 Estructura del Proyecto

```
auto/
├── src/
│   ├── app.js                    # Punto de entrada de la aplicación
│   ├── config/                   # Configuración centralizada
│   │   ├── index.js              # Configuración principal
│   │   ├── constants.js          # Constantes de la aplicación
│   │   └── supabase.js           # Configuración de Supabase
│   ├── controllers/              # Controladores (lógica de negocio)
│   │   ├── authController.js     # Controlador de autenticación
│   │   └── sunatController.js    # Controlador de SUNAT
│   ├── middlewares/              # Middlewares de Express
│   │   ├── auth/                 # Middlewares de autenticación
│   │   │   ├── authenticate.js   # Middleware de autenticación
│   │   │   └── authorize.js      # Middlewares de autorización
│   │   ├── errorHandler.js       # Manejo de errores
│   │   └── logger.js             # Logger de requests
│   ├── models/                   # Modelos de datos
│   ├── routes/                   # Rutas de la API
│   │   ├── authRouter.js         # Rutas de autenticación
│   │   └── sunatRouter.js        # Rutas de SUNAT
│   ├── services/                 # Servicios de negocio
│   │   ├── auth/                 # Servicios de autenticación
│   │   │   └── authService.js    # Servicio de autenticación
│   │   ├── sunat/
│   │   │   ├── sunatLogin.js     # Servicio de login SUNAT
│   │   │   └── sunatDescarga.js  # Servicio de descarga
│   │   └── browser/
│   │       └── browserService.js # Servicio de navegador
│   ├── utils/                    # Utilidades
│   │   ├── logger.js             # Sistema de logging
│   │   ├── errors.js             # Clases de error personalizadas
│   │   └── helpers.js            # Funciones auxiliares
│   ├── validators/               # Validadores de datos
│   │   ├── authValidator.js      # Validadores de autenticación
│   │   └── sunatValidator.js     # Validadores de SUNAT
│   └── errors/                   # Manejo de errores (futuro)
├── descargas/                    # Archivos descargados
├── logs/                         # Archivos de log
├── tests/                        # Tests (futuro)
└── package.json
```

## 🚀 Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
Crear un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Configuración del servidor
PORT=3000
NODE_ENV=development

# Configuración de SUNAT
SUNAT_RUC=tu_ruc_aqui
SUNAT_USER=tu_usuario_aqui
SUNAT_PASS=tu_clave_aqui

# Configuración del navegador
BROWSER_HEADLESS=false
BROWSER_SLOW_MO=500
BROWSER_TIMEOUT=30000

# Configuración de Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui

# Configuración de JWT (opcional)
JWT_SECRET=tu_jwt_secret_aqui
JWT_EXPIRES_IN=7d
```

3. Instalar navegadores de Playwright:
```bash
npx playwright install chromium
```

## 📝 Uso

### Iniciar el servidor

```bash
npm start
```

O en modo desarrollo:
```bash
npm run dev
```

### Endpoints disponibles

#### Autenticación (Públicos)
- `POST /auth/login` - Iniciar sesión con email y contraseña
- `POST /auth/register` - Registrar nuevo usuario
- `POST /auth/refresh` - Refrescar token de acceso
- `GET /auth/me` - Obtener información del usuario actual (requiere autenticación)
- `POST /auth/logout` - Cerrar sesión (requiere autenticación)

#### SUNAT (Protegidos - requieren autenticación)
- `POST /sunat/login` - Iniciar sesión en SUNAT
- `POST /sunat/descargar` - Descargar constancias

#### Sistema
- `GET /health` - Verificar estado del servidor

## 🔧 Configuración

Las configuraciones se encuentran en:
- `src/config/index.js` - Configuración principal
- `src/config/constants.js` - Constantes y URLs

## 📊 Logging

Los logs se guardan en la carpeta `logs/` con formato JSON y también se muestran en consola.

## 🏗️ Arquitectura

El proyecto sigue una arquitectura escalable con separación de responsabilidades:

- **Controllers**: Manejan las peticiones HTTP
- **Services**: Contienen la lógica de negocio
- **Validators**: Validan los datos de entrada
- **Middlewares**: Procesan requests y responses
- **Utils**: Funciones auxiliares reutilizables
- **Config**: Configuración centralizada

## 🔐 Autenticación y Autorización

El sistema utiliza Supabase para la autenticación de usuarios. Todas las rutas de SUNAT requieren autenticación.

### Flujo de Autenticación

1. **Registro/Login**: El usuario se registra o inicia sesión mediante `/auth/login` o `/auth/register`
2. **Token**: Se recibe un `access_token` y `refresh_token`
3. **Uso**: Incluir el token en el header `Authorization: Bearer <access_token>`
4. **Refresh**: Cuando el token expire, usar `/auth/refresh` con el `refresh_token`

### Ejemplo de uso

```javascript
// 1. Login
const response = await fetch('http://localhost:3000/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'usuario@example.com',
    password: 'password123'
  })
});

const { data } = await response.json();
const { access_token, refresh_token } = data.session;

// 2. Usar token en requests protegidos
const sunatResponse = await fetch('http://localhost:3000/sunat/descargar', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json'
  }
});
```

### Middlewares de Autorización

- `authenticate`: Verifica que el usuario esté autenticado
- `requireEmpresa`: Verifica acceso a una empresa específica
- `requirePermission(permiso)`: Verifica permisos específicos
- `requireRole(rol)`: Verifica rol específico
- `requireAdmin`: Verifica rol de administrador

Ver documentación en `src/middlewares/auth/README.md` para más detalles.

## 🔐 Seguridad

- Las credenciales se manejan mediante variables de entorno
- El archivo `.env` está en `.gitignore`
- Las sesiones se guardan localmente en `session.json`
- Autenticación mediante tokens JWT de Supabase
- Control de acceso basado en roles y permisos

## 📝 Notas

- El proyecto utiliza Playwright para automatización del navegador
- Los archivos descargados se guardan en `descargas/`
- Las sesiones se guardan en `session.json` para reutilización

