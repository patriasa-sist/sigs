-- Mejora del trigger de historial para detectar más campos
-- Ejecutar manualmente en Supabase SQL Editor

CREATE OR REPLACE FUNCTION registrar_historial_poliza()
RETURNS TRIGGER AS $$
DECLARE
  accion_tipo TEXT;
  campos_cambiados TEXT[] := ARRAY[]::TEXT[];
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
      CASE
        WHEN TG_OP = 'INSERT' THEN 'Póliza creada'
        WHEN TG_OP = 'UPDATE' THEN 'Modificado: ' || array_to_string(campos_cambiados, ', ')
        WHEN TG_OP = 'DELETE' THEN 'Póliza eliminada'
      END
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario explicativo
COMMENT ON FUNCTION registrar_historial_poliza() IS
'Trigger que registra cambios en pólizas. Detecta cambios en campos principales y genera descripción legible.';
