-- =====================================================================
-- Migración: Ajuste manual de Prima Neta (solo administradores)
-- Fecha: 2026-06-11
--
-- Permite a administración/contabilidad sobreescribir la prima neta
-- autocalculada (comisiones y prima total incluidas) en casos
-- excepcionales: descuento interno, pago en otra divisa, etc., sin
-- duplicar productos de aseguradora que solo se usarían 1-2 veces.
-- Si la prima total cambia, el server action reparte la diferencia entre
-- las cuotas NO pagadas de polizas_pagos (sin cambios de esquema ahí).
--
--   1. polizas.prima_neta_manual          → marca que el valor fue intervenido a mano
--   2. polizas.prima_neta_ajuste_motivo   → justificación obligatoria del ajuste
--   3. Trigger de historial extendido     → registra el ajuste y su motivo
--
-- La trazabilidad (quién/cuándo) ya la provee el trigger existente
-- trigger_historial_polizas sobre polizas_historial_ediciones.
-- =====================================================================

-- 1. Nuevas columnas en polizas
ALTER TABLE polizas
	ADD COLUMN IF NOT EXISTS prima_neta_manual BOOLEAN NOT NULL DEFAULT false,
	ADD COLUMN IF NOT EXISTS prima_neta_ajuste_motivo TEXT;

COMMENT ON COLUMN polizas.prima_neta_manual IS
	'true cuando un admin sobreescribió la prima neta autocalculada (descuento interno, otra divisa, etc.). La edición normal preserva los montos manuales salvo que cambie prima total, producto o modalidad.';
COMMENT ON COLUMN polizas.prima_neta_ajuste_motivo IS
	'Justificación obligatoria del ajuste manual de prima neta. NULL cuando prima_neta_manual = false.';

-- 2. Trigger de historial: detectar ajuste manual y registrar el motivo
CREATE OR REPLACE FUNCTION public.registrar_historial_poliza()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  accion_tipo TEXT;
  campos_cambiados TEXT[] := ARRAY[]::TEXT[];
  descripcion_final TEXT;
BEGIN
  -- Determinar tipo de acción
  IF (TG_OP = 'INSERT') THEN
    accion_tipo := 'creacion';
  ELSIF (TG_OP = 'UPDATE') THEN
    accion_tipo := 'edicion';

    -- Detectar qué campos cambiaron
    -- Datos básicos
    IF (OLD.numero_poliza IS DISTINCT FROM NEW.numero_poliza) THEN
      campos_cambiados := array_append(campos_cambiados, 'número de póliza');
    END IF;
    IF (OLD.compania_aseguradora_id IS DISTINCT FROM NEW.compania_aseguradora_id) THEN
      campos_cambiados := array_append(campos_cambiados, 'compañía aseguradora');
    END IF;
    IF (OLD.ramo IS DISTINCT FROM NEW.ramo) THEN
      campos_cambiados := array_append(campos_cambiados, 'ramo');
    END IF;
    IF (OLD.producto_id IS DISTINCT FROM NEW.producto_id) THEN
      campos_cambiados := array_append(campos_cambiados, 'producto');
    END IF;
    IF (OLD.grupo_produccion IS DISTINCT FROM NEW.grupo_produccion) THEN
      campos_cambiados := array_append(campos_cambiados, 'grupo de producción');
    END IF;
    IF (OLD.client_id IS DISTINCT FROM NEW.client_id) THEN
      campos_cambiados := array_append(campos_cambiados, 'asegurado');
    END IF;

    -- Director de cartera
    IF (OLD.director_cartera_id IS DISTINCT FROM NEW.director_cartera_id) THEN
      campos_cambiados := array_append(campos_cambiados, 'director de cartera');
    END IF;

    -- Fechas
    IF (OLD.inicio_vigencia IS DISTINCT FROM NEW.inicio_vigencia) THEN
      campos_cambiados := array_append(campos_cambiados, 'inicio de vigencia');
    END IF;
    IF (OLD.fin_vigencia IS DISTINCT FROM NEW.fin_vigencia) THEN
      campos_cambiados := array_append(campos_cambiados, 'fin de vigencia');
    END IF;
    IF (OLD.fecha_emision_compania IS DISTINCT FROM NEW.fecha_emision_compania) THEN
      campos_cambiados := array_append(campos_cambiados, 'fecha de emisión');
    END IF;

    -- Responsables y ubicación
    IF (OLD.responsable_id IS DISTINCT FROM NEW.responsable_id) THEN
      campos_cambiados := array_append(campos_cambiados, 'responsable');
    END IF;
    IF (OLD.regional_id IS DISTINCT FROM NEW.regional_id) THEN
      campos_cambiados := array_append(campos_cambiados, 'regional');
    END IF;
    IF (OLD.categoria_id IS DISTINCT FROM NEW.categoria_id) THEN
      campos_cambiados := array_append(campos_cambiados, 'categoría');
    END IF;

    -- Pagos y montos
    IF (OLD.modalidad_pago IS DISTINCT FROM NEW.modalidad_pago) THEN
      campos_cambiados := array_append(campos_cambiados, 'modalidad de pago');
    END IF;
    IF (OLD.prima_total IS DISTINCT FROM NEW.prima_total) THEN
      campos_cambiados := array_append(campos_cambiados, 'prima total');
    END IF;
    IF (OLD.prima_neta IS DISTINCT FROM NEW.prima_neta) THEN
      campos_cambiados := array_append(campos_cambiados, 'prima neta');
    END IF;
    IF (OLD.moneda IS DISTINCT FROM NEW.moneda) THEN
      campos_cambiados := array_append(campos_cambiados, 'moneda');
    END IF;
    IF (OLD.comision IS DISTINCT FROM NEW.comision) THEN
      campos_cambiados := array_append(campos_cambiados, 'comisión');
    END IF;
    IF (OLD.comision_empresa IS DISTINCT FROM NEW.comision_empresa) THEN
      campos_cambiados := array_append(campos_cambiados, 'comisión empresa');
    END IF;
    IF (OLD.comision_encargado IS DISTINCT FROM NEW.comision_encargado) THEN
      campos_cambiados := array_append(campos_cambiados, 'comisión encargado');
    END IF;

    -- Ajuste manual de prima neta (admin)
    IF (OLD.prima_neta_manual IS DISTINCT FROM NEW.prima_neta_manual) THEN
      IF NEW.prima_neta_manual THEN
        campos_cambiados := array_append(campos_cambiados, 'ajuste manual de prima neta');
      ELSE
        campos_cambiados := array_append(campos_cambiados, 'restablecimiento de prima neta autocalculada');
      END IF;
    ELSIF (NEW.prima_neta_manual AND OLD.prima_neta_ajuste_motivo IS DISTINCT FROM NEW.prima_neta_ajuste_motivo) THEN
      campos_cambiados := array_append(campos_cambiados, 'motivo del ajuste de prima neta');
    END IF;

    -- Estado y validación
    IF (OLD.estado IS DISTINCT FROM NEW.estado) THEN
      campos_cambiados := array_append(campos_cambiados, 'estado');
    END IF;
    IF (OLD.validado_por IS DISTINCT FROM NEW.validado_por) THEN
      campos_cambiados := array_append(campos_cambiados, 'validación');
    END IF;
    IF (OLD.rechazado_por IS DISTINCT FROM NEW.rechazado_por) THEN
      campos_cambiados := array_append(campos_cambiados, 'rechazo');
    END IF;

  ELSIF (TG_OP = 'DELETE') THEN
    accion_tipo := 'eliminacion';
  END IF;

  -- Solo insertar si hay cambios (evita registros vacíos)
  IF (TG_OP = 'INSERT' OR TG_OP = 'DELETE' OR array_length(campos_cambiados, 1) > 0) THEN
    descripcion_final := CASE
      WHEN TG_OP = 'INSERT' THEN 'Póliza creada'
      WHEN TG_OP = 'UPDATE' THEN 'Modificado: ' || array_to_string(campos_cambiados, ', ')
      WHEN TG_OP = 'DELETE' THEN 'Póliza eliminada'
    END;

    -- Adjuntar el motivo cuando el cambio involucra un ajuste manual vigente
    IF (TG_OP = 'UPDATE'
        AND NEW.prima_neta_manual
        AND NEW.prima_neta_ajuste_motivo IS NOT NULL
        AND (OLD.prima_neta IS DISTINCT FROM NEW.prima_neta
             OR OLD.prima_neta_manual IS DISTINCT FROM NEW.prima_neta_manual
             OR OLD.prima_neta_ajuste_motivo IS DISTINCT FROM NEW.prima_neta_ajuste_motivo)) THEN
      descripcion_final := descripcion_final || '. Motivo del ajuste: ' || NEW.prima_neta_ajuste_motivo;
    END IF;

    INSERT INTO polizas_historial_ediciones (
      poliza_id,
      accion,
      usuario_id,
      campos_modificados,
      descripcion
    ) VALUES (
      COALESCE(NEW.id, OLD.id),
      accion_tipo,
      auth.uid(),
      CASE WHEN array_length(campos_cambiados, 1) > 0 THEN campos_cambiados ELSE NULL END,
      descripcion_final
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;
