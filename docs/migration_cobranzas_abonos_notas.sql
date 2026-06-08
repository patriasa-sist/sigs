-- ============================================================================
-- Migración: Cobranzas — Libro de abonos, notas estructuradas y multi-comprobante
-- Fecha: 2026-06-08
-- Habilita:
--   Mejora #1 — notas estructuradas en cuotas (sin contaminar el log de pagos)
--   Mejora #2 — pagos parciales: cada abono con su propio comprobante; la cuota
--                conserva su monto original
--   Mejora #3 — cuotas de anexo cobrables (fecha_pago + estado 'parcial' + auditoría)
--
-- Modelo unificado centrado en el "abono": un abono pertenece a una cuota de
-- póliza (polizas_pagos) O a una cuota de anexo (polizas_anexos_pagos). Notas y
-- comprobantes siguen el mismo patrón de doble FK excluyente.
--
-- Ejecutar manualmente en el SQL Editor de Supabase. Es idempotente.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Libro de abonos (un registro por pago parcial o total)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.polizas_pagos_abonos (
	id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	pago_id       uuid REFERENCES public.polizas_pagos(id) ON DELETE CASCADE,
	anexo_pago_id uuid REFERENCES public.polizas_anexos_pagos(id) ON DELETE CASCADE,
	monto         numeric NOT NULL CHECK (monto > 0),
	fecha_pago    date NOT NULL,
	observaciones text,
	created_by    uuid REFERENCES public.profiles(id),
	created_at    timestamptz NOT NULL DEFAULT now(),
	-- exactamente uno de (pago_id, anexo_pago_id)
	CONSTRAINT abono_pertenece_a_una_cuota CHECK (
		(pago_id IS NOT NULL)::int + (anexo_pago_id IS NOT NULL)::int = 1
	)
);
CREATE INDEX IF NOT EXISTS idx_abonos_pago        ON public.polizas_pagos_abonos(pago_id);
CREATE INDEX IF NOT EXISTS idx_abonos_anexo_pago  ON public.polizas_pagos_abonos(anexo_pago_id);

-- ----------------------------------------------------------------------------
-- 2) Notas estructuradas (Mejora #1)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.polizas_cuotas_notas (
	id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	pago_id       uuid REFERENCES public.polizas_pagos(id) ON DELETE CASCADE,
	anexo_pago_id uuid REFERENCES public.polizas_anexos_pagos(id) ON DELETE CASCADE,
	nota          text NOT NULL CHECK (length(btrim(nota)) > 0),
	created_by    uuid REFERENCES public.profiles(id),
	created_at    timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT nota_pertenece_a_una_cuota CHECK (
		(pago_id IS NOT NULL)::int + (anexo_pago_id IS NOT NULL)::int = 1
	)
);
CREATE INDEX IF NOT EXISTS idx_notas_pago       ON public.polizas_cuotas_notas(pago_id);
CREATE INDEX IF NOT EXISTS idx_notas_anexo_pago ON public.polizas_cuotas_notas(anexo_pago_id);

-- ----------------------------------------------------------------------------
-- 3) Comprobantes: permitir múltiples por cuota (uno por abono)
--    - quitar UNIQUE(pago_id) que limitaba a 1 comprobante por cuota
--    - pago_id pasa a NULLABLE (las cuotas de anexo usan anexo_pago_id)
--    - agregar abono_id (el abono concreto) y anexo_pago_id (cuota de anexo dueña)
-- ----------------------------------------------------------------------------
ALTER TABLE public.polizas_pagos_comprobantes
	DROP CONSTRAINT IF EXISTS polizas_pagos_comprobantes_pago_id_key;

ALTER TABLE public.polizas_pagos_comprobantes
	ALTER COLUMN pago_id DROP NOT NULL;

ALTER TABLE public.polizas_pagos_comprobantes
	ADD COLUMN IF NOT EXISTS abono_id      uuid REFERENCES public.polizas_pagos_abonos(id) ON DELETE CASCADE;
ALTER TABLE public.polizas_pagos_comprobantes
	ADD COLUMN IF NOT EXISTS anexo_pago_id uuid REFERENCES public.polizas_anexos_pagos(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_comprobantes_abono      ON public.polizas_pagos_comprobantes(abono_id);
CREATE INDEX IF NOT EXISTS idx_comprobantes_anexo_pago ON public.polizas_pagos_comprobantes(anexo_pago_id);

-- exactamente un dueño: cuota de póliza (pago_id) o cuota de anexo (anexo_pago_id).
-- Las filas legadas tienen pago_id y satisfacen la condición.
ALTER TABLE public.polizas_pagos_comprobantes
	DROP CONSTRAINT IF EXISTS comprobante_un_dueno;
ALTER TABLE public.polizas_pagos_comprobantes
	ADD CONSTRAINT comprobante_un_dueno CHECK (
		(pago_id IS NOT NULL)::int + (anexo_pago_id IS NOT NULL)::int = 1
	);

-- a lo sumo un comprobante activo por abono
CREATE UNIQUE INDEX IF NOT EXISTS uq_comprobante_por_abono
	ON public.polizas_pagos_comprobantes(abono_id) WHERE abono_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 4) polizas_anexos_pagos: habilitar cobro (fecha_pago, estado 'parcial', auditoría)
-- ----------------------------------------------------------------------------
ALTER TABLE public.polizas_anexos_pagos ADD COLUMN IF NOT EXISTS fecha_pago date;
ALTER TABLE public.polizas_anexos_pagos ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.polizas_anexos_pagos ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.polizas_anexos_pagos ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.polizas_anexos_pagos DROP CONSTRAINT IF EXISTS polizas_anexos_pagos_estado_check;
ALTER TABLE public.polizas_anexos_pagos ADD CONSTRAINT polizas_anexos_pagos_estado_check
	CHECK (estado = ANY (ARRAY['pendiente'::text, 'pagado'::text, 'vencido'::text, 'parcial'::text]));

-- ----------------------------------------------------------------------------
-- 5) Backfill: crear un abono histórico por cada cuota PAGADA que ya tiene
--    comprobante, y enlazar ese comprobante al abono. Las cuotas 'parcial'
--    existentes se dejan como están (su monto ya es el saldo residual heredado).
-- ----------------------------------------------------------------------------
INSERT INTO public.polizas_pagos_abonos (pago_id, monto, fecha_pago, observaciones, created_by, created_at)
SELECT pp.id, pp.monto, COALESCE(pp.fecha_pago, CURRENT_DATE), 'Abono histórico (migración)', pp.updated_by, now()
FROM public.polizas_pagos pp
WHERE pp.estado = 'pagado'
  AND EXISTS (SELECT 1 FROM public.polizas_pagos_comprobantes c WHERE c.pago_id = pp.id)
  AND NOT EXISTS (SELECT 1 FROM public.polizas_pagos_abonos a WHERE a.pago_id = pp.id);

UPDATE public.polizas_pagos_comprobantes c
SET abono_id = a.id
FROM public.polizas_pagos_abonos a
WHERE a.pago_id = c.pago_id
  AND c.pago_id IS NOT NULL
  AND c.abono_id IS NULL;

-- ----------------------------------------------------------------------------
-- 6) RLS — espejo de las políticas de polizas_pagos_comprobantes
--    (lectura: autenticado; escritura: cobranza + admin)
-- ----------------------------------------------------------------------------
ALTER TABLE public.polizas_pagos_abonos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polizas_cuotas_notas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS abonos_select ON public.polizas_pagos_abonos;
CREATE POLICY abonos_select ON public.polizas_pagos_abonos
	FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS abonos_write ON public.polizas_pagos_abonos;
CREATE POLICY abonos_write ON public.polizas_pagos_abonos
	FOR ALL TO authenticated
	USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = ANY (ARRAY['cobranza'::text, 'admin'::text])))
	WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = ANY (ARRAY['cobranza'::text, 'admin'::text])));

DROP POLICY IF EXISTS notas_select ON public.polizas_cuotas_notas;
CREATE POLICY notas_select ON public.polizas_cuotas_notas
	FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS notas_write ON public.polizas_cuotas_notas;
CREATE POLICY notas_write ON public.polizas_cuotas_notas
	FOR ALL TO authenticated
	USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = ANY (ARRAY['cobranza'::text, 'admin'::text])))
	WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = ANY (ARRAY['cobranza'::text, 'admin'::text])));

-- ============================================================================
-- Verificación rápida (opcional):
--   SELECT count(*) FROM polizas_pagos_abonos;        -- abonos históricos creados
--   SELECT count(*) FROM polizas_pagos_comprobantes WHERE abono_id IS NOT NULL;
-- ============================================================================
