-- ============================================
-- Migración: Permiso gerencia.aps (reportes APS)
-- Fecha: 2026-06-11
-- Descripción:
--   Crea el permiso `gerencia.aps` para generar los 9 reportes APS
--   (Producción PDF, Comisión Excel y Prima Neta Excel; cada uno en
--   variantes Ingreso / Egreso / General) desde el módulo /reportes.
--
--   Sin data scoping (reporte regulatorio: consolida todas las pólizas).
--   Sin defaults por rol: se asigna individualmente en user_permissions
--   a quienes hagan contabilidad. Admin tiene bypass hardcodeado.
-- ============================================

INSERT INTO permissions (id, module, action, description) VALUES
  ('gerencia.aps', 'gerencia', 'aps', 'Generar reportes APS de producción, comisión y prima neta (sin filtro por equipo, ve todas las pólizas)')
ON CONFLICT (id) DO NOTHING;

-- NOTA: Los usuarios a los que se les asigne el permiso necesitan re-login
--       para que aparezca en su JWT.
