-- ============================================================================
-- Ítems siniestrados: registra qué ítem(s) específicos de la póliza (vehículo,
-- persona, bien, equipo, nave, carga) fueron afectados por un siniestro.
-- La selección es OPCIONAL durante el registro y editable después (reemplazo
-- completo: delete + insert). Ejecutar manualmente en Supabase.
-- ============================================================================

BEGIN;

CREATE TABLE siniestros_items (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	siniestro_id uuid NOT NULL REFERENCES siniestros(id) ON DELETE CASCADE,
	tipo text NOT NULL CHECK (tipo IN ('vehiculo', 'persona', 'bien', 'equipo', 'nave', 'carga')),
	-- id de la fila de origen en la tabla espejo del ramo (polizas_automotor_vehiculos,
	-- polizas_beneficiarios, polizas_incendio_bienes, etc.). Sin FK porque la tabla
	-- de origen depende del ramo y el ítem puede desaparecer de la póliza (p.ej.
	-- exclusión por anexo) sin que deba perderse el registro del siniestro.
	origen_id uuid,
	-- Snapshot legible del ítem al momento de seleccionarlo (robusto ante cambios
	-- o eliminación del ítem original).
	descripcion text NOT NULL,
	-- Snapshot completo del ítem (shape AseguradoDetalle de types/siniestro.ts).
	detalle jsonb,
	created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_siniestros_items_siniestro ON siniestros_items(siniestro_id);

ALTER TABLE siniestros_items ENABLE ROW LEVEL SECURITY;

-- ── Políticas RLS ───────────────────────────────────────────────────────────
-- Espejo de las políticas de siniestros_coberturas, con una diferencia: DELETE
-- también lo tienen siniestros/comercial (la edición de ítems es delete+insert),
-- no solo admin.

-- SELECT con scoping por equipo (mismo criterio que siniestros_coberturas_select_scoped)
CREATE POLICY "siniestros_items_select_scoped" ON siniestros_items
	FOR SELECT USING (
		(
			EXISTS (
				SELECT 1 FROM profiles
				WHERE profiles.id = (SELECT auth.uid())
					AND profiles.role = ANY (ARRAY['admin'::text, 'usuario'::text, 'cobranza'::text])
			)
		)
		OR EXISTS (
			SELECT 1 FROM siniestros si
			WHERE si.id = siniestros_items.siniestro_id
				AND (
					(
						EXISTS (
							SELECT 1 FROM profiles
							WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'siniestros'::text
						)
						AND si.responsable_id = ANY (get_team_member_ids((SELECT auth.uid())))
					)
					OR (
						EXISTS (
							SELECT 1 FROM profiles
							WHERE profiles.id = (SELECT auth.uid())
								AND profiles.role = ANY (ARRAY['comercial'::text, 'agente'::text])
						)
						AND EXISTS (
							SELECT 1 FROM polizas p
							WHERE p.id = si.poliza_id
								AND p.responsable_id = ANY (get_team_member_ids((SELECT auth.uid())))
						)
					)
				)
		)
	);

CREATE POLICY "Solo siniestros, comercial y admin pueden asignar items" ON siniestros_items
	FOR INSERT WITH CHECK (
		EXISTS (
			SELECT 1 FROM profiles
			WHERE profiles.id = (SELECT auth.uid())
				AND profiles.role = ANY (ARRAY['siniestros'::text, 'comercial'::text, 'admin'::text])
		)
	);

CREATE POLICY "Solo siniestros, comercial y admin pueden modificar items" ON siniestros_items
	FOR UPDATE USING (
		EXISTS (
			SELECT 1 FROM profiles
			WHERE profiles.id = (SELECT auth.uid())
				AND profiles.role = ANY (ARRAY['siniestros'::text, 'comercial'::text, 'admin'::text])
		)
	);

CREATE POLICY "Solo siniestros, comercial y admin pueden eliminar items" ON siniestros_items
	FOR DELETE USING (
		EXISTS (
			SELECT 1 FROM profiles
			WHERE profiles.id = (SELECT auth.uid())
				AND profiles.role = ANY (ARRAY['siniestros'::text, 'comercial'::text, 'admin'::text])
		)
	);

COMMIT;
