# Sistema de Permisos Granulares y Equipos

## Estado General

| Fase                                | Estado              | Descripcion                          |
| ----------------------------------- | ------------------- | ------------------------------------ |
| Fase 1: Permisos Granulares         | Completada          | RBAC con permisos en BD + JWT        |
| Fase 2: Equipos y Aislamiento       | Completada (codigo) | Pendiente ejecutar SQL en Supabase   |
| Fase 3: Datos de Agentes en Equipos | Completada (codigo) | Pendiente ejecutar SQL en Supabase   |
| Fase 4: JWT + Middleware avanzado   | Pendiente           | Optimizacion de performance          |

---

## Fase 1: Permisos Granulares (COMPLETADA)

### Que se hizo

Migracion de 45+ checks de rol hardcodeados (`profile.role === 'admin'`) a un sistema de permisos granulares basado en BD.

### Arquitectura

- **24 permisos** en formato `modulo.accion` (ej: `polizas.ver`, `admin.usuarios`)
- **7 modulos**: polizas, clientes, cobranzas, siniestros, vencimientos, documentos, admin
- **3 tablas nuevas**: `permissions`, `role_permissions`, `user_permissions`
- **JWT claims**: `user_role` + `user_permissions[]` inyectados via `custom_access_token_hook`
- **Admin bypass**: hardcodeado en codigo, admin siempre tiene todos los permisos sin consultar BD
- **Refresh**: requiere re-login cuando cambian permisos (no invalidacion automatica de JWT)

### 4 capas de seguridad

1. **RLS** (Postgres) - `user_has_permission()` function
2. **Server Actions** - `hasPermission()`, `requirePermission()`, `checkPermission()`
3. **Middleware** - Decodifica JWT, verifica `user_permissions` array
4. **UI** - Hook `usePermissions()` con `can()` helper en navbar

### Archivos clave

```
docs/migration_permissions_system.sql     -- SQL para ejecutar en Supabase (Fase 1)
utils/auth/helpers.ts                     -- Permission type, hasPermission(), requirePermission(), checkPermission(), getDataScopeFilter()
utils/auth/roles.ts                       -- ROLE_CONFIG con defaultPermissions[], ALL_PERMISSIONS, labels
utils/supabase/middleware.ts              -- PROTECTED_ROUTES mapeado a Permission strings
components/ui/navbar.tsx                  -- usePermissions() hook + can() helper
app/admin/permisos/page.tsx               -- UI admin: matriz permisos
app/admin/permisos/actions.ts             -- Server actions para gestion de permisos
app/admin/permisos/components/MatrizPermisos.tsx    -- Grid rol x permiso
app/admin/permisos/components/PermisosUsuario.tsx   -- Permisos extra por usuario
```

### Archivos migrados (18 server actions/pages)

Todos los checks de rol en estos archivos fueron reemplazados por `checkPermission()` o `requirePermission()`:

- `app/gerencia/validacion/actions.ts` y `page.tsx`
- `app/cobranzas/actions.ts` y `page.tsx`
- `app/siniestros/actions.ts`, `page.tsx`, `nuevo/page.tsx`, `editar/[id]/page.tsx`
- `app/admin/reportes/actions.ts` y `page.tsx`
- `app/admin/users/actions.ts`
- `app/polizas/documentos/actions.ts`
- `app/clientes/trazabilidad/actions.ts`
- `app/polizas/permisos/actions.ts`
- `app/clientes/permisos/actions.ts`
- `app/clientes/editar/actions.ts`
- `app/clientes/documentos/actions.ts`
- `app/polizas/[id]/editar/actions.ts`

### Permisos por rol (defaults)

| Rol        | Permisos                                                                                                                                        |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| admin      | TODOS (bypass hardcodeado)                                                                                                                      |
| usuario    | polizas.ver, polizas.validar, polizas.exportar, clientes.ver, clientes.trazabilidad, cobranzas.ver, siniestros.ver, vencimientos.ver            |
| comercial  | polizas.ver/crear/editar, clientes.ver/crear/editar, vencimientos.ver/generar, cobranzas.ver, siniestros.ver/crear/editar, documentos.descartar |
| agente     | polizas.ver/crear/editar, clientes.ver/crear/editar, vencimientos.ver/generar, cobranzas.ver, documentos.descartar                              |
| cobranza   | cobranzas.ver/gestionar, polizas.ver, clientes.ver                                                                                              |
| siniestros | siniestros.ver/crear/editar, polizas.ver, clientes.ver, cobranzas.ver                                                                           |

### SQL pendiente de ejecutar (COMPLETADA)

- `docs/migration_permissions_system.sql` - Crea tablas, catalogo de permisos, funciones RPC, actualiza JWT hook

---

## Fase 2: Equipos y Aislamiento de Datos (COMPLETADA - codigo listo)

### Que se hizo

Sistema de equipos para agrupar agentes y comerciales, con aislamiento de datos por equipo.

### Arquitectura

- **2 tablas nuevas**: `equipos`, `equipo_miembros`
- **Funcion clave**: `get_team_member_ids(user_id)` retorna array de UUIDs de compañeros de equipo
- **RLS scoped**: Politicas SELECT de `polizas`, `clients`, `polizas_pagos` reescritas para filtrar por equipo
- **Application-level scoping**: `getDataScopeFilter()` en server actions como optimizacion

### Reglas de visibilidad

| Rol                              | Ve                                                  |
| -------------------------------- | --------------------------------------------------- |
| admin, usuario                   | TODO                                                |
| cobranza, siniestros             | TODO                                                |
| agente, comercial (sin equipo)   | Solo sus propios datos                              |
| agente, comercial (con equipo)   | Sus datos + datos de TODOS los compañeros de equipo |
| agente, comercial (multi-equipo) | Union de todos los miembros de todos sus equipos    |

**Importante**: Todos los miembros del equipo ven los datos de todos los demas. El rol "lider" es solo administrativo, no afecta visibilidad.

### Doble capa de proteccion

1. **RLS en Postgres** (defensa primaria): `responsable_id = ANY(get_team_member_ids(auth.uid()))`
2. **Filtros en server actions** (optimizacion): `.in('responsable_id', teamMemberIds)` para counts correctos

### Archivos clave

```
docs/migration_equipos_system.sql                   -- SQL para ejecutar en Supabase (Fase 2)
app/admin/equipos/page.tsx                          -- UI admin: gestion de equipos
app/admin/equipos/actions.ts                        -- CRUD equipos + miembros
app/admin/equipos/components/GestionEquipos.tsx     -- Componente interactivo
```

### Archivos modificados

```
utils/auth/helpers.ts      -- getDataScopeFilter(), permiso admin.equipos
utils/auth/roles.ts        -- admin.equipos en constantes
app/polizas/actions.ts     -- Scoping en obtenerPolizas() y buscarPolizas()
app/clientes/actions.ts    -- Scoping en getAllClients() (count + query)
components/ui/navbar.tsx   -- Link "Equipos" en dropdown
```

### SQL pendiente de ejecutar (COMPLETADA)

- `docs/migration_equipos_system.sql` - Crea tablas equipos, funciones, reescribe politicas RLS

### Orden de ejecucion SQL (COMPLETADA)

**IMPORTANTE**: Ejecutar en este orden:

1. Primero: `docs/migration_permissions_system.sql` (Fase 1)
2. Segundo: `docs/migration_equipos_system.sql` (Fase 2)

---

## Fase 3: Reglas de Negocio Avanzadas (COMPLETADA - codigo listo)

### Que se hizo

Scoping avanzado, auto-asignacion, transferencia de datos, y dashboard por equipo.

### Arquitectura

#### 3A - Scoping Critico + Auto-Asignacion
- **NOT NULL constraints**: `clients.executive_in_charge` y `siniestros.responsable_id` ahora son NOT NULL
- **Scoping en detalle**: `obtenerDetallePoliza()`, `getClientById()`, `getClientDetailsComplete()` verifican equipo
- **Siniestros scoping**: Rol siniestros ve los suyos y los de su equipo; comercial/agente ve siniestros de polizas de su equipo
- **`getDataScopeFilter(module?)`**: Ahora acepta parametro opcional de modulo y retorna `role`
- **Auto-asignacion polizas**: DatosBasicos pre-selecciona al usuario actual y muestra solo miembros del equipo para agente/comercial
- **Auto-asignacion clientes**: ExecutiveDropdown filtra por equipo y pre-selecciona al usuario actual
- **Validacion server-side**: `guardarPoliza()` valida que responsable_id sea del equipo

#### 3D - Transferencia de Datos
- **Pagina**: `/admin/transferencias` - Admin puede transferir polizas/clientes entre usuarios
- **Auditoria**: Cada transferencia queda registrada en historial
- **Seleccion bulk**: Checkboxes para seleccionar multiples polizas/clientes

#### 3E - Reportes Scoped
- **Filtro por equipo**: `exportarProduccion()` acepta `equipo_id` para filtrar por equipo
- **UI**: Dropdown de equipo en formulario de reportes

#### 3F - Dashboard por Equipo
- **Pagina**: `/admin/dashboard-equipos` - Metricas por equipo
- **Metricas**: Total polizas, polizas activas, clientes, siniestros abiertos, prima total
- **Cards**: Vista de tarjetas por equipo con miembros

### Reglas de visibilidad (actualizadas)

| Rol                              | Polizas/Clientes          | Siniestros                        |
| -------------------------------- | ------------------------- | --------------------------------- |
| admin, usuario                   | TODO                      | TODO                              |
| cobranza                         | TODO                      | TODO                              |
| siniestros (sin equipo)          | TODO                      | Solo sus propios siniestros       |
| siniestros (con equipo)          | TODO                      | Sus siniestros + equipo           |
| agente, comercial (sin equipo)   | Solo sus propios datos    | Siniestros de sus polizas         |
| agente, comercial (con equipo)   | Datos de su equipo        | Siniestros de polizas del equipo  |

### RLS actualizado en tablas dependientes

| Tabla                          | Scoping                                     |
| ------------------------------ | ------------------------------------------- |
| siniestros                     | Por `responsable_id` (siniestros) o poliza  |
| natural_clients                | Via `clients.executive_in_charge`            |
| juridic_clients                | Via `clients.executive_in_charge`            |
| unipersonal_clients            | Via `clients.executive_in_charge`            |
| clientes_documentos            | Via `clients.executive_in_charge`            |
| polizas_documentos             | Via `polizas.responsable_id`                 |
| clientes_historial_ediciones   | Via `clients.executive_in_charge`            |
| siniestros_documentos          | Via `siniestros.responsable_id` o poliza     |
| siniestros_observaciones       | Via `siniestros.responsable_id` o poliza     |
| siniestros_coberturas          | Via `siniestros.responsable_id` o poliza     |
| siniestros_historial           | Via `siniestros.responsable_id` o poliza     |
| siniestros_estados_historial   | Via `siniestros.responsable_id` o poliza     |

### Archivos clave

```
docs/migration_fase3_reglas_negocio.sql              -- SQL para ejecutar en Supabase (Fase 3)
utils/auth/helpers.ts                                -- getDataScopeFilter(module?) con role
app/siniestros/actions.ts                            -- Scoping en obtenerSiniestros/detalle
app/polizas/actions.ts                               -- Scoping en obtenerDetallePoliza
app/clientes/actions.ts                              -- Scoping en getClientById
app/clientes/detail-actions.ts                       -- Scoping en getClientDetailsComplete
app/polizas/nueva/actions.ts                         -- Validacion responsable_id en equipo
components/polizas/steps/DatosBasicos.tsx             -- Auto-asignacion + filtro equipo
components/shared/ExecutiveDropdown.tsx               -- Auto-asignacion + filtro equipo
app/admin/transferencias/page.tsx                    -- UI transferencia de datos
app/admin/transferencias/actions.ts                  -- Server actions transferencia
components/admin/TransferenciasDatos.tsx              -- Componente transferencia
app/admin/dashboard-equipos/page.tsx                 -- Dashboard por equipo
app/admin/dashboard-equipos/actions.ts               -- Server actions dashboard
components/admin/DashboardEquipos.tsx                 -- Componente dashboard
app/admin/reportes/actions.ts                        -- Filtro equipo en reportes
components/admin/ExportarProduccion.tsx               -- Dropdown equipo en UI reportes
types/reporte.ts                                     -- equipo_id en filtros
```

### SQL pendiente de ejecutar

- `docs/migration_fase3_reglas_negocio.sql` - NOT NULL, vistas, RLS siniestros, RLS dependientes

### Orden de ejecucion SQL

**IMPORTANTE**: Ejecutar despues de las migraciones de Fase 1 y Fase 2:

1. `docs/migration_permissions_system.sql` (Fase 1)
2. `docs/migration_equipos_system.sql` (Fase 2)
3. `docs/migration_fase3_reglas_negocio.sql` (Fase 3)

---

## Fase 4: Optimizacion JWT + Middleware (PENDIENTE)

### Objetivo

Mejorar performance evitando llamadas RPC innecesarias.

### Ideas planificadas

- **team_member_ids en JWT**: Inyectar array de compañeros de equipo en el token para evitar la llamada RPC `get_team_member_ids()` en cada request
- **Cache de permisos**: Evaluar cache en memoria para `getDataScopeFilter()` dentro de un mismo request
- **Middleware scoping**: El middleware podria hacer pre-check de equipo ademas de permisos
- **Token refresh automatico**: Evaluar webhook o mecanismo para invalidar JWT cuando cambian permisos o equipos (actualmente requiere re-login)

### Cuando implementar

Con 4 agentes y 10 comerciales el impacto de la llamada RPC es minimo. Implementar cuando:

- El numero de usuarios crezca significativamente (50+)
- Se detecten problemas de latencia en las queries scoped
- Se necesite invalidacion automatica de permisos sin re-login

---

## Contexto Tecnico Importante

### Stack

- Next.js 15 App Router + TypeScript strict
- Supabase Auth SSR + PostgreSQL RLS
- Tailwind CSS v4 + shadcn/ui
- JWT custom claims via `custom_access_token_hook`

### Roles del sistema

| Rol        | Cantidad actual | Aislamiento       |
| ---------- | --------------- | ----------------- |
| admin      | 8               | No (bypass total) |
| comercial  | 10              | Si (equipo)       |
| agente     | 4               | Si (equipo)       |
| cobranza   | 2               | No                |
| usuario    | 2               | No                |
| siniestros | 1               | No                |

### Campos de ownership en BD

| Tabla      | Campo               | Tipo          | Uso                          |
| ---------- | ------------------- | ------------- | ---------------------------- |
| polizas    | responsable_id      | UUID NOT NULL | Responsable comercial/agente |
| polizas    | created_by          | UUID nullable | Quien creo (trigger)         |
| clients    | executive_in_charge | UUID nullable | Ejecutivo a cargo            |
| siniestros | responsable_id      | UUID nullable | Responsable del siniestro    |

### Funciones PostgreSQL clave

- `user_has_permission(p_user_id, p_permission_id)` - Verifica permiso (rol + user overrides)
- `get_user_permissions(p_user_id)` - Retorna array de permisos efectivos
- `get_team_member_ids(p_user_id)` - Retorna UUIDs de compañeros de equipo
- `user_needs_data_scoping(p_user_id)` - TRUE si es agente o comercial
- `custom_access_token_hook(event)` - Inyecta user_role + user_permissions en JWT

### Funciones TypeScript clave

```typescript
// Server-side (utils/auth/helpers.ts)
hasPermission(permission); // Boolean, admin bypass
requirePermission(permission); // Redirect si no tiene permiso, retorna UserProfile
checkPermission(permission); // { allowed, profile } sin redirect
getDataScopeFilter(); // { needsScoping, teamMemberIds, userId }

// Client-side (utils/auth/helpers.ts)
getPermissionsFromSession(); // Decode JWT, retorna string[]
hasPermissionClient(permission); // Decode JWT, boolean
```
