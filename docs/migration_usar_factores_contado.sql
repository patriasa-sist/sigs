-- Migration: Agregar campo usar_factores_contado a polizas
-- Descripcion: Permite registrar cuando una póliza a crédito usó
--              factores de comisión al contado (caso especial).
--              Los reportes de producción y contabilidad deben usar este
--              campo para determinar qué factor aplicar al recalcular.
-- Ejecutar manualmente en Supabase SQL Editor.

-- Agregar columna booleana con default false
ALTER TABLE polizas
ADD COLUMN IF NOT EXISTS usar_factores_contado boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN polizas.usar_factores_contado IS 'Si true, esta póliza a crédito usó factor_contado en vez de factor_credito para el cálculo de prima neta y comisiones. Caso especial poco frecuente.';
