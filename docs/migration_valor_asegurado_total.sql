-- Migración: valor asegurado total denormalizado en la póliza madre
-- El reporte de producción necesita el valor asegurado de la madre sin consultar
-- las tablas de ítems en cada export (golpeaba la BD con un IN(...) gigante y
-- traía miles de filas). Se denormaliza en polizas.valor_asegurado_total,
-- mantenido por triggers en cada tabla de ítems → el reporte lo lee gratis junto
-- con la query de pólizas que ya hace. Los anexos siguen calculándose aparte.
--
-- Solo cubre la PÓLIZA MADRE (no anexos): la tabla madre no se muta al validar
-- anexos, así el total de la madre es estable. Ramos de personas (Salud/Vida/AP)
-- y fianzas no tienen tabla de ítems con valor → la columna queda NULL.
--
-- IMPORTANTE: ejecutar ANTES (o junto) con el deploy del código del reporte, que
-- ya lee polizas.valor_asegurado_total. Ejecutar manualmente (Claude solo lee).

BEGIN;

ALTER TABLE public.polizas
	ADD COLUMN IF NOT EXISTS valor_asegurado_total numeric;

COMMENT ON COLUMN public.polizas.valor_asegurado_total IS
	'Suma del valor asegurado de los ítems de la póliza madre (mantenido por '
	'triggers). NULL para ramos sin tabla de ítems con valor (personas/fianzas).';

-- Recompute para una póliza: suma la tabla de ítems de su ramo. Una póliza es de
-- un solo ramo, así que solo una de las sumas aporta; el resto da 0. Si ninguna
-- aporta (ramo sin ítems con valor), queda NULL para no mostrar 0 espurio.
-- NOTA: cuando exista polizas_desgravamen, agregar su suma aquí.
CREATE OR REPLACE FUNCTION public.recompute_poliza_valor_asegurado(p_poliza_id uuid)
RETURNS void
LANGUAGE sql
AS $$
	UPDATE public.polizas
	SET valor_asegurado_total = (
		SELECT NULLIF(
			COALESCE((SELECT sum(valor_asegurado)      FROM public.polizas_automotor_vehiculos     WHERE poliza_id = p_poliza_id), 0)
			+ COALESCE((SELECT sum(valor_asegurado)     FROM public.polizas_ramos_tecnicos_equipos   WHERE poliza_id = p_poliza_id), 0)
			+ COALESCE((SELECT sum(valor_asegurado)     FROM public.polizas_responsabilidad_civil    WHERE poliza_id = p_poliza_id), 0)
			+ COALESCE((SELECT sum(valor_asegurado)     FROM public.polizas_transporte               WHERE poliza_id = p_poliza_id), 0)
			+ COALESCE((SELECT sum(valor_total_declarado) FROM public.polizas_incendio_bienes        WHERE poliza_id = p_poliza_id), 0)
			+ COALESCE((SELECT sum(valor_total_declarado) FROM public.polizas_riesgos_varios_bienes  WHERE poliza_id = p_poliza_id), 0)
			+ COALESCE((SELECT sum(valor_casco)         FROM public.polizas_aeronavegacion_naves     WHERE poliza_id = p_poliza_id), 0)
		, 0)
	)
	WHERE id = p_poliza_id;
$$;

-- Trigger genérico: recomputa la(s) póliza(s) afectada(s) por el cambio de ítems.
CREATE OR REPLACE FUNCTION public.trg_recompute_poliza_valor_asegurado()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF tg_op = 'DELETE' THEN
		PERFORM public.recompute_poliza_valor_asegurado(old.poliza_id);
		RETURN old;
	END IF;
	IF tg_op = 'UPDATE' AND new.poliza_id IS DISTINCT FROM old.poliza_id THEN
		PERFORM public.recompute_poliza_valor_asegurado(old.poliza_id);
	END IF;
	PERFORM public.recompute_poliza_valor_asegurado(new.poliza_id);
	RETURN new;
END;
$$;

-- Un trigger por tabla de ítems con valor asegurado.
DO $$
DECLARE
	t text;
	tablas text[] := ARRAY[
		'polizas_automotor_vehiculos',
		'polizas_ramos_tecnicos_equipos',
		'polizas_responsabilidad_civil',
		'polizas_transporte',
		'polizas_incendio_bienes',
		'polizas_riesgos_varios_bienes',
		'polizas_aeronavegacion_naves'
	];
BEGIN
	FOREACH t IN ARRAY tablas LOOP
		EXECUTE format('DROP TRIGGER IF EXISTS valor_asegurado_total ON public.%I', t);
		EXECUTE format(
			'CREATE TRIGGER valor_asegurado_total
				AFTER INSERT OR UPDATE OR DELETE ON public.%I
				FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_poliza_valor_asegurado()',
			t
		);
	END LOOP;
END $$;

-- Backfill de las pólizas existentes (una pasada, set-based).
UPDATE public.polizas p
SET valor_asegurado_total = NULLIF(
	COALESCE((SELECT sum(valor_asegurado)        FROM public.polizas_automotor_vehiculos     WHERE poliza_id = p.id), 0)
	+ COALESCE((SELECT sum(valor_asegurado)      FROM public.polizas_ramos_tecnicos_equipos   WHERE poliza_id = p.id), 0)
	+ COALESCE((SELECT sum(valor_asegurado)      FROM public.polizas_responsabilidad_civil    WHERE poliza_id = p.id), 0)
	+ COALESCE((SELECT sum(valor_asegurado)      FROM public.polizas_transporte               WHERE poliza_id = p.id), 0)
	+ COALESCE((SELECT sum(valor_total_declarado) FROM public.polizas_incendio_bienes         WHERE poliza_id = p.id), 0)
	+ COALESCE((SELECT sum(valor_total_declarado) FROM public.polizas_riesgos_varios_bienes   WHERE poliza_id = p.id), 0)
	+ COALESCE((SELECT sum(valor_casco)          FROM public.polizas_aeronavegacion_naves     WHERE poliza_id = p.id), 0)
, 0);

COMMIT;
