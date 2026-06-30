-- Migración: datos específicos de Desgravamen
-- Issue #18 — Los ramos de desgravamen (tipos_seguros 9348/9349) necesitan
-- capturar al menos el valor asegurado (puede ser 0). Tabla 1:1 con la póliza,
-- mismo patrón/RLS que las demás tablas de ramo (p. ej. polizas_responsabilidad_civil).
--
-- Ejecutar manualmente (Claude solo tiene lectura en la BD).

CREATE TABLE IF NOT EXISTS public.polizas_desgravamen (
	poliza_id uuid PRIMARY KEY REFERENCES public.polizas (id) ON DELETE CASCADE,
	valor_asegurado numeric NOT NULL DEFAULT 0,
	created_at timestamptz DEFAULT now()
);

ALTER TABLE public.polizas_desgravamen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read" ON public.polizas_desgravamen
	FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON public.polizas_desgravamen
	FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON public.polizas_desgravamen
	FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON public.polizas_desgravamen
	FOR DELETE TO authenticated USING (true);
