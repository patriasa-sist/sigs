-- ============================================
-- Migración: Mejoras Módulo de Siniestros
-- Fecha: 2024-12-22
-- Descripción: Agregar sistema de estados, vista con flag de atención,
--              función helper para contactos, e índices de performance
-- ============================================

-- ============================================
-- 1. Tabla de catálogo de estados
-- ============================================
CREATE TABLE IF NOT EXISTS siniestros_estados_catalogo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  orden integer NOT NULL DEFAULT 0,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE siniestros_estados_catalogo IS 'Catálogo de estados posibles para el seguimiento de siniestros';
COMMENT ON COLUMN siniestros_estados_catalogo.codigo IS 'Código único del estado para referencia programática';
COMMENT ON COLUMN siniestros_estados_catalogo.nombre IS 'Nombre descriptivo del estado';
COMMENT ON COLUMN siniestros_estados_catalogo.orden IS 'Orden de visualización en UI';

-- Insertar estados predefinidos
INSERT INTO siniestros_estados_catalogo (codigo, nombre, descripcion, orden) VALUES
  ('espera_informe_transito', 'Espera informe tránsito', 'Esperando informe oficial de tránsito', 1),
  ('espera_proforma', 'Espera proforma', 'Esperando proforma de reparación o servicios', 2),
  ('espera_franquicia', 'Espera franquicia', 'Esperando pago de franquicia por parte del cliente', 3),
  ('espera_orden', 'Espera orden', 'Esperando orden de trabajo o autorización', 4),
  ('espera_reparacion', 'Espera reparación', 'Vehículo o bien en proceso de reparación', 5),
  ('espera_conformidad', 'Espera conformidad', 'Esperando conformidad del cliente sobre la reparación', 6),
  ('espera_receta_medica', 'Espera receta médica', 'Esperando receta o documentación médica', 7),
  ('espera_autorizacion_ordenes', 'Espera autorización/órdenes', 'Esperando autorización de órdenes médicas o servicios', 8),
  ('espera_liquidacion', 'Espera liquidación', 'En proceso de liquidación del siniestro', 9)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================
-- 2. Tabla de historial de estados
-- ============================================
CREATE TABLE IF NOT EXISTS siniestros_estados_historial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  siniestro_id uuid NOT NULL REFERENCES siniestros(id) ON DELETE CASCADE,
  estado_id uuid NOT NULL REFERENCES siniestros_estados_catalogo(id),
  observacion text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE siniestros_estados_historial IS 'Historial de cambios de estado de cada siniestro';
COMMENT ON COLUMN siniestros_estados_historial.siniestro_id IS 'Referencia al siniestro';
COMMENT ON COLUMN siniestros_estados_historial.estado_id IS 'Estado aplicado en este registro';
COMMENT ON COLUMN siniestros_estados_historial.observacion IS 'Observación opcional del usuario al cambiar estado';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_siniestros_estados_historial_siniestro
  ON siniestros_estados_historial(siniestro_id);

CREATE INDEX IF NOT EXISTS idx_siniestros_estados_historial_fecha
  ON siniestros_estados_historial(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_siniestros_estados_historial_siniestro_fecha
  ON siniestros_estados_historial(siniestro_id, created_at DESC);

-- ============================================
-- 3. Índices para filtro de "sin actualizaciones en 10 días"
-- ============================================
CREATE INDEX IF NOT EXISTS idx_siniestros_updated_at
  ON siniestros(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_siniestros_estado_updated
  ON siniestros(estado, updated_at DESC);

-- ============================================
-- 4. Vista para estado actual de siniestros con flag de atención
-- ============================================
CREATE OR REPLACE VIEW siniestros_con_estado_actual AS
SELECT
  s.*,
  seh.estado_id AS estado_actual_id,
  sec.nombre AS estado_actual_nombre,
  sec.codigo AS estado_actual_codigo,
  seh.created_at AS estado_actual_fecha,
  seh.observacion AS estado_actual_observacion,
  CASE
    WHEN s.updated_at < (now() - INTERVAL '10 days') THEN true
    ELSE false
  END AS requiere_atencion
FROM siniestros s
LEFT JOIN LATERAL (
  SELECT estado_id, created_at, observacion
  FROM siniestros_estados_historial
  WHERE siniestro_id = s.id
  ORDER BY created_at DESC
  LIMIT 1
) seh ON true
LEFT JOIN siniestros_estados_catalogo sec ON seh.estado_id = sec.id;

COMMENT ON VIEW siniestros_con_estado_actual IS 'Siniestros con su estado más reciente y flag de atención para siniestros sin actualización en 10+ días';

-- ============================================
-- 5. RLS Policies
-- ============================================
ALTER TABLE siniestros_estados_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE siniestros_estados_historial ENABLE ROW LEVEL SECURITY;

-- Catálogo: lectura para todos autenticados
DROP POLICY IF EXISTS "Authenticated users can read estados catalogo" ON siniestros_estados_catalogo;
CREATE POLICY "Authenticated users can read estados catalogo"
  ON siniestros_estados_catalogo FOR SELECT
  TO authenticated
  USING (true);

-- Historial: lectura para todos autenticados
DROP POLICY IF EXISTS "Authenticated users can read estados historial" ON siniestros_estados_historial;
CREATE POLICY "Authenticated users can read estados historial"
  ON siniestros_estados_historial FOR SELECT
  TO authenticated
  USING (true);

-- Historial: inserción para usuarios autenticados
DROP POLICY IF EXISTS "Authenticated users can insert estados historial" ON siniestros_estados_historial;
CREATE POLICY "Authenticated users can insert estados historial"
  ON siniestros_estados_historial FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- 6. Función trigger para actualizar updated_at en siniestros
-- ============================================
-- Asegurar que el trigger existe para mantener updated_at actualizado
CREATE OR REPLACE FUNCTION actualizar_updated_at_siniestros()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_actualizar_updated_at ON siniestros;

CREATE TRIGGER trigger_actualizar_updated_at
  BEFORE UPDATE ON siniestros
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_updated_at_siniestros();

COMMENT ON FUNCTION actualizar_updated_at_siniestros() IS 'Actualiza automáticamente el campo updated_at cuando se modifica un siniestro';

-- ============================================
-- 7. Función para obtener contacto de póliza (helper para WhatsApp)
-- ============================================
CREATE OR REPLACE FUNCTION obtener_contacto_poliza(poliza_id_param uuid)
RETURNS TABLE (
  nombre_completo text,
  telefono text,
  celular text,
  correo text
) AS $$
BEGIN
  -- Obtener datos de la póliza y cliente asociado
  RETURN QUERY
  SELECT
    CASE
      -- Cliente natural: concatenar nombres
      WHEN c.client_type = 'natural' THEN
        TRIM(
          COALESCE(nc.primer_nombre, '') || ' ' ||
          COALESCE(nc.segundo_nombre, '') || ' ' ||
          COALESCE(nc.primer_apellido, '') || ' ' ||
          COALESCE(nc.segundo_apellido, '')
        )
      -- Cliente jurídico: razón social
      WHEN c.client_type = 'juridic' THEN
        jc.razon_social
      ELSE
        'Desconocido'::text
    END AS nombre_completo,

    -- Teléfono: priorizar jurídico, natural no tiene teléfono fijo
    COALESCE(jc.telefono, '')::text AS telefono,

    -- Celular: solo cliente natural tiene celular
    COALESCE(nc.celular, '')::text AS celular,

    -- Email: disponible en ambos tipos
    COALESCE(nc.correo_electronico, jc.correo_electronico, '')::text AS correo

  FROM polizas p
  INNER JOIN clients c ON p.client_id = c.id
  LEFT JOIN natural_clients nc ON c.id = nc.client_id AND c.client_type = 'natural'
  LEFT JOIN juridic_clients jc ON c.id = jc.client_id AND c.client_type = 'juridic'
  WHERE p.id = poliza_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION obtener_contacto_poliza(uuid) IS 'Obtiene información de contacto del cliente asociado a una póliza para envío de WhatsApp';

-- ============================================
-- 8. Grant permissions
-- ============================================
GRANT SELECT ON siniestros_estados_catalogo TO authenticated;
GRANT SELECT, INSERT ON siniestros_estados_historial TO authenticated;
GRANT SELECT ON siniestros_con_estado_actual TO authenticated;
GRANT EXECUTE ON FUNCTION obtener_contacto_poliza(uuid) TO authenticated;

-- ============================================
-- Fin de migración
-- ============================================
