-- =============================================================================
-- Permiso granular: siniestros.reabrir (issue #40)
-- =============================================================================
-- Permite reabrir siniestros cerrados (rechazado/declinado/concluido) desde la
-- página de edición, dejando registro en el historial. Admin siempre puede
-- (bypass hardcodeado en código); este permiso habilita a usuarios puntuales.
--
-- Se asigna a Gerald Cortez Caballero (jefe.atc@patria-sa.com) según pedido.
-- IMPORTANTE: Gerald debe CERRAR SESIÓN y volver a entrar para que el permiso
-- llegue a su JWT (claims user_permissions).
-- =============================================================================

-- 1) Alta del permiso en el catálogo
INSERT INTO permissions (id, module, action, description)
VALUES ('siniestros.reabrir', 'siniestros', 'reabrir', 'Reabrir siniestros cerrados')
ON CONFLICT (id) DO NOTHING;

-- 2) Asignación a Gerald (por email, robusto ante cambios de UUID)
INSERT INTO user_permissions (user_id, permission_id, granted_by)
SELECT p.id, 'siniestros.reabrir', (SELECT id FROM profiles WHERE role = 'admin' ORDER BY created_at LIMIT 1)
FROM profiles p
WHERE p.email = 'jefe.atc@patria-sa.com'
ON CONFLICT DO NOTHING;

-- 3) Verificación
SELECT up.user_id, pr.full_name, up.permission_id, up.granted_at
FROM user_permissions up
JOIN profiles pr ON pr.id = up.user_id
WHERE up.permission_id = 'siniestros.reabrir';
