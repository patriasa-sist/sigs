-- ============================================================================
-- Roster GLOBAL de firmantes para generación de cartas (vencimientos / cobranzas)
-- ============================================================================
--
-- Problema: la generación de cartas leía los firmantes con un SELECT directo a
-- `profiles` (filtrando firma_url IS NOT NULL). Pero el módulo de vencimientos lo
-- usan los roles `agente` y `comercial`, y la RLS de `profiles` solo les permite
-- leer su propio perfil + los miembros de su equipo. Por eso firmantes válidos que
-- no estaban en su equipo (p.ej. "Carmen Ferrufino Howard", rol comercial) NO se
-- cargaban, y la resolución caía a un array legacy hardcodeado que, por coincidencia
-- de apellido ("Ferrufino"), estampaba la firma de otra persona (Diego) en lugar de
-- la de Carmen.
--
-- Solución: una función SECURITY DEFINER que devuelve el roster completo de firmantes
-- (cualquier perfil con firma cargada), ignorando la RLS de `profiles`. Los datos que
-- expone (nombre, cargo, firma, teléfono, email) se imprimen en las cartas que salen
-- a los clientes, por lo que no son sensibles. SIN scoping de equipo: cualquier
-- ejecutivo puede figurar como firmante de una carta.
--
-- Mismo patrón que `get_usuarios_comerciales()` (roster para filtros).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.obtener_firmantes()
RETURNS TABLE (
	id uuid,
	full_name text,
	acronimo text,
	cargo text,
	telefono text,
	email text,
	firma_url text,
	role text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
	SELECT
		p.id,
		p.full_name,
		p.acronimo,
		p.cargo,
		p.telefono,
		p.email,
		p.firma_url,
		p.role
	FROM profiles p
	WHERE p.firma_url IS NOT NULL
	ORDER BY p.full_name;
$$;

REVOKE ALL ON FUNCTION public.obtener_firmantes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obtener_firmantes() TO authenticated;
