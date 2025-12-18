# Resumen del Sistema de Pólizas

## ✅ Completado Hasta Ahora

### 1. Base de Datos (Supabase)

#### Migraciones Ejecutadas:
- ✅ `migration_polizas_system.sql` - Sistema completo de pólizas
- ✅ `migration_add_audit_fields.sql` - Campos de auditoría
- ✅ `migration_historial_basico.sql` - Historial de ediciones

#### Tablas Creadas:

**Catálogos:**
- `companias_aseguradoras` - 17 compañías precargadas
- `regionales` - 9 departamentos de Bolivia
- `categorias` - Grupos y asociaciones
- `tipos_vehiculo` - 9 tipos precargados
- `marcas_vehiculo` - 11 marcas precargadas

**Sistema de Pólizas:**
- `polizas` - Tabla principal con datos comunes
- `polizas_pagos` - Cuotas de pago (contado/crédito)
- `polizas_documentos` - Documentos digitalizados
- `polizas_automotor_vehiculos` - Vehículos (relación 1:N)

**Auditoría:**
- `polizas_historial_ediciones` - Log completo de acciones
- Vista: `polizas_con_auditoria` - Pólizas con info de usuarios
- Vista: `polizas_historial_vista` - Historial con nombres de usuarios

#### Características de BD:
- ✅ Triggers automáticos para `created_by`, `updated_by`
- ✅ Validaciones con CHECK constraints
- ✅ Campos calculados (prima_neta, comision)
- ✅ Índices para búsquedas rápidas
- ✅ Cascadas en deletes

---

### 2. TypeScript Types

#### Archivo: `types/poliza.ts`

**Tipos Creados:**
- ✅ Catálogos: `CompaniaAseguradora`, `Regional`, `Categoria`, `TipoVehiculo`, `MarcaVehiculo`
- ✅ Clientes: `ClienteNatural`, `ClienteJuridico`, `AseguradoSeleccionado`
- ✅ Paso 1: `AseguradoSeleccionado`
- ✅ Paso 2: `DatosBasicosPoliza`
- ✅ Paso 3: `VehiculoAutomotor`, `DatosAutomotor`, `DatosEspecificosPoliza` (unión discriminada)
- ✅ Paso 4: `ModalidadPago`, `PagoContado`, `PagoCredito`, `CuotaCredito`
- ✅ Paso 5: `DocumentoPoliza`
- ✅ Paso 6: `AdvertenciaPoliza`
- ✅ Estado: `PolizaFormState`
- ✅ BD: `PolizaDB`, `PagoPolizaDB`, `DocumentoPolizaDB`, `VehiculoAutomotorDB`
- ✅ Excel: `VehiculoExcelRow`, `ExcelImportResult`
- ✅ Validación: `ValidationError`, `ValidationResult`

**Total:** 30+ tipos completamente definidos

---

### 3. Utilidades de Validación

#### Archivo: `utils/polizaValidation.ts`

**Funciones:**
- ✅ `validarDatosBasicos()` - Valida paso 2 (fechas, campos requeridos)
- ✅ `validarVehiculoAutomotor()` - Valida cada vehículo
- ✅ `validarPlacasUnicas()` - Detecta duplicados
- ✅ `validarModalidadPago()` - Valida contado/crédito y suma de cuotas
- ✅ `validarFechasPago()` - Previene fechas pasadas
- ✅ `calcularPrimaNetaYComision()` - Cálculos automáticos (87%, 2%)
- ✅ `calcularCuotasEquitativas()` - Distribución equitativa
- ✅ `generarAdvertenciasVehiculo()` - Campos opcionales vacíos
- ✅ `validarDocumentosMinimos()` - Validación de documentos

---

### 4. Import de Excel

#### Archivo: `utils/vehiculoExcelImport.ts`

**Características:**
- ✅ Importa vehículos desde Excel (.xlsx)
- ✅ Mapeo flexible de columnas (case-insensitive, sin acentos)
- ✅ Validación automática de cada fila
- ✅ Reporte detallado de errores por fila
- ✅ Conversión automática de tipos (string → number)
- ✅ Normalización de valores ("público" → "publico")
- ✅ Función para generar template: `generarTemplateExcel()`

**Columnas Soportadas:**
- Obligatorias: placa, valor_asegurado, franquicia, nro_chasis, uso
- Opcionales: tipo_vehiculo, marca, modelo, año, color, ejes, nro_motor, nro_asientos, plaza_circulacion

---

## 📋 Próximos Pasos

### Paso 4: Implementar Componentes del Formulario

Necesitamos crear los componentes React para cada paso del formulario:

1. **Componente principal**: `NuevaPolizaForm.tsx`
   - Orquesta todo el flujo
   - Maneja estado global con `PolizaFormState`
   - Navegación entre pasos

2. **Paso 1**: `BuscarAsegurado.tsx`
   - Buscador de clientes (natural/jurídico)
   - Tabla de resultados
   - Selección de asegurado

3. **Paso 2**: `DatosBasicos.tsx`
   - Formulario con dropdowns de catálogos
   - Selectores de fecha
   - Validación en tiempo real

4. **Paso 3**: `DatosEspecificos.tsx` + `AutomotorForm.tsx`
   - Router que carga formulario según ramo
   - Tabla de vehículos
   - Modal para agregar/editar vehículos
   - Botón de importar Excel

5. **Paso 4**: `ModalidadPago.tsx`
   - Tabs: Contado vs Crédito
   - Cálculos automáticos de cuotas
   - Validación de fechas

6. **Paso 5**: `CargarDocumentos.tsx`
   - Drag & drop con react-dropzone
   - Upload a Supabase Storage
   - Lista de documentos cargados

7. **Paso 6**: `Resumen.tsx`
   - Visualización completa de datos
   - Lista de advertencias
   - Botón "Guardar Póliza"
   - Generación de PDF

---

## 🎯 Arquitectura del Formulario

```
┌────────────────────────────────────────┐
│  app/polizas/nueva/page.tsx            │
│  (Página contenedora)                  │
└─────────────┬──────────────────────────┘
              │
              ▼
┌────────────────────────────────────────┐
│  NuevaPolizaForm.tsx                   │
│  - Estado: PolizaFormState             │
│  - Paso actual: 1-6                    │
│  - Navegación                          │
└─────────────┬──────────────────────────┘
              │
              ├─▶ BuscarAsegurado (Paso 1)
              ├─▶ DatosBasicos (Paso 2)
              ├─▶ DatosEspecificos → AutomotorForm (Paso 3)
              ├─▶ ModalidadPago (Paso 4)
              ├─▶ CargarDocumentos (Paso 5)
              └─▶ Resumen (Paso 6)
```

**Flujo de Datos:**
- Estado se mantiene en `NuevaPolizaForm` (componente padre)
- Cada paso recibe props: `datos`, `onChange`, `onNext`, `onPrev`
- Validación antes de permitir avanzar
- Solo al final (paso 6) se guarda en Supabase

---

## 🔑 Decisiones de Arquitectura

### Base de Datos
✅ **Tabla base + Tablas específicas por ramo** (en lugar de tabla única o JSONB)
- Normalización correcta
- Validaciones a nivel de BD
- TypeScript fuertemente tipado

### Trazabilidad
✅ **Historial básico** (en lugar de solo último editor o snapshot completo)
- Registra quién, cuándo, qué campos
- No guarda valores (ligero)
- Forense completo

### Formulario
✅ **Flujo vertical acumulativo** (en lugar de wizard con pasos ocultos)
- Toda la información visible
- Navegación flexible hacia atrás
- Modificación de pasos previos
- Guardado solo al final

### Vehículos Automotor
✅ **Relación 1:N con tabla dedicada** (en lugar de JSONB)
- Múltiples vehículos por póliza
- Búsqueda eficiente por placa
- Import masivo desde Excel

---

## 📊 Métricas del Sistema

- **Tablas creadas:** 9 tablas + 2 vistas
- **Tipos TypeScript:** 30+ tipos
- **Funciones de validación:** 9 funciones
- **Catálogos precargados:** 46 registros
- **Campos de auditoría:** 4 por tabla (created_by, updated_by, created_at, updated_at)

---

## ¿Continuamos con los componentes React?

Ahora que tenemos toda la base sólida (BD + Types + Validaciones), podemos proceder a implementar los componentes del formulario paso a paso.

**¿Comenzamos con el Paso 1 (BuscarAsegurado)?**
