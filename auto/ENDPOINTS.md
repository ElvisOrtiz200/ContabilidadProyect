# 📋 Documentación de Endpoints API

Base URL: `http://localhost:3000`

**Todas las rutas protegidas requieren token de autenticación:**
```
Authorization: Bearer <access_token>
```

---

## 🔐 Autenticación (`/auth`)

### `POST /auth/login`
Inicia sesión con email y contraseña.

**Body:**
```json
{
  "email": "usuario@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Inicio de sesión exitoso",
  "data": {
    "user": { ... },
    "token": "access_token",
    "refreshToken": "refresh_token",
    "expiresAt": 1234567890,
    "empresas": []
  }
}
```

---

### `POST /auth/register`
Registra un nuevo usuario.

**Body:**
```json
{
  "email": "usuario@example.com",
  "password": "password123",
  "nombres": "Juan Pérez",
  "telefono": "987654321"
}
```

---

### `GET /auth/me`
Obtiene información del usuario actual (requiere token).

---

### `POST /auth/refresh`
Refresca el token de acceso.

**Body:**
```json
{
  "refresh_token": "refresh_token_value"
}
```

---

### `POST /auth/logout`
Cierra sesión (requiere token).

---

### `POST /auth/resend-confirmation`
Reenvía el email de confirmación.

**Body:**
```json
{
  "email": "usuario@example.com"
}
```

---

## 🏢 Empresas (`/empresas`)

### `GET /empresas`
Lista todas las empresas.

**Query params opcionales:**
- `?activo=true` - Filtrar por estado activo

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "empresa_id": "uuid",
      "ruc": "20123456789",
      "nombre_comercial": "Mi Empresa SAC",
      "industria": "Servicios",
      "direccion": "Av. Siempre Viva 123",
      "pais": "PE",
      "activo": true,
      "sunat_id": "uuid",
      "estadoEmpresa": true,
      "created_at": "2024-01-15T00:00:00Z"
    }
  ]
}
```

---

### `GET /empresas/:empresaId`
Obtiene una empresa por ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "empresa_id": "uuid",
    "ruc": "20123456789",
    ...
  }
}
```

---

### `POST /empresas`
Crea una nueva empresa.

**Body:**
```json
{
  "ruc": "20123456789",
  "nombre_comercial": "Mi Empresa SAC",
  "industria": "Servicios",
  "direccion": "Av. Siempre Viva 123",
  "pais": "PE",
  "activo": true,
  "estadoEmpresa": true
}
```

**Response:** `201 Created`

---

### `PUT /empresas/:empresaId`
Actualiza una empresa existente.

**Body:** Solo los campos a actualizar
```json
{
  "nombre_comercial": "Nuevo Nombre",
  "direccion": "Nueva Dirección"
}
```

---

### `PATCH /empresas/:empresaId` ⭐ NUEVO
Actualiza parcialmente una empresa (compatible con Supabase/frontend).

**Body:** Solo los campos a actualizar
```json
{
  "sunat_id": "uuid-de-credencial",
  "nombre_comercial": "Nuevo Nombre"
}
```

**Nota:** Este endpoint es idéntico a `PUT`, pero permite usar `PATCH` para compatibilidad con clientes que usan Supabase directamente.

---

### `DELETE /empresas/:empresaId`
Elimina una empresa.

---

### `GET /empresas/:empresaId/credenciales` ⭐ NUEVO
Obtiene las credenciales SUNAT de una empresa específica.

**Response:**
```json
{
  "success": true,
  "data": {
    "sunat_id": "uuid",
    "usuario": "USUARIO_SOL",
    "clave_encriptada": "...",
    "regimen": "RMT",
    "fecha_afiliacion": "2024-01-15",
    "created_at": "2024-01-15T00:00:00Z",
    "update_at": null,
    "empresa": {
      "empresa_id": "uuid",
      "ruc": "20123456789",
      "nombre_comercial": "Mi Empresa SAC",
      ...
    }
  }
}
```

---

## 🔑 Credenciales SUNAT (`/sunat-credenciales`)

### `GET /sunat-credenciales`
Lista todas las credenciales SUNAT con información de empresa relacionada.

**Query params opcionales:**
- `?regimen=RMT` - Filtrar por régimen
- `?empresa_id=<uuid>` - Filtrar por empresa

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "sunat_id": "uuid",
      "usuario": "USUARIO_SOL",
      "clave_encriptada": "...",
      "regimen": "RMT",
      "fecha_afiliacion": "2024-01-15",
      "created_at": "2024-01-15T00:00:00Z",
      "update_at": null,
      "empresa": {
        "empresa_id": "uuid",
        "ruc": "20123456789",
        "nombre_comercial": "Mi Empresa SAC",
        "industria": "Servicios",
        "direccion": "Av. Siempre Viva 123",
        "pais": "PE",
        "activo": true,
        "estadoEmpresa": true
      }
    }
  ]
}
```

---

### `GET /sunat-credenciales/empresa/:empresaId` ⭐ NUEVO
Obtiene credenciales SUNAT de una empresa específica (alternativa al endpoint de empresas).

**Response:** Igual que `GET /empresas/:empresaId/credenciales`

---

### `GET /sunat-credenciales/:sunatId`
Obtiene una credencial por `sunat_id` con información de empresa.

**Response:**
```json
{
  "success": true,
  "data": {
    "sunat_id": "uuid",
    "usuario": "USUARIO_SOL",
    "clave_encriptada": "...",
    "regimen": "RMT",
    "fecha_afiliacion": "2024-01-15",
    "created_at": "2024-01-15T00:00:00Z",
    "update_at": null,
    "empresa": {
      "empresa_id": "uuid",
      "ruc": "20123456789",
      "nombre_comercial": "Mi Empresa SAC",
      ...
    }
  }
}
```

---

### `POST /sunat-credenciales`
Crea nuevas credenciales SUNAT.

**Body:**
```json
{
  "usuario": "USUARIO_SOL",
  "clave_encriptada": "clave_encriptada",
  "regimen": "RMT",
  "fecha_afiliacion": "2024-01-15",
  "empresa_id": "uuid-de-empresa"
}
```

**Campos requeridos:**
- `usuario`
- `clave_encriptada`

**Campos opcionales:**
- `empresa_id` - Si se proporciona, la empresa se vinculará automáticamente con el `sunat_id` de la credencial creada

**Response:** `201 Created`

**Nota:** Si envías `empresa_id`, la empresa se actualizará automáticamente con el `sunat_id` de la credencial creada. No necesitas hacer una segunda llamada para vincularlas.

---

### `PUT /sunat-credenciales/:sunatId`
Actualiza credenciales existentes.

**Body:** Solo los campos a actualizar
```json
{
  "usuario": "NUEVO_USUARIO",
  "clave_encriptada": "nueva_clave"
}
```

**Campos permitidos:**
- `usuario`
- `clave_encriptada`
- `regimen`
- `fecha_afiliacion`

---

### `DELETE /sunat-credenciales/:sunatId`
Elimina credenciales SUNAT.

---

## 🌐 SUNAT (`/sunat`)

### `POST /sunat/obtenerRentas`
Obtiene rentas y declaraciones de SUNAT (requiere autenticación).

**Body:**
```json
{
  "ruc": "20123456789",
  "usuario": "USUARIO_SOL",
  "clave": "clave"
}
```

---

### `POST /sunat/descargar`
Descarga constancias de SUNAT (requiere autenticación).

---

## 🏥 Sistema (`/health`)

### `GET /health`
Verifica el estado del servidor.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T00:00:00.000Z",
  "environment": "development"
}
```

---

## 📝 Notas Importantes

1. **Relación Empresa-Credenciales:**
   - `empresas.sunat_id` → `sunat_credenciales.sunat_id` (Foreign Key)
   - Una empresa puede tener una credencial SUNAT asociada
   - Una credencial puede estar asociada a múltiples empresas (aunque normalmente es 1:1)

2. **Filtrado por Empresa:**
   - Usa `?empresa_id=<uuid>` en `GET /sunat-credenciales` para filtrar credenciales de una empresa
   - O usa `GET /empresas/:empresaId/credenciales` para obtener directamente las credenciales de una empresa

3. **Información de Empresa en Respuestas:**
   - Todos los endpoints de credenciales ahora incluyen el campo `empresa` con la información relacionada
   - Si no hay empresa asociada, `empresa` será `null`

4. **Autenticación:**
   - Todas las rutas excepto `/auth/*` y `/health` requieren token válido
   - Obtén el token con `POST /auth/login`
   - Incluye el token en el header: `Authorization: Bearer <token>`

---

## 🔄 Flujo Recomendado para Frontend

1. **Login:** `POST /auth/login` → Obtener `token`
2. **Listar Empresas:** `GET /empresas` → Ver todas las empresas
3. **Ver Credenciales de una Empresa:**
   - Opción A: `GET /empresas/:empresaId/credenciales`
   - Opción B: `GET /sunat-credenciales?empresa_id=<empresaId>`
4. **Listar Todas las Credenciales:** `GET /sunat-credenciales` → Incluye info de empresa en cada credencial
5. **Crear/Editar/Eliminar:** Usar los endpoints correspondientes

---

**Última actualización:** 2025-11-26

