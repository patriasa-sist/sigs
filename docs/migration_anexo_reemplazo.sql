-- Migración: nuevo tipo de anexo "reemplazo"
-- Un anexo de reemplazo quita un item y agrega otro en el mismo acto, sin
-- impacto contable (no genera prima ni toca cuotas). Reutiliza las tablas
-- espejo por ramo existentes: sus filas llevan accion='exclusion' (item que
-- sale) y accion='inclusion' (item que entra), igual que inclusión/exclusión.
-- No requiere columnas ni tablas nuevas: solo ampliar el CHECK de tipo_anexo.

ALTER TABLE polizas_anexos
	DROP CONSTRAINT IF EXISTS polizas_anexos_tipo_anexo_check;

ALTER TABLE polizas_anexos
	ADD CONSTRAINT polizas_anexos_tipo_anexo_check
	CHECK (tipo_anexo = ANY (ARRAY['inclusion'::text, 'exclusion'::text, 'anulacion'::text, 'reemplazo'::text]));
