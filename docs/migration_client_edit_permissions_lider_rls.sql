-- ============================================================================
-- MIGRACIÓN: Permitir a líderes de equipo gestionar permisos de edición de clientes
-- ============================================================================
-- Problema (espejo de migration_policy_edit_permissions_lider_rls.sql):
--   app/clientes/permisos/actions.ts autoriza la gestión de permisos por 2 caminos:
--     1. admin (o permiso admin.permisos)
--     2. líder de equipo del commercial_owner del cliente
--          (requireAdminOrTeamLeaderForClient → isUserTeamLeaderForCommercialOwner)
--
--   Pero las políticas RLS de client_edit_permissions SOLO permiten al rol 'admin'
--   hacer INSERT / UPDATE / DELETE. Para un líder de equipo (NO admin):
--     - grantEditPermission pasa las validaciones del código, llega al INSERT y
--       RLS lo rechaza en silencio → toast genérico "Error al otorgar permiso".
--     - getClientPermissions corre con la sesión del líder y sale vacío.
--     - revokeEditPermission (UPDATE) falla por la misma razón.
--
-- Solución (PURAMENTE ADITIVA — nadie pierde acceso que ya tenía):
--   Políticas RLS para líderes de equipo espejando la lógica del código. Un
--   usuario es "líder del cliente" si tiene rol_equipo='lider' en un equipo que
--   también contiene al commercial_owner_id del cliente. Las políticas admin
--   existentes se conservan intactas (políticas del mismo comando se combinan
--   con OR).
--
-- Ejecutar manualmente en el SQL Editor de Supabase.
-- ============================================================================

-- Predicado reutilizable: ¿p_user_id lidera un equipo que contiene al
-- commercial_owner del cliente p_client_id? SECURITY DEFINER para evitar
-- recursión de RLS sobre equipo_miembros y mantener la condición barata.
CREATE OR REPLACE FUNCTION es_lider_de_cliente(p_client_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
	SELECT EXISTS (
		SELECT 1
		FROM clients c
		JOIN equipo_miembros em_lider
			ON em_lider.user_id = p_user_id
		   AND em_lider.rol_equipo = 'lider'
		JOIN equipo_miembros em_resp
			ON em_resp.equipo_id = em_lider.equipo_id
		   AND em_resp.user_id = c.commercial_owner_id
		WHERE c.id = p_client_id
	);
$$;

COMMENT ON FUNCTION es_lider_de_cliente(uuid, uuid) IS
	'true si el usuario es líder de un equipo que contiene al commercial_owner del cliente';

-- SELECT: el líder ve los permisos de los clientes que gestiona ----------------
DROP POLICY IF EXISTS "Lider ve permisos cliente" ON client_edit_permissions;
CREATE POLICY "Lider ve permisos cliente"
	ON client_edit_permissions FOR SELECT
	USING (es_lider_de_cliente(client_id, (SELECT auth.uid())));

-- INSERT: el líder otorga permisos en clientes que gestiona, y solo a usuarios
-- que pertenecen a alguno de sus equipos ---------------------------------------
DROP POLICY IF EXISTS "Lider puede insertar permisos cliente" ON client_edit_permissions;
CREATE POLICY "Lider puede insertar permisos cliente"
	ON client_edit_permissions FOR INSERT
	WITH CHECK (
		es_lider_de_cliente(client_id, (SELECT auth.uid()))
		AND EXISTS (
			SELECT 1
			FROM equipo_miembros em_lider
			JOIN equipo_miembros em_target
				ON em_target.equipo_id = em_lider.equipo_id
			   AND em_target.user_id = client_edit_permissions.user_id
			WHERE em_lider.user_id = (SELECT auth.uid())
			  AND em_lider.rol_equipo = 'lider'
		)
	);

-- UPDATE: el líder revoca (soft delete) o re-otorga permisos de clientes que
-- gestiona ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Lider puede actualizar permisos cliente" ON client_edit_permissions;
CREATE POLICY "Lider puede actualizar permisos cliente"
	ON client_edit_permissions FOR UPDATE
	USING (es_lider_de_cliente(client_id, (SELECT auth.uid())));
