-- Migration: Agregar campos de renovación a pólizas
-- Permite identificar si una póliza es renovación de otra y vincularla por número de póliza anterior

-- Agregar campo booleano para indicar si es renovación
ALTER TABLE polizas
ADD COLUMN IF NOT EXISTS es_renovacion boolean NOT NULL DEFAULT false;

-- Agregar campo de texto libre para el número de póliza anterior
-- Es texto libre porque la póliza original puede no existir en el sistema
ALTER TABLE polizas
ADD COLUMN IF NOT EXISTS nro_poliza_anterior text;

-- Comentarios descriptivos
COMMENT ON COLUMN polizas.es_renovacion IS 'Indica si esta póliza es una renovación de otra póliza';
COMMENT ON COLUMN polizas.nro_poliza_anterior IS 'Número de la póliza anterior que se renueva (texto libre, puede ser de otra aseguradora)';
