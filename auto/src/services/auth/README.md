# Servicio de Autenticación

Este servicio maneja toda la lógica de autenticación usando Supabase.

## Funcionalidades

- **Login**: Inicia sesión con email y contraseña
- **Registro**: Crea nuevos usuarios y sus perfiles
- **Verificación de token**: Valida tokens de acceso
- **Refresh token**: Renueva tokens expirados
- **Logout**: Cierra sesión
- **Gestión de empresas**: Obtiene empresas asociadas al usuario
- **Roles y permisos**: Obtiene roles y permisos del usuario por empresa

## Uso

```javascript
import { authService } from '../services/auth/authService.js';

// Login
const result = await authService.login(email, password);

// Registro
const user = await authService.register(email, password, nombres, telefono);

// Verificar token
const userData = await authService.verifyToken(accessToken);

// Obtener empresas del usuario
const empresas = await authService.getEmpresasUsuario(userId);

// Obtener roles y permisos
const rolesPermisos = await authService.getRolesPermisos(usuarioId, empresaId);
```

## Estructura de Datos

### Usuario autenticado
```javascript
{
  user: {
    id: "uuid",
    email: "usuario@example.com",
    nombres: "Juan Pérez",
    telefono: "123456789",
    // ... otros campos del perfil
  },
  empresas: [
    {
      id: "uuid",
      empresas: {
        id: "uuid",
        ruc: "12345678901",
        nombre_comercial: "Mi Empresa",
        // ...
      },
      rol: "admin",
      estado: "activo"
    }
  ]
}
```

