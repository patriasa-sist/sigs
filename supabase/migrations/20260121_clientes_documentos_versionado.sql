-- =====================================================
-- Migration: Versionado de Documentos de Clientes
-- Fecha: 2026-01-21
-- Descripción: Agrega soporte para versionado de documentos
--              permitiendo reemplazar documentos manteniendo
--              el historial para auditoría.
-- =====================================================

-- =====================================================
-- 1. AGREGAR CAMPOS DE VERSIONADO
-- =====================================================

-- Campo version: número de versión del documento
ALTER TABLE clientes_documentos
ADD COLUMN IF NOT EXISTS version integer DEFAULT 1 NOT NULL;

-- Campo replaced_by: referencia al documento que reemplaza a este
ALTER TABLE clientes_documentos
ADD COLUMN IF NOT EXISTS replaced_by uuid REFERENCES clientes_documentos(id);

-- Campo replaced_at: fecha en que fue reemplazado
ALTER TABLE clientes_documentos
ADD COLUMN IF NOT EXISTS replaced_at timestamptz;

-- Comentarios de documentación
COMMENT ON COLUMN clientes_documentos.version IS 'Número de versión del documento (1 = original)';
COMMENT ON COLUMN clientes_documentos.replaced_by IS 'ID del documento que reemplaza a este';
COMMENT ON COLUMN clientes_documentos.replaced_at IS 'Fecha en que fue reemplazado por otra versión';

-- =====================================================
-- 2. ACTUALIZAR CONSTRAINT DE ESTADO
-- =====================================================

-- Eliminar constraint existente si existe
ALTER TABLE clientes_documentos
DROP CONSTRAINT IF EXISTS clientes_documentos_estado_check;

-- Agregar nuevo constraint con 'reemplazado'
ALTER TABLE clientes_documentos
ADD CONSTRAINT clientes_documentos_estado_check
CHECK (estado = ANY (ARRAY['activo'::text, 'descartado'::text, 'reemplazado'::text]));

-- =====================================================
-- 3. ÍNDICES PARA CONSULTAS EFICIENTES
-- =====================================================

-- Índice para buscar documentos activos de un cliente
CREATE INDEX IF NOT EXISTS idx_clientes_docs_client_activo
    ON clientes_documentos(client_id)
    WHERE estado = 'activo';

-- Índice para buscar historial de un tipo de documento
CREATE INDEX IF NOT EXISTS idx_clientes_docs_historial
    ON clientes_documentos(client_id, tipo_documento, version DESC);

-- Índice para documentos reemplazados
CREATE INDEX IF NOT EXISTS idx_clientes_docs_replaced
    ON clientes_documentos(replaced_by)
    WHERE replaced_by IS NOT NULL;

-- =====================================================
-- 4. FUNCIÓN PARA REEMPLAZAR DOCUMENTO
-- =====================================================

CREATE OR REPLACE FUNCTION replace_cliente_documento(
    p_old_doc_id uuid,
    p_new_storage_path text,
    p_new_nombre_archivo text,
    p_new_tipo_archivo text,
    p_new_tamano_bytes integer,
    p_new_descripcion text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
    v_client_id uuid;
    v_tipo_documento text;
    v_old_version integer;
    v_new_doc_id uuid;
    v_user_id uuid;
BEGIN
    -- Obtener usuario actual
    v_user_id := auth.uid();

    -- Obtener datos del documento original
    SELECT client_id, tipo_documento, version
    INTO v_client_id, v_tipo_documento, v_old_version
    FROM clientes_documentos
    WHERE id = p_old_doc_id AND estado = 'activo';

    IF v_client_id IS NULL THEN
        RAISE EXCEPTION 'Documento no encontrado o no está activo';
    END IF;

    -- Crear nuevo documento con versión incrementada
    INSERT INTO clientes_documentos (
        client_id,
        tipo_documento,
        nombre_archivo,
        tipo_archivo,
        tamano_bytes,
        storage_path,
        storage_bucket,
        estado,
        subido_por,
        fecha_subida,
        descripcion,
        version
    ) VALUES (
        v_client_id,
        v_tipo_documento,
        p_new_nombre_archivo,
        p_new_tipo_archivo,
        p_new_tamano_bytes,
        p_new_storage_path,
        'clientes-documentos',
        'activo',
        v_user_id,
        now(),
        p_new_descripcion,
        v_old_version + 1
    )
    RETURNING id INTO v_new_doc_id;

    -- Marcar documento viejo como reemplazado
    UPDATE clientes_documentos
    SET
        estado = 'reemplazado',
        replaced_by = v_new_doc_id,
        replaced_at = now(),
        updated_at = now()
    WHERE id = p_old_doc_id;

    RETURN v_new_doc_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION replace_cliente_documento IS 'Reemplaza un documento existente, marcando el viejo como reemplazado y creando uno nuevo con versión incrementada';

-- =====================================================
-- 5. FUNCIÓN PARA OBTENER HISTORIAL DE DOCUMENTO
-- =====================================================

CREATE OR REPLACE FUNCTION get_documento_historial(p_client_id uuid, p_tipo_documento text)
RETURNS TABLE (
    id uuid,
    version integer,
    nombre_archivo text,
    tamano_bytes integer,
    estado text,
    fecha_subida timestamptz,
    replaced_at timestamptz,
    subido_por_nombre text
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cd.id,
        cd.version,
        cd.nombre_archivo,
        cd.tamano_bytes,
        cd.estado,
        cd.fecha_subida,
        cd.replaced_at,
        p.full_name as subido_por_nombre
    FROM clientes_documentos cd
    LEFT JOIN profiles p ON p.id = cd.subido_por
    WHERE cd.client_id = p_client_id
    AND cd.tipo_documento = p_tipo_documento
    ORDER BY cd.version DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_documento_historial IS 'Obtiene el historial de versiones de un tipo de documento para un cliente';

-- =====================================================
-- 6. VISTA PARA DOCUMENTOS CON HISTORIAL
-- =====================================================

CREATE OR REPLACE VIEW clientes_documentos_con_historial AS
SELECT
    cd.*,
    p_subido.full_name as subido_por_nombre,
    p_subido.email as subido_por_email,
    (
        SELECT COUNT(*)
        FROM clientes_documentos cd2
        WHERE cd2.client_id = cd.client_id
        AND cd2.tipo_documento = cd.tipo_documento
    ) as total_versiones
FROM clientes_documentos cd
LEFT JOIN profiles p_subido ON p_subido.id = cd.subido_por;

COMMENT ON VIEW clientes_documentos_con_historial IS 'Vista de documentos con información de auditoría y conteo de versiones';
