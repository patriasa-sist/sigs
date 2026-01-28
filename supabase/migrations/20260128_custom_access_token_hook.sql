-- ============================================================================
-- CUSTOM ACCESS TOKEN HOOK - Agrega el rol del usuario al JWT
-- ============================================================================
-- Este hook se ejecuta cada vez que Supabase Auth genera o renueva un token.
-- Agrega el campo 'user_role' al JWT para evitar consultas a la BD en cada request.
--
-- IMPORTANTE: Después de ejecutar esta migración, debes habilitar el hook en:
-- Supabase Dashboard → Authentication → Hooks → Custom Access Token Hook
-- ============================================================================

-- 1. Crear la función del hook
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE  -- STABLE = solo lectura, no modifica datos
SECURITY DEFINER  -- Se ejecuta con permisos del owner (postgres)
SET search_path = public  -- Seguridad: evita ataques de search_path
AS $$
DECLARE
  claims jsonb;
  user_role text;
BEGIN
  -- Obtener el rol del usuario desde la tabla profiles
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = (event->>'user_id')::uuid;

  -- Obtener los claims existentes del token
  claims := event->'claims';

  -- Agregar el rol a los claims
  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  ELSE
    -- Si no tiene perfil, asignar rol por defecto
    claims := jsonb_set(claims, '{user_role}', '"invitado"');
  END IF;

  -- Retornar el evento con los claims actualizados
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- 2. Configurar permisos para supabase_auth_admin (requerido por Supabase)
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

GRANT EXECUTE
  ON FUNCTION public.custom_access_token_hook
  TO supabase_auth_admin;

-- 3. Revocar acceso de usuarios normales (seguridad)
REVOKE EXECUTE
  ON FUNCTION public.custom_access_token_hook
  FROM authenticated, anon, public;

-- 4. Permitir que supabase_auth_admin lea la tabla profiles
GRANT SELECT ON public.profiles TO supabase_auth_admin;

-- 5. Crear política RLS para que supabase_auth_admin pueda leer profiles
-- (necesario si profiles tiene RLS habilitado)
DO $$
BEGIN
  -- Verificar si la política ya existe antes de crearla
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
    AND policyname = 'Allow auth admin to read profiles for JWT hook'
  ) THEN
    CREATE POLICY "Allow auth admin to read profiles for JWT hook"
    ON public.profiles
    AS PERMISSIVE
    FOR SELECT
    TO supabase_auth_admin
    USING (true);
  END IF;
END;
$$;

-- ============================================================================
-- VERIFICACIÓN: Después de ejecutar, verifica que la función existe:
-- SELECT proname FROM pg_proc WHERE proname = 'custom_access_token_hook';
-- ============================================================================

COMMENT ON FUNCTION public.custom_access_token_hook IS
'Hook de Supabase Auth que agrega user_role al JWT. Configurar en Dashboard → Auth → Hooks.';
