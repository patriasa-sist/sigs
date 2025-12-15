-- Agregar triggers de auditoría para siniestros_observaciones, siniestros_historial y siniestros_documentos
-- Esto asegura que created_by y uploaded_by se capturen automáticamente

-- ============================================
-- FUNCIÓN DE AUDITORÍA PARA OBSERVACIONES
-- ============================================

CREATE OR REPLACE FUNCTION audit_siniestros_observaciones()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    NEW.created_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger a tabla de observaciones
CREATE TRIGGER audit_siniestros_observaciones_trigger
  BEFORE INSERT ON siniestros_observaciones
  FOR EACH ROW
  EXECUTE FUNCTION audit_siniestros_observaciones();

COMMENT ON FUNCTION audit_siniestros_observaciones() IS 'Captura automáticamente el usuario que crea una observación';

-- ============================================
-- FUNCIÓN DE AUDITORÍA PARA HISTORIAL
-- ============================================

CREATE OR REPLACE FUNCTION audit_siniestros_historial()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    NEW.created_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger a tabla de historial
CREATE TRIGGER audit_siniestros_historial_trigger
  BEFORE INSERT ON siniestros_historial
  FOR EACH ROW
  EXECUTE FUNCTION audit_siniestros_historial();

COMMENT ON FUNCTION audit_siniestros_historial() IS 'Captura automáticamente el usuario que crea un registro de historial';

-- ============================================
-- FUNCIÓN DE AUDITORÍA PARA DOCUMENTOS
-- ============================================

CREATE OR REPLACE FUNCTION audit_siniestros_documentos()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    NEW.uploaded_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger a tabla de documentos
CREATE TRIGGER audit_siniestros_documentos_trigger
  BEFORE INSERT ON siniestros_documentos
  FOR EACH ROW
  EXECUTE FUNCTION audit_siniestros_documentos();

COMMENT ON FUNCTION audit_siniestros_documentos() IS 'Captura automáticamente el usuario que sube un documento';
