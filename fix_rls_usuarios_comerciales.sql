-- ==========================================
-- FIX: Permitir que comerciales/admin vean otros comerciales/admin
-- Ejecutar en Supabase SQL Editor
-- ==========================================

-- OPCIÓN 1: Agregar Política RLS (Recomendado si no hay políticas conflictivas)
-- Esta política permite a comerciales y admins ver otros comerciales y admins

CREATE POLICY "Comerciales y admins pueden ver otros comerciales y admins"
ON profiles
FOR SELECT
TO authenticated
USING (
  -- El usuario autenticado debe ser comercial o admin
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('comercial', 'admin')
  )
  -- Y solo puede ver perfiles de comerciales o admin
  AND role IN ('comercial', 'admin')
);

-- ==========================================
-- OPCIÓN 2: Función RPC con SECURITY DEFINER (Más segura y controlada)
-- Usar esta opción si la Opción 1 no funciona o si prefieres más control
-- ==========================================

-- Crear función que retorna usuarios comerciales/admin
CREATE OR REPLACE FUNCTION get_usuarios_comerciales()
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  role TEXT
)
SECURITY DEFINER -- Ejecuta con permisos del owner (bypass RLS)
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verificar que el usuario autenticado sea comercial o admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('comercial', 'admin')
  ) THEN
    RAISE EXCEPTION 'No autorizado: solo comerciales y admins pueden ver esta información';
  END IF;

  -- Retornar solo usuarios comerciales y admin (sin información sensible)
  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.role
  FROM profiles p
  WHERE p.role IN ('comercial', 'admin')
  ORDER BY p.full_name;
END;
$$;

-- Dar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION get_usuarios_comerciales() TO authenticated;

-- Agregar comentario para documentación
COMMENT ON FUNCTION get_usuarios_comerciales() IS
'Retorna lista de usuarios comerciales y admin. Solo accesible por comerciales y admin. No expone información sensible como email.';

-- ==========================================
-- VERIFICACIÓN: Ejecuta esto después de aplicar una de las opciones
-- ==========================================

-- Verificar que funciona (debe retornar usuarios comerciales/admin)
-- SELECT * FROM get_usuarios_comerciales();

-- Verificar políticas actuales
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- ==========================================
-- NOTAS IMPORTANTES
-- ==========================================

/*
OPCIÓN 1 (Política RLS):
  ✅ Pros: Más simple, funciona con queries normales de Supabase
  ❌ Contras: Puede entrar en conflicto con otras políticas existentes

OPCIÓN 2 (Función RPC):
  ✅ Pros: Más segura, control total, bypass RLS de forma controlada
  ✅ Pros: No expone email ni otros datos sensibles
  ✅ Pros: Validación de autorización incorporada
  ❌ Contras: Requiere usar .rpc() en lugar de .from()

RECOMENDACIÓN: Usar OPCIÓN 2 (Función RPC) por mayor seguridad y control.

El código frontend ya está preparado para usar la función RPC con fallback automático.
*/
