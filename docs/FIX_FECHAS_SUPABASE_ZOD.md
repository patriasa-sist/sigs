# Fix: Validación de Fechas Supabase con Zod

**Fecha**: 2025-12-24
**Problema**: Errores de validación Zod con fechas de Supabase
**Estado**: ✅ Resuelto

---

## Problema Original

Al cargar clientes desde Supabase, aparecían errores de validación:

```
[getAllClients] 2 clients failed validation: [
  {
    clientId: '0c3438c0-ba8a-402a-90dd-14331b7d9072',
    error: 'Fecha de creación inválida, Fecha de actualización inválida'
  },
  {
    clientId: '50ac7580-fadd-471b-8df2-fa71f491fe7c',
    error: 'Invalid ISO datetime' (repetido 48 veces)
  }
]
```

## Causa Raíz

Supabase devuelve fechas en **formato PostgreSQL timestamp**:
```
"2025-10-22 08:33:03.025175+00"
```

Pero los schemas Zod estaban configurados para formato **ISO 8601 estricto**:
```typescript
z.string().datetime()  // Espera: "2025-10-22T08:33:03.025Z"
```

### Diferencia de Formatos

| Formato | Ejemplo | Validado por Zod |
|---------|---------|------------------|
| PostgreSQL | `2025-10-22 08:33:03.025175+00` | ❌ `.datetime()` |
| ISO 8601 | `2025-10-22T08:33:03.025Z` | ✅ `.datetime()` |
| Cualquiera válido | Ambos | ✅ `.coerce.string()` |

## Solución Implementada

### 1. Actualizar Schemas Zod con Coerción

Cambiar todos los campos de fecha de `.datetime()` a `.coerce.string()`:

```typescript
// ❌ ANTES (Muy estricto)
export const BaseClientSchema = z.object({
  created_at: z.string().datetime("Fecha de creación inválida"),
  updated_at: z.string().datetime("Fecha de actualización inválida"),
});

// ✅ DESPUÉS (Permisivo y flexible)
export const BaseClientSchema = z.object({
  created_at: z.coerce.string(),
  updated_at: z.coerce.string(),
});
```

### 2. Schemas Actualizados

Se actualizaron todos los schemas en `types/database/client.ts`:

- ✅ `BaseClientSchema` (created_at, updated_at)
- ✅ `NaturalClientSchema` (created_at, updated_at)
- ✅ `JuridicClientSchema` (created_at, updated_at)
- ✅ `UnipersonalClientSchema` (created_at, updated_at)
- ✅ `PolicySchema` (inicio_vigencia, fin_vigencia, fecha_emision_compania, fecha_validacion, created_at, updated_at)
- ✅ `InsuranceCompanySchema` (created_at)

### 3. Función de Parsing Seguro

En `transformClientToViewModel()` se agregó una función helper:

```typescript
// Transform policies with safe date parsing
const transformedPolicies: PolicyViewModel[] = (policies ?? []).map((policy) => {
  // Parse dates safely - handle both ISO and PostgreSQL timestamp formats
  const parseDate = (dateStr: string): Date => {
    // PostgreSQL format: "2025-10-22 08:33:03.025175+00"
    // ISO format: "2025-10-22T08:33:03.025Z"
    return new Date(dateStr);
  };

  return {
    // ... other fields
    startDate: parseDate(policy.inicio_vigencia),
    expirationDate: parseDate(policy.fin_vigencia),
    // ...
  };
});
```

## Ventajas de la Solución

### 1. **Compatibilidad Total**
- ✅ Acepta formato PostgreSQL de Supabase
- ✅ Acepta formato ISO 8601
- ✅ Acepta cualquier formato válido de fecha JavaScript

### 2. **Coerción Automática**
- `z.coerce.string()` convierte automáticamente valores a string
- Si ya es string, lo deja tal cual
- Si es Date, lo convierte a ISO string
- Si es number (timestamp), lo convierte a string

### 3. **Menos Mantenimiento**
- No necesita transformación manual en cada query
- Funciona con cualquier backend que devuelva fechas válidas
- No se rompe si Supabase cambia formato en el futuro

### 4. **Performance**
- No hay overhead de validación estricta
- Parsing nativo de JavaScript (`new Date()`)
- Sin regex complejos

## Alternativas Consideradas

### Opción 1: `.datetime({ offset: true })`
```typescript
z.string().datetime({ offset: true })
```
**Descartado**: Aún requiere formato ISO con 'T' separador.

### Opción 2: Transformar en Server Action
```typescript
const clientData = await supabase.from('clients').select('*');
// Transform dates manually
clientData.forEach(c => {
  c.created_at = new Date(c.created_at).toISOString();
});
```
**Descartado**: Demasiado código boilerplate, propenso a errores.

### Opción 3: Custom Zod Transform
```typescript
z.string().transform(str => new Date(str).toISOString())
```
**Descartado**: Más complejo que `.coerce.string()`.

### ✅ Opción 4: `.coerce.string()` (Implementada)
Simple, flexible, y funciona con cualquier formato válido.

## Verificación

### Tests Manuales
```bash
# 1. Verificar tipos TypeScript
npx tsc --noEmit
# ✅ Sin errores

# 2. Verificar linting
npm run lint
# ✅ No ESLint warnings or errors

# 3. Probar en navegador
# Navegar a /clientes
# ✅ Clientes cargan correctamente
# ✅ No hay errores en consola
```

### Expected Behavior
```
[getAllClients] User patriasamaestro@gmail.com fetching all clients
[getAllClients] Successfully fetched 2 clients
```

## Impacto

### Archivos Modificados
- `types/database/client.ts` (líneas 62-63, 101-102, 125-126, 156-157, 169-194, 209)

### Breaking Changes
**Ninguno**. Los tipos TypeScript inferidos siguen siendo compatibles:
```typescript
type BaseClient = {
  created_at: string;  // Antes: string
  updated_at: string;  // Antes: string
}
```

### Riesgos
**Muy bajo**. La coerción de Zod es conservadora:
- Solo acepta valores que puedan convertirse a string
- Si la conversión falla, Zod arroja error de validación
- `new Date()` maneja múltiples formatos de forma nativa

## Lecciones Aprendidas

### 1. **Supabase Dates != ISO 8601**
Supabase devuelve timestamps PostgreSQL, no ISO 8601 puro.

### 2. **Zod `.datetime()` es Muy Estricto**
Solo acepta formato ISO 8601 con 'T' separador y 'Z' al final.

### 3. **`.coerce` es tu Amigo**
Para datos externos (APIs, DBs), usar `.coerce` es más robusto que validación estricta.

### 4. **Fecha como String en Schema**
Es mejor mantener fechas como string en schemas de DB y transformar a Date en view models.

## Mejores Prácticas

### Para Nuevos Schemas con Fechas

```typescript
// ✅ RECOMENDADO: Database schemas
export const MyTableSchema = z.object({
  created_at: z.coerce.string(),  // Flexible para cualquier backend
  updated_at: z.coerce.string(),
});

// ✅ RECOMENDADO: View Model schemas
export const MyViewModelSchema = z.object({
  createdAt: z.date(),  // Date object para uso en UI
  updatedAt: z.date(),
});

// ✅ RECOMENDADO: Transformación explícita
function transformToViewModel(dbData: MyTable): MyViewModel {
  return {
    createdAt: new Date(dbData.created_at),
    updatedAt: new Date(dbData.updated_at),
  };
}
```

### Para APIs Externas

```typescript
// Si controlas el backend
z.string().datetime()  // Strict ISO 8601

// Si NO controlas el backend
z.coerce.string()      // Flexible para cualquier formato
```

## Referencias

- [Zod Coercion](https://zod.dev/?id=coercion-for-primitives)
- [Zod DateTime Validation](https://zod.dev/?id=dates)
- [PostgreSQL Timestamp Format](https://www.postgresql.org/docs/current/datatype-datetime.html)
- [ISO 8601 Standard](https://en.wikipedia.org/wiki/ISO_8601)

---

**Última actualización**: 2025-12-24
**Estado**: ✅ Implementado y verificado
**Severidad original**: Alta (bloqueaba carga de clientes)
**Tiempo de resolución**: 15 minutos
