-- Agregar campo updated_at a vista siniestros_vista
-- Primero eliminamos la vista existente para poder recrearla con todos los campos

DROP VIEW IF EXISTS siniestros_vista;

CREATE VIEW siniestros_vista AS
SELECT
  s.id,
  s.poliza_id,
  s.fecha_siniestro,
  s.fecha_reporte,
  s.lugar_hecho,
  s.departamento_id,
  s.monto_reserva,
  s.moneda,
  s.descripcion,
  s.contactos,
  s.estado,
  s.fecha_cierre,
  s.motivo_cierre_tipo,
  s.motivo_rechazo,
  s.motivo_declinacion,
  s.monto_reclamado,
  s.moneda_reclamado,
  s.deducible,
  s.moneda_deducible,
  s.monto_pagado,
  s.moneda_pagado,
  s.es_pago_comercial,
  s.fecha_llegada_repuestos,
  s.created_at,
  s.updated_at,
  s.created_by,
  s.updated_by,
  s.cerrado_por,

  -- Información de la póliza
  p.numero_poliza,
  p.ramo,
  p.inicio_vigencia AS poliza_inicio_vigencia,
  p.fin_vigencia AS poliza_fin_vigencia,

  -- Información del cliente
  CASE
    WHEN c.client_type = 'natural' THEN
      CONCAT(nc.primer_nombre, ' ', COALESCE(nc.segundo_nombre || ' ', ''), nc.primer_apellido, ' ', COALESCE(nc.segundo_apellido, ''))
    ELSE
      jc.razon_social
  END AS cliente_nombre,

  CASE
    WHEN c.client_type = 'natural' THEN nc.numero_documento
    ELSE jc.nit
  END AS cliente_documento,

  c.client_type AS cliente_tipo,

  -- Información de la compañía aseguradora
  ca.nombre AS compania_nombre,

  -- Información del departamento
  r.nombre AS departamento_nombre,
  r.codigo AS departamento_codigo,

  -- Información del responsable de la póliza
  resp.full_name AS responsable_nombre,

  -- Información de auditoría
  creator.full_name AS creado_por_nombre,
  s.created_at AS fecha_creacion,

  -- Contadores
  (SELECT COUNT(*) FROM siniestros_documentos sd WHERE sd.siniestro_id = s.id AND sd.estado = 'activo') AS total_documentos,
  (SELECT COUNT(*) FROM siniestros_observaciones so WHERE so.siniestro_id = s.id) AS total_observaciones,
  (SELECT COUNT(*) FROM siniestros_coberturas sc WHERE sc.siniestro_id = s.id) AS total_coberturas

FROM siniestros s
LEFT JOIN polizas p ON s.poliza_id = p.id
LEFT JOIN clients c ON p.client_id = c.id
LEFT JOIN natural_clients nc ON c.id = nc.client_id AND c.client_type = 'natural'
LEFT JOIN juridic_clients jc ON c.id = jc.client_id AND c.client_type = 'juridica'
LEFT JOIN companias_aseguradoras ca ON p.compania_aseguradora_id = ca.id
LEFT JOIN regionales r ON s.departamento_id = r.id
LEFT JOIN profiles resp ON p.responsable_id = resp.id
LEFT JOIN profiles creator ON s.created_by = creator.id;

COMMENT ON VIEW siniestros_vista IS 'Vista consolidada de siniestros con información relacionada de pólizas, clientes, compañías y auditoría (incluye updated_at)';
