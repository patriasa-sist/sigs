-- ==========================================
-- MIGRATION: Historial Básico de Ediciones
-- Ejecutar DESPUÉS de migration_add_audit_fields.sql
-- ==========================================

-- Tabla de log de acciones sobre pólizas
CREATE TABLE polizas_historial_ediciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poliza_id UUID NOT NULL REFERENCES polizas(id) ON DELETE CASCADE,

  accion TEXT NOT NULL CHECK (accion IN ('creacion', 'edicion', 'eliminacion')),
  usuario_id UUID NOT NULL REFERENCES profiles(id),

  -- Opcional: registrar qué campos se modificaron (sin valores)
  campos_modificados TEXT[], -- Ej: ['prima_total', 'fin_vigencia']
  descripcion TEXT, -- Descripción opcional de la acción

  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_historial_poliza ON polizas_historial_ediciones(poliza_id);
CREATE INDEX idx_historial_usuario ON polizas_historial_ediciones(usuario_id);
CREATE INDEX idx_historial_timestamp ON polizas_historial_ediciones(timestamp DESC);

-- Función para registrar cambios automáticamente
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

    -- Detectar qué campos cambiaron (opcional, útil para auditoría)
    IF (OLD.numero_poliza IS DISTINCT FROM NEW.numero_poliza) THEN
      campos_cambiados := array_append(campos_cambiados, 'numero_poliza');
    END IF;
    IF (OLD.compania_aseguradora_id IS DISTINCT FROM NEW.compania_aseguradora_id) THEN
      campos_cambiados := array_append(campos_cambiados, 'compania_aseguradora');
    END IF;
    IF (OLD.ramo IS DISTINCT FROM NEW.ramo) THEN
      campos_cambiados := array_append(campos_cambiados, 'ramo');
    END IF;
    IF (OLD.inicio_vigencia IS DISTINCT FROM NEW.inicio_vigencia) THEN
      campos_cambiados := array_append(campos_cambiados, 'inicio_vigencia');
    END IF;
    IF (OLD.fin_vigencia IS DISTINCT FROM NEW.fin_vigencia) THEN
      campos_cambiados := array_append(campos_cambiados, 'fin_vigencia');
    END IF;
    IF (OLD.fecha_emision_compania IS DISTINCT FROM NEW.fecha_emision_compania) THEN
      campos_cambiados := array_append(campos_cambiados, 'fecha_emision_compania');
    END IF;
    IF (OLD.responsable_id IS DISTINCT FROM NEW.responsable_id) THEN
      campos_cambiados := array_append(campos_cambiados, 'responsable');
    END IF;
    IF (OLD.regional_id IS DISTINCT FROM NEW.regional_id) THEN
      campos_cambiados := array_append(campos_cambiados, 'regional');
    END IF;
    IF (OLD.categoria_id IS DISTINCT FROM NEW.categoria_id) THEN
      campos_cambiados := array_append(campos_cambiados, 'categoria');
    END IF;
    IF (OLD.modalidad_pago IS DISTINCT FROM NEW.modalidad_pago) THEN
      campos_cambiados := array_append(campos_cambiados, 'modalidad_pago');
    END IF;
    IF (OLD.prima_total IS DISTINCT FROM NEW.prima_total) THEN
      campos_cambiados := array_append(campos_cambiados, 'prima_total');
    END IF;
    IF (OLD.moneda IS DISTINCT FROM NEW.moneda) THEN
      campos_cambiados := array_append(campos_cambiados, 'moneda');
    END IF;
    IF (OLD.estado IS DISTINCT FROM NEW.estado) THEN
      campos_cambiados := array_append(campos_cambiados, 'estado');
    END IF;

  ELSIF (TG_OP = 'DELETE') THEN
    accion_tipo := 'eliminacion';
  END IF;

  -- Insertar registro en historial
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
      WHEN TG_OP = 'UPDATE' THEN 'Póliza editada - ' || array_length(campos_cambiados, 1) || ' campos modificados'
      WHEN TG_OP = 'DELETE' THEN 'Póliza eliminada'
    END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para capturar cambios en polizas
CREATE TRIGGER trigger_historial_polizas
  AFTER INSERT OR UPDATE OR DELETE ON polizas
  FOR EACH ROW
  EXECUTE FUNCTION registrar_historial_poliza();

-- Vista para consultar historial con nombres de usuarios
CREATE OR REPLACE VIEW polizas_historial_vista AS
SELECT
  h.id,
  h.poliza_id,
  pol.numero_poliza,
  h.accion,
  h.usuario_id,
  u.full_name as usuario_nombre,
  u.email as usuario_email,
  h.campos_modificados,
  h.descripcion,
  h.timestamp
FROM polizas_historial_ediciones h
LEFT JOIN profiles u ON h.usuario_id = u.id
LEFT JOIN polizas pol ON h.poliza_id = pol.id
ORDER BY h.timestamp DESC;

-- ==========================================
-- CONSULTAS ÚTILES PARA GERENCIA
-- ==========================================

-- Ver historial completo de una póliza específica
-- SELECT * FROM polizas_historial_vista WHERE numero_poliza = 'POL-001';

-- Ver quién ha estado editando pólizas hoy
-- SELECT usuario_nombre, COUNT(*) as ediciones
-- FROM polizas_historial_vista
-- WHERE DATE(timestamp) = CURRENT_DATE AND accion = 'edicion'
-- GROUP BY usuario_nombre;

-- Ver últimas 50 acciones en el sistema
-- SELECT * FROM polizas_historial_vista LIMIT 50;

COMMENT ON TABLE polizas_historial_ediciones IS 'Log básico de todas las acciones sobre pólizas (quién, cuándo, qué campos)';
COMMENT ON VIEW polizas_historial_vista IS 'Vista del historial con información de usuarios para reportes';

-- ==========================================
-- FIN DE LA MIGRACIÓN
-- ==========================================
