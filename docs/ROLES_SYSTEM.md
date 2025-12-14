# Sistema Centralizado de Roles

## Descripción General

El sistema de roles ha sido centralizado en **una única fuente de verdad** ubicada en `utils/auth/roles.ts`. Esto evita duplicación de código y facilita el mantenimiento y la adición de nuevos roles.

## Estructura del Sistema

### 1. Tipo Base (`utils/auth/helpers.ts`)
```typescript
export type UserRole = "admin" | "usuario" | "agente" | "comercial" | "cobranza" | "invitado" | "desactivado";
```

### 2. Configuración Centralizada (`utils/auth/roles.ts`)

Contiene:
- **VALID_ROLES**: Array de todos los roles válidos
- **ASSIGNABLE_ROLES**: Roles asignables desde la UI
- **OPERATIONAL_ROLES**: Roles con acceso operativo al sistema
- **ROLE_CONFIG**: Configuración completa de cada rol (labels, descripciones, colores, iconos, permisos)
- **Helper functions**: Funciones para trabajar con roles

## Cómo Agregar un Nuevo Rol

Sigue estos pasos en orden:

### Paso 1: Actualizar el Tipo Base
**Archivo:** `utils/auth/helpers.ts:5`

```typescript
export type UserRole =
  | "admin"
  | "usuario"
  | "agente"
  | "comercial"
  | "cobranza"
  | "invitado"
  | "desactivado"
  | "nuevo_rol";  // ← Agregar aquí
```

### Paso 2: Actualizar Constraint de Base de Datos

Crea una nueva migración SQL:

```sql
-- Archivo: supabase/migrations/YYYYMMDD_add_nuevo_rol.sql

ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check
CHECK (role = ANY (ARRAY[
  'admin'::text,
  'usuario'::text,
  'agente'::text,
  'comercial'::text,
  'cobranza'::text,
  'invitado'::text,
  'desactivado'::text,
  'nuevo_rol'::text  -- ← Agregar aquí
]));

COMMENT ON CONSTRAINT profiles_role_check ON profiles
IS 'Valida que el rol del usuario sea uno de los roles permitidos del sistema';
```

Ejecuta la migración en Supabase SQL Editor.

### Paso 3: Agregar a Configuración Centralizada
**Archivo:** `utils/auth/roles.ts`

#### 3.1 Agregar a VALID_ROLES
```typescript
export const VALID_ROLES: readonly UserRole[] = [
  "admin",
  "usuario",
  "agente",
  "comercial",
  "cobranza",
  "invitado",
  "desactivado",
  "nuevo_rol"  // ← Agregar aquí
] as const;
```

#### 3.2 Agregar a ASSIGNABLE_ROLES (si aplica)
```typescript
export const ASSIGNABLE_ROLES: readonly UserRole[] = [
  "admin",
  "usuario",
  "agente",
  "comercial",
  "cobranza",
  "invitado",
  "desactivado",
  "nuevo_rol"  // ← Agregar aquí (solo si es asignable desde UI)
] as const;
```

#### 3.3 Agregar a OPERATIONAL_ROLES (si aplica)
```typescript
export const OPERATIONAL_ROLES: readonly UserRole[] = [
  "admin",
  "usuario",
  "agente",
  "comercial",
  "cobranza",
  "nuevo_rol"  // ← Agregar aquí (solo si tiene acceso operativo)
] as const;
```

#### 3.4 Agregar Configuración Completa a ROLE_CONFIG
```typescript
export const ROLE_CONFIG = {
  // ... otros roles ...

  nuevo_rol: {
    label: "New Role",
    labelEs: "Nuevo Rol",
    description: "English description of what this role does",
    descriptionEs: "Descripción en español de lo que hace este rol",
    color: "indigo",  // Color de Tailwind (orange, blue, green, violet, etc.)
    icon: UserCheck,  // Icono de lucide-react
    colorClasses: {
      bg: "bg-indigo-50",
      text: "text-indigo-600",
      border: "border-indigo-200",
      gradient: "from-indigo-50 to-white"
    },
    permissions: {
      canManageUsers: false,
      canManageRoles: false,
      canSendInvitations: false,
      canValidatePolicies: false,
      canCreatePolicies: false,
      canViewPayments: false,
      canManagePayments: false,
      canDeleteDocuments: false
    }
  }
} as const;
```

### Paso 4: Actualizar Políticas RLS (si necesario)

Si el nuevo rol necesita acceso especial a ciertas tablas, actualiza las políticas RLS correspondientes:

```sql
-- Ejemplo: Agregar nuevo_rol a una política existente
DROP POLICY IF EXISTS "select_pagos_roles_operativos" ON polizas_pagos;
CREATE POLICY "select_pagos_roles_operativos" ON polizas_pagos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'usuario', 'comercial', 'agente', 'cobranza', 'nuevo_rol')
    )
  );
```

## Archivos que Usan el Sistema Centralizado

Estos archivos ya están configurados para usar automáticamente los nuevos roles:

1. ✅ `utils/auth/roles.ts` - Configuración centralizada
2. ✅ `utils/auth/helpers.ts` - Tipo base
3. ✅ `app/admin/roles/page.tsx` - Página de gestión de roles
4. ✅ `app/admin/roles/components/UserRoleManager.tsx` - Componente de cambio de roles
5. ✅ `app/admin/actions.ts` - Server actions para actualizar roles

## Funciones Helper Disponibles

```typescript
import {
  getRoleConfig,
  getRoleLabel,
  getRoleDescription,
  isAssignableRole,
  isOperationalRole,
  hasPermission,
  VALID_ROLES,
  ASSIGNABLE_ROLES,
  OPERATIONAL_ROLES
} from "@/utils/auth/roles";

// Obtener configuración completa de un rol
const config = getRoleConfig("cobranza");

// Obtener label traducido
const label = getRoleLabel("cobranza", "es");  // "Cobranza"
const labelEn = getRoleLabel("cobranza", "en"); // "Cobranza"

// Obtener descripción traducida
const desc = getRoleDescription("cobranza", "es");

// Verificar si es asignable
const assignable = isAssignableRole("cobranza");  // true

// Verificar si es operativo
const operational = isOperationalRole("invitado");  // false

// Verificar permisos
const canManage = hasPermission("cobranza", "canManagePayments");  // true

// Iterar todos los roles
VALID_ROLES.forEach(role => {
  console.log(getRoleLabel(role));
});
```

## Permisos del Sistema

Los permisos están definidos en `ROLE_CONFIG[role].permissions`:

- **canManageUsers**: Puede gestionar usuarios (crear, editar, eliminar)
- **canManageRoles**: Puede cambiar roles de usuarios
- **canSendInvitations**: Puede enviar invitaciones
- **canValidatePolicies**: Puede validar/rechazar pólizas pendientes
- **canCreatePolicies**: Puede crear nuevas pólizas
- **canViewPayments**: Puede ver cuotas de pago
- **canManagePayments**: Puede editar cuotas de pago (registrar pagos, cambiar estados)
- **canDeleteDocuments**: Puede eliminar permanentemente documentos

## Roles Actuales del Sistema

| Rol | Label | Descripción | Permisos Principales |
|-----|-------|-------------|----------------------|
| **admin** | Administrador | Acceso completo al sistema | Todos los permisos |
| **usuario** | Usuario | Usuario estándar con validación | Validar pólizas, ver pagos |
| **agente** | Agente | Agente de seguros | Crear pólizas, ver pagos |
| **comercial** | Comercial | Comercial de ventas | Crear pólizas, ver pagos |
| **cobranza** | Cobranza | Gestión de cobros | Ver y gestionar pagos |
| **invitado** | Invitado | Acceso limitado | Sin permisos operativos |
| **desactivado** | Desactivado | Cuenta desactivada | Sin acceso |

## Ejemplos de Uso en Código

### Renderizar Roles Dinámicamente
```typescript
import { VALID_ROLES, getRoleConfig, getRoleLabel } from "@/utils/auth/roles";

// En un componente
{VALID_ROLES.map((role) => {
  const config = getRoleConfig(role);
  const Icon = config.icon;

  return (
    <div key={role}>
      <Icon className={config.colorClasses.text} />
      {getRoleLabel(role)}
    </div>
  );
})}
```

### Validar Permisos
```typescript
import { hasPermission } from "@/utils/auth/roles";

// Verificar si el usuario puede gestionar pagos
if (hasPermission(userRole, "canManagePayments")) {
  // Mostrar botón de gestión de pagos
}
```

### Filtrar Roles Operativos
```typescript
import { OPERATIONAL_ROLES } from "@/utils/auth/roles";

// Crear política RLS
WHERE role IN ('admin', 'usuario', 'comercial', 'agente', 'cobranza')

// Mejor: usar OPERATIONAL_ROLES para mantener sincronizado
WHERE role = ANY(ARRAY[/* valores de OPERATIONAL_ROLES */])
```

## Ventajas del Sistema Centralizado

✅ **Única fuente de verdad**: Todos los roles definidos en un solo lugar
✅ **Fácil mantenimiento**: Agregar/modificar roles en 3 pasos simples
✅ **Consistencia**: Mismos labels e iconos en toda la aplicación
✅ **Type-safe**: TypeScript garantiza uso correcto de roles
✅ **Escalable**: Agregar permisos sin tocar múltiples archivos
✅ **Documentado**: Configuración autodocumentada con comentarios

## Troubleshooting

### El nuevo rol no aparece en la UI
1. Verifica que agregaste el rol a `ASSIGNABLE_ROLES`
2. Verifica que agregaste la configuración completa a `ROLE_CONFIG`
3. Reinicia el servidor de desarrollo

### Error al guardar rol en base de datos
1. Verifica que ejecutaste la migración SQL
2. Verifica que el constraint incluye el nuevo rol
3. Revisa los logs de Supabase

### Los permisos no funcionan correctamente
1. Verifica que configuraste `permissions` en `ROLE_CONFIG`
2. Verifica que usas `hasPermission()` correctamente
3. Actualiza las políticas RLS si es necesario

## Mantenimiento Futuro

Para mantener el sistema saludable:

1. **NUNCA hardcodear roles** en componentes o páginas
2. **SIEMPRE usar** `VALID_ROLES`, `ASSIGNABLE_ROLES`, etc.
3. **SIEMPRE usar** helpers como `getRoleLabel()`, `getRoleConfig()`
4. **Documentar** nuevos permisos agregados a `permissions`
5. **Actualizar esta guía** cuando cambies la estructura

## Referencias

- Configuración: `utils/auth/roles.ts`
- Tipo base: `utils/auth/helpers.ts`
- Ejemplo de uso: `app/admin/roles/page.tsx`
- Ejemplo de componente: `app/admin/roles/components/UserRoleManager.tsx`
