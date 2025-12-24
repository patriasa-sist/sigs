-- ============================================
-- Migración: Normalizar natural_clients a minúsculas
-- Fecha: 2024-12-24
-- Descripción:
--   1. Renombrar oficio → profesion_oficio
--   2. Cambiar varchar a text (recomendación PostgreSQL)
--   3. Normalizar valores a minúsculas
--   4. Actualizar constraints para minúsculas
-- ============================================

-- 1. Renombrar columna oficio a profesion_oficio
ALTER TABLE natural_clients
RENAME COLUMN oficio TO profesion_oficio;

-- 2. Eliminar constraint existente de genero
ALTER TABLE natural_clients
DROP CONSTRAINT IF EXISTS natural_clients_genero_check;

-- 3. Actualizar valores existentes a minúsculas ANTES de agregar constraints
UPDATE natural_clients
SET
  tipo_documento = LOWER(tipo_documento),
  estado_civil = LOWER(estado_civil),
  genero = LOWER(genero)
WHERE tipo_documento IS NOT NULL
   OR estado_civil IS NOT NULL
   OR genero IS NOT NULL;

-- 4. Cambiar tipos de varchar a text (recomendación PostgreSQL)
ALTER TABLE natural_clients
  ALTER COLUMN tipo_documento TYPE text,
  ALTER COLUMN estado_civil TYPE text,
  ALTER COLUMN genero TYPE text;

-- 5. Agregar nuevos constraints con valores en minúsculas
ALTER TABLE natural_clients
ADD CONSTRAINT natural_clients_tipo_documento_check
CHECK (tipo_documento IN ('ci', 'pasaporte'));

ALTER TABLE natural_clients
ADD CONSTRAINT natural_clients_estado_civil_check
CHECK (estado_civil IN ('casado', 'soltero', 'divorciado', 'viudo'));

ALTER TABLE natural_clients
ADD CONSTRAINT natural_clients_genero_check
CHECK (genero IS NULL OR genero IN ('masculino', 'femenino', 'otro'));

-- 6. Comentarios para documentación
COMMENT ON COLUMN natural_clients.profesion_oficio IS 'Profesión u oficio del cliente (antes: oficio)';
COMMENT ON CONSTRAINT natural_clients_tipo_documento_check ON natural_clients IS 'Solo permite: ci, pasaporte (minúsculas)';
COMMENT ON CONSTRAINT natural_clients_estado_civil_check ON natural_clients IS 'Solo permite: casado, soltero, divorciado, viudo (minúsculas)';
COMMENT ON CONSTRAINT natural_clients_genero_check ON natural_clients IS 'Solo permite: masculino, femenino, otro (minúsculas) o NULL';

-- 7. Verificar los cambios
DO $$
DECLARE
    test_record RECORD;
BEGIN
    SELECT
        tipo_documento,
        estado_civil,
        genero,
        profesion_oficio
    INTO test_record
    FROM natural_clients
    LIMIT 1;

    IF test_record.tipo_documento = LOWER(test_record.tipo_documento) THEN
        RAISE NOTICE '✓ Valores normalizados correctamente a minúsculas';
    ELSE
        RAISE WARNING '✗ Aún existen valores en mayúsculas';
    END IF;
END $$;

-- 8. Mostrar estructura actualizada
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'natural_clients'
  AND column_name IN ('tipo_documento', 'estado_civil', 'genero', 'profesion_oficio')
ORDER BY ordinal_position;
