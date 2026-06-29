-- ============================================================================
-- MIGRACIÓN: Scoping por USUARIO en ventanas de excepción de documentos
-- ============================================================================
-- Hasta ahora una ventana cubría a TODOS los usuarios de los roles indicados
-- (roles text[]). Esto agrega la posibilidad de acotar una ventana a usuarios
-- específicos.
--
-- Semántica de la nueva columna `usuarios`:
--   • usuarios IS NULL          → comportamiento clásico: aplica por ROL (roles).
--   • usuarios = ARRAY[uuid...] → aplica SOLO a esos usuarios (ignora roles).
--
-- Ejecutar la SECCIÓN 1 (estructura) UNA sola vez.
-- La SECCIÓN 2 es operativa (acotar la ventana existente a un usuario).
-- ============================================================================


-- ============================================================================
-- SECCIÓN 1 · ESTRUCTURA (ejecutar una sola vez)
-- ============================================================================

-- 1.1 Columna de usuarios (NULL = sigue siendo por rol) -----------------------
ALTER TABLE document_exception_windows
  ADD COLUMN IF NOT EXISTS usuarios uuid[];

COMMENT ON COLUMN document_exception_windows.usuarios IS
  'Scoping individual. Si es NULL la ventana aplica por rol (roles). Si tiene UUIDs, aplica SOLO a esos usuarios (profiles.id), ignorando roles.';

-- 1.2 Función de evaluación: respeta `usuarios` cuando está presente ----------
CREATE OR REPLACE FUNCTION usuario_tiene_ventana_excepcion()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM document_exception_windows w
    WHERE w.activo
      AND now() >= w.inicio
      AND now() <  w.fin
      AND (
        -- Ventana acotada a usuarios concretos
        (w.usuarios IS NOT NULL AND (SELECT auth.uid()) = ANY (w.usuarios))
        OR
        -- Ventana clásica por rol
        (w.usuarios IS NULL AND EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = (SELECT auth.uid())
            AND p.role = ANY (w.roles)
        ))
      )
  );
$$;

-- 1.3 Trigger de marcado retroactivo: misma lógica usando NEW.created_by ------
CREATE OR REPLACE FUNCTION marcar_cliente_carga_retroactiva()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w_id uuid;
BEGIN
  SELECT w.id INTO w_id
  FROM document_exception_windows w
  WHERE w.activo
    AND now() >= w.inicio
    AND now() <  w.fin
    AND (
      (w.usuarios IS NOT NULL AND NEW.created_by = ANY (w.usuarios))
      OR
      (w.usuarios IS NULL AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = NEW.created_by
          AND p.role = ANY (w.roles)
      ))
    )
  ORDER BY w.created_at DESC
  LIMIT 1;

  IF w_id IS NOT NULL THEN
    NEW.carga_retroactiva := true;
    NEW.carga_retroactiva_window_id := w_id;
  END IF;

  RETURN NEW;
END;
$$;


-- ============================================================================
-- SECCIÓN 2 · ACOTAR LA VENTANA EXISTENTE A SERLY SANCHEZ (operativo)
-- ============================================================================
-- Reabre la ventana por 3 días y la limita a Serly Fabiola Sanchez Colón.
-- Al setear `usuarios`, deja de cubrir al resto de comercial/agente.

UPDATE document_exception_windows
SET fin      = now() + interval '3 days',
    activo   = true,
    usuarios = ARRAY['d5ab0710-2edb-4f8c-bb35-5294dd0cae49'::uuid]
WHERE motivo = 'Carga retroactiva de ~100 clientes antiguos sin documentos';

-- Verificación
SELECT now() AS ahora_utc, fin, usuarios,
       (now() < fin AND activo) AS vigente
FROM document_exception_windows
ORDER BY created_at DESC LIMIT 1;
