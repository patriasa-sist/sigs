-- =============================================================================
-- Limpieza de clientes huérfanos (issue #47)
-- =============================================================================
-- Un cliente huérfano es una fila en `clients` SIN fila en ninguna tabla de
-- subtipo (natural/juridica/unipersonal/ong/club/asociacion_civil). Se
-- originaban cuando el alta fallaba a mitad (p.ej. documento rechazado por el
-- bucket) y el rollback client-side de `clients` era bloqueado en silencio por
-- RLS (DELETE solo admin). Al 2026-08-04 había 47 huérfanos.
--
-- Desde v1.6.36 el rollback se hace server-side con cliente admin, así que no
-- deberían generarse nuevos. Esta migración limpia los históricos.
--
-- Seguridad: solo borra clientes sin subtipo Y sin pólizas. Ejecutar el SELECT
-- de verificación primero.
-- =============================================================================

-- 1) VERIFICACIÓN (ejecutar primero y revisar): lista los huérfanos a borrar
SELECT c.id, c.client_type, c.status, c.created_at, p.full_name AS creador
FROM clients c
LEFT JOIN profiles p ON p.id = c.created_by
WHERE NOT EXISTS (SELECT 1 FROM natural_clients WHERE client_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM juridic_clients WHERE client_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM unipersonal_clients WHERE client_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM ong_clients WHERE client_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM club_clients WHERE client_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM asociacion_civil_clients WHERE client_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM polizas WHERE client_id = c.id)
ORDER BY c.created_at DESC;

-- 2) LIMPIEZA
BEGIN;

CREATE TEMP TABLE huerfanos_a_borrar AS
SELECT c.id
FROM clients c
WHERE NOT EXISTS (SELECT 1 FROM natural_clients WHERE client_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM juridic_clients WHERE client_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM unipersonal_clients WHERE client_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM ong_clients WHERE client_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM club_clients WHERE client_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM asociacion_civil_clients WHERE client_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM polizas WHERE client_id = c.id);

-- Dependencias débiles que pudieran existir
DELETE FROM client_partners WHERE client_id IN (SELECT id FROM huerfanos_a_borrar);
DELETE FROM client_extra_phones WHERE client_id IN (SELECT id FROM huerfanos_a_borrar);
DELETE FROM clientes_documentos WHERE client_id IN (SELECT id FROM huerfanos_a_borrar);
DELETE FROM client_edit_permissions WHERE client_id IN (SELECT id FROM huerfanos_a_borrar);

DELETE FROM clients WHERE id IN (SELECT id FROM huerfanos_a_borrar);

-- Reporte: cuántos se borraron
SELECT count(*) AS huerfanos_borrados FROM huerfanos_a_borrar;

DROP TABLE huerfanos_a_borrar;

COMMIT;
