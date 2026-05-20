-- ============================================
-- Migración: Permiso gerencia.amlc + endurecer defaults de gerencia.ver
-- Fecha: 2026-05-20
-- Descripción:
--   1. Crea el nuevo permiso `gerencia.amlc` (reporte AMLC, sin scoping de datos).
--   2. Quita la asignación por defecto de `gerencia.ver` de TODOS los roles.
--      A partir de ahora solo admin (bypass hardcodeado) o usuarios con
--      asignación individual en user_permissions pueden acceder al módulo.
--   3. Asigna `gerencia.amlc` por defecto al rol `uif` (área de compliance).
-- ============================================

-- 1. Crear el nuevo permiso
INSERT INTO permissions (id, module, action, description) VALUES
  ('gerencia.amlc', 'gerencia', 'amlc', 'Generar reporte AMLC (sin filtro por equipo, ve todas las pólizas)')
ON CONFLICT (id) DO NOTHING;

-- 2. Quitar asignación por defecto de gerencia.ver de TODOS los roles
-- (los usuarios que ya tengan asignación individual en user_permissions la conservan)
DELETE FROM role_permissions WHERE permission_id = 'gerencia.ver';

-- 3. Asignar permisos por defecto al rol uif:
--    - gerencia.ver: para acceder al dashboard gerencial
--    - gerencia.amlc: para generar el reporte AMLC (sin scoping)
INSERT INTO role_permissions (role, permission_id) VALUES
  ('uif', 'gerencia.ver'),
  ('uif', 'gerencia.amlc')
ON CONFLICT DO NOTHING;

-- NOTA: Los usuarios necesitan re-login para que los cambios se reflejen en su JWT.
-- NOTA: gerencia.exportar y gerencia.amlc siempre fueron individuales — no se tocan acá.
