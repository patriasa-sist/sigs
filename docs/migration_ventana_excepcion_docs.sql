-- ============================================================================
-- MIGRACIÓN: Ventana temporal de excepción de documentos (carga retroactiva)
-- ============================================================================
-- Objetivo: permitir que los roles operativos (comercial, agente) carguen
-- clientes SIN documentos durante una ventana de tiempo acotada (p. ej. 3 días),
-- para cargar retroactivamente ~100 clientes antiguos.
--
-- A diferencia de document_exceptions (excepción de USO ÚNICO, por documento,
-- consumible cliente a cliente), una "ventana" es:
--   • Global por rol  → cubre a TODOS los usuarios de los roles indicados.
--   • NO consumible    → no se gasta al crear cada cliente (ideal para lotes).
--   • Auto-expira      → deja de aplicar cuando now() >= fin.
--   • Reversible       → se apaga con un UPDATE (activo = false).
--
-- Este script debe ejecutarse manualmente en Supabase SQL Editor.
-- Ejecutar la SECCIÓN 1 (estructura) UNA sola vez.
-- La SECCIÓN 2 (encender) y SECCIÓN 3 (apagar) son operativas, se reusan.
-- ============================================================================


-- ============================================================================
-- SECCIÓN 1 · ESTRUCTURA (ejecutar una sola vez)
-- ============================================================================

-- 1.1 Tabla de ventanas -------------------------------------------------------
CREATE TABLE IF NOT EXISTS document_exception_windows (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  motivo      text NOT NULL,
  roles       text[] NOT NULL DEFAULT ARRAY['comercial','agente'],
  inicio      timestamptz NOT NULL DEFAULT now(),
  fin         timestamptz NOT NULL,
  activo      boolean NOT NULL DEFAULT true,
  creado_por  uuid NOT NULL REFERENCES profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT doc_exc_window_fin_after_inicio CHECK (fin > inicio)
);

COMMENT ON TABLE document_exception_windows IS
  'Ventanas temporales que eximen documentos obligatorios a roles operativos (backfill de clientes retroactivos). No consumibles; auto-expiran por fin; reversibles con activo=false.';
COMMENT ON COLUMN document_exception_windows.roles IS
  'Roles cubiertos por la ventana (ej: comercial, agente). Un usuario queda cubierto si su rol está en este array.';
COMMENT ON COLUMN document_exception_windows.fin IS
  'Instante de corte. Pasado este momento la ventana deja de aplicar aunque activo siga en true.';

-- Índice para la evaluación frecuente (solo ventanas vigentes)
CREATE INDEX IF NOT EXISTS idx_doc_exc_windows_vigentes
  ON document_exception_windows (fin) WHERE activo;

-- 1.2 RLS: la tabla solo la gestionan admin / uif -----------------------------
ALTER TABLE document_exception_windows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doc_exc_windows_admin_all" ON document_exception_windows;
CREATE POLICY "doc_exc_windows_admin_all"
  ON document_exception_windows
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin','uif'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin','uif'))
  );

-- 1.3 Función de evaluación (SECURITY DEFINER) --------------------------------
-- Cualquier usuario autenticado la invoca para saber si ÉL está cubierto por
-- una ventana vigente. No expone la tabla; solo devuelve un booleano.
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
    JOIN profiles p ON p.id = (SELECT auth.uid())
    WHERE w.activo
      AND now() >= w.inicio
      AND now() <  w.fin
      AND p.role = ANY (w.roles)
  );
$$;

COMMENT ON FUNCTION usuario_tiene_ventana_excepcion() IS
  'Devuelve true si el usuario autenticado está cubierto por una ventana de excepción de documentos vigente. Usada por obtenerMisExcepciones().';

REVOKE ALL ON FUNCTION usuario_tiene_ventana_excepcion() FROM public;
GRANT EXECUTE ON FUNCTION usuario_tiene_ventana_excepcion() TO authenticated;

-- 1.4 Marca de "carga retroactiva" en clients --------------------------------
-- Diferencia los clientes cargados bajo la ventana, para que AUDITORÍA entienda
-- que la ausencia de documentos es autorizada (no una incidencia falsa).
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS carga_retroactiva boolean NOT NULL DEFAULT false;
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS carga_retroactiva_window_id uuid REFERENCES document_exception_windows(id);

COMMENT ON COLUMN clients.carga_retroactiva IS
  'true si el cliente fue cargado durante una ventana de excepción de documentos (lote retroactivo autorizado por gerencia). La ausencia de documentos en estos clientes es esperada, no una incidencia.';
COMMENT ON COLUMN clients.carga_retroactiva_window_id IS
  'Ventana de excepción bajo la cual se cargó este cliente (trazabilidad para auditoría).';

CREATE INDEX IF NOT EXISTS idx_clients_carga_retroactiva
  ON clients (carga_retroactiva) WHERE carga_retroactiva;

-- Trigger: al insertar un cliente, si su creador está cubierto por una ventana
-- vigente, lo marca automáticamente. Sin ventana activa, es un no-op inofensivo,
-- por eso el trigger puede quedar instalado de forma permanente.
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
  JOIN profiles p ON p.id = NEW.created_by
  WHERE w.activo
    AND now() >= w.inicio
    AND now() <  w.fin
    AND p.role = ANY (w.roles)
  ORDER BY w.created_at DESC
  LIMIT 1;

  IF w_id IS NOT NULL THEN
    NEW.carga_retroactiva := true;
    NEW.carga_retroactiva_window_id := w_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marcar_carga_retroactiva ON clients;
CREATE TRIGGER trg_marcar_carga_retroactiva
  BEFORE INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION marcar_cliente_carga_retroactiva();


-- ============================================================================
-- SECCIÓN 2 · ENCENDER LA VENTANA (operativo — ejecutar cuando se inicie la carga)
-- ============================================================================
-- Crea una ventana de 3 días para comercial + agente.
-- creado_por se resuelve automáticamente al primer admin (FK NOT NULL).
-- Repetir esta sentencia crea una nueva ventana; basta con una vigente.

INSERT INTO document_exception_windows (motivo, roles, inicio, fin, creado_por)
VALUES (
  'Carga retroactiva de ~100 clientes antiguos sin documentos',
  ARRAY['comercial','agente'],
  now(),
  now() + interval '3 days',
  (SELECT id FROM profiles WHERE role = 'admin' ORDER BY created_at LIMIT 1)
);

-- Verificación rápida del estado de las ventanas:
-- SELECT motivo, roles, inicio, fin, activo, (now() < fin AND activo) AS vigente
-- FROM document_exception_windows ORDER BY created_at DESC;


-- ============================================================================
-- SECCIÓN 3 · APAGAR LA VENTANA (operativo — ejecutar al terminar o al 3er día)
-- ============================================================================
-- La ventana se auto-expira por fecha (fin), pero esto la corta de inmediato.
-- No toca document_exceptions (las excepciones reales de uso único siguen intactas).

UPDATE document_exception_windows
SET activo = false
WHERE activo = true;
