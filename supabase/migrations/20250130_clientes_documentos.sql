-- ================================================
-- MIGRATION: Client Documents System
-- Description: Tables and storage for client document uploads
-- Author: Claude Code
-- Date: 2025-01-30
-- ================================================

-- ================================================
-- 1. CREATE STORAGE BUCKET FOR CLIENT DOCUMENTS
-- ================================================

-- Create bucket for client documents (public for authenticated users)
INSERT INTO storage.buckets (id, name, public)
VALUES ('clientes-documentos', 'clientes-documentos', true)
ON CONFLICT (id) DO NOTHING;

-- ================================================
-- 2. STORAGE POLICIES (RLS)
-- ================================================

-- Allow authenticated users to upload documents
CREATE POLICY "Authenticated users can upload client documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'clientes-documentos');

-- Allow public read access (for system users to view documents)
CREATE POLICY "Public read access for client documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'clientes-documentos');

-- Allow users to update their own uploaded files
CREATE POLICY "Users can update their own client documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'clientes-documentos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow only admins to delete documents
CREATE POLICY "Only admins can delete client documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'clientes-documentos' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ================================================
-- 3. CREATE CLIENT DOCUMENTS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS clientes_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Document metadata
  tipo_documento text NOT NULL CHECK (tipo_documento IN (
    -- Natural person documents
    'documento_identidad',
    'certificacion_pep',
    'formulario_kyc',
    -- Unipersonal additional documents
    'nit',
    'matricula_comercio',
    -- Juridic additional documents
    'testimonio_constitucion',
    'balance_estado_resultados',
    'poder_representacion',
    'documento_identidad_representante'
  )),

  nombre_archivo text NOT NULL,
  tipo_archivo text NOT NULL, -- MIME type
  tamano_bytes bigint NOT NULL,

  -- Storage reference
  storage_path text NOT NULL UNIQUE,
  storage_bucket text NOT NULL DEFAULT 'clientes-documentos',

  -- Soft delete
  estado text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'descartado')),

  -- Audit fields
  subido_por uuid REFERENCES profiles(id),
  fecha_subida timestamptz NOT NULL DEFAULT now(),
  descartado_por uuid REFERENCES profiles(id),
  fecha_descarte timestamptz,

  -- Metadata
  descripcion text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ================================================
-- 4. INDEXES
-- ================================================

CREATE INDEX idx_clientes_documentos_client_id ON clientes_documentos(client_id);
CREATE INDEX idx_clientes_documentos_tipo ON clientes_documentos(tipo_documento);
CREATE INDEX idx_clientes_documentos_estado ON clientes_documentos(estado);
CREATE INDEX idx_clientes_documentos_subido_por ON clientes_documentos(subido_por);

-- ================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ================================================

ALTER TABLE clientes_documentos ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read active documents
CREATE POLICY "Authenticated users can view active client documents"
ON clientes_documentos FOR SELECT
TO authenticated
USING (estado = 'activo');

-- Admins can see all documents (including discarded)
CREATE POLICY "Admins can view all client documents"
ON clientes_documentos FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Authenticated users can insert documents
CREATE POLICY "Authenticated users can upload client documents"
ON clientes_documentos FOR INSERT
TO authenticated
WITH CHECK (true);

-- Only admins can update documents
CREATE POLICY "Admins can update client documents"
ON clientes_documentos FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- No direct deletes (use soft delete functions instead)
CREATE POLICY "No direct deletes on client documents"
ON clientes_documentos FOR DELETE
TO authenticated
USING (false);

-- ================================================
-- 6. TRIGGERS
-- ================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_clientes_documentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_clientes_documentos_updated_at
BEFORE UPDATE ON clientes_documentos
FOR EACH ROW
EXECUTE FUNCTION update_clientes_documentos_updated_at();

-- ================================================
-- 7. SOFT DELETE FUNCTIONS
-- ================================================

-- Function to discard a document (soft delete)
CREATE OR REPLACE FUNCTION descartar_documento_cliente(documento_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE clientes_documentos
  SET
    estado = 'descartado',
    descartado_por = auth.uid(),
    fecha_descarte = now()
  WHERE id = documento_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore a discarded document (admin only)
CREATE OR REPLACE FUNCTION restaurar_documento_cliente(documento_id uuid)
RETURNS void AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can restore documents';
  END IF;

  UPDATE clientes_documentos
  SET
    estado = 'activo',
    descartado_por = NULL,
    fecha_descarte = NULL
  WHERE id = documento_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to permanently delete a document (admin only)
CREATE OR REPLACE FUNCTION eliminar_documento_cliente_permanente(documento_id uuid)
RETURNS void AS $$
DECLARE
  doc_path text;
  doc_bucket text;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can permanently delete documents';
  END IF;

  -- Get storage info before deleting
  SELECT storage_path, storage_bucket
  INTO doc_path, doc_bucket
  FROM clientes_documentos
  WHERE id = documento_id;

  -- Delete from database
  DELETE FROM clientes_documentos WHERE id = documento_id;

  -- Delete from storage (admin can delete via RLS policy)
  DELETE FROM storage.objects
  WHERE bucket_id = doc_bucket AND name = doc_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 8. HELPER VIEWS
-- ================================================

-- View for documents with user information
CREATE OR REPLACE VIEW clientes_documentos_con_auditoria AS
SELECT
  cd.*,
  p_subido.email as subido_por_email,
  p_subido.full_name as subido_por_nombre,
  p_descartado.email as descartado_por_email,
  p_descartado.full_name as descartado_por_nombre
FROM clientes_documentos cd
LEFT JOIN profiles p_subido ON cd.subido_por = p_subido.id
LEFT JOIN profiles p_descartado ON cd.descartado_por = p_descartado.id;

-- Grant access to authenticated users
GRANT SELECT ON clientes_documentos_con_auditoria TO authenticated;

-- ================================================
-- 9. COMMENTS
-- ================================================

COMMENT ON TABLE clientes_documentos IS 'Stores metadata for client uploaded documents';
COMMENT ON COLUMN clientes_documentos.tipo_documento IS 'Type of document: documento_identidad, certificacion_pep, formulario_kyc, nit, matricula_comercio, testimonio_constitucion, balance_estado_resultados, poder_representacion, documento_identidad_representante';
COMMENT ON COLUMN clientes_documentos.estado IS 'Document state: activo (visible) or descartado (soft deleted)';
COMMENT ON COLUMN clientes_documentos.storage_path IS 'Full path in storage bucket';
COMMENT ON FUNCTION descartar_documento_cliente IS 'Soft delete a client document (changes estado to descartado)';
COMMENT ON FUNCTION restaurar_documento_cliente IS 'Restore a discarded client document (admin only)';
COMMENT ON FUNCTION eliminar_documento_cliente_permanente IS 'Permanently delete a client document from DB and Storage (admin only)';
