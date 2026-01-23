-- =====================================================
-- Migration: Sistema de Rechazo de Polizas Mejorado
-- Descripcion: Agrega estado "rechazada" con campos de
--              trazabilidad y permiso automatico de edicion
-- =====================================================

-- =====================================================
-- 1. AGREGAR ESTADO "RECHAZADA" AL CHECK CONSTRAINT
-- =====================================================

ALTER TABLE polizas
DROP CONSTRAINT IF EXISTS polizas_estado_check;

ALTER TABLE polizas
ADD CONSTRAINT polizas_estado_check
CHECK (estado = ANY (ARRAY[
  'pendiente'::text,
  'activa'::text,
  'vencida'::text,
  'cancelada'::text,
  'renovada'::text,
  'rechazada'::text
]));

-- =====================================================
-- 2. AGREGAR CAMPOS DE RECHAZO A POLIZAS
-- =====================================================

ALTER TABLE polizas
ADD COLUMN IF NOT EXISTS motivo_rechazo text,
ADD COLUMN IF NOT EXISTS rechazado_por uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS fecha_rechazo timestamptz,
ADD COLUMN IF NOT EXISTS puede_editar_hasta timestamptz;

COMMENT ON COLUMN polizas.motivo_rechazo IS 'Razon del rechazo por gerencia (obligatorio al rechazar)';
COMMENT ON COLUMN polizas.rechazado_por IS 'Gerente/admin que rechazo la poliza';
COMMENT ON COLUMN polizas.fecha_rechazo IS 'Fecha y hora del rechazo';
COMMENT ON COLUMN polizas.puede_editar_hasta IS 'Ventana de edicion permitida (timestamp + 1 dia al rechazar)';

-- =====================================================
-- 3. INDICE PARA POLIZAS RECHAZADAS
-- =====================================================

-- Indice para buscar polizas rechazadas por creador
-- La verificacion de puede_editar_hasta > now() se hace en la consulta
CREATE INDEX IF NOT EXISTS idx_polizas_rechazadas
ON polizas(created_by, puede_editar_hasta)
WHERE estado = 'rechazada';

-- =====================================================
-- FIN DE LA MIGRACION
-- =====================================================
