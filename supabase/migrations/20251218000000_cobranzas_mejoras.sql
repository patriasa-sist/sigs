-- =============================================
-- MIGRACIÓN: Mejoras Módulo Cobranzas
-- Fecha: 2025-12-18
-- Descripción: Implementa 8 mejoras para el módulo de cobranzas:
--   1. Tabla para comprobantes de pago
--   2. Campos de prórroga en cuotas
--   3. Storage bucket para comprobantes
--   4. RLS policies para seguridad
--   5. Funciones de DB para prórroga y soft delete
-- =============================================

-- =============================================
-- 1. TABLA PARA COMPROBANTES DE PAGO
-- =============================================

CREATE TABLE IF NOT EXISTS polizas_pagos_comprobantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pago_id uuid NOT NULL UNIQUE REFERENCES polizas_pagos(id) ON DELETE CASCADE,
  nombre_archivo text NOT NULL,
  archivo_url text NOT NULL,
  tamano_bytes bigint NOT NULL CHECK (tamano_bytes > 0 AND tamano_bytes <= 10485760),
  tipo_archivo text NOT NULL CHECK (tipo_archivo IN ('factura', 'recibo', 'comprobante_deposito', 'otro')),
  estado text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'descartado')),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE polizas_pagos_comprobantes IS 'Comprobantes/facturas adjuntos a pagos de cuotas';
COMMENT ON COLUMN polizas_pagos_comprobantes.pago_id IS 'Relación 1:1 con cuota pagada (UNIQUE constraint)';
COMMENT ON COLUMN polizas_pagos_comprobantes.nombre_archivo IS 'Nombre original del archivo subido';
COMMENT ON COLUMN polizas_pagos_comprobantes.archivo_url IS 'URL del archivo en Supabase Storage';
COMMENT ON COLUMN polizas_pagos_comprobantes.tamano_bytes IS 'Tamaño del archivo en bytes (máximo 10MB)';
COMMENT ON COLUMN polizas_pagos_comprobantes.tipo_archivo IS 'Tipo de comprobante: factura, recibo, comprobante_deposito, otro';
COMMENT ON COLUMN polizas_pagos_comprobantes.estado IS 'Estado del comprobante: activo o descartado (soft delete)';
COMMENT ON COLUMN polizas_pagos_comprobantes.uploaded_by IS 'Usuario que subió el comprobante';

-- =============================================
-- 2. CAMPOS DE PRÓRROGA EN POLIZAS_PAGOS
-- =============================================

ALTER TABLE polizas_pagos
ADD COLUMN IF NOT EXISTS fecha_vencimiento_original date,
ADD COLUMN IF NOT EXISTS prorrogas_historial jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN polizas_pagos.fecha_vencimiento_original IS 'Fecha de vencimiento original antes de cualquier prórroga';
COMMENT ON COLUMN polizas_pagos.prorrogas_historial IS 'Array JSONB con historial completo de prórrogas aplicadas';

-- =============================================
-- 3. STORAGE BUCKET PARA COMPROBANTES
-- =============================================

-- IMPORTANTE: El bucket NO se puede crear desde SQL por restricciones de permisos.
-- Debes crear el bucket MANUALMENTE desde la UI de Supabase:
--
-- PASOS:
-- 1. Ir a: Storage → "Create a new bucket"
-- 2. Bucket name: pagos-comprobantes
-- 3. Public bucket: ✅ MARCAR (necesario para RLS)
-- 4. File size limit: 10485760 (10MB)
-- 5. Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp, application/pdf
-- 6. Click "Create bucket"
--
-- Verificar que el bucket existe:
-- SELECT * FROM storage.buckets WHERE id = 'pagos-comprobantes';
-- (Debe retornar 1 fila con public = true)

-- Las siguientes líneas están comentadas porque requieren permisos de superusuario:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('pagos-comprobantes', 'pagos-comprobantes', true)
-- ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 4. RLS POLICIES PARA TABLA COMPROBANTES
-- =============================================

ALTER TABLE polizas_pagos_comprobantes ENABLE ROW LEVEL SECURITY;

-- Política de lectura: todos los usuarios autenticados pueden ver comprobantes activos
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver comprobantes activos" ON polizas_pagos_comprobantes;
CREATE POLICY "Usuarios autenticados pueden ver comprobantes activos"
ON polizas_pagos_comprobantes FOR SELECT
TO authenticated
USING (estado = 'activo');

-- Política de inserción: solo cobranza y admin pueden subir comprobantes
DROP POLICY IF EXISTS "Cobranza y admin pueden subir comprobantes" ON polizas_pagos_comprobantes;
CREATE POLICY "Cobranza y admin pueden subir comprobantes"
ON polizas_pagos_comprobantes FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('cobranza', 'admin')
  )
);

-- Política de actualización: solo cobranza y admin (para soft delete)
DROP POLICY IF EXISTS "Cobranza y admin pueden actualizar comprobantes" ON polizas_pagos_comprobantes;
CREATE POLICY "Cobranza y admin pueden actualizar comprobantes"
ON polizas_pagos_comprobantes FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('cobranza', 'admin')
  )
);

-- =============================================
-- 5. RLS POLICIES PARA STORAGE BUCKET
-- =============================================

-- Política de inserción: usuarios autenticados pueden subir archivos en su carpeta
DROP POLICY IF EXISTS "Usuarios autenticados pueden subir a pagos-comprobantes" ON storage.objects;
CREATE POLICY "Usuarios autenticados pueden subir a pagos-comprobantes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pagos-comprobantes'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Política de lectura: todos los usuarios autenticados pueden leer archivos
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer de pagos-comprobantes" ON storage.objects;
CREATE POLICY "Usuarios autenticados pueden leer de pagos-comprobantes"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'pagos-comprobantes');

-- Política de eliminación: solo admin puede eliminar físicamente
DROP POLICY IF EXISTS "Solo admin puede eliminar de pagos-comprobantes" ON storage.objects;
CREATE POLICY "Solo admin puede eliminar de pagos-comprobantes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'pagos-comprobantes'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- =============================================
-- 6. FUNCIÓN PARA REGISTRAR PRÓRROGA DE CUOTA
-- =============================================

CREATE OR REPLACE FUNCTION registrar_prorroga_cuota(
  p_cuota_id uuid,
  p_nueva_fecha date,
  p_usuario_id uuid,
  p_motivo text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fecha_actual date;
  v_fecha_original date;
  v_usuario_nombre text;
  v_prorroga jsonb;
  v_dias_extension integer;
  v_estado_cuota text;
BEGIN
  -- Obtener datos actuales de la cuota
  SELECT fecha_vencimiento, fecha_vencimiento_original, estado
  INTO v_fecha_actual, v_fecha_original, v_estado_cuota
  FROM polizas_pagos
  WHERE id = p_cuota_id;

  -- Validar que la cuota existe
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cuota no encontrada';
  END IF;

  -- Validar que la cuota no esté pagada
  IF v_estado_cuota = 'pagado' THEN
    RAISE EXCEPTION 'No se puede prorrogar una cuota ya pagada';
  END IF;

  -- Validar que la nueva fecha sea futura
  IF p_nueva_fecha <= CURRENT_DATE THEN
    RAISE EXCEPTION 'La nueva fecha debe ser futura (después de hoy)';
  END IF;

  -- Obtener nombre del usuario
  SELECT full_name INTO v_usuario_nombre
  FROM profiles
  WHERE id = p_usuario_id;

  -- Si no se encuentra el usuario, usar 'Sistema'
  IF v_usuario_nombre IS NULL THEN
    v_usuario_nombre := 'Sistema';
  END IF;

  -- Calcular días de extensión
  v_dias_extension := p_nueva_fecha - v_fecha_actual;

  -- Si es la primera prórroga, guardar fecha original
  IF v_fecha_original IS NULL THEN
    UPDATE polizas_pagos
    SET fecha_vencimiento_original = v_fecha_actual
    WHERE id = p_cuota_id;

    v_fecha_original := v_fecha_actual;
  END IF;

  -- Crear objeto de prórroga con todos los datos
  v_prorroga := jsonb_build_object(
    'fecha_anterior', v_fecha_actual::text,
    'fecha_nueva', p_nueva_fecha::text,
    'fecha_registro', now()::text,
    'usuario_id', p_usuario_id::text,
    'usuario_nombre', v_usuario_nombre,
    'motivo', p_motivo,
    'dias_extension', v_dias_extension
  );

  -- Actualizar cuota con nueva fecha y registro de prórroga
  UPDATE polizas_pagos
  SET
    fecha_vencimiento = p_nueva_fecha,
    prorrogas_historial = COALESCE(prorrogas_historial, '[]'::jsonb) || v_prorroga,
    updated_at = now(),
    updated_by = p_usuario_id,
    observaciones = COALESCE(observaciones || E'\n', '') ||
                    format('Prórroga registrada: %s días (de %s a %s)%s',
                           v_dias_extension,
                           v_fecha_actual,
                           p_nueva_fecha,
                           CASE WHEN p_motivo IS NOT NULL AND p_motivo != ''
                                THEN ' - Motivo: ' || p_motivo
                                ELSE ''
                           END)
  WHERE id = p_cuota_id;

  -- Retornar objeto de prórroga creado
  RETURN v_prorroga;
END;
$$;

COMMENT ON FUNCTION registrar_prorroga_cuota IS 'Registra prórroga de cuota con validaciones y mantiene historial completo en JSONB';

-- =============================================
-- 7. FUNCIÓN PARA DESCARTAR COMPROBANTE (SOFT DELETE)
-- =============================================

CREATE OR REPLACE FUNCTION descartar_comprobante(p_comprobante_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_affected_rows integer;
BEGIN
  -- Actualizar estado a descartado
  UPDATE polizas_pagos_comprobantes
  SET
    estado = 'descartado',
    updated_at = now()
  WHERE id = p_comprobante_id
  AND estado = 'activo'; -- Solo si está activo

  -- Obtener número de filas afectadas
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;

  -- Retornar true si se actualizó al menos una fila
  RETURN v_affected_rows > 0;
END;
$$;

COMMENT ON FUNCTION descartar_comprobante IS 'Marca un comprobante como descartado (soft delete) sin eliminarlo físicamente';

-- =============================================
-- 8. FUNCIÓN PARA RESTAURAR COMPROBANTE
-- =============================================

CREATE OR REPLACE FUNCTION restaurar_comprobante(p_comprobante_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_affected_rows integer;
BEGIN
  -- Actualizar estado a activo
  UPDATE polizas_pagos_comprobantes
  SET
    estado = 'activo',
    updated_at = now()
  WHERE id = p_comprobante_id
  AND estado = 'descartado'; -- Solo si está descartado

  -- Obtener número de filas afectadas
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;

  -- Retornar true si se actualizó al menos una fila
  RETURN v_affected_rows > 0;
END;
$$;

COMMENT ON FUNCTION restaurar_comprobante IS 'Restaura un comprobante descartado a estado activo';

-- =============================================
-- 9. TRIGGER PARA AUTO-ACTUALIZAR updated_at
-- =============================================

-- Función genérica para actualizar updated_at
CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION actualizar_updated_at IS 'Función de trigger para auto-actualizar campo updated_at';

-- Crear trigger en tabla de comprobantes
DROP TRIGGER IF EXISTS trigger_comprobantes_updated_at ON polizas_pagos_comprobantes;
CREATE TRIGGER trigger_comprobantes_updated_at
BEFORE UPDATE ON polizas_pagos_comprobantes
FOR EACH ROW
EXECUTE FUNCTION actualizar_updated_at();

COMMENT ON TRIGGER trigger_comprobantes_updated_at ON polizas_pagos_comprobantes
IS 'Auto-actualiza updated_at en cada modificación';

-- =============================================
-- 10. ÍNDICES PARA OPTIMIZACIÓN DE PERFORMANCE
-- =============================================

-- Índices en tabla de comprobantes
CREATE INDEX IF NOT EXISTS idx_comprobantes_pago_id
ON polizas_pagos_comprobantes(pago_id);

CREATE INDEX IF NOT EXISTS idx_comprobantes_estado
ON polizas_pagos_comprobantes(estado);

CREATE INDEX IF NOT EXISTS idx_comprobantes_uploaded_by
ON polizas_pagos_comprobantes(uploaded_by);

-- Índices en tabla de pagos (si no existen)
CREATE INDEX IF NOT EXISTS idx_pagos_fecha_vencimiento
ON polizas_pagos(fecha_vencimiento);

CREATE INDEX IF NOT EXISTS idx_pagos_estado
ON polizas_pagos(estado);

CREATE INDEX IF NOT EXISTS idx_pagos_poliza_id
ON polizas_pagos(poliza_id);

COMMENT ON INDEX idx_comprobantes_pago_id IS 'Optimiza búsquedas de comprobante por cuota de pago';
COMMENT ON INDEX idx_comprobantes_estado IS 'Optimiza filtros por estado (activo/descartado)';
COMMENT ON INDEX idx_pagos_fecha_vencimiento IS 'Optimiza ordenamiento y filtros por fecha de vencimiento';
COMMENT ON INDEX idx_pagos_estado IS 'Optimiza filtros por estado de pago';

-- =============================================
-- 11. GRANTS Y PERMISOS
-- =============================================

-- Asegurar que usuarios autenticados puedan ejecutar las funciones
GRANT EXECUTE ON FUNCTION registrar_prorroga_cuota TO authenticated;
GRANT EXECUTE ON FUNCTION descartar_comprobante TO authenticated;
GRANT EXECUTE ON FUNCTION restaurar_comprobante TO authenticated;

-- =============================================
-- MIGRACIÓN COMPLETADA
-- =============================================

-- Verificaciones finales
DO $$
BEGIN
  -- Verificar que la tabla existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'polizas_pagos_comprobantes') THEN
    RAISE EXCEPTION 'ERROR: Tabla polizas_pagos_comprobantes no fue creada';
  END IF;

  -- Verificar que las columnas de prórroga existen
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'polizas_pagos'
    AND column_name = 'fecha_vencimiento_original'
  ) THEN
    RAISE EXCEPTION 'ERROR: Columna fecha_vencimiento_original no fue agregada';
  END IF;

  -- Verificar que el bucket existe
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'pagos-comprobantes') THEN
    RAISE WARNING 'ADVERTENCIA: Bucket pagos-comprobantes no fue creado. Verificar manualmente.';
  END IF;

  RAISE NOTICE 'Migración de Cobranzas completada exitosamente';
  RAISE NOTICE 'Tabla polizas_pagos_comprobantes creada: ✓';
  RAISE NOTICE 'Campos de prórroga agregados: ✓';
  RAISE NOTICE 'RLS policies configuradas: ✓';
  RAISE NOTICE 'Funciones creadas: ✓';
  RAISE NOTICE 'Índices creados: ✓';
END $$;
