-- ============================================================================
-- MIGRACIÓN: Alinear la RLS de UPDATE de clientes con la autorización del código
-- ============================================================================
-- Problema:
--   Las acciones de edición de cliente (app/clientes/editar/actions.ts →
--   authorizeClientEdit) autorizan por 4 caminos:
--     1. admin
--     2. permiso de rol `clientes.editar`
--     3. líder de equipo del dueño del cliente (commercial_owner_id)
--     4. permiso explícito por cliente (client_edit_permissions, vigente)
--
--   Pero las políticas RLS de UPDATE de las tablas scoped (natural_clients,
--   juridic_clients, unipersonal_clients) SOLO permiten editar si:
--     NOT user_needs_data_scoping(uid)   -- (admin y roles no agente/comercial)
--     OR el cliente está en el equipo del usuario (get_team_member_ids)
--
--   Para un usuario agente/comercial autorizado por el camino 2 (clientes.editar)
--   o 4 (permiso explícito) sobre un cliente FUERA de su equipo, el UPDATE pasa
--   por RLS y se filtra a 0 filas SIN error. supabase-js devuelve error=null, la
--   acción retorna success:true y la UI muestra "guardado" pero nada cambia.
--
-- Solución (PURAMENTE ADITIVA — nadie pierde acceso que ya tenía):
--   Se reemplazan las políticas UPDATE de las 3 tablas scoped por la MISMA
--   condición previa MÁS los caminos 2 y 4. (El camino 1 y los roles no scoped
--   ya están cubiertos por `NOT user_needs_data_scoping`; el camino 3 — líder —
--   ya funciona porque el líder comparte equipo con el dueño y por tanto entra en
--   get_team_member_ids).
--
--   Nota: las tablas ong_clients / club_clients / asociacion_civil_clients tienen
--   política UPDATE = true (sin scoping), por lo que NO sufren este bug y no se
--   tocan aquí.
--
-- Ejecutar manualmente en el SQL Editor de Supabase.
-- ============================================================================

-- natural_clients --------------------------------------------------------------
DROP POLICY IF EXISTS natural_clients_update ON natural_clients;
CREATE POLICY natural_clients_update ON natural_clients
	FOR UPDATE
	USING (
		(NOT user_needs_data_scoping((SELECT auth.uid())))
		OR EXISTS (
			SELECT 1 FROM clients c
			WHERE c.id = natural_clients.client_id
			  AND c.commercial_owner_id = ANY (get_team_member_ids((SELECT auth.uid())))
		)
		OR user_has_permission((SELECT auth.uid()), 'clientes.editar')
		OR EXISTS (
			SELECT 1 FROM client_edit_permissions cep
			WHERE cep.client_id = natural_clients.client_id
			  AND cep.user_id = (SELECT auth.uid())
			  AND cep.revoked_at IS NULL
			  AND (cep.expires_at IS NULL OR cep.expires_at > now())
		)
	);

-- juridic_clients --------------------------------------------------------------
DROP POLICY IF EXISTS juridic_clients_update ON juridic_clients;
CREATE POLICY juridic_clients_update ON juridic_clients
	FOR UPDATE
	USING (
		(NOT user_needs_data_scoping((SELECT auth.uid())))
		OR EXISTS (
			SELECT 1 FROM clients c
			WHERE c.id = juridic_clients.client_id
			  AND c.commercial_owner_id = ANY (get_team_member_ids((SELECT auth.uid())))
		)
		OR user_has_permission((SELECT auth.uid()), 'clientes.editar')
		OR EXISTS (
			SELECT 1 FROM client_edit_permissions cep
			WHERE cep.client_id = juridic_clients.client_id
			  AND cep.user_id = (SELECT auth.uid())
			  AND cep.revoked_at IS NULL
			  AND (cep.expires_at IS NULL OR cep.expires_at > now())
		)
	);

-- unipersonal_clients ----------------------------------------------------------
DROP POLICY IF EXISTS unipersonal_clients_update ON unipersonal_clients;
CREATE POLICY unipersonal_clients_update ON unipersonal_clients
	FOR UPDATE
	USING (
		(NOT user_needs_data_scoping((SELECT auth.uid())))
		OR EXISTS (
			SELECT 1 FROM clients c
			WHERE c.id = unipersonal_clients.client_id
			  AND c.commercial_owner_id = ANY (get_team_member_ids((SELECT auth.uid())))
		)
		OR user_has_permission((SELECT auth.uid()), 'clientes.editar')
		OR EXISTS (
			SELECT 1 FROM client_edit_permissions cep
			WHERE cep.client_id = unipersonal_clients.client_id
			  AND cep.user_id = (SELECT auth.uid())
			  AND cep.revoked_at IS NULL
			  AND (cep.expires_at IS NULL OR cep.expires_at > now())
		)
	);

-- IMPORTANTE: natural_clients también se actualiza al editar un cliente
-- unipersonal (datos personales). La política natural_clients_update de arriba
-- ya cubre ese caso porque el cliente unipersonal comparte la fila por client_id.
