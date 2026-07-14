-- ============================================================
-- Fix: columna jsonb `items` guardada como string JSON
-- ============================================================
-- El insert de bienes de anexos (Incendio / Riesgos Varios) hacía
-- JSON.stringify() sobre la columna jsonb, por lo que quedó guardado
-- un string JSON ("[{...}]") en lugar de un array ([{...}]).
-- Eso crasheaba el detalle de póliza (bien.items.map is not a function),
-- p.ej. en la póliza CMR-SCR0689686.
--
-- El código ya se corrigió (inserta el array directo y los lectores
-- normalizan defensivamente); esta migración repara las filas existentes.
--
-- Idempotente: solo toca filas cuyo jsonb es de tipo 'string'. El loop
-- cubre el caso hipotético de doble encoding.

DO $$
DECLARE
	v_rows integer;
BEGIN
	LOOP
		UPDATE public.polizas_anexos_incendio_bienes
		SET items = (items #>> '{}')::jsonb
		WHERE jsonb_typeof(items) = 'string';
		GET DIAGNOSTICS v_rows = ROW_COUNT;
		EXIT WHEN v_rows = 0;
	END LOOP;

	LOOP
		UPDATE public.polizas_anexos_riesgos_varios_bienes
		SET items = (items #>> '{}')::jsonb
		WHERE jsonb_typeof(items) = 'string';
		GET DIAGNOSTICS v_rows = ROW_COUNT;
		EXIT WHEN v_rows = 0;
	END LOOP;
END $$;

-- Verificación (debe devolver 0 filas en ambas):
-- SELECT id, jsonb_typeof(items) FROM public.polizas_anexos_incendio_bienes WHERE jsonb_typeof(items) <> 'array';
-- SELECT id, jsonb_typeof(items) FROM public.polizas_anexos_riesgos_varios_bienes WHERE jsonb_typeof(items) <> 'array';
