-- ============================================
-- Migración: Permisos del módulo Gerencia
-- Fecha: 2026-03-14
-- Descripción: Agrega permisos gerencia.ver y gerencia.exportar,
--              migra admin.reportes a gerencia.exportar
-- ============================================

-- 1. Insertar nuevos permisos
INSERT INTO permissions (id, module, action, description) VALUES
  ('gerencia.ver', 'gerencia', 'ver', 'Ver dashboard y estadísticas de gerencia'),
  ('gerencia.exportar', 'gerencia', 'exportar', 'Exportar reportes desde módulo gerencia');

-- 2. Asignar permisos por defecto a roles
-- NOTA: usuario solo recibe gerencia.ver por defecto.
-- gerencia.exportar debe ser asignado manualmente por un admin a cada usuario.
INSERT INTO role_permissions (role, permission_id) VALUES
  ('usuario', 'gerencia.ver'),
  ('comercial', 'gerencia.ver'),
  ('agente', 'gerencia.ver');

-- 3. Migrar permisos individuales de admin.reportes a gerencia.exportar
-- (usuarios que tenían admin.reportes asignado directamente)
UPDATE user_permissions
SET permission_id = 'gerencia.exportar'
WHERE permission_id = 'admin.reportes';

-- 4. Limpiar permiso viejo
DELETE FROM role_permissions WHERE permission_id = 'admin.reportes';
DELETE FROM permissions WHERE id = 'admin.reportes';

-- NOTA: Los usuarios necesitan re-login para que los nuevos permisos
-- se reflejen en su JWT.
