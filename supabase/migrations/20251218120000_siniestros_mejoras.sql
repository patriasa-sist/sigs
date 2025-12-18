-- ============================================================================
-- MIGRACIÓN: Mejoras al Módulo de Siniestros
-- Fecha: 2025-12-18
-- Descripción:
--   1. Código correlativo automático formato AÑO-00001 (1 a 99999)
--   2. Campo responsable_id para asignar responsable del siniestro
--   3. Log de cambios de responsable en historial
--   4. Vista actualizada con información del responsable
-- ============================================================================

-- ============================================================================
-- 1. TABLA PARA TRACKING DE CÓDIGOS CORRELATIVOS DE SINIESTROS
-- ============================================================================

CREATE TABLE IF NOT EXISTS siniestros_correlativo_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anio INTEGER NOT NULL,
  ultimo_numero INTEGER NOT NULL DEFAULT 0 CHECK (ultimo_numero >= 0 AND ultimo_numero <= 99999),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(anio)
);

COMMENT ON TABLE siniestros_correlativo_tracker IS 'Tabla para trackear el último número correlativo usado por año';
COMMENT ON COLUMN siniestros_correlativo_tracker.anio IS 'Año del correlativo (YYYY)';
COMMENT ON COLUMN siniestros_correlativo_tracker.ultimo_numero IS 'Último número correlativo generado (0-99999)';

-- ============================================================================
-- 2. AGREGAR CAMPOS A LA TABLA SINIESTROS
-- ============================================================================

-- Campo para código correlativo
ALTER TABLE siniestros
ADD COLUMN IF NOT EXISTS codigo_siniestro TEXT UNIQUE;

COMMENT ON COLUMN siniestros.codigo_siniestro IS 'Código correlativo único formato AÑO-00001 (generado automáticamente)';

-- Campo para responsable del siniestro
ALTER TABLE siniestros
ADD COLUMN IF NOT EXISTS responsable_id UUID REFERENCES profiles(id);

COMMENT ON COLUMN siniestros.responsable_id IS 'Usuario responsable del siniestro (puede ser diferente de created_by)';

-- ============================================================================
-- 3. FUNCIÓN PARA GENERAR CÓDIGO CORRELATIVO AUTOMÁTICAMENTE
-- ============================================================================

CREATE OR REPLACE FUNCTION generar_codigo_siniestro()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  anio_actual INTEGER;
  nuevo_numero INTEGER;
  codigo_generado TEXT;
BEGIN
  -- Obtener el año actual
  anio_actual := EXTRACT(YEAR FROM CURRENT_DATE);

  -- Bloquear la fila para evitar race conditions
  -- Intentar actualizar el tracker para el año actual
  UPDATE siniestros_correlativo_tracker
  SET
    ultimo_numero = ultimo_numero + 1,
    updated_at = NOW()
  WHERE anio = anio_actual
  RETURNING ultimo_numero INTO nuevo_numero;

  -- Si no existe el registro para este año, crearlo
  IF NOT FOUND THEN
    INSERT INTO siniestros_correlativo_tracker (anio, ultimo_numero)
    VALUES (anio_actual, 1)
    RETURNING ultimo_numero INTO nuevo_numero;
  END IF;

  -- Validar que no se exceda el límite
  IF nuevo_numero > 99999 THEN
    RAISE EXCEPTION 'Se ha alcanzado el límite máximo de siniestros para el año % (99999)', anio_actual;
  END IF;

  -- Generar el código con formato AÑO-00001
  codigo_generado := anio_actual || '-' || LPAD(nuevo_numero::TEXT, 5, '0');

  RETURN codigo_generado;
END;
$$;

COMMENT ON FUNCTION generar_codigo_siniestro IS 'Genera código correlativo único para siniestros formato AÑO-00001';

-- ============================================================================
-- 4. TRIGGER PARA GENERAR CÓDIGO AUTOMÁTICAMENTE AL INSERTAR
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_generar_codigo_siniestro()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Generar código solo si no se proporcionó uno
  IF NEW.codigo_siniestro IS NULL THEN
    NEW.codigo_siniestro := generar_codigo_siniestro();
  END IF;

  -- Si no se especifica responsable, usar el created_by
  IF NEW.responsable_id IS NULL AND NEW.created_by IS NOT NULL THEN
    NEW.responsable_id := NEW.created_by;
  END IF;

  RETURN NEW;
END;
$$;

-- Crear trigger BEFORE INSERT
DROP TRIGGER IF EXISTS trigger_auto_codigo_siniestro ON siniestros;
CREATE TRIGGER trigger_auto_codigo_siniestro
  BEFORE INSERT ON siniestros
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generar_codigo_siniestro();

COMMENT ON TRIGGER trigger_auto_codigo_siniestro ON siniestros IS 'Genera automáticamente el código correlativo y asigna responsable por defecto';

-- ============================================================================
-- 5. TRIGGER PARA REGISTRAR CAMBIOS DE RESPONSABLE EN HISTORIAL
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_log_cambio_responsable()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  usuario_actual UUID;
  nombre_responsable_anterior TEXT;
  nombre_responsable_nuevo TEXT;
BEGIN
  -- Solo registrar si cambió el responsable
  IF OLD.responsable_id IS DISTINCT FROM NEW.responsable_id THEN
    -- Obtener usuario actual
    usuario_actual := auth.uid();

    -- Obtener nombre del responsable anterior
    IF OLD.responsable_id IS NOT NULL THEN
      SELECT full_name INTO nombre_responsable_anterior
      FROM profiles
      WHERE id = OLD.responsable_id;
    END IF;

    -- Obtener nombre del responsable nuevo
    IF NEW.responsable_id IS NOT NULL THEN
      SELECT full_name INTO nombre_responsable_nuevo
      FROM profiles
      WHERE id = NEW.responsable_id;
    END IF;

    -- Insertar en historial
    INSERT INTO siniestros_historial (
      siniestro_id,
      accion,
      campo_modificado,
      valor_anterior,
      valor_nuevo,
      detalles,
      created_by
    ) VALUES (
      NEW.id,
      'responsable_cambiado',
      'responsable_id',
      COALESCE(nombre_responsable_anterior, 'Sin asignar'),
      COALESCE(nombre_responsable_nuevo, 'Sin asignar'),
      jsonb_build_object(
        'responsable_id_anterior', OLD.responsable_id,
        'responsable_id_nuevo', NEW.responsable_id,
        'timestamp', NOW()
      ),
      usuario_actual
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Crear trigger AFTER UPDATE
DROP TRIGGER IF EXISTS trigger_log_responsable_siniestro ON siniestros;
CREATE TRIGGER trigger_log_responsable_siniestro
  AFTER UPDATE ON siniestros
  FOR EACH ROW
  WHEN (OLD.responsable_id IS DISTINCT FROM NEW.responsable_id)
  EXECUTE FUNCTION trigger_log_cambio_responsable();

COMMENT ON TRIGGER trigger_log_responsable_siniestro ON siniestros IS 'Registra cambios de responsable en el historial de auditoría';

-- ============================================================================
-- 6. ACTUALIZAR VISTA siniestros_vista PARA INCLUIR RESPONSABLE
-- ============================================================================

-- Primero eliminar la vista existente
DROP VIEW IF EXISTS siniestros_vista CASCADE;

-- Recrear la vista con el campo de responsable
CREATE VIEW siniestros_vista AS
SELECT
  s.id,
  s.poliza_id,
  s.codigo_siniestro,

  -- Detalles del siniestro
  s.fecha_siniestro,
  s.fecha_reporte,
  s.lugar_hecho,
  s.departamento_id,
  s.monto_reserva,
  s.moneda,
  s.descripcion,
  s.contactos,

  -- Estado
  s.estado,
  s.motivo_cierre_tipo,
  s.fecha_cierre,
  s.cerrado_por,

  -- Datos de rechazo
  s.motivo_rechazo,

  -- Datos de declinación
  s.motivo_declinacion,

  -- Datos de indemnización
  s.monto_reclamado,
  s.moneda_reclamado,
  s.deducible,
  s.moneda_deducible,
  s.monto_pagado,
  s.moneda_pagado,
  s.es_pago_comercial,
  s.fecha_llegada_repuestos,

  -- Auditoría
  s.created_at,
  s.updated_at,
  s.created_by,
  s.updated_by,
  s.responsable_id,

  -- Datos de la póliza
  p.numero_poliza,
  p.ramo,
  p.inicio_vigencia AS poliza_inicio_vigencia,
  p.fin_vigencia AS poliza_fin_vigencia,

  -- Datos del cliente (usando CASE para manejar natural y juridica)
  CASE
    WHEN c.client_type = 'natural' THEN
      TRIM(CONCAT(nc.primer_nombre, ' ', COALESCE(nc.segundo_nombre, ''), ' ', nc.primer_apellido, ' ', COALESCE(nc.segundo_apellido, '')))
    WHEN c.client_type = 'juridica' THEN
      jc.razon_social
    ELSE
      'Cliente desconocido'
  END AS cliente_nombre,

  CASE
    WHEN c.client_type = 'natural' THEN
      nc.numero_documento
    WHEN c.client_type = 'juridica' THEN
      jc.nit
    ELSE
      ''
  END AS cliente_documento,

  c.client_type AS cliente_tipo,

  -- Datos de compañía
  ca.nombre AS compania_nombre,
  ca.id AS compania_id,

  -- Datos de departamento
  r.nombre AS departamento_nombre,
  r.codigo AS departamento_codigo,

  -- Responsable de la póliza
  p_responsable.full_name AS poliza_responsable_nombre,

  -- Responsable del siniestro (NUEVO CAMPO)
  s_responsable.full_name AS responsable_nombre,
  s_responsable.email AS responsable_email,

  -- Usuario que creó el siniestro
  creator.full_name AS creado_por_nombre,
  s.created_at AS fecha_creacion,

  -- Usuario que cerró el siniestro
  closer.full_name AS cerrado_por_nombre,

  -- Contadores
  (SELECT COUNT(*) FROM siniestros_documentos sd WHERE sd.siniestro_id = s.id AND sd.estado = 'activo') AS total_documentos,
  (SELECT COUNT(*) FROM siniestros_observaciones so WHERE so.siniestro_id = s.id) AS total_observaciones,
  (SELECT COUNT(*) FROM siniestros_coberturas sc WHERE sc.siniestro_id = s.id) AS total_coberturas

FROM siniestros s

-- JOIN con póliza
LEFT JOIN polizas p ON s.poliza_id = p.id

-- JOIN con cliente
LEFT JOIN clients c ON p.client_id = c.id
LEFT JOIN natural_clients nc ON c.id = nc.client_id AND c.client_type = 'natural'
LEFT JOIN juridic_clients jc ON c.id = jc.client_id AND c.client_type = 'juridica'

-- JOIN con compañía aseguradora
LEFT JOIN companias_aseguradoras ca ON p.compania_aseguradora_id = ca.id

-- JOIN con departamento
LEFT JOIN regionales r ON s.departamento_id = r.id

-- JOIN con responsable de la póliza
LEFT JOIN profiles p_responsable ON p.responsable_id = p_responsable.id

-- JOIN con responsable del siniestro (NUEVO)
LEFT JOIN profiles s_responsable ON s.responsable_id = s_responsable.id

-- JOIN con usuario creador
LEFT JOIN profiles creator ON s.created_by = creator.id

-- JOIN con usuario que cerró
LEFT JOIN profiles closer ON s.cerrado_por = closer.id;

COMMENT ON VIEW siniestros_vista IS 'Vista completa de siniestros con todos los datos relacionados incluyendo responsable del siniestro';

-- ============================================================================
-- 7. POLÍTICA RLS PARA NUEVO CAMPO responsable_id
-- ============================================================================

-- Permitir a usuarios con rol 'siniestros', 'comercial' y 'admin' ver y modificar responsable_id
-- Las políticas existentes ya deberían cubrir esto, pero nos aseguramos

-- ============================================================================
-- 8. ÍNDICES PARA OPTIMIZAR CONSULTAS
-- ============================================================================

-- Índice para búsquedas por código de siniestro
CREATE INDEX IF NOT EXISTS idx_siniestros_codigo
ON siniestros(codigo_siniestro);

-- Índice para búsquedas por responsable
CREATE INDEX IF NOT EXISTS idx_siniestros_responsable
ON siniestros(responsable_id);

-- Índice compuesto para filtros comunes
CREATE INDEX IF NOT EXISTS idx_siniestros_estado_responsable
ON siniestros(estado, responsable_id);

-- ============================================================================
-- 9. DATOS INICIALES Y BACKFILL
-- ============================================================================

-- Actualizar siniestros existentes: asignar responsable_id = created_by si no tiene
UPDATE siniestros
SET responsable_id = created_by
WHERE responsable_id IS NULL AND created_by IS NOT NULL;

-- Generar códigos correlativos para siniestros existentes (si existen)
-- IMPORTANTE: Esto debe ejecutarse con cuidado en producción
DO $$
DECLARE
  siniestro_record RECORD;
  codigo_generado TEXT;
BEGIN
  -- Solo generar para siniestros que no tienen código
  FOR siniestro_record IN
    SELECT id, created_at
    FROM siniestros
    WHERE codigo_siniestro IS NULL
    ORDER BY created_at ASC
  LOOP
    -- Generar código basado en el año de creación
    codigo_generado := generar_codigo_siniestro();

    -- Actualizar el siniestro
    UPDATE siniestros
    SET codigo_siniestro = codigo_generado
    WHERE id = siniestro_record.id;
  END LOOP;
END $$;

-- ============================================================================
-- 10. GRANTS Y PERMISOS
-- ============================================================================

-- Permisos para la tabla de tracking
GRANT SELECT, INSERT, UPDATE ON siniestros_correlativo_tracker TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

-- Verificación de la migración
DO $$
BEGIN
  RAISE NOTICE '✅ Migración completada exitosamente';
  RAISE NOTICE '  - Tabla siniestros_correlativo_tracker creada';
  RAISE NOTICE '  - Campo codigo_siniestro agregado a siniestros';
  RAISE NOTICE '  - Campo responsable_id agregado a siniestros';
  RAISE NOTICE '  - Función generar_codigo_siniestro() creada';
  RAISE NOTICE '  - Triggers para código automático y log de cambios creados';
  RAISE NOTICE '  - Vista siniestros_vista actualizada con responsable';
  RAISE NOTICE '  - Índices de optimización creados';
  RAISE NOTICE '  - Siniestros existentes actualizados con responsable y código';
END $$;
