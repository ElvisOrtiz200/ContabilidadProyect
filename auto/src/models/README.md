# Modelos

Esta carpeta está preparada para modelos de datos si en el futuro se necesita una capa de abstracción adicional sobre Supabase.

## Estructura de Base de Datos

### Tablas principales:

- `auth.users` - Usuarios de Supabase (tabla por defecto)
- `public.perfiles` - Perfiles de usuario
- `public.empresas` - Empresas
- `public.empresa_usuarios` - Relación usuarios-empresas
- `public.roles` - Roles del sistema
- `public.rol_permisos` - Permisos por rol

## Relaciones

- `perfiles.id` → `auth.users.id` (FK)
- `empresa_usuarios.empresa_id` → `empresas.id` (FK)
- `empresa_usuarios.usuario_id` → `perfiles.id` (FK)
- `roles.empresa_id` → `empresas.id` (FK, nullable)
- `rol_permisos.rol_id` → `roles.id` (FK)

