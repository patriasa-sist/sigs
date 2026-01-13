-- Migración: Agregar columna 'rol' a polizas_salud_beneficiarios
-- Fecha: 2025-01-12
-- Descripción: Agrega la columna rol (obligatoria) para beneficiarios de salud
--
-- IMPORTANTE: Ejecutar esta migración si la tabla ya existe sin la columna rol

-- =============================================
-- AGREGAR COLUMNA ROL (si no existe)
-- =============================================

-- Agregar columna rol como nullable primero
ALTER TABLE polizas_salud_beneficiarios
ADD COLUMN IF NOT EXISTS rol text;

-- Actualizar registros existentes con valor por defecto
UPDATE polizas_salud_beneficiarios
SET rol = 'dependiente'
WHERE rol IS NULL;

-- Ahora hacer la columna NOT NULL y agregar constraint
ALTER TABLE polizas_salud_beneficiarios
ALTER COLUMN rol SET NOT NULL;

-- Agregar constraint de validación
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'polizas_salud_beneficiarios_rol_check'
  ) THEN
    ALTER TABLE polizas_salud_beneficiarios
    ADD CONSTRAINT polizas_salud_beneficiarios_rol_check
    CHECK (rol IN ('dependiente', 'conyugue'));
  END IF;
END $$;

-- Agregar comentario
COMMENT ON COLUMN polizas_salud_beneficiarios.rol IS 'Rol del beneficiario (dependiente, conyugue, OBLIGATORIO)';

-- =============================================
-- VERIFICACIÓN
-- =============================================

-- Verificar que la columna existe y tiene el constraint correcto
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'polizas_salud_beneficiarios'
    AND column_name = 'rol'
  ) THEN
    RAISE EXCEPTION 'La columna rol no se pudo crear correctamente';
  END IF;
END $$;
