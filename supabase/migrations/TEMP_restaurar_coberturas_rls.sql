-- ============================================
-- RESTAURACIÓN COMPLETA: coberturas_catalogo y siniestros_coberturas
-- Ejecutar DESPUÉS de haber recreado coberturas_catalogo con codigo_puc
-- ============================================

-- PASO 1: Recrear tabla siniestros_coberturas (si no existe)
CREATE TABLE IF NOT EXISTS siniestros_coberturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  siniestro_id UUID NOT NULL REFERENCES siniestros(id) ON DELETE CASCADE,
  cobertura_id UUID NOT NULL REFERENCES coberturas_catalogo(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT cobertura_siniestro_unica UNIQUE (siniestro_id, cobertura_id)
);

CREATE INDEX IF NOT EXISTS idx_siniestros_coberturas_siniestro ON siniestros_coberturas(siniestro_id);

COMMENT ON TABLE siniestros_coberturas IS 'Relación N:N entre siniestros y coberturas aplicadas';

-- ============================================
-- PASO 2: RESTAURAR RLS POLICIES
-- ============================================

-- Habilitar RLS
ALTER TABLE coberturas_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE siniestros_coberturas ENABLE ROW LEVEL SECURITY;

-- Policies para coberturas_catalogo
-- SELECT: Todos los usuarios autenticados
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver coberturas" ON coberturas_catalogo;
CREATE POLICY "Usuarios autenticados pueden ver coberturas"
  ON coberturas_catalogo FOR SELECT
  TO authenticated
  USING (true);

-- INSERT/UPDATE: Solo siniestros, comercial y admin
DROP POLICY IF EXISTS "Solo siniestros, comercial y admin pueden modificar coberturas" ON coberturas_catalogo;
CREATE POLICY "Solo siniestros, comercial y admin pueden modificar coberturas"
  ON coberturas_catalogo FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('siniestros', 'comercial', 'admin')
    )
  );

-- Policies para siniestros_coberturas
-- SELECT: Todos los usuarios autenticados
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver coberturas de siniestros" ON siniestros_coberturas;
CREATE POLICY "Usuarios autenticados pueden ver coberturas de siniestros"
  ON siniestros_coberturas FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Solo siniestros, comercial y admin
DROP POLICY IF EXISTS "Solo siniestros, comercial y admin pueden asignar coberturas" ON siniestros_coberturas;
CREATE POLICY "Solo siniestros, comercial y admin pueden asignar coberturas"
  ON siniestros_coberturas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('siniestros', 'comercial', 'admin')
    )
  );

-- UPDATE: Solo siniestros, comercial y admin
DROP POLICY IF EXISTS "Solo siniestros, comercial y admin pueden modificar coberturas asignadas" ON siniestros_coberturas;
CREATE POLICY "Solo siniestros, comercial y admin pueden modificar coberturas asignadas"
  ON siniestros_coberturas FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('siniestros', 'comercial', 'admin')
    )
  );

-- DELETE: Solo admin
DROP POLICY IF EXISTS "Solo admin puede eliminar coberturas asignadas" ON siniestros_coberturas;
CREATE POLICY "Solo admin puede eliminar coberturas asignadas"
  ON siniestros_coberturas FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- PASO 3: RECREAR VISTA siniestros_vista
-- ============================================

-- La vista usa COUNT de siniestros_coberturas, necesita recrearse
DROP VIEW IF EXISTS siniestros_vista CASCADE;

CREATE OR REPLACE VIEW siniestros_vista AS
SELECT
  -- Campos del siniestro
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
  s.motivo_cierre_tipo,
  s.fecha_cierre,
  s.cerrado_por,

  -- Campos específicos por tipo de cierre
  s.motivo_rechazo,
  s.motivo_declinacion,
  s.monto_reclamado,
  s.deducible,
  s.monto_pagado,
  s.es_pago_comercial,
  s.fecha_llegada_repuestos,

  -- Información de la póliza
  p.numero_poliza,
  p.ramo,
  p.inicio_vigencia AS poliza_inicio,
  p.fin_vigencia AS poliza_fin,
  p.prima_total AS poliza_prima_total,

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
INNER JOIN polizas p ON s.poliza_id = p.id
INNER JOIN clients c ON p.client_id = c.id
LEFT JOIN natural_clients nc ON c.id = nc.client_id AND c.client_type = 'natural'
LEFT JOIN juridic_clients jc ON c.id = jc.client_id AND c.client_type = 'juridica'
LEFT JOIN companias_aseguradoras ca ON p.compania_aseguradora_id = ca.id
LEFT JOIN regionales r ON s.departamento_id = r.id
LEFT JOIN profiles resp ON p.responsable_id = resp.id
LEFT JOIN profiles creator ON s.created_by = creator.id;

COMMENT ON VIEW siniestros_vista IS 'Vista consolidada de siniestros con información de póliza, cliente, y contadores';

-- ============================================
-- PASO 4: VERIFICACIÓN FINAL
-- ============================================

-- Verificar que todo esté en orden
SELECT
  'Tablas recreadas' AS verificacion,
  COUNT(*) FILTER (WHERE table_name = 'coberturas_catalogo') AS coberturas_catalogo,
  COUNT(*) FILTER (WHERE table_name = 'siniestros_coberturas') AS siniestros_coberturas
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('coberturas_catalogo', 'siniestros_coberturas');

-- Verificar RLS habilitado
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('coberturas_catalogo', 'siniestros_coberturas');

-- Verificar policies creadas
SELECT
  tablename,
  policyname,
  cmd AS command
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('coberturas_catalogo', 'siniestros_coberturas')
ORDER BY tablename, policyname;

-- RESULTADO ESPERADO:
-- ✓ coberturas_catalogo: 2 policies (SELECT para todos, ALL para roles autorizados)
-- ✓ siniestros_coberturas: 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- ✓ Vista siniestros_vista recreada correctamente
