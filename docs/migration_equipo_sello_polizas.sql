-- ============================================================================
-- MIGRACIÓN: Sello de equipo en pólizas (visibilidad histórica por equipo)
-- ============================================================================
-- Fecha: 2026-07-21
--
-- PROBLEMA: la visibilidad de una póliza para agente/comercial se calcula con
-- la membresía ACTUAL del responsable (responsable_id ∈ get_team_member_ids).
-- Cuando un miembro cambia de equipo, toda su producción histórica "viaja" con
-- él y su equipo anterior pierde la visibilidad de ese trabajo (caso Daniela:
-- pasó de agente a comercial y el equipo de Mariola dejó de ver sus pólizas
-- registradas hasta el 30 de junio).
--
-- SOLUCIÓN: sellar en cada póliza el equipo del responsable AL MOMENTO del
-- registro (polizas.equipo_id). La regla de visibilidad pasa a ser:
--     responsable es miembro actual de mi equipo
--     O la póliza quedó sellada con un equipo al que pertenezco.
-- Mismo principio que factor_prima_neta congelado: los hechos históricos se
-- fijan al registrar, no se recalculan con datos vivos.
--
-- ORDEN DE DESPLIEGUE (importante):
--   1. Ejecutar esta migración completa.
--   2. Desplegar el código (guardarPoliza ahora inserta equipo_id; fallaría
--      sin la columna).
--   3. Usuarios agente/comercial/siniestros deben hacer RE-LOGIN para recibir
--      el nuevo claim team_ids en su JWT (sin re-login: comportamiento actual,
--      sin sello, nada se rompe).
--
-- PREREQUISITO: migration_exclusion_multi_cuota.sql aplicada (la PARTE 5
-- recrea la vista cobranzas_polizas_resumen sobre esa definición; si la vista
-- viva difiere, el CREATE OR REPLACE fallará con error de columnas — en ese
-- caso ajustar la PARTE 5 a la definición vigente agregando p.equipo_id al
-- final del SELECT).
--
-- PENDIENTE (fase posterior, documentado): el módulo de siniestros sigue
-- scopeado solo por responsable (tablas siniestros* y sus políticas RLS);
-- los siniestros de pólizas selladas no se muestran al equipo anterior.
--
-- EJECUTAR EN: Supabase Dashboard → SQL Editor
-- ============================================================================

-- ============================================================
-- PARTE 1: COLUMNA equipo_id EN polizas
-- ============================================================

ALTER TABLE public.polizas
	ADD COLUMN IF NOT EXISTS equipo_id UUID REFERENCES public.equipos(id);

COMMENT ON COLUMN public.polizas.equipo_id IS
'Sello histórico: equipo del responsable al momento de registrar la póliza. NO se recalcula si el responsable cambia de equipo ni al transferir la póliza; da visibilidad permanente al equipo donde se produjo. NULL = responsable sin equipo al registrar (la visibilidad cae solo en responsable_id).';

CREATE INDEX IF NOT EXISTS idx_polizas_equipo_id ON public.polizas(equipo_id);

-- ============================================================
-- PARTE 2: FUNCIÓN get_user_equipo_ids
-- ============================================================
-- Equipos a los que pertenece el usuario (array vacío si no tiene equipo).

CREATE OR REPLACE FUNCTION public.get_user_equipo_ids(p_user_id UUID)
RETURNS UUID[] AS $$
	SELECT COALESCE(array_agg(equipo_id), ARRAY[]::uuid[])
	FROM equipo_miembros
	WHERE user_id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_user_equipo_ids IS
'Retorna los IDs de los equipos del usuario. Array vacío si no pertenece a ninguno. Usada por las políticas RLS del sello de equipo en pólizas.';

-- ============================================================
-- PARTE 3: POLÍTICAS RLS (polizas, polizas_pagos, polizas_documentos)
-- ============================================================
-- Basadas en las versiones de migration_performance_optimization.sql;
-- verificar antes con:
--   SELECT policyname, qual FROM pg_policies
--   WHERE tablename IN ('polizas','polizas_pagos','polizas_documentos')
--     AND cmd = 'SELECT';

DROP POLICY IF EXISTS "polizas_select_scoped" ON public.polizas;
CREATE POLICY "polizas_select_scoped" ON public.polizas
	FOR SELECT TO public
	USING (
		EXISTS (
			SELECT 1 FROM profiles
			WHERE profiles.id = (select auth.uid())
			AND profiles.role = ANY(ARRAY['admin', 'usuario', 'cobranza', 'siniestros'])
		)
		OR responsable_id = ANY(get_team_member_ids((select auth.uid())))
		OR (equipo_id IS NOT NULL AND equipo_id = ANY(get_user_equipo_ids((select auth.uid()))))
	);

DROP POLICY IF EXISTS "pagos_select_scoped" ON public.polizas_pagos;
CREATE POLICY "pagos_select_scoped" ON public.polizas_pagos
	FOR SELECT TO public
	USING (
		EXISTS (
			SELECT 1 FROM profiles
			WHERE profiles.id = (select auth.uid())
			AND profiles.role = ANY(ARRAY['admin', 'usuario', 'cobranza', 'siniestros'])
		)
		OR EXISTS (
			SELECT 1 FROM polizas
			WHERE polizas.id = polizas_pagos.poliza_id
			AND (
				polizas.responsable_id = ANY(get_team_member_ids((select auth.uid())))
				OR (polizas.equipo_id IS NOT NULL AND polizas.equipo_id = ANY(get_user_equipo_ids((select auth.uid()))))
			)
		)
	);

DROP POLICY IF EXISTS "polizas_documentos_select_scoped" ON public.polizas_documentos;
CREATE POLICY "polizas_documentos_select_scoped" ON public.polizas_documentos
	FOR SELECT TO authenticated
	USING (
		(
			estado::text = 'activo'
			OR estado IS NULL
			OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin')
		)
		AND (
			NOT user_needs_data_scoping((select auth.uid()))
			OR EXISTS (
				SELECT 1 FROM polizas p
				WHERE p.id = polizas_documentos.poliza_id
				AND (
					p.responsable_id = ANY(get_team_member_ids((select auth.uid())))
					OR (p.equipo_id IS NOT NULL AND p.equipo_id = ANY(get_user_equipo_ids((select auth.uid()))))
				)
			)
		)
	);

-- ============================================================
-- PARTE 4: HOOK JWT — nuevo claim team_ids
-- ============================================================
-- Reemplaza la versión de migration_fase4_jwt_optimizacion.sql agregando el
-- claim team_ids (equipos del usuario) junto a team_member_ids.

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims jsonb;
  user_role_value text;
  user_perms text[];
  user_id_value uuid;
  team_ids text[];
  equipo_ids text[];
BEGIN
  user_id_value := (event->>'user_id')::uuid;

  -- Obtener el rol del usuario desde la tabla profiles
  SELECT role INTO user_role_value
  FROM public.profiles
  WHERE id = user_id_value;

  -- Obtener los claims existentes del token
  claims := event->'claims';

  -- Agregar el rol a los claims
  IF user_role_value IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role_value));
  ELSE
    claims := jsonb_set(claims, '{user_role}', '"invitado"');
    user_role_value := 'invitado';
  END IF;

  -- Obtener permisos combinados (rol + directos del usuario)
  SELECT COALESCE(array_agg(DISTINCT permission_id), ARRAY[]::TEXT[])
  INTO user_perms
  FROM (
    SELECT rp.permission_id
    FROM role_permissions rp
    WHERE rp.role = user_role_value
    UNION
    SELECT up.permission_id
    FROM user_permissions up
    WHERE up.user_id = user_id_value
      AND (up.expires_at IS NULL OR up.expires_at > now())
  ) combined;

  -- Agregar permisos al JWT
  claims := jsonb_set(claims, '{user_permissions}', to_jsonb(user_perms));

  -- Team member ids + equipos propios, solo para roles con aislamiento
  IF user_role_value IN ('agente', 'comercial', 'siniestros') THEN
    SELECT COALESCE(
      array_agg(DISTINCT em2.user_id::text),
      ARRAY[user_id_value::text]
    )
    INTO team_ids
    FROM equipo_miembros em1
    JOIN equipo_miembros em2 ON em2.equipo_id = em1.equipo_id
    WHERE em1.user_id = user_id_value;

    IF team_ids IS NULL THEN
      team_ids := ARRAY[user_id_value::text];
    END IF;

    claims := jsonb_set(claims, '{team_member_ids}', to_jsonb(team_ids));

    -- SELLO DE EQUIPO: equipos del usuario, para ver pólizas selladas
    -- (polizas.equipo_id) aunque el responsable ya no esté en el equipo.
    SELECT COALESCE(array_agg(equipo_id::text), ARRAY[]::text[])
    INTO equipo_ids
    FROM equipo_miembros
    WHERE user_id = user_id_value;

    IF equipo_ids IS NULL THEN
      equipo_ids := ARRAY[]::text[];
    END IF;

    claims := jsonb_set(claims, '{team_ids}', to_jsonb(equipo_ids));
  ELSE
    claims := jsonb_set(claims, '{team_member_ids}', '[]'::jsonb);
    claims := jsonb_set(claims, '{team_ids}', '[]'::jsonb);
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

COMMENT ON FUNCTION public.custom_access_token_hook IS
'Hook de Supabase Auth que agrega user_role, user_permissions, team_member_ids y team_ids al JWT.
- user_role: rol del usuario.
- user_permissions: permisos efectivos (rol + directos).
- team_member_ids: UUIDs de compañeros de equipo (roles con aislamiento).
- team_ids: UUIDs de los equipos del usuario, para visibilidad de pólizas selladas (polizas.equipo_id).
Cambios en permisos o equipos requieren re-login.';

-- ============================================================
-- PARTE 5: VISTA cobranzas_polizas_resumen + equipo_id
-- ============================================================
-- Igual a la versión de migration_exclusion_multi_cuota.sql con p.equipo_id
-- agregado AL FINAL del SELECT (CREATE OR REPLACE solo admite añadir columnas
-- al final).

CREATE OR REPLACE VIEW public.cobranzas_polizas_resumen AS
WITH abonos_por_pago AS (
	SELECT polizas_pagos_abonos.pago_id,
		sum(polizas_pagos_abonos.monto) AS abonado
	FROM polizas_pagos_abonos
	WHERE polizas_pagos_abonos.pago_id IS NOT NULL
	GROUP BY polizas_pagos_abonos.pago_id
), abonos_por_anexo AS (
	SELECT polizas_pagos_abonos.anexo_pago_id,
		sum(polizas_pagos_abonos.monto) AS abonado
	FROM polizas_pagos_abonos
	WHERE polizas_pagos_abonos.anexo_pago_id IS NOT NULL
	GROUP BY polizas_pagos_abonos.anexo_pago_id
), descuento_por_pago AS (
	SELECT pap.cuota_original_id AS cuota_id,
		sum(- pap.monto) AS descuento
	FROM polizas_anexos_pagos pap
		JOIN polizas_anexos pa ON pa.id = pap.anexo_id
	WHERE pap.tipo = 'ajuste'
		AND pap.monto < 0
		AND pap.cuota_original_id IS NOT NULL
		AND pa.estado = 'activo'
	GROUP BY pap.cuota_original_id
), descuento_por_anexo AS (
	SELECT pap.cuota_anexo_pago_id AS cuota_id,
		sum(- pap.monto) AS descuento
	FROM polizas_anexos_pagos pap
		JOIN polizas_anexos pa ON pa.id = pap.anexo_id
	WHERE pap.tipo = 'ajuste'
		AND pap.monto < 0
		AND pap.cuota_anexo_pago_id IS NOT NULL
		AND pa.estado = 'activo'
	GROUP BY pap.cuota_anexo_pago_id
), cuota_estados AS (
	SELECT pp.poliza_id,
		pp.monto,
		COALESCE(ap.abonado, 0::numeric) AS abonado,
		COALESCE(dp.descuento, 0::numeric) AS descuento,
		pp.fecha_vencimiento,
			CASE
				WHEN pp.fecha_pago IS NOT NULL THEN 'pagado'::text
				WHEN pp.estado_real = 'pagado'::text THEN 'pagado'::text
				WHEN (COALESCE(ap.abonado, 0::numeric) + COALESCE(dp.descuento, 0::numeric)) >= (pp.monto - 0.01) THEN 'saldado'::text
				WHEN pp.estado_real IS NOT NULL AND pp.estado_real <> ''::text THEN pp.estado_real
				WHEN pp.estado = 'parcial'::text THEN 'parcial'::text
				WHEN pp.fecha_vencimiento < CURRENT_DATE THEN 'vencido'::text
				ELSE 'pendiente'::text
			END AS estado_efectivo
	FROM polizas_pagos pp
		JOIN polizas p_1 ON p_1.id = pp.poliza_id
		LEFT JOIN abonos_por_pago ap ON ap.pago_id = pp.id
		LEFT JOIN descuento_por_pago dp ON dp.cuota_id = pp.id
	WHERE p_1.estado = 'activa'::text
	UNION ALL
	SELECT pa.poliza_id,
		pap.monto,
		COALESCE(aa.abonado, 0::numeric) AS abonado,
		COALESCE(da.descuento, 0::numeric) AS descuento,
		pap.fecha_vencimiento,
			CASE
				WHEN pap.estado = 'pagado'::text THEN 'pagado'::text
				WHEN (COALESCE(aa.abonado, 0::numeric) + COALESCE(da.descuento, 0::numeric)) >= (pap.monto - 0.01) THEN 'saldado'::text
				WHEN pap.estado = 'parcial'::text THEN 'parcial'::text
				WHEN pap.fecha_vencimiento < CURRENT_DATE THEN 'vencido'::text
				ELSE 'pendiente'::text
			END AS estado_efectivo
	FROM polizas_anexos_pagos pap
		JOIN polizas_anexos pa ON pa.id = pap.anexo_id
		JOIN polizas p_1 ON p_1.id = pa.poliza_id
		LEFT JOIN abonos_por_anexo aa ON aa.anexo_pago_id = pap.id
		LEFT JOIN descuento_por_anexo da ON da.cuota_id = pap.id
	WHERE pap.tipo = 'cuota_propia'::text AND pa.estado = 'activo'::text AND p_1.estado = 'activa'::text
)
SELECT p.id,
	p.numero_poliza,
	p.ramo,
	p.prima_total,
	p.moneda,
	p.estado,
	p.inicio_vigencia,
	p.fin_vigencia,
	p.modalidad_pago,
	p.client_id,
	p.compania_aseguradora_id,
	p.responsable_id,
	p.regional_id,
	COALESCE(count(ce.poliza_id) FILTER (WHERE ce.estado_efectivo = 'vencido'::text), 0::bigint)::integer AS cuotas_vencidas,
	COALESCE(count(ce.poliza_id) FILTER (WHERE ce.estado_efectivo = ANY (ARRAY['pendiente'::text, 'parcial'::text])), 0::bigint)::integer AS cuotas_pendientes,
	COALESCE(sum(GREATEST(ce.monto - ce.abonado - ce.descuento, 0::numeric)) FILTER (WHERE ce.estado_efectivo <> ALL (ARRAY['pagado'::text, 'saldado'::text])), 0::numeric) AS total_pendiente,
	COALESCE(sum(
		CASE
			WHEN ce.estado_efectivo = 'pagado'::text THEN ce.monto
			ELSE ce.abonado
		END), 0::numeric) AS total_pagado,
	min(ce.fecha_vencimiento) FILTER (WHERE ce.estado_efectivo = ANY (ARRAY['pendiente'::text, 'parcial'::text])) AS proxima_fecha_vencimiento,
	p.equipo_id
FROM polizas p
	LEFT JOIN cuota_estados ce ON ce.poliza_id = p.id
WHERE p.estado = 'activa'::text
GROUP BY p.id;

-- ============================================================
-- PARTE 6: BACKFILL
-- ============================================================
-- 6.a Sellar las pólizas existentes con el equipo ACTUAL del responsable
--     (el más antiguo si pertenece a varios). Es la mejor aproximación
--     disponible: no existe historial de membresías.

UPDATE public.polizas p
SET equipo_id = m.equipo_id
FROM (
	SELECT DISTINCT ON (user_id) user_id, equipo_id
	FROM public.equipo_miembros
	ORDER BY user_id, added_at ASC
) m
WHERE p.equipo_id IS NULL
	AND p.responsable_id = m.user_id;

-- 6.b CORRECCIÓN MANUAL para responsables que YA cambiaron de equipo antes de
--     esta migración (el backfill 6.a les selló el equipo NUEVO).
--     Caso Daniela Dorado: sus pólizas registradas hasta el 30 de junio (La
--     Paz) pertenecen al equipo "Mariola" (líderes Mariola Benavent Coock y
--     Samuel Salaues Nacif), del que ya fue removida.

UPDATE public.polizas
SET equipo_id = '369b3fed-d853-4a26-8cf6-0308a93960e5' -- equipo "Mariola"
WHERE responsable_id = 'c5461825-ee33-44ac-ae68-ab9d9eb38a73' -- Daniela Dorado
	AND created_at < '2026-07-01T04:00:00Z'; -- fin del 30-jun en La Paz (UTC-4)

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
-- 1. Columna y sello:
--    SELECT count(*) FILTER (WHERE equipo_id IS NOT NULL) AS selladas,
--           count(*) AS total
--    FROM polizas;
--
-- 2. Función:
--    SELECT get_user_equipo_ids('<uuid-usuario>');
--
-- 3. Políticas:
--    SELECT policyname FROM pg_policies
--    WHERE tablename IN ('polizas','polizas_pagos','polizas_documentos') AND cmd = 'SELECT';
--
-- 4. Claim en JWT: logout/login con un agente y decodificar el access_token
--    (jwt.io) → debe incluir team_ids.
--
-- 5. Vista:
--    SELECT equipo_id FROM cobranzas_polizas_resumen LIMIT 1;
--
-- 6. Caso Daniela (debe devolver la cantidad de pólizas pre-julio recuperadas
--    para el equipo Mariola):
--    SELECT count(*) FROM polizas
--    WHERE responsable_id = 'c5461825-ee33-44ac-ae68-ab9d9eb38a73'
--      AND equipo_id = '369b3fed-d853-4a26-8cf6-0308a93960e5';
-- ============================================================================
