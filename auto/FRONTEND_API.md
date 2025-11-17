# Guía de API para Frontend

Esta guía muestra cómo el frontend debe comunicarse con el backend.

## Configuración Base

**URL Base:** `http://localhost:3000`

## Autenticación

### 1. Login

**Endpoint:** `POST /auth/login`

**Request:**
```javascript
const response = await fetch('http://localhost:3000/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'usuario@example.com',
    password: 'ClaveSegura123'
  })
});

const data = await response.json();
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Inicio de sesión exitoso",
  "data": {
    "user": {
      "id": "uuid",
      "email": "usuario@example.com",
      "nombres": "Juan Pérez",
      "telefono": "+51 999 888 777"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": 1731452800,
    "empresas": []
  }
}
```

**Respuesta de Error (400):**
```json
{
  "success": false,
  "message": "Email y contraseña son requeridos",
  "errors": {
    "email": "El email es requerido",
    "password": "La contraseña es requerida"
  }
}
```

**Respuesta de Error (401):**
```json
{
  "success": false,
  "message": "Email o contraseña incorrectos. Verifica tus credenciales."
}
```

### 2. Registro

**Endpoint:** `POST /auth/register`

**Request:**
```javascript
const response = await fetch('http://localhost:3000/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'nuevo@example.com',
    password: 'ClaveSegura123',
    nombres: 'Juan Pérez',
    telefono: '+51 999 888 777'
  })
});

const data = await response.json();
```

**Respuesta Exitosa (201):**
```json
{
  "success": true,
  "message": "Usuario registrado exitosamente. Por favor, confirma tu email.",
  "data": {
    "user": {
      "id": "uuid",
      "email": "nuevo@example.com",
      "nombres": "Juan Pérez",
      "telefono": "+51 999 888 777"
    },
    "requiresEmailConfirmation": true
  }
}
```

### 3. Obtener Usuario Actual

**Endpoint:** `GET /auth/me`

**Request:**
```javascript
const response = await fetch('http://localhost:3000/auth/me', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
});

const data = await response.json();
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "usuario@example.com",
      "nombres": "Juan Pérez",
      "telefono": "+51 999 888 777"
    },
    "empresas": []
  }
}
```

### 4. Cerrar Sesión

**Endpoint:** `POST /auth/logout`

**Request:**
```javascript
const response = await fetch('http://localhost:3000/auth/logout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
});

const data = await response.json();
```

### 5. Refrescar Token

**Endpoint:** `POST /auth/refresh`

**Request:**
```javascript
const response = await fetch('http://localhost:3000/auth/refresh', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    refresh_token: refreshToken
  })
});

const data = await response.json();
```

## Ejemplo de Implementación en React/Vue/Angular

### Función de Login

```javascript
async function login(email, password) {
  try {
    const response = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al iniciar sesión');
    }

    if (data.success) {
      // Guardar token en localStorage o estado
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      
      return data.data;
    }
  } catch (error) {
    console.error('Error en login:', error);
    throw error;
  }
}
```

### Función para Requests Autenticados

```javascript
async function authenticatedFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Si el token expiró, intentar refrescar
  if (response.status === 401) {
    const refreshed = await refreshToken();
    if (refreshed) {
      // Reintentar la petición con el nuevo token
      headers['Authorization'] = `Bearer ${refreshed.token}`;
      return fetch(url, { ...options, headers });
    }
  }

  return response;
}
```

## Manejo de Errores

Todas las respuestas de error siguen este formato:

```json
{
  "success": false,
  "message": "Mensaje de error descriptivo",
  "errors": {
    // Detalles específicos de validación (opcional)
  }
}
```

**Códigos de Estado HTTP:**
- `200` - Éxito
- `201` - Creado exitosamente
- `400` - Error de validación
- `401` - No autenticado
- `403` - No autorizado
- `404` - No encontrado
- `500` - Error del servidor

## CORS

El backend está configurado para aceptar peticiones desde:
- `http://localhost:3000`
- `http://localhost:5173` (Vite default)
- `http://localhost:5174` (Vite alternate)

Para agregar más orígenes, configura la variable de entorno:
```env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,https://tudominio.com
```

## Notas Importantes

1. **Siempre incluye el header `Authorization`** en requests protegidos
2. **Guarda el token** en localStorage o en el estado de tu aplicación
3. **Maneja la expiración del token** implementando refresh automático
4. **Valida las respuestas** usando el campo `success`
5. **Muestra mensajes de error** usando el campo `message`

