# Middlewares de Autenticación y Autorización

## Middlewares disponibles

### `authenticate`
Autentica al usuario mediante token Bearer. Agrega `req.user` y `req.userEmpresas` al request.

```javascript
import { authenticate } from '../middlewares/auth/authenticate.js';

router.get('/ruta-protegida', authenticate, controller);
```

### `optionalAuthenticate`
Autentica si hay token, pero no falla si no existe. Útil para rutas que pueden ser públicas o privadas.

```javascript
import { optionalAuthenticate } from '../middlewares/auth/authenticate.js';

router.get('/ruta-opcional', optionalAuthenticate, controller);
```

### `requireEmpresa`
Verifica que el usuario pertenece a una empresa específica. Requiere `empresaId` en params, query o body.

```javascript
import { requireEmpresa } from '../middlewares/auth/authorize.js';

router.get('/empresa/:empresaId/datos', authenticate, requireEmpresa, controller);
```

### `requirePermission(permiso)`
Verifica que el usuario tiene un permiso específico.

```javascript
import { requirePermission } from '../middlewares/auth/authorize.js';

router.post('/crear', authenticate, requireEmpresa, requirePermission('crear'), controller);
```

### `requireRole(rol)`
Verifica que el usuario tiene un rol específico.

```javascript
import { requireRole } from '../middlewares/auth/authorize.js';

router.delete('/eliminar', authenticate, requireEmpresa, requireRole('admin'), controller);
```

### `requireAdmin`
Verifica que el usuario es administrador.

```javascript
import { requireAdmin } from '../middlewares/auth/authorize.js';

router.post('/configurar', authenticate, requireEmpresa, requireAdmin, controller);
```

## Orden de uso recomendado

1. `authenticate` - Siempre primero para rutas protegidas
2. `requireEmpresa` - Si la ruta requiere una empresa específica
3. `requireRole` o `requirePermission` - Para control de acceso granular

## Ejemplo completo

```javascript
router.post(
  '/empresa/:empresaId/documentos',
  authenticate,           // 1. Autenticar usuario
  requireEmpresa,         // 2. Verificar acceso a empresa
  requirePermission('crear_documentos'), // 3. Verificar permiso
  controller
);
```

