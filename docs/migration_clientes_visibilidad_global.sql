-- =============================================================
-- Migration: Visibilidad global de clientes — acceso total
-- Ejecutar manualmente en Supabase SQL Editor
-- =============================================================
--
-- Decisión de negocio: todos los usuarios autenticados pueden ver
-- todos los clientes con datos completos.
-- Las pólizas siguen escopadas al equipo (sin cambios).
--
-- Cambios:
--   1. RLS en tablas de clientes: SELECT abierto a autenticados
--   2. Dos funciones para detección temprana de duplicados al crear cliente
-- =============================================================


-- =============================================================
-- 1. Abrir SELECT de clientes a todos los usuarios autenticados
-- =============================================================

-- clients
DROP POLICY IF EXISTS "clients_select_scoped" ON clients;
CREATE POLICY "clients_select_authenticated"
  ON clients FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- natural_clients
DROP POLICY IF EXISTS "natural_clients_select_policy" ON natural_clients;
CREATE POLICY "natural_clients_select_authenticated"
  ON natural_clients FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- juridic_clients
DROP POLICY IF EXISTS "juridic_clients_select_policy" ON juridic_clients;
CREATE POLICY "juridic_clients_select_authenticated"
  ON juridic_clients FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- unipersonal_clients
DROP POLICY IF EXISTS "unipersonal_clients_select_policy" ON unipersonal_clients;
CREATE POLICY "unipersonal_clients_select_authenticated"
  ON unipersonal_clients FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Tablas relacionadas que también se cargan en el detalle de cliente
DROP POLICY IF EXISTS "client_partners_select_policy" ON client_partners;
CREATE POLICY "client_partners_select_authenticated"
  ON client_partners FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "legal_representatives_select_policy" ON legal_representatives;
CREATE POLICY "legal_representatives_select_authenticated"
  ON legal_representatives FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "client_extra_phones_select_policy" ON client_extra_phones;
CREATE POLICY "client_extra_phones_select_authenticated"
  ON client_extra_phones FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "clientes_documentos_select_policy" ON clientes_documentos;
CREATE POLICY "clientes_documentos_select_authenticated"
  ON clientes_documentos FOR SELECT
  USING (auth.uid() IS NOT NULL);


-- =============================================================
-- 2. verificar_documento_existente
-- Detección temprana de CI/Pasaporte/CEX duplicados al crear cliente
-- Retorna si existe y el nombre del cliente para mostrar en el banner
-- =============================================================
CREATE OR REPLACE FUNCTION verificar_documento_existente(
  p_tipo_documento   text,
  p_numero_documento text
)
RETURNS TABLE (
  existe    boolean,
  client_id uuid,
  nombre    text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    true,
    nc.client_id,
    trim(concat_ws(' ',
      nc.primer_nombre,
      nc.segundo_nombre,
      nc.primer_apellido,
      nc.segundo_apellido
    ))
  FROM natural_clients nc
  WHERE nc.tipo_documento = p_tipo_documento
    AND nc.numero_documento = p_numero_documento
  LIMIT 1;

  -- Si no encontró nada, retornar fila vacía
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text;
  END IF;
END;
$$;


-- =============================================================
-- 3. verificar_nit_existente
-- Detección temprana de NIT duplicados (jurídico / unipersonal)
-- =============================================================
CREATE OR REPLACE FUNCTION verificar_nit_existente(
  p_nit text
)
RETURNS TABLE (
  existe      boolean,
  client_id   uuid,
  nombre      text,
  tipo_cliente text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_nombre    text;
  v_tipo      text;
BEGIN
  -- Buscar en jurídicos primero
  SELECT jc.client_id, jc.razon_social, 'juridica'
  INTO v_client_id, v_nombre, v_tipo
  FROM juridic_clients jc
  WHERE jc.nit = p_nit
  LIMIT 1;

  -- Si no encontró, buscar en unipersonales
  IF v_client_id IS NULL THEN
    SELECT uc.client_id, uc.razon_social, 'unipersonal'
    INTO v_client_id, v_nombre, v_tipo
    FROM unipersonal_clients uc
    WHERE uc.nit = p_nit
    LIMIT 1;
  END IF;

  IF v_client_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_client_id, v_nombre, v_tipo;
END;
$$;


-- =============================================================
-- Permisos de ejecución
-- =============================================================
GRANT EXECUTE ON FUNCTION verificar_documento_existente(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION verificar_nit_existente(text)              TO authenticated;
