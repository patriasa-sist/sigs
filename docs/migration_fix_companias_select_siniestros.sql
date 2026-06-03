-- Fix: el rol "siniestros" no podía leer companias_aseguradoras (RLS),
-- por lo que al visualizar una póliza para registrar un caso la compañía
-- aparecía como "N/A". Se agrega "siniestros" (y "uif") a la policy de SELECT.

DROP POLICY IF EXISTS cobranza_select_companias ON companias_aseguradoras;

CREATE POLICY cobranza_select_companias ON companias_aseguradoras
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = ANY (ARRAY[
        'admin'::text,
        'usuario'::text,
        'comercial'::text,
        'agente'::text,
        'cobranza'::text,
        'siniestros'::text,
        'uif'::text
      ])
  )
);
