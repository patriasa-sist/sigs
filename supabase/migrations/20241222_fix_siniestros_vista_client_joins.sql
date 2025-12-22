-- ============================================
-- Fix: Agregar fecha_reporte_compania + Corrección de JOINs en siniestros_vista
-- Fecha: 2024-12-22
-- Descripción:
--   1. Agregar fecha_reporte_compania a tabla siniestros
--   2. Corregir nombres de tablas y columnas para mostrar correctamente
--      datos de cliente en dashboard de siniestros
-- ============================================

-- ISSUE 1: Campo de fecha faltante referenciado en la vista
--   - fecha_reporte_compania (cuando se reportó a la aseguradora)
--   NOTA: created_at ya captura cuando el cliente reportó (momento de registro)
--         por lo tanto NO se necesita fecha_reporte_cliente

-- ISSUE 2: La vista usaba nombres incorrectos de tablas/columnas:
--   - asegurado_id → debe ser client_id
--   - tipo_asegurado → debe ser clients.client_type
--   - personas_naturales/personas_juridicas → debe ser natural_clients/juridic_clients
--   - responsable_comercial_id → debe ser responsable_id (columna no existe)
--   - nc.ci → debe ser nc.numero_documento (columna correcta en natural_clients)

-- STEP 1: Agregar campo de fecha faltante a tabla siniestros
ALTER TABLE siniestros
ADD COLUMN IF NOT EXISTS fecha_reporte_compania date;

COMMENT ON COLUMN siniestros.fecha_reporte_compania IS 'Fecha en que se reportó a la compañía aseguradora';

-- STEP 2: Recrear vista con JOINs corregidos y nuevos campos
DROP VIEW IF EXISTS siniestros_vista CASCADE;

CREATE VIEW siniestros_vista AS
SELECT
  s.id,
  s.poliza_id,
  s.codigo_siniestro,
  s.fecha_siniestro,
  s.fecha_reporte,
  s.fecha_reporte_compania,
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

  -- Información del cliente (CORREGIDO)
  CASE
    WHEN c.client_type = 'natural' THEN
      TRIM(COALESCE(nc.primer_nombre, '') || ' ' || COALESCE(nc.segundo_nombre, '') || ' ' ||
           COALESCE(nc.primer_apellido, '') || ' ' || COALESCE(nc.segundo_apellido, ''))
    WHEN c.client_type = 'juridic' THEN
      jc.razon_social
    ELSE 'Desconocido'
  END AS cliente_nombre,

  CASE
    WHEN c.client_type = 'natural' THEN nc.numero_documento
    WHEN c.client_type = 'juridic' THEN jc.nit
    ELSE NULL
  END AS cliente_documento,

  c.client_type AS cliente_tipo,
  nc.celular AS cliente_celular,
  COALESCE(nc.correo_electronico, jc.correo_electronico) AS cliente_correo,

  -- Información de responsable
  resp.full_name AS responsable_nombre,
  resp.email AS responsable_email,

  -- Información de compañía
  comp.nombre AS compania_nombre,
  comp.id AS compania_id,

  -- Información de departamento
  reg.nombre AS departamento_nombre,
  reg.codigo AS departamento_codigo,

  -- Información del responsable de la póliza
  resp_poliza.full_name AS poliza_responsable_nombre,

  -- Información de usuario creador
  creador.full_name AS creado_por_nombre,
  s.created_at AS fecha_creacion,

  -- Información de usuario que cerró
  cerrador.full_name AS cerrado_por_nombre,

  -- Contadores
  (SELECT COUNT(*) FROM siniestros_documentos sd WHERE sd.siniestro_id = s.id AND sd.estado = 'activo') AS total_documentos,
  (SELECT COUNT(*) FROM siniestros_observaciones so WHERE so.siniestro_id = s.id) AS total_observaciones,
  (SELECT COUNT(*) FROM siniestros_coberturas sc WHERE sc.siniestro_id = s.id) AS total_coberturas,

  -- Campos relacionados con cierre
  s.motivo_cierre_tipo,
  s.fecha_cierre,
  s.cerrado_por,
  s.motivo_rechazo,
  s.motivo_declinacion,

  -- Campos de indemnización
  s.monto_reclamado,
  s.moneda_reclamado,
  s.deducible,
  s.moneda_deducible,
  s.monto_pagado,
  s.moneda_pagado,
  s.es_pago_comercial,
  s.fecha_llegada_repuestos

FROM siniestros s
INNER JOIN polizas p ON s.poliza_id = p.id
LEFT JOIN clients c ON p.client_id = c.id
LEFT JOIN natural_clients nc ON c.id = nc.client_id AND c.client_type = 'natural'
LEFT JOIN juridic_clients jc ON c.id = jc.client_id AND c.client_type = 'juridic'
LEFT JOIN profiles resp ON s.responsable_id = resp.id
LEFT JOIN profiles resp_poliza ON p.responsable_id = resp_poliza.id
LEFT JOIN companias_aseguradoras comp ON p.compania_aseguradora_id = comp.id
LEFT JOIN regionales reg ON s.departamento_id = reg.id
LEFT JOIN profiles creador ON s.created_by = creador.id
LEFT JOIN profiles cerrador ON s.cerrado_por = cerrador.id;

COMMENT ON VIEW siniestros_vista IS 'Vista consolidada de siniestros con información de cliente, póliza, compañía y responsables';

-- Recrear vista siniestros_con_estado_actual (depende de siniestros_vista)
DROP VIEW IF EXISTS siniestros_con_estado_actual CASCADE;

CREATE VIEW siniestros_con_estado_actual AS
SELECT
  -- Todas las columnas de siniestros_vista
  sv.*,

  -- Campos de estado actual (del historial)
  seh.estado_id AS estado_actual_id,
  sec.nombre AS estado_actual_nombre,
  sec.codigo AS estado_actual_codigo,
  seh.created_at AS estado_actual_fecha,
  seh.observacion AS estado_actual_observacion,

  -- Flag de atención (calculado)
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

COMMENT ON VIEW siniestros_con_estado_actual IS 'Siniestros con su estado más reciente y flag de atención para siniestros sin actualización en 10+ días';

-- Grant permissions
GRANT SELECT ON siniestros_vista TO authenticated;
GRANT SELECT ON siniestros_con_estado_actual TO authenticated;
