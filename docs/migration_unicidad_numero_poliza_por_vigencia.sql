-- Migration: Relajar unicidad de numero_poliza para permitir renovaciones
--
-- Contexto: la aseguradora reemite el MISMO numero_poliza al renovar (mismo
-- numero, nuevo periodo de vigencia). La constraint global UNIQUE(numero_poliza)
-- bloqueaba el INSERT de la renovacion.
--
-- Solucion: unicidad por (compania_aseguradora_id, numero_poliza, inicio_vigencia).
-- El mismo numero se permite mientras el periodo de vigencia difiera (renovacion);
-- se siguen bloqueando duplicados reales (misma compania + numero + fecha de inicio).
--
-- Verificado antes de migrar:
--   - numero_poliza NO se usa como llave de busqueda en el codigo (siempre por id),
--     por lo que relajar la unicidad no rompe lookups.
--   - Las 3 columnas son NOT NULL (el UNIQUE no genera huecos por NULLs distintos).
--   - No existen filas que violen el nuevo indice compuesto.

BEGIN;

-- 1) Eliminar la unicidad global anterior.
ALTER TABLE public.polizas
	DROP CONSTRAINT IF EXISTS polizas_numero_poliza_key;

-- 2) Nueva unicidad compuesta: numero unico por compania y periodo de vigencia.
--    (un mismo numero puede repetirse en renovaciones con distinto inicio_vigencia)
ALTER TABLE public.polizas
	ADD CONSTRAINT polizas_numero_compania_vigencia_key
	UNIQUE (compania_aseguradora_id, numero_poliza, inicio_vigencia);

COMMENT ON CONSTRAINT polizas_numero_compania_vigencia_key ON public.polizas IS
	'Numero de poliza unico por compania y fecha de inicio de vigencia. Permite que las renovaciones reusen el mismo numero en un periodo distinto.';

-- 3) El indice de busqueda idx_polizas_numero (solo numero_poliza) se conserva:
--    sigue acelerando filtros/busquedas por numero aunque ya no sea unico.

COMMIT;
