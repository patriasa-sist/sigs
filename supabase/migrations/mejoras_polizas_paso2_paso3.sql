-- Migración: Mejoras en el flujo de creación de pólizas (Paso 2 y Paso 3)
-- Fecha: 2025-12-08
-- Descripción: Agrega nuevos campos y actualiza validaciones para el sistema de pólizas
--
-- ═══════════════════════════════════════════════════════════════════════════════
-- IMPORTANTE: CONSTANTES CENTRALIZADAS
-- ═══════════════════════════════════════════════════════════════════════════════
-- Los valores de validación deben coincidir con utils/validationConstants.ts
-- (única fuente de verdad para el frontend)
--
-- Referencia de constantes del sistema:
--   VEHICULO_RULES.ANO_MIN = 1950
--   VEHICULO_RULES.ANO_MAX = 2050
--   VEHICULO_RULES.COASEGURO_MIN = 0
--   VEHICULO_RULES.COASEGURO_MAX = 100
--   VEHICULO_RULES.FRANQUICIAS_DISPONIBLES = [700, 1000, 1400]
--   POLIZA_RULES.GRUPOS_PRODUCCION = ['generales', 'personales']
--   POLIZA_RULES.MONEDAS = ['Bs', 'USD', 'USDT', 'UFV']
-- ═══════════════════════════════════════════════════════════════════════════════

-- =============================================
-- PREPARACIÓN: DESHABILITAR TRIGGERS TEMPORALMENTE
-- =============================================
-- Los triggers de historial requieren auth.uid() que no está disponible en migraciones
-- Se deshabilitan temporalmente para permitir ALTER TABLE sin errores
-- IMPORTANTE: Solo deshabilitamos triggers de usuario, NO triggers de sistema (FK, etc.)

ALTER TABLE polizas DISABLE TRIGGER audit_polizas_trigger;
ALTER TABLE polizas DISABLE TRIGGER trigger_historial_polizas;
ALTER TABLE polizas_automotor_vehiculos DISABLE TRIGGER audit_vehiculos_trigger;

-- =============================================
-- PASO 2: MEJORAS EN DATOS BÁSICOS
-- =============================================

-- 1. Agregar campo grupo_produccion a polizas
-- Ref: POLIZA_RULES.GRUPOS_PRODUCCION
ALTER TABLE polizas
ADD COLUMN IF NOT EXISTS grupo_produccion text CHECK (grupo_produccion IN ('generales', 'personales'));

COMMENT ON COLUMN polizas.grupo_produccion IS 'Grupo de producción: generales o personales';

-- 2. Agregar campo moneda a polizas (ya existe en polizas, pero aseguramos que sea requerido)
-- La columna moneda ya existe, solo agregamos el comentario
COMMENT ON COLUMN polizas.moneda IS 'Moneda de la póliza: Bs, USD, USDT, o UFV';

-- 3. Hacer categoria_id nullable (ahora es opcional - Grupo de negocios)
ALTER TABLE polizas
ALTER COLUMN categoria_id DROP NOT NULL;

COMMENT ON COLUMN polizas.categoria_id IS 'Grupo de negocios (opcional, antes Categoría)';

-- =============================================
-- PASO 3: MEJORAS EN AUTOMOTOR
-- =============================================

-- 4. Agregar campo coaseguro a polizas_automotor_vehiculos
-- Ref: VEHICULO_RULES.COASEGURO_MIN, VEHICULO_RULES.COASEGURO_MAX
ALTER TABLE polizas_automotor_vehiculos
ADD COLUMN IF NOT EXISTS coaseguro numeric(5,2) NOT NULL DEFAULT 0 CHECK (coaseguro >= 0 AND coaseguro <= 100);

COMMENT ON COLUMN polizas_automotor_vehiculos.coaseguro IS 'Porcentaje de coaseguro (0-100%)';

-- 5. Cambiar tipo de columna ano de text a integer
-- Ref: VEHICULO_RULES.ANO_MIN, VEHICULO_RULES.ANO_MAX
-- Primero, convertimos los valores existentes a integer (si hay datos)
ALTER TABLE polizas_automotor_vehiculos
ALTER COLUMN ano TYPE integer USING
  CASE
    WHEN ano ~ '^\d+$' THEN ano::integer
    ELSE NULL
  END;

-- Agregar constraint de validación para años (rango definido en constantes)
ALTER TABLE polizas_automotor_vehiculos
ADD CONSTRAINT vehiculo_ano_valido CHECK (ano IS NULL OR (ano >= 1950 AND ano <= 2050));

COMMENT ON COLUMN polizas_automotor_vehiculos.ano IS 'Año del vehículo (1950-2050)';

-- =============================================
-- ACTUALIZACIONES DE CATÁLOGOS
-- =============================================

-- 6. Actualizar tipos_vehiculo: agregar "Semiremolque" y "Tracto Camion", eliminar "Trailer"

-- Desactivar "Trailer" (si existe)
UPDATE tipos_vehiculo
SET activo = false
WHERE nombre = 'Trailer';

-- Agregar "Semiremolque" (si no existe)
INSERT INTO tipos_vehiculo (nombre, activo)
SELECT 'Semiremolque', true
WHERE NOT EXISTS (
  SELECT 1 FROM tipos_vehiculo WHERE nombre = 'Semiremolque'
);

-- Agregar "Tracto Camion" (si no existe)
INSERT INTO tipos_vehiculo (nombre, activo)
SELECT 'Tracto Camion', true
WHERE NOT EXISTS (
  SELECT 1 FROM tipos_vehiculo WHERE nombre = 'Tracto Camion'
);

-- =============================================
-- ACTUALIZAR VALORES POR DEFECTO
-- =============================================

-- Establecer valor por defecto para grupo_produccion en registros existentes
UPDATE polizas
SET grupo_produccion = 'generales'
WHERE grupo_produccion IS NULL;

-- Ahora hacer el campo NOT NULL
ALTER TABLE polizas
ALTER COLUMN grupo_produccion SET NOT NULL;

-- Establecer valor por defecto para moneda en registros existentes (si hay NULL)
UPDATE polizas
SET moneda = 'Bs'
WHERE moneda IS NULL;

-- =============================================
-- ÍNDICES PARA MEJOR PERFORMANCE
-- =============================================

-- Índice para búsquedas por grupo de producción
CREATE INDEX IF NOT EXISTS idx_polizas_grupo_produccion ON polizas(grupo_produccion);

-- Índice para búsquedas por coaseguro
CREATE INDEX IF NOT EXISTS idx_vehiculos_coaseguro ON polizas_automotor_vehiculos(coaseguro);

-- =============================================
-- COMENTARIOS ADICIONALES
-- =============================================

COMMENT ON CONSTRAINT vehiculo_ano_valido ON polizas_automotor_vehiculos IS 'Valida que el año del vehículo esté entre 1950 y 2050';

-- =============================================
-- FINALIZACIÓN: REACTIVAR TRIGGERS
-- =============================================
-- Reactivar los triggers de usuario después de completar los cambios de schema

ALTER TABLE polizas ENABLE TRIGGER audit_polizas_trigger;
ALTER TABLE polizas ENABLE TRIGGER trigger_historial_polizas;
ALTER TABLE polizas_automotor_vehiculos ENABLE TRIGGER audit_vehiculos_trigger;
