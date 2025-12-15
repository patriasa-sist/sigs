-- ============================================
-- MIGRACIÓN: Sistema Completo de Siniestros
-- Fecha: 2024-12-15
-- Descripción: Implementación del módulo de gestión de siniestros
-- ============================================

-- ============================================
-- PASO 1: AGREGAR ROL "SINIESTROS"
-- ============================================

-- Agregar rol "siniestros" al constraint de profiles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'usuario', 'comercial', 'agente', 'invitado', 'cobranza', 'siniestros', 'desactivado'));

-- Comentario
COMMENT ON COLUMN profiles.role IS 'Roles: admin, usuario, comercial, agente, invitado, cobranza, siniestros, desactivado';

-- ============================================
-- PASO 2: CREAR TABLA DE CATÁLOGO DE COBERTURAS
-- ============================================

CREATE TABLE IF NOT EXISTS coberturas_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  codigo_puc TEXT, -- Código PUC del ramo (ej: "9105" para Automotores) - Más robusto que nombre
  ramo TEXT NOT NULL, -- Nombre del ramo (ej: "Automotores") - Para compatibilidad con polizas existentes
  es_custom BOOLEAN DEFAULT false, -- true si es una cobertura agregada manualmente
  activo BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT cobertura_unica UNIQUE (nombre, codigo_puc, ramo)
);

CREATE INDEX idx_coberturas_codigo_puc ON coberturas_catalogo(codigo_puc);
CREATE INDEX idx_coberturas_ramo ON coberturas_catalogo(ramo);
CREATE INDEX idx_coberturas_activo ON coberturas_catalogo(activo);

COMMENT ON TABLE coberturas_catalogo IS 'Catálogo de coberturas predefinidas por tipo de seguro (ramo)';
COMMENT ON COLUMN coberturas_catalogo.codigo_puc IS 'Código PUC del ramo (identificador único oficial) - NULL para coberturas genéricas';
COMMENT ON COLUMN coberturas_catalogo.ramo IS 'Nombre del ramo - mantenido para compatibilidad con sistema de pólizas';
COMMENT ON COLUMN coberturas_catalogo.es_custom IS 'true si fue agregada manualmente por un usuario, false si es predefinida del sistema';

-- ============================================
-- PASO 3: CREAR TABLA PRINCIPAL DE SINIESTROS
-- ============================================

CREATE TABLE IF NOT EXISTS siniestros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relación con póliza siniestrada
  poliza_id UUID NOT NULL REFERENCES polizas(id) ON DELETE RESTRICT,

  -- Detalles del siniestro (Paso 2 del formulario)
  fecha_siniestro DATE NOT NULL,
  fecha_reporte DATE NOT NULL,
  lugar_hecho TEXT NOT NULL,
  departamento_id UUID NOT NULL REFERENCES regionales(id),
  monto_reserva DECIMAL(12,2) NOT NULL,
  moneda TEXT NOT NULL CHECK (moneda IN ('Bs', 'USD', 'USDT', 'UFV')),
  descripcion TEXT NOT NULL,
  contactos TEXT[], -- Array de emails

  -- Estado del siniestro
  estado TEXT DEFAULT 'abierto' CHECK (estado IN ('abierto', 'rechazado', 'declinado', 'concluido')),

  -- Información de cierre (campos opcionales hasta que se cierra el caso)
  motivo_cierre_tipo TEXT CHECK (motivo_cierre_tipo IN ('rechazo', 'declinacion', 'indemnizacion')),
  fecha_cierre TIMESTAMPTZ,
  cerrado_por UUID REFERENCES profiles(id),

  -- Rechazado (si aplica)
  motivo_rechazo TEXT CHECK (motivo_rechazo IN ('Mora', 'Incumplimiento', 'Sin cobertura', 'No aplicable')),

  -- Declinado (si aplica)
  motivo_declinacion TEXT CHECK (motivo_declinacion IN ('Solicitud cliente', 'Pagó otra póliza')),

  -- Indemnización (si aplica)
  monto_reclamado DECIMAL(12,2),
  moneda_reclamado TEXT CHECK (moneda_reclamado IN ('Bs', 'USD', 'USDT', 'UFV')),
  deducible DECIMAL(12,2),
  moneda_deducible TEXT CHECK (moneda_deducible IN ('Bs', 'USD', 'USDT', 'UFV')),
  monto_pagado DECIMAL(12,2),
  moneda_pagado TEXT CHECK (moneda_pagado IN ('Bs', 'USD', 'USDT', 'UFV')),
  es_pago_comercial BOOLEAN DEFAULT false,

  -- Fecha opcional para gestión de repuestos
  fecha_llegada_repuestos DATE,

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),

  -- Constraints de negocio
  CONSTRAINT fecha_reporte_valida CHECK (fecha_reporte >= fecha_siniestro),
  CONSTRAINT monto_reserva_positivo CHECK (monto_reserva > 0),
  CONSTRAINT montos_indemnizacion_validos CHECK (
    (estado != 'concluido') OR
    (monto_reclamado IS NOT NULL AND monto_pagado IS NOT NULL)
  ),
  CONSTRAINT motivo_cierre_coherente CHECK (
    (estado = 'abierto' AND motivo_cierre_tipo IS NULL) OR
    (estado = 'rechazado' AND motivo_cierre_tipo = 'rechazo' AND motivo_rechazo IS NOT NULL) OR
    (estado = 'declinado' AND motivo_cierre_tipo = 'declinacion' AND motivo_declinacion IS NOT NULL) OR
    (estado = 'concluido' AND motivo_cierre_tipo = 'indemnizacion')
  )
);

-- Índices para optimización de queries
CREATE INDEX idx_siniestros_poliza ON siniestros(poliza_id);
CREATE INDEX idx_siniestros_estado ON siniestros(estado);
CREATE INDEX idx_siniestros_fecha_siniestro ON siniestros(fecha_siniestro DESC);
CREATE INDEX idx_siniestros_departamento ON siniestros(departamento_id);
CREATE INDEX idx_siniestros_created_by ON siniestros(created_by);
CREATE INDEX idx_siniestros_fecha_cierre ON siniestros(fecha_cierre DESC) WHERE fecha_cierre IS NOT NULL;

-- Comentarios
COMMENT ON TABLE siniestros IS 'Registro de siniestros reportados en pólizas activas';
COMMENT ON COLUMN siniestros.contactos IS 'Array de emails de contacto para el siniestro';
COMMENT ON COLUMN siniestros.estado IS 'Estado del siniestro: abierto, rechazado, declinado, concluido';
COMMENT ON COLUMN siniestros.motivo_cierre_tipo IS 'Tipo de cierre: rechazo, declinacion, indemnizacion';

-- ============================================
-- PASO 4: TABLA DE COBERTURAS DEL SINIESTRO
-- ============================================

CREATE TABLE IF NOT EXISTS siniestros_coberturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  siniestro_id UUID NOT NULL REFERENCES siniestros(id) ON DELETE CASCADE,
  cobertura_id UUID NOT NULL REFERENCES coberturas_catalogo(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT cobertura_siniestro_unica UNIQUE (siniestro_id, cobertura_id)
);

CREATE INDEX idx_siniestros_coberturas_siniestro ON siniestros_coberturas(siniestro_id);

COMMENT ON TABLE siniestros_coberturas IS 'Relación N:N entre siniestros y coberturas aplicadas';

-- ============================================
-- PASO 5: TABLA DE DOCUMENTOS DEL SINIESTRO
-- ============================================

CREATE TABLE IF NOT EXISTS siniestros_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  siniestro_id UUID NOT NULL REFERENCES siniestros(id) ON DELETE CASCADE,

  tipo_documento TEXT NOT NULL, -- Ver tipos predefinidos en constantes del frontend
  nombre_archivo TEXT NOT NULL,
  archivo_url TEXT NOT NULL, -- Path en Supabase Storage
  tamano_bytes BIGINT,

  -- Soft delete
  estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'descartado')),

  -- Auditoría
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES profiles(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_siniestros_documentos_siniestro ON siniestros_documentos(siniestro_id);
CREATE INDEX idx_siniestros_documentos_estado ON siniestros_documentos(estado);
CREATE INDEX idx_siniestros_documentos_tipo ON siniestros_documentos(tipo_documento);

COMMENT ON TABLE siniestros_documentos IS 'Documentos asociados a siniestros con sistema de soft delete';
COMMENT ON COLUMN siniestros_documentos.estado IS 'Estado del documento: activo o descartado (soft delete)';

-- ============================================
-- PASO 6: TABLA DE OBSERVACIONES DEL SINIESTRO
-- ============================================

CREATE TABLE IF NOT EXISTS siniestros_observaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  siniestro_id UUID NOT NULL REFERENCES siniestros(id) ON DELETE CASCADE,

  observacion TEXT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_siniestros_observaciones_siniestro ON siniestros_observaciones(siniestro_id);
CREATE INDEX idx_siniestros_observaciones_created_at ON siniestros_observaciones(created_at DESC);

COMMENT ON TABLE siniestros_observaciones IS 'Registro cronológico de observaciones agregadas durante la gestión del siniestro';

-- ============================================
-- PASO 7: TABLA DE HISTORIAL DE EDICIONES
-- ============================================

CREATE TABLE IF NOT EXISTS siniestros_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  siniestro_id UUID NOT NULL REFERENCES siniestros(id) ON DELETE CASCADE,

  accion TEXT NOT NULL, -- 'created', 'updated', 'documento_agregado', 'observacion_agregada', 'estado_cambiado', 'cerrado'
  campo_modificado TEXT, -- Nombre del campo modificado (si aplica)
  valor_anterior TEXT, -- Valor previo (JSON string si es objeto)
  valor_nuevo TEXT, -- Valor nuevo (JSON string si es objeto)
  detalles JSONB, -- Información adicional en formato JSON

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_siniestros_historial_siniestro ON siniestros_historial(siniestro_id);
CREATE INDEX idx_siniestros_historial_created_at ON siniestros_historial(created_at DESC);
CREATE INDEX idx_siniestros_historial_accion ON siniestros_historial(accion);

COMMENT ON TABLE siniestros_historial IS 'Auditoría detallada de todos los cambios en siniestros';

-- ============================================
-- PASO 8: TRIGGERS DE AUDITORÍA
-- ============================================

-- Trigger para updated_at en siniestros
CREATE TRIGGER update_siniestros_updated_at
  BEFORE UPDATE ON siniestros
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para registrar cambios en historial
CREATE OR REPLACE FUNCTION registrar_cambio_siniestro()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO siniestros_historial (siniestro_id, accion, detalles, created_by)
    VALUES (
      NEW.id,
      'created',
      jsonb_build_object('poliza_id', NEW.poliza_id, 'fecha_siniestro', NEW.fecha_siniestro),
      auth.uid()
    );
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Registrar cambio de estado específicamente
    IF (OLD.estado != NEW.estado) THEN
      INSERT INTO siniestros_historial (siniestro_id, accion, campo_modificado, valor_anterior, valor_nuevo, created_by)
      VALUES (
        NEW.id,
        'estado_cambiado',
        'estado',
        OLD.estado,
        NEW.estado,
        auth.uid()
      );
    END IF;

    -- Registrar cierre del siniestro
    IF (OLD.estado = 'abierto' AND NEW.estado IN ('rechazado', 'declinado', 'concluido')) THEN
      INSERT INTO siniestros_historial (siniestro_id, accion, detalles, created_by)
      VALUES (
        NEW.id,
        'cerrado',
        jsonb_build_object(
          'tipo_cierre', NEW.motivo_cierre_tipo,
          'estado_final', NEW.estado,
          'fecha_cierre', NEW.fecha_cierre
        ),
        auth.uid()
      );
    END IF;

    -- Registrar otros cambios importantes
    IF (OLD.monto_reserva != NEW.monto_reserva OR OLD.descripcion != NEW.descripcion OR OLD.fecha_llegada_repuestos IS DISTINCT FROM NEW.fecha_llegada_repuestos) THEN
      INSERT INTO siniestros_historial (siniestro_id, accion, created_by)
      VALUES (NEW.id, 'updated', auth.uid());
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_historial_siniestros
  AFTER INSERT OR UPDATE ON siniestros
  FOR EACH ROW EXECUTE FUNCTION registrar_cambio_siniestro();

-- Trigger para capturar created_by y updated_by
CREATE OR REPLACE FUNCTION audit_siniestros_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    NEW.created_by = auth.uid();
    NEW.updated_by = auth.uid();
  ELSIF (TG_OP = 'UPDATE') THEN
    NEW.updated_by = auth.uid();
    NEW.created_by = OLD.created_by; -- Mantener creador original
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_siniestros_trigger
  BEFORE INSERT OR UPDATE ON siniestros
  FOR EACH ROW EXECUTE FUNCTION audit_siniestros_fields();

-- ============================================
-- PASO 9: VISTA CONSOLIDADA DE SINIESTROS
-- ============================================

CREATE OR REPLACE VIEW siniestros_vista AS
SELECT
  s.id,
  s.poliza_id,
  s.fecha_siniestro,
  s.fecha_reporte,
  s.lugar_hecho,
  s.monto_reserva,
  s.moneda,
  s.descripcion,
  s.estado,
  s.fecha_cierre,
  s.motivo_cierre_tipo,
  s.created_at,

  -- Información de la póliza
  p.numero_poliza,
  p.ramo,
  p.inicio_vigencia AS poliza_inicio_vigencia,
  p.fin_vigencia AS poliza_fin_vigencia,

  -- Información del cliente
  CASE
    WHEN c.client_type = 'natural' THEN
      CONCAT(nc.primer_nombre, ' ', COALESCE(nc.segundo_nombre || ' ', ''), nc.primer_apellido, ' ', COALESCE(nc.segundo_apellido, ''))
    ELSE
      jc.razon_social
  END AS cliente_nombre,

  CASE
    WHEN c.client_type = 'natural' THEN nc.numero_documento
    ELSE jc.nit
  END AS cliente_documento,

  c.client_type AS cliente_tipo,

  -- Información de la compañía aseguradora
  ca.nombre AS compania_nombre,

  -- Información del departamento
  r.nombre AS departamento_nombre,
  r.codigo AS departamento_codigo,

  -- Información del responsable de la póliza
  resp.full_name AS responsable_nombre,

  -- Información de auditoría
  creator.full_name AS creado_por_nombre,
  s.created_at AS fecha_creacion,

  -- Contadores
  (SELECT COUNT(*) FROM siniestros_documentos sd WHERE sd.siniestro_id = s.id AND sd.estado = 'activo') AS total_documentos,
  (SELECT COUNT(*) FROM siniestros_observaciones so WHERE so.siniestro_id = s.id) AS total_observaciones,
  (SELECT COUNT(*) FROM siniestros_coberturas sc WHERE sc.siniestro_id = s.id) AS total_coberturas

FROM siniestros s
INNER JOIN polizas p ON s.poliza_id = p.id
INNER JOIN clients c ON p.client_id = c.id
LEFT JOIN natural_clients nc ON c.id = nc.client_id AND c.client_type = 'natural'
LEFT JOIN juridic_clients jc ON c.id = jc.client_id AND c.client_type = 'juridica'
LEFT JOIN companias_aseguradoras ca ON p.compania_aseguradora_id = ca.id
LEFT JOIN regionales r ON s.departamento_id = r.id
LEFT JOIN profiles resp ON p.responsable_id = resp.id
LEFT JOIN profiles creator ON s.created_by = creator.id;

COMMENT ON VIEW siniestros_vista IS 'Vista consolidada de siniestros con información de póliza, cliente, y contadores';

-- ============================================
-- PASO 10: RLS POLICIES
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE siniestros ENABLE ROW LEVEL SECURITY;
ALTER TABLE siniestros_coberturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE coberturas_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE siniestros_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE siniestros_observaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE siniestros_historial ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios autenticados pueden leer siniestros
CREATE POLICY "Usuarios autenticados pueden leer siniestros"
ON siniestros FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'usuario', 'comercial', 'agente', 'cobranza', 'siniestros')
  )
);

-- Política: Solo siniestros, comercial y admin pueden crear siniestros
CREATE POLICY "Solo siniestros, comercial y admin pueden crear siniestros"
ON siniestros FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('siniestros', 'comercial', 'admin')
  )
);

-- Política: Solo siniestros, comercial y admin pueden actualizar siniestros
CREATE POLICY "Solo siniestros, comercial y admin pueden actualizar siniestros"
ON siniestros FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('siniestros', 'comercial', 'admin')
  )
);

-- Política: Solo admins pueden eliminar siniestros
CREATE POLICY "Solo admins pueden eliminar siniestros"
ON siniestros FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Políticas para catálogo de coberturas (lectura pública autenticada, escritura admin)
CREATE POLICY "Usuarios autenticados pueden leer coberturas activas"
ON coberturas_catalogo FOR SELECT
TO authenticated
USING (activo = true);

CREATE POLICY "Solo admins pueden modificar coberturas"
ON coberturas_catalogo FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Políticas para siniestros_coberturas (igual que siniestros)
CREATE POLICY "Usuarios autenticados pueden leer coberturas de siniestros"
ON siniestros_coberturas FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'usuario', 'comercial', 'agente', 'cobranza', 'siniestros')
  )
);

CREATE POLICY "Solo siniestros, comercial y admin pueden gestionar coberturas de siniestros"
ON siniestros_coberturas FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('siniestros', 'comercial', 'admin')
  )
);

-- Políticas para documentos (similar a polizas_documentos)
CREATE POLICY "Usuarios autenticados pueden leer documentos activos de siniestros"
ON siniestros_documentos FOR SELECT
TO authenticated
USING (estado = 'activo' OR estado IS NULL);

CREATE POLICY "Solo siniestros, comercial y admin pueden subir documentos"
ON siniestros_documentos FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('siniestros', 'comercial', 'admin')
  )
);

CREATE POLICY "Solo siniestros, comercial y admin pueden actualizar documentos"
ON siniestros_documentos FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('siniestros', 'comercial', 'admin')
  )
);

CREATE POLICY "Solo admins pueden eliminar documentos físicamente"
ON siniestros_documentos FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Políticas para observaciones
CREATE POLICY "Usuarios autenticados pueden leer observaciones"
ON siniestros_observaciones FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'usuario', 'comercial', 'agente', 'cobranza', 'siniestros')
  )
);

CREATE POLICY "Solo siniestros, comercial y admin pueden agregar observaciones"
ON siniestros_observaciones FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('siniestros', 'comercial', 'admin')
  )
);

-- Políticas para historial (solo lectura)
CREATE POLICY "Usuarios autenticados pueden leer historial"
ON siniestros_historial FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'usuario', 'comercial', 'agente', 'cobranza', 'siniestros')
  )
);

-- ============================================
-- PASO 11: STORAGE BUCKET PARA DOCUMENTOS
-- ============================================

-- Crear bucket para documentos de siniestros
INSERT INTO storage.buckets (id, name, public)
VALUES ('siniestros-documentos', 'siniestros-documentos', true)
ON CONFLICT (id) DO NOTHING;

-- Política: Permitir upload solo a usuarios autenticados con roles siniestros/comercial/admin
DROP POLICY IF EXISTS "Siniestros, comercial y admin pueden subir documentos de siniestros" ON storage.objects;
CREATE POLICY "Siniestros, comercial y admin pueden subir documentos de siniestros"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'siniestros-documentos'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('siniestros', 'comercial', 'admin')
  )
);

-- Política: Permitir lectura pública
DROP POLICY IF EXISTS "Documentos de siniestros son de lectura pública" ON storage.objects;
CREATE POLICY "Documentos de siniestros son de lectura pública"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'siniestros-documentos');

-- Política: SOLO ADMINS pueden eliminar físicamente archivos
DROP POLICY IF EXISTS "Solo admins pueden eliminar documentos de siniestros físicamente" ON storage.objects;
CREATE POLICY "Solo admins pueden eliminar documentos de siniestros físicamente"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'siniestros-documentos'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ============================================
-- PASO 12: FUNCIONES RPC PARA SOFT DELETE
-- ============================================

-- Función para marcar documento como descartado
CREATE OR REPLACE FUNCTION descartar_documento_siniestro(documento_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  usuario_rol TEXT;
  siniestro_id_val UUID;
BEGIN
  -- Obtener rol del usuario actual
  SELECT role INTO usuario_rol
  FROM profiles
  WHERE id = auth.uid();

  -- Verificar que el usuario sea siniestros, comercial o admin
  IF usuario_rol NOT IN ('siniestros', 'comercial', 'admin') THEN
    RAISE EXCEPTION 'Usuario no autorizado para descartar documentos';
  END IF;

  -- Obtener siniestro_id antes de actualizar
  SELECT siniestro_id INTO siniestro_id_val
  FROM siniestros_documentos
  WHERE id = documento_id;

  -- Marcar documento como descartado
  UPDATE siniestros_documentos
  SET estado = 'descartado'
  WHERE id = documento_id;

  -- Registrar en historial
  INSERT INTO siniestros_historial (siniestro_id, accion, detalles, created_by)
  VALUES (
    siniestro_id_val,
    'documento_descartado',
    jsonb_build_object('documento_id', documento_id),
    auth.uid()
  );

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Función para restaurar documento descartado (solo admin)
CREATE OR REPLACE FUNCTION restaurar_documento_siniestro(documento_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  usuario_rol TEXT;
  siniestro_id_val UUID;
BEGIN
  -- Obtener rol del usuario actual
  SELECT role INTO usuario_rol
  FROM profiles
  WHERE id = auth.uid();

  -- Verificar que el usuario sea admin
  IF usuario_rol != 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden restaurar documentos';
  END IF;

  -- Obtener siniestro_id antes de actualizar
  SELECT siniestro_id INTO siniestro_id_val
  FROM siniestros_documentos
  WHERE id = documento_id;

  -- Restaurar documento
  UPDATE siniestros_documentos
  SET estado = 'activo'
  WHERE id = documento_id;

  -- Registrar en historial
  INSERT INTO siniestros_historial (siniestro_id, accion, detalles, created_by)
  VALUES (
    siniestro_id_val,
    'documento_restaurado',
    jsonb_build_object('documento_id', documento_id),
    auth.uid()
  );

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Función para eliminar permanentemente documento (solo admin)
CREATE OR REPLACE FUNCTION eliminar_documento_siniestro_permanente(documento_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  usuario_rol TEXT;
  archivo_path TEXT;
  siniestro_id_val UUID;
BEGIN
  -- Obtener rol del usuario actual
  SELECT role INTO usuario_rol
  FROM profiles
  WHERE id = auth.uid();

  -- Verificar que el usuario sea admin
  IF usuario_rol != 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden eliminar documentos permanentemente';
  END IF;

  -- Obtener path del archivo y siniestro_id
  SELECT archivo_url, siniestro_id INTO archivo_path, siniestro_id_val
  FROM siniestros_documentos
  WHERE id = documento_id;

  -- Registrar en historial antes de eliminar
  INSERT INTO siniestros_historial (siniestro_id, accion, detalles, created_by)
  VALUES (
    siniestro_id_val,
    'documento_eliminado_permanente',
    jsonb_build_object('documento_id', documento_id, 'archivo_url', archivo_path),
    auth.uid()
  );

  -- Eliminar registro de base de datos
  DELETE FROM siniestros_documentos
  WHERE id = documento_id;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- ============================================
-- PASO 13: DATOS INICIALES - COBERTURAS PREDEFINIDAS
-- ============================================

-- Coberturas para AUTOMOTORES (PUC 9105)
INSERT INTO coberturas_catalogo (nombre, descripcion, codigo_puc, ramo, es_custom) VALUES
  ('Daños materiales propios', 'Cobertura de daños al vehículo asegurado', '9105', 'Automotores', false),
  ('Robo total', 'Cobertura por robo total del vehículo', '9105', 'Automotores', false),
  ('Incendio total', 'Cobertura por incendio total del vehículo', '9105', 'Automotores', false),
  ('Responsabilidad civil', 'Cobertura de daños a terceros', '9105', 'Automotores', false),
  ('Accidentes personales', 'Cobertura de lesiones a ocupantes', '9105', 'Automotores', false),
  ('Asistencia en ruta', 'Servicio de grúa y asistencia mecánica', '9105', 'Automotores', false),
  ('Cristales', 'Cobertura de parabrisas y ventanas', '9105', 'Automotores', false),
  ('Fenómenos naturales', 'Daños por lluvia, granizo, inundación, etc.', '9105', 'Automotores', false)
ON CONFLICT (nombre, codigo_puc, ramo) DO NOTHING;

-- Coberturas para SALUD O ENFERMEDAD (PUC 9111 - generales)
INSERT INTO coberturas_catalogo (nombre, descripcion, codigo_puc, ramo, es_custom) VALUES
  ('Consultas médicas', 'Atención médica general', '9111', 'Salud o enfermedad', false),
  ('Hospitalización', 'Cobertura de internación hospitalaria', '9111', 'Salud o enfermedad', false),
  ('Cirugías', 'Intervenciones quirúrgicas', '9111', 'Salud o enfermedad', false),
  ('Medicamentos', 'Cobertura de fármacos prescritos', '9111', 'Salud o enfermedad', false),
  ('Exámenes de laboratorio', 'Análisis clínicos y estudios', '9111', 'Salud o enfermedad', false),
  ('Emergencias', 'Atención de urgencias médicas', '9111', 'Salud o enfermedad', false),
  ('Maternidad', 'Cobertura de parto y prenatal', '9111', 'Salud o enfermedad', false)
ON CONFLICT (nombre, codigo_puc, ramo) DO NOTHING;

-- Coberturas para INCENDIO Y ALIADOS (PUC 9101)
INSERT INTO coberturas_catalogo (nombre, descripcion, codigo_puc, ramo, es_custom) VALUES
  ('Incendio', 'Daños por fuego', '9101', 'Incendio y aliados', false),
  ('Explosión', 'Daños por explosión', '9101', 'Incendio y aliados', false),
  ('Rayo', 'Daños por descarga eléctrica', '9101', 'Incendio y aliados', false),
  ('Terremoto', 'Daños por movimientos sísmicos', '9101', 'Incendio y aliados', false),
  ('Inundación', 'Daños por agua', '9101', 'Incendio y aliados', false),
  ('Robo con violencia', 'Sustracción forzosa de bienes', '9101', 'Incendio y aliados', false)
ON CONFLICT (nombre, codigo_puc, ramo) DO NOTHING;

-- Coberturas para ACCIDENTES PERSONALES (PUC 9350 - personas)
INSERT INTO coberturas_catalogo (nombre, descripcion, codigo_puc, ramo, es_custom) VALUES
  ('Muerte accidental', 'Indemnización por fallecimiento', '9350', 'Accidentes personales', false),
  ('Invalidez permanente', 'Compensación por discapacidad', '9350', 'Accidentes personales', false),
  ('Gastos médicos', 'Atención de lesiones', '9350', 'Accidentes personales', false),
  ('Incapacidad temporal', 'Compensación durante recuperación', '9350', 'Accidentes personales', false)
ON CONFLICT (nombre, codigo_puc, ramo) DO NOTHING;

-- Coberturas para RESPONSABILIDAD CIVIL (PUC 9108)
INSERT INTO coberturas_catalogo (nombre, descripcion, codigo_puc, ramo, es_custom) VALUES
  ('Daños materiales a terceros', 'Indemnización por daños patrimoniales', '9108', 'Responsabilidad civil', false),
  ('Lesiones a terceros', 'Gastos médicos de afectados', '9108', 'Responsabilidad civil', false),
  ('Defensa jurídica', 'Costos legales de defensa', '9108', 'Responsabilidad civil', false)
ON CONFLICT (nombre, codigo_puc, ramo) DO NOTHING;

-- Coberturas GENERALES (aplicables a múltiples ramos - sin PUC específico)
INSERT INTO coberturas_catalogo (nombre, descripcion, codigo_puc, ramo, es_custom) VALUES
  ('Daños materiales', 'Cobertura general de daños', NULL, 'General', false),
  ('Pérdida total', 'Indemnización por pérdida completa', NULL, 'General', false),
  ('Gastos de reposición', 'Costos de reemplazo de bienes', NULL, 'General', false)
ON CONFLICT (nombre, codigo_puc, ramo) DO NOTHING;

-- ============================================
-- FINALIZACIÓN
-- ============================================

-- Comentario final
COMMENT ON TABLE siniestros IS 'Sistema completo de gestión de siniestros - Migración 20251215000000';
