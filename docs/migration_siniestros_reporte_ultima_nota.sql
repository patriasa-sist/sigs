-- Migración: agregar "última nota registrada" a la vista de siniestros con estado actual.
-- Usada por el reporte de siniestros (columna "Última Nota" en el export a Excel).
--
-- Se hace con un LATERAL que trae solo la observación más reciente por siniestro
-- (1 fila por siniestro, no toda la tabla de observaciones). CREATE OR REPLACE VIEW
-- exige conservar las columnas existentes en el mismo orden; la nueva columna
-- `ultima_nota` se agrega al final.

CREATE OR REPLACE VIEW siniestros_con_estado_actual AS
SELECT sv.id,
    sv.poliza_id,
    sv.codigo_siniestro,
    sv.fecha_siniestro,
    sv.fecha_reporte,
    sv.fecha_reporte_compania,
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
    sv.poliza_responsable_id,
    sv.cliente_nombre,
    sv.cliente_documento,
    sv.cliente_tipo,
    sv.cliente_celular,
    sv.cliente_correo,
    sv.responsable_nombre,
    sv.responsable_email,
    sv.compania_nombre,
    sv.compania_id,
    sv.departamento_nombre,
    sv.departamento_codigo,
    sv.poliza_responsable_nombre,
    sv.creado_por_nombre,
    sv.fecha_creacion,
    sv.cerrado_por_nombre,
    sv.total_documentos,
    sv.total_observaciones,
    sv.total_coberturas,
    sv.motivo_cierre_tipo,
    sv.fecha_cierre,
    sv.cerrado_por,
    sv.motivo_rechazo,
    sv.motivo_declinacion,
    sv.monto_reclamado,
    sv.moneda_reclamado,
    sv.deducible,
    sv.moneda_deducible,
    sv.monto_pagado,
    sv.moneda_pagado,
    sv.es_pago_comercial,
    sv.fecha_llegada_repuestos,
    seh.estado_id AS estado_actual_id,
    sec.nombre AS estado_actual_nombre,
    sec.codigo AS estado_actual_codigo,
    seh.created_at AS estado_actual_fecha,
    seh.observacion AS estado_actual_observacion,
    CASE
        WHEN sv.updated_at < (now() - '10 days'::interval) THEN true
        ELSE false
    END AS requiere_atencion,
    obs.observacion AS ultima_nota
   FROM siniestros_vista sv
     LEFT JOIN LATERAL ( SELECT siniestros_estados_historial.estado_id,
            siniestros_estados_historial.created_at,
            siniestros_estados_historial.observacion
           FROM siniestros_estados_historial
          WHERE siniestros_estados_historial.siniestro_id = sv.id
          ORDER BY siniestros_estados_historial.created_at DESC
         LIMIT 1) seh ON true
     LEFT JOIN siniestros_estados_catalogo sec ON seh.estado_id = sec.id
     LEFT JOIN LATERAL ( SELECT siniestros_observaciones.observacion
           FROM siniestros_observaciones
          WHERE siniestros_observaciones.siniestro_id = sv.id
          ORDER BY siniestros_observaciones.created_at DESC
         LIMIT 1) obs ON true;
