-- ============================================================================
-- MIGRACIÓN FASE 4: Inyectar team_member_ids en JWT
-- ============================================================================
-- Objetivo: Eliminar la llamada RPC get_team_member_ids() en cada request.
--
-- Actualmente getDataScopeFilter() hace 2 consultas a BD por request:
--   1. SELECT role FROM profiles (via getCurrentUserProfile)
--   2. RPC get_team_member_ids() para agente/comercial/siniestros
--
-- Con esta migración el JWT incluye team_member_ids al momento del login,
-- y getDataScopeFilter() lee del token sin llamadas a BD.
--
-- PREREQUISITOS: Fases 1, 2 y 3 deben estar aplicadas.
-- NOTA: Usuarios agente/comercial/siniestros deben hacer re-login para que
--       el nuevo claim aparezca en su JWT. Cambios de equipo también requieren re-login.
--
-- EJECUTAR EN: Supabase Dashboard → SQL Editor
-- ============================================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims jsonb;
  user_role_value text;
  user_perms text[];
  user_id_value uuid;
  team_ids text[];
BEGIN
  user_id_value := (event->>'user_id')::uuid;

  -- Obtener el rol del usuario desde la tabla profiles
  SELECT role INTO user_role_value
  FROM public.profiles
  WHERE id = user_id_value;

  -- Obtener los claims existentes del token
  claims := event->'claims';

  -- Agregar el rol a los claims
  IF user_role_value IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role_value));
  ELSE
    claims := jsonb_set(claims, '{user_role}', '"invitado"');
    user_role_value := 'invitado';
  END IF;

  -- Obtener permisos combinados (rol + directos del usuario)
  SELECT COALESCE(array_agg(DISTINCT permission_id), ARRAY[]::TEXT[])
  INTO user_perms
  FROM (
    SELECT rp.permission_id
    FROM role_permissions rp
    WHERE rp.role = user_role_value
    UNION
    SELECT up.permission_id
    FROM user_permissions up
    WHERE up.user_id = user_id_value
      AND (up.expires_at IS NULL OR up.expires_at > now())
  ) combined;

  -- Agregar permisos al JWT
  claims := jsonb_set(claims, '{user_permissions}', to_jsonb(user_perms));

  -- ============================================================
  -- FASE 4: Inyectar team_member_ids para roles con aislamiento
  -- ============================================================
  -- Para agente, comercial y siniestros: incluir IDs de compañeros de equipo.
  -- Esto evita la llamada RPC get_team_member_ids() en cada request.
  -- Si el usuario no pertenece a ningún equipo, se incluye solo su propio ID.
  IF user_role_value IN ('agente', 'comercial', 'siniestros') THEN
    SELECT COALESCE(
      array_agg(DISTINCT em2.user_id::text),
      ARRAY[user_id_value::text]
    )
    INTO team_ids
    FROM equipo_miembros em1
    JOIN equipo_miembros em2 ON em2.equipo_id = em1.equipo_id
    WHERE em1.user_id = user_id_value;

    -- Fallback: si la consulta no encontró filas (usuario sin equipo)
    IF team_ids IS NULL THEN
      team_ids := ARRAY[user_id_value::text];
    END IF;

    claims := jsonb_set(claims, '{team_member_ids}', to_jsonb(team_ids));
  ELSE
    -- Roles sin aislamiento (admin, usuario, cobranza, invitado, desactivado):
    -- Array vacío indica que no se necesita scoping.
    claims := jsonb_set(claims, '{team_member_ids}', '[]'::jsonb);
  END IF;

  -- Retornar el evento con los claims actualizados
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

COMMENT ON FUNCTION public.custom_access_token_hook IS
'Fase 4: Hook de Supabase Auth que agrega user_role, user_permissions y team_member_ids al JWT.
- user_role: rol del usuario (admin, comercial, agente, etc.)
- user_permissions: array de permisos efectivos (rol + sobreescritos por usuario)
- team_member_ids: UUIDs de compañeros de equipo para roles con aislamiento (agente/comercial/siniestros).
  Array vacío para roles sin aislamiento.
Cambios en permisos o equipos requieren re-login para reflejarse en el JWT.';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- Después de aplicar la migración, verificar que la función fue actualizada:
--
-- SELECT proname, prosrc FROM pg_proc
-- WHERE proname = 'custom_access_token_hook'
--   AND pronamespace = 'public'::regnamespace;
--
-- Para verificar el nuevo claim en un JWT:
--   1. Hacer logout y login en la aplicación
--   2. En el navegador (DevTools), buscar la cookie de sesión de Supabase
--   3. Decodificar el access_token en jwt.io y verificar team_member_ids
--
-- IMPORTANTE: Los usuarios existentes deben hacer re-login para obtener el
-- nuevo claim team_member_ids en su JWT. Sin re-login, el código TypeScript
-- usa el fallback y llama al RPC get_team_member_ids() como antes.
-- ============================================================================
