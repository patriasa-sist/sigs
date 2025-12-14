-- =====================================================
-- Migración: Agregar acceso de lectura a clientes para rol cobranza
-- Fecha: 2025-12-14
-- Descripción:
--   Permite que el rol "cobranza" pueda leer información de clientes
--   necesaria para el módulo de cobranzas
-- =====================================================

-- 0. Habilitar RLS en las tablas (si no está habilitado)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE natural_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE juridic_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE polizas ENABLE ROW LEVEL SECURITY;
ALTER TABLE companias_aseguradoras ENABLE ROW LEVEL SECURITY;

-- 1. Política SELECT para tabla clients
DROP POLICY IF EXISTS "cobranza_select_clients" ON clients;
CREATE POLICY "cobranza_select_clients" ON clients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'usuario', 'comercial', 'agente', 'cobranza')
    )
  );

COMMENT ON POLICY "cobranza_select_clients" ON clients
IS 'Permite a usuarios con roles operativos (incluyendo cobranza) leer información de clientes';

-- 2. Política SELECT para tabla natural_clients
DROP POLICY IF EXISTS "cobranza_select_natural_clients" ON natural_clients;
CREATE POLICY "cobranza_select_natural_clients" ON natural_clients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'usuario', 'comercial', 'agente', 'cobranza')
    )
  );

COMMENT ON POLICY "cobranza_select_natural_clients" ON natural_clients
IS 'Permite a usuarios con roles operativos (incluyendo cobranza) leer información de personas naturales';

-- 3. Política SELECT para tabla juridic_clients
DROP POLICY IF EXISTS "cobranza_select_juridic_clients" ON juridic_clients;
CREATE POLICY "cobranza_select_juridic_clients" ON juridic_clients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'usuario', 'comercial', 'agente', 'cobranza')
    )
  );

COMMENT ON POLICY "cobranza_select_juridic_clients" ON juridic_clients
IS 'Permite a usuarios con roles operativos (incluyendo cobranza) leer información de personas jurídicas';

-- 4. Política SELECT para tabla polizas (si no existe)
-- El rol cobranza necesita leer pólizas activas
DROP POLICY IF EXISTS "cobranza_select_polizas" ON polizas;
CREATE POLICY "cobranza_select_polizas" ON polizas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'usuario', 'comercial', 'agente', 'cobranza')
    )
  );

COMMENT ON POLICY "cobranza_select_polizas" ON polizas
IS 'Permite a usuarios con roles operativos (incluyendo cobranza) leer pólizas';

-- 5. Política SELECT para companias_aseguradoras
DROP POLICY IF EXISTS "cobranza_select_companias" ON companias_aseguradoras;
CREATE POLICY "cobranza_select_companias" ON companias_aseguradoras
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'usuario', 'comercial', 'agente', 'cobranza')
    )
  );

COMMENT ON POLICY "cobranza_select_companias" ON companias_aseguradoras
IS 'Permite a usuarios con roles operativos (incluyendo cobranza) leer compañías aseguradoras';

-- =====================================================
-- NOTAS IMPORTANTES:
-- =====================================================
-- 1. El rol "cobranza" SOLO tiene permisos de SELECT (lectura)
-- 2. NO puede INSERT, UPDATE, ni DELETE en estas tablas
-- 3. Solo puede UPDATE en polizas_pagos (definido en migración anterior)
-- 4. Esto permite que el módulo de cobranzas muestre información
--    completa de clientes sin comprometer la seguridad
-- =====================================================
