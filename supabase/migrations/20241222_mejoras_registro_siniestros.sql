-- ============================================
-- MIGRACIÓN: Mejoras Módulo Registro de Siniestros
-- Fecha: 2024-12-22
-- Descripción: Agrega fechas adicionales, nueva cobertura y actualiza vistas
-- ============================================

-- ============================================
-- 1. AGREGAR NUEVAS COLUMNAS DE FECHA
-- ============================================

-- Agregar columnas de fecha de reporte cliente y compañía
ALTER TABLE siniestros
ADD COLUMN IF NOT EXISTS fecha_reporte_cliente DATE,
ADD COLUMN IF NOT EXISTS fecha_reporte_compania DATE;

-- Comentarios para documentación
COMMENT ON COLUMN siniestros.fecha_siniestro IS 'Fecha en que ocurrió el siniestro';
COMMENT ON COLUMN siniestros.fecha_reporte IS 'Fecha de reporte interno (created_at)';
COMMENT ON COLUMN siniestros.fecha_reporte_cliente IS 'Fecha en que el cliente reportó el siniestro';
COMMENT ON COLUMN siniestros.fecha_reporte_compania IS 'Fecha en que se reportó el siniestro a la compañía aseguradora';
COMMENT ON COLUMN siniestros.contactos IS 'Array JSONB de contactos con estructura: {nombre, telefono, correo?}';

-- ============================================
-- 2. ACTUALIZAR VISTAS
-- ============================================

-- Eliminar vista dependiente primero
DROP VIEW IF EXISTS siniestros_con_estado_actual CASCADE;

-- Recrear vista siniestros_vista con nuevos campos
DROP VIEW IF EXISTS siniestros_vista CASCADE;

CREATE VIEW siniestros_vista AS
SELECT
  s.id,
  s.poliza_id,
  s.codigo_siniestro,
  s.fecha_siniestro,
  s.fecha_reporte,
  s.fecha_reporte_cliente,   -- NUEVO
  s.fecha_reporte_compania,  -- NUEVO
  s.lugar_hecho,
  s.departamento_id,
  s.monto_reserva,
  s.moneda,
  s.descripcion,
  s.contactos,
  s.responsable_id,
  s.estado,
  s.created_at,
  s.updated_at,
  s.created_by,
  s.updated_by,

  -- Información de póliza
  p.numero_poliza,
  p.ramo,
  p.inicio_vigencia AS poliza_inicio_vigencia,
  p.fin_vigencia AS poliza_fin_vigencia,

  -- Información del cliente
  COALESCE(pn.nombres || ' ' || pn.primer_apellido, pj.razon_social) AS cliente_nombre,
  COALESCE(pn.ci, pj.nit) AS cliente_documento,
  CASE WHEN pn.id IS NOT NULL THEN 'natural' ELSE 'juridica' END AS cliente_tipo,
  pn.celular AS cliente_celular,
  pn.correo_electronico AS cliente_correo,

  -- Información de responsable
  resp.full_name AS responsable_nombre,
  resp.email AS responsable_email,

  -- Información de compañía
  comp.nombre AS compania_nombre,

  -- Información de departamento
  reg.nombre AS departamento_nombre,
  reg.codigo AS departamento_codigo,

  -- Información de usuario creador
  creador.full_name AS creador_nombre,
  creador.email AS creador_email,

  -- Información de último editor
  editor.full_name AS editor_nombre,
  editor.email AS editor_email

FROM siniestros s
INNER JOIN polizas p ON s.poliza_id = p.id
LEFT JOIN personas_naturales pn ON p.asegurado_id = pn.id AND p.tipo_asegurado = 'natural'
LEFT JOIN personas_juridicas pj ON p.asegurado_id = pj.id AND p.tipo_asegurado = 'juridica'
LEFT JOIN profiles resp ON s.responsable_id = resp.id
LEFT JOIN companias_aseguradoras comp ON p.compania_id = comp.id
LEFT JOIN regionales reg ON s.departamento_id = reg.id
LEFT JOIN profiles creador ON s.created_by = creador.id
LEFT JOIN profiles editor ON s.updated_by = editor.id;

-- Recrear vista siniestros_con_estado_actual
CREATE VIEW siniestros_con_estado_actual AS
SELECT
  -- Todas las columnas de siniestros_vista
  sv.id,
  sv.poliza_id,
  sv.codigo_siniestro,
  sv.fecha_siniestro,
  sv.fecha_reporte,
  sv.fecha_reporte_cliente,    -- NUEVO
  sv.fecha_reporte_compania,   -- NUEVO
  sv.lugar_hecho,
  sv.departamento_id,
  sv.monto_reserva,
  sv.moneda,
  sv.descripcion,
  sv.contactos,
  sv.responsable_id,
  sv.estado,
  sv.created_at,
  sv.updated_at,
  sv.created_by,
  sv.updated_by,
  sv.numero_poliza,
  sv.ramo,
  sv.poliza_inicio_vigencia,
  sv.poliza_fin_vigencia,
  sv.cliente_nombre,
  sv.cliente_documento,
  sv.cliente_tipo,
  sv.cliente_celular,
  sv.cliente_correo,
  sv.responsable_nombre,
  sv.responsable_email,
  sv.compania_nombre,
  sv.departamento_nombre,
  sv.departamento_codigo,
  sv.creador_nombre,
  sv.creador_email,
  sv.editor_nombre,
  sv.editor_email,

  -- Campos de estado actual
  seh.estado_id AS estado_actual_id,
  sec.nombre AS estado_actual_nombre,
  sec.codigo AS estado_actual_codigo,
  seh.created_at AS estado_actual_fecha,
  seh.observacion AS estado_actual_observacion,

  -- Flag de atención (sin actualizaciones en más de 10 días)
  CASE
    WHEN sv.updated_at < (now() - INTERVAL '10 days') THEN true
    ELSE false
  END AS requiere_atencion

FROM siniestros_vista sv
LEFT JOIN LATERAL (
  SELECT estado_id, created_at, observacion
  FROM siniestros_estados_historial
  WHERE siniestro_id = sv.id
  ORDER BY created_at DESC
  LIMIT 1
) seh ON true
LEFT JOIN siniestros_estados_catalogo sec ON seh.estado_id = sec.id;

-- ============================================
-- 3. INSERTAR COBERTURA "GESTIÓN COMERCIAL"
-- ============================================

-- Insertar cobertura "Gestión comercial" aplicable a todos los ramos
INSERT INTO coberturas_catalogo (nombre, descripcion, ramo, codigo_puc, es_custom, activo)
VALUES (
  'Gestión comercial',
  'Cobertura de gestión comercial aplicable a todos los ramos',
  'General',
  null,
  false,
  true
)
ON CONFLICT DO NOTHING;

-- ============================================
-- FIN DE MIGRACIÓN
-- ============================================

-- Verificar que las vistas se crearon correctamente
SELECT
  schemaname,
  viewname,
  viewowner
FROM pg_views
WHERE viewname IN ('siniestros_vista', 'siniestros_con_estado_actual');
