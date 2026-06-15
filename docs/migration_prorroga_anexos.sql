-- ============================================================================
-- Migration: Prórroga de cuotas de ANEXO (paridad con cuotas de póliza)
-- ============================================================================
-- Contexto: las cuotas de inclusión (polizas_anexos_pagos, tipo = 'cuota_propia')
-- no soportaban prórroga porque la tabla carecía de las columnas de historial y
-- el RPC `registrar_prorroga_cuota` solo opera sobre `polizas_pagos`.
-- Esta migración agrega las columnas espejo y un RPC análogo para anexos.
-- Ejecutar manualmente en Supabase.
-- ============================================================================

-- 1) Columnas de historial de prórroga en la tabla de pagos de anexos
ALTER TABLE public.polizas_anexos_pagos
	ADD COLUMN IF NOT EXISTS fecha_vencimiento_original date,
	ADD COLUMN IF NOT EXISTS prorrogas_historial jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2) RPC: registrar una prórroga sobre una cuota de anexo
--    Espejo de public.registrar_prorroga_cuota pero sobre polizas_anexos_pagos.
CREATE OR REPLACE FUNCTION public.registrar_prorroga_cuota_anexo(
	p_cuota_id uuid,
	p_nueva_fecha date,
	p_usuario_id uuid,
	p_motivo text DEFAULT NULL::text
)
	RETURNS jsonb
	LANGUAGE plpgsql
	SECURITY DEFINER
AS $function$
DECLARE
	v_fecha_actual date;
	v_fecha_original date;
	v_usuario_nombre text;
	v_prorroga jsonb;
	v_dias_extension integer;
	v_estado_cuota text;
BEGIN
	-- Obtener datos actuales de la cuota de anexo
	SELECT fecha_vencimiento, fecha_vencimiento_original, estado
	INTO v_fecha_actual, v_fecha_original, v_estado_cuota
	FROM polizas_anexos_pagos
	WHERE id = p_cuota_id;

	-- Validar que la cuota existe
	IF NOT FOUND THEN
		RAISE EXCEPTION 'Cuota de anexo no encontrada';
	END IF;

	-- Validar que la cuota no esté pagada
	IF v_estado_cuota = 'pagado' THEN
		RAISE EXCEPTION 'No se puede prorrogar una cuota ya pagada';
	END IF;

	-- Validar que la nueva fecha sea futura
	IF p_nueva_fecha <= CURRENT_DATE THEN
		RAISE EXCEPTION 'La nueva fecha debe ser futura (después de hoy)';
	END IF;

	-- Obtener nombre del usuario
	SELECT full_name INTO v_usuario_nombre
	FROM profiles
	WHERE id = p_usuario_id;

	IF v_usuario_nombre IS NULL THEN
		v_usuario_nombre := 'Sistema';
	END IF;

	-- Calcular días de extensión
	v_dias_extension := p_nueva_fecha - v_fecha_actual;

	-- Si es la primera prórroga, guardar fecha original
	IF v_fecha_original IS NULL THEN
		UPDATE polizas_anexos_pagos
		SET fecha_vencimiento_original = v_fecha_actual
		WHERE id = p_cuota_id;

		v_fecha_original := v_fecha_actual;
	END IF;

	-- Crear objeto de prórroga con todos los datos
	v_prorroga := jsonb_build_object(
		'fecha_anterior', v_fecha_actual::text,
		'fecha_nueva', p_nueva_fecha::text,
		'fecha_registro', now()::text,
		'usuario_id', p_usuario_id::text,
		'usuario_nombre', v_usuario_nombre,
		'motivo', p_motivo,
		'dias_extension', v_dias_extension
	);

	-- Actualizar cuota con nueva fecha y registro de prórroga
	UPDATE polizas_anexos_pagos
	SET
		fecha_vencimiento = p_nueva_fecha,
		prorrogas_historial = COALESCE(prorrogas_historial, '[]'::jsonb) || v_prorroga,
		updated_at = now(),
		updated_by = p_usuario_id,
		observaciones = COALESCE(observaciones || E'\n', '') ||
		                format('Prórroga registrada: %s días (de %s a %s)%s',
		                       v_dias_extension,
		                       v_fecha_actual,
		                       p_nueva_fecha,
		                       CASE WHEN p_motivo IS NOT NULL AND p_motivo != ''
		                            THEN ' - Motivo: ' || p_motivo
		                            ELSE ''
		                       END)
	WHERE id = p_cuota_id;

	RETURN v_prorroga;
END;
$function$;
