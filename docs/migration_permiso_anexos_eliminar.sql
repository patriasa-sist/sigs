-- ============================================
-- Migración: Permiso anexos.eliminar
-- Fecha: 2026-05-26
-- Descripción: Agrega permiso granular para eliminar anexos completamente
--              desde el panel admin (/admin/anexos).
--              Reversión de anulaciones accidentales y otros errores.
-- ============================================

-- 1. Insertar el permiso
INSERT INTO permissions (id, module, action, description) VALUES
  ('anexos.eliminar', 'polizas', 'eliminar', 'Eliminar anexos de pólizas completamente (BD + Storage). Reactiva la póliza si el anexo era una anulación.');

-- 2. NO se asigna por defecto a ningún rol.
--    Admin tiene bypass total hardcodeado en el código.
--    Para asignar a un no-admin específico:
--      INSERT INTO user_permissions (user_id, permission_id, granted_by)
--      VALUES ('<uuid>', 'anexos.eliminar', '<admin_uuid>');

-- 3. Storage: NO se requiere policy adicional.
--    El server action eliminarAnexoCompleto() usa createAdminClient (service_role)
--    para los DELETE de storage.objects, bypaseando RLS de forma controlada
--    tras validar el permiso a nivel aplicación con requirePermission('anexos.eliminar').

-- NOTA: Los usuarios necesitan re-login para que el nuevo permiso
-- se refleje en su JWT (excepto admin, que bypasea siempre).
