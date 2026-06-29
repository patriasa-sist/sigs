-- ============================================================================
-- MIGRACIÓN: Permitir a líderes de equipo gestionar permisos de edición de pólizas
-- ============================================================================
-- Problema:
--   app/polizas/permisos/actions.ts autoriza la gestión de permisos por 2 caminos:
--     1. admin (o permiso admin.permisos)
--     2. líder de equipo del responsable de la póliza
--          (requireAdminOrTeamLeaderForPolicy → isUserTeamLeaderForResponsable)
--
--   Pero las políticas RLS de policy_edit_permissions SOLO permiten al rol 'admin'
--   hacer INSERT / UPDATE / DELETE, y SELECT solo de los permisos propios o admin.
--
--   Resultado para un líder de equipo (NO admin):
--     - grantPolicyEditPermission pasa todas las validaciones del código, llega al
--       INSERT y RLS lo rechaza en silencio → la acción devuelve el genérico
--       "Error al otorgar permiso" (toast rojo en PolicyPermissionsModal).
--     - getPolicyPermissions corre con la sesión del líder; la política SELECT no
--       lo incluye, así que el bloque "PERMISOS ACTIVOS" siempre sale vacío aunque
--       existan permisos para esa póliza.
--     - revokePolicyEditPermission (UPDATE) también falla por la misma razón.
--
-- Solución (PURAMENTE ADITIVA — nadie pierde acceso que ya tenía):
--   Se agregan políticas RLS para líderes de equipo, espejando exactamente la
--   lógica del código. Un usuario es "líder de la póliza" si tiene una fila en
--   equipo_miembros con rol_equipo='lider' en un equipo que también contiene al
--   responsable_id de la póliza. Las políticas admin existentes se conservan
--   intactas (las políticas del mismo comando se combinan con OR).
--
-- Ejecutar manualmente en el SQL Editor de Supabase.
-- ============================================================================

-- Predicado reutilizable: ¿(SELECT auth.uid()) lidera un equipo que contiene al
-- responsable de la póliza p_poliza_id? SECURITY DEFINER para evitar recursión de
-- RLS sobre equipo_miembros y mantener la condición barata.
CREATE OR REPLACE FUNCTION es_lider_de_poliza(p_poliza_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
	SELECT EXISTS (
		SELECT 1
		FROM polizas pol
		JOIN equipo_miembros em_lider
			ON em_lider.user_id = p_user_id
		   AND em_lider.rol_equipo = 'lider'
		JOIN equipo_miembros em_resp
			ON em_resp.equipo_id = em_lider.equipo_id
		   AND em_resp.user_id = pol.responsable_id
		WHERE pol.id = p_poliza_id
	);
$$;

COMMENT ON FUNCTION es_lider_de_poliza(uuid, uuid) IS
	'true si el usuario es líder de un equipo que contiene al responsable de la póliza';

-- SELECT: el líder ve los permisos de las pólizas que gestiona ------------------
DROP POLICY IF EXISTS "Lider ve permisos poliza" ON policy_edit_permissions;
CREATE POLICY "Lider ve permisos poliza"
	ON policy_edit_permissions FOR SELECT
	USING (es_lider_de_poliza(poliza_id, (SELECT auth.uid())));

-- INSERT: el líder otorga permisos en pólizas que gestiona, y solo a usuarios
-- que pertenecen a alguno de sus equipos ---------------------------------------
DROP POLICY IF EXISTS "Lider puede insertar permisos poliza" ON policy_edit_permissions;
CREATE POLICY "Lider puede insertar permisos poliza"
	ON policy_edit_permissions FOR INSERT
	WITH CHECK (
		es_lider_de_poliza(poliza_id, (SELECT auth.uid()))
		AND EXISTS (
			SELECT 1
			FROM equipo_miembros em_lider
			JOIN equipo_miembros em_target
				ON em_target.equipo_id = em_lider.equipo_id
			   AND em_target.user_id = policy_edit_permissions.user_id
			WHERE em_lider.user_id = (SELECT auth.uid())
			  AND em_lider.rol_equipo = 'lider'
		)
	);

-- UPDATE: el líder revoca (soft delete) permisos de pólizas que gestiona --------
DROP POLICY IF EXISTS "Lider puede actualizar permisos poliza" ON policy_edit_permissions;
CREATE POLICY "Lider puede actualizar permisos poliza"
	ON policy_edit_permissions FOR UPDATE
	USING (es_lider_de_poliza(poliza_id, (SELECT auth.uid())));
