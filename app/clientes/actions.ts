/**
 * Client Management Server Actions
 * @module app/clientes/actions
 * @description Secure server-side actions for client data operations
 *
 * Security Features:
 * - Server-only execution (prevents client-side abuse)
 * - Authentication check before operations
 * - Zod validation for all returned data
 * - SQL injection prevention via Supabase client
 * - Type-safe error handling
 * - Comprehensive logging for audit trail
 */

"use server";

import { createClient } from "@/utils/supabase/server";
import {
	ClientViewModel,
	ClientQueryResult,
	ClientQueryResultSchema,
	transformClientToViewModel,
} from "@/types/database/client";
import { ZodError } from "zod";

// ============================================
// ERROR HANDLING TYPES
// ============================================

export type ActionResult<T> =
	| { success: true; data: T }
	| { success: false; error: string; details?: unknown };

export type PaginatedResult<T> = {
	success: true;
	data: T[];
	pagination: {
		page: number;
		pageSize: number;
		totalRecords: number;
		totalPages: number;
	};
} | {
	success: false;
	error: string;
	details?: unknown;
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get authenticated Supabase client
 * @returns Supabase client with user session
 * @throws Error if user is not authenticated
 */
async function getAuthenticatedClient() {
	const supabase = await createClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		throw new Error("No autenticado. Por favor inicie sesión.");
	}

	return { supabase, user };
}

/**
 * Safe error message extraction
 * @param error - Unknown error object
 * @returns User-friendly error message
 */
function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	if (typeof error === "string") {
		return error;
	}
	return "Error desconocido";
}

// ============================================
// CLIENT QUERY ACTIONS
// ============================================

/**
 * Fetch all clients with their policies
 *
 * @description
 * Retrieves clients from the database with:
 * - Type-specific client data (natural/juridic/unipersonal)
 * - Associated policies with insurance company info
 * - Proper validation and transformation
 * - Optional server-side pagination for performance
 *
 * @param options - Optional pagination parameters
 * @param options.page - Page number (default: 1)
 * @param options.pageSize - Records per page (default: 20)
 * @returns Paginated result with client view models and pagination metadata
 *
 * @example
 * ```typescript
 * // Fetch first page with 20 clients
 * const result = await getAllClients({ page: 1, pageSize: 20 });
 * if (result.success) {
 *   console.log(`Found ${result.data.length} clients (page ${result.pagination.page} of ${result.pagination.totalPages})`);
 * }
 * ```
 */
export async function getAllClients(options?: {
	page?: number;
	pageSize?: number;
	commercial_owner_id?: string;
}): Promise<PaginatedResult<ClientViewModel>> {
	try {
		const { supabase, user } = await getAuthenticatedClient();

		const page = options?.page ?? 1;
		const pageSize = options?.pageSize ?? 20;
		const offset = (page - 1) * pageSize;

		console.log(`[getAllClients] User ${user.email} fetching clients (page ${page}, size ${pageSize})`);

		// Query base clients con count exacto en una sola round-trip
		let clientsQuery = supabase
			.from("clients")
			.select(
				`
				*,
				natural_clients (*),
				juridic_clients (*),
				unipersonal_clients (*)
			`,
				{ count: "exact" }
			)
			.order("created_at", { ascending: false })
			.range(offset, offset + pageSize - 1);

		if (options?.commercial_owner_id) {
			clientsQuery = clientsQuery.eq("commercial_owner_id", options.commercial_owner_id);
		}

		const { data: clientsData, count: totalRecords, error: clientsError } = await clientsQuery;

		if (clientsError) {
			console.error("[getAllClients] Error fetching clients:", clientsError);
			return {
				success: false,
				error: "Error al obtener clientes",
				details: clientsError,
			};
		}

		if (!clientsData || clientsData.length === 0) {
			console.log("[getAllClients] No clients found");
			return {
				success: true,
				data: [],
				pagination: {
					page,
					pageSize,
					totalRecords: 0,
					totalPages: 0,
				},
			};
		}

		// Extract client IDs for policy query
		const clientIds = clientsData.map((c) => c.id);

		// Extract unique executive IDs for profiles_public query
		const executiveIds = [...new Set(
			clientsData
				.map((c) => c.commercial_owner_id)
				.filter((id): id is string => id !== null)
		)];

		// Query executives from profiles_public view (restricted public access)
		const executivesMap = new Map<string, { id: string; full_name: string; email: string }>();
		if (executiveIds.length > 0) {
			const { data: executivesData, error: executivesError } = await supabase
				.from("profiles_public")
				.select("id, full_name, email")
				.in("id", executiveIds);

			if (executivesError) {
				console.error("[getAllClients] Error fetching executives:", executivesError);
				// Continue without executives - non-blocking error
			} else if (executivesData) {
				for (const exec of executivesData) {
					executivesMap.set(exec.id, exec);
				}
			}
		}

		// Query policies for these clients
		const { data: policiesData, error: policiesError } = await supabase
			.from("polizas")
			.select(
				`
				*,
				companias_aseguradoras (
					id,
					nombre,
					activo,
					created_at
				)
			`
			)
			.in("client_id", clientIds);

		if (policiesError) {
			console.error("[getAllClients] Error fetching policies:", policiesError);
			// Continue without policies - non-blocking error
		}

		// Group policies by client_id for efficient lookup
		const policiesByClient = new Map<string, typeof policiesData>();
		if (policiesData) {
			for (const policy of policiesData) {
				const existing = policiesByClient.get(policy.client_id) || [];
				existing.push(policy);
				policiesByClient.set(policy.client_id, existing);
			}
		}

		// Transform and validate each client
		const validatedClients: ClientViewModel[] = [];
		const errors: Array<{ clientId: string; error: string }> = [];

		for (const clientData of clientsData) {
			try {
				// Prepare query result structure
				// Handle Supabase returning either object or array for 1:1 relationships
				const executiveData = clientData.commercial_owner_id
					? executivesMap.get(clientData.commercial_owner_id) ?? null
					: null;

				const queryResult: ClientQueryResult = {
					clients: clientData,
					natural_clients: Array.isArray(clientData.natural_clients)
						? clientData.natural_clients[0] ?? null
						: clientData.natural_clients ?? null,
					juridic_clients: Array.isArray(clientData.juridic_clients)
						? clientData.juridic_clients[0] ?? null
						: clientData.juridic_clients ?? null,
					unipersonal_clients: Array.isArray(clientData.unipersonal_clients)
						? clientData.unipersonal_clients[0] ?? null
						: clientData.unipersonal_clients ?? null,
					executive: executiveData,
					policies: policiesByClient.get(clientData.id) ?? [],
				};

				// Validate with Zod
				const validated = ClientQueryResultSchema.parse(queryResult);

				// Transform to view model
				const viewModel = transformClientToViewModel(validated);
				validatedClients.push(viewModel);
			} catch (validationError) {
				// Log validation error with detailed field information
				let errorMsg: string;

				if (validationError instanceof ZodError) {
					// Build detailed error message with field paths
					const detailedErrors = validationError.issues.map((issue) => {
						const fieldPath = issue.path.length > 0
							? issue.path.join('.')
							: 'root';
						return `[${fieldPath}] ${issue.message} (expected: ${(issue as { expected?: unknown }).expected ?? 'N/A'}, received: ${(issue as { received?: unknown }).received ?? 'N/A'})`;
					});
					errorMsg = detailedErrors.join(' | ');

					// Log each issue separately for clarity
					console.error(`[getAllClients] Validation error for client ${clientData.id}:`);
					for (const issue of validationError.issues) {
						const fieldPath = issue.path.length > 0 ? issue.path.join('.') : 'root';
						console.error(`  - Field "${fieldPath}": ${issue.message}`);
						console.error(`    Expected: ${(issue as { expected?: unknown }).expected ?? 'N/A'}, Received: ${(issue as { received?: unknown }).received ?? 'N/A'}`);
					}
				} else {
					errorMsg = getErrorMessage(validationError);
					console.error(`[getAllClients] Validation error for client ${clientData.id}:`, errorMsg);
				}

				errors.push({ clientId: clientData.id, error: errorMsg });
			}
		}

		if (errors.length > 0) {
			console.warn(`[getAllClients] ${errors.length} clients failed validation:`, errors);
		}

		const totalPages = Math.ceil((totalRecords ?? 0) / pageSize);

		console.log(`[getAllClients] Successfully fetched ${validatedClients.length} clients (page ${page}/${totalPages})`);

		return {
			success: true,
			data: validatedClients,
			pagination: {
				page,
				pageSize,
				totalRecords: totalRecords ?? 0,
				totalPages,
			},
		};
	} catch (error) {
		console.error("[getAllClients] Unexpected error:", error);
		return {
			success: false,
			error: getErrorMessage(error),
			details: error,
		};
	}
}

/**
 * Fetch a single client by ID
 *
 * @param clientId - UUID of the client to fetch
 * @returns Action result with client view model
 *
 * @example
 * ```typescript
 * const result = await getClientById('uuid-here');
 * if (result.success) {
 *   console.log('Client:', result.data.fullName);
 * }
 * ```
 */
export async function getClientById(clientId: string): Promise<ActionResult<ClientViewModel>> {
	try {
		const { supabase, user } = await getAuthenticatedClient();

		console.log(`[getClientById] User ${user.email} fetching client ${clientId}`);

		// Validate UUID format
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!uuidRegex.test(clientId)) {
			return {
				success: false,
				error: "ID de cliente inválido",
			};
		}

		// Query base client with type-specific data
		// Note: executive is fetched separately via profiles_public view for RLS compliance
		const { data: clientData, error: clientError } = await supabase
			.from("clients")
			.select(
				`
				*,
				natural_clients (*),
				juridic_clients (*),
				unipersonal_clients (*)
			`
			)
			.eq("id", clientId)
			.single();

		if (clientError) {
			console.error("[getClientById] Error fetching client:", clientError);
			return {
				success: false,
				error: "Error al obtener cliente",
				details: clientError,
			};
		}

		if (!clientData) {
			return {
				success: false,
				error: "Cliente no encontrado",
			};
		}

		// Fetch commercial owner from profiles_public view (restricted public access)
		let executiveData: { id: string; full_name: string; email: string } | null = null;
		if (clientData.commercial_owner_id) {
			const { data: execData, error: execError } = await supabase
				.from("profiles_public")
				.select("id, full_name, email")
				.eq("id", clientData.commercial_owner_id)
				.single();

			if (execError) {
				console.error("[getClientById] Error fetching executive:", execError);
				// Continue without executive - non-blocking error
			} else {
				executiveData = execData;
			}
		}

		// Query policies for this client
		const { data: policiesData, error: policiesError } = await supabase
			.from("polizas")
			.select(
				`
				*,
				companias_aseguradoras (
					id,
					nombre,
					activo,
					created_at
				)
			`
			)
			.eq("client_id", clientId);

		if (policiesError) {
			console.error("[getClientById] Error fetching policies:", policiesError);
			// Continue without policies
		}

		// Prepare query result structure
		// Handle Supabase returning either object or array for 1:1 relationships
		const queryResult: ClientQueryResult = {
			clients: clientData,
			natural_clients: Array.isArray(clientData.natural_clients)
				? clientData.natural_clients[0] ?? null
				: clientData.natural_clients ?? null,
			juridic_clients: Array.isArray(clientData.juridic_clients)
				? clientData.juridic_clients[0] ?? null
				: clientData.juridic_clients ?? null,
			unipersonal_clients: Array.isArray(clientData.unipersonal_clients)
				? clientData.unipersonal_clients[0] ?? null
				: clientData.unipersonal_clients ?? null,
			executive: executiveData,
			policies: policiesData ?? [],
		};

		// Validate with Zod
		const validated = ClientQueryResultSchema.parse(queryResult);

		// Transform to view model
		const viewModel = transformClientToViewModel(validated);

		console.log(`[getClientById] Successfully fetched client ${clientId}`);

		return { success: true, data: viewModel };
	} catch (error) {
		console.error("[getClientById] Unexpected error:", error);

		// Handle Zod validation errors specially
		if (error instanceof ZodError) {
			return {
				success: false,
				error: "Datos de cliente inválidos",
				details: error.issues,
			};
		}

		return {
			success: false,
			error: getErrorMessage(error),
			details: error,
		};
	}
}

/**
 * Search clients by query string
 *
 * @description
 * Searches clients across multiple fields:
 * - Full name (natural clients)
 * - Razón social (juridic/unipersonal clients)
 * - Document number (CI, NIT)
 * - Email
 * - Phone
 * - Policy number
 *
 * @param query - Search query string
 * @returns Action result with array of matching clients
 *
 * @example
 * ```typescript
 * const result = await searchClients('juan garcia');
 * if (result.success) {
 *   console.log(`Found ${result.data.length} matches`);
 * }
 * ```
 */
export async function searchClients(query: string, filters?: { commercial_owner_id?: string }): Promise<ActionResult<ClientViewModel[]>> {
	try {
		const { supabase, user } = await getAuthenticatedClient();

		const trimmedQuery = query.trim().substring(0, 100);
		if (!trimmedQuery) {
			const result = await getAllClients({ page: 1, pageSize: 20, commercial_owner_id: filters?.commercial_owner_id });
			if (!result.success) return result;
			return { success: true, data: result.data };
		}

		console.log(`[searchClients] User ${user.email} searching for: "${trimmedQuery}"`);

		const q = trimmedQuery;

		// Buscar en todas las tablas relevantes en paralelo
		const [natRes, jurRes, uniRes, clientsRes, polizasRes] = await Promise.all([
			supabase.from("natural_clients").select("client_id")
				.or(`primer_nombre.ilike.%${q}%,primer_apellido.ilike.%${q}%,segundo_apellido.ilike.%${q}%,numero_documento.ilike.%${q}%`),
			supabase.from("juridic_clients").select("client_id")
				.or(`razon_social.ilike.%${q}%,nit.ilike.%${q}%`),
			supabase.from("unipersonal_clients").select("client_id")
				.or(`razon_social.ilike.%${q}%,nit.ilike.%${q}%`),
			supabase.from("clients").select("id")
				.or(`email.ilike.%${q}%,phone.ilike.%${q}%`),
			supabase.from("polizas").select("client_id")
				.ilike("numero_poliza", `%${q}%`),
		]);

		const matchingIds = new Set([
			...(natRes.data?.map((r) => r.client_id) ?? []),
			...(jurRes.data?.map((r) => r.client_id) ?? []),
			...(uniRes.data?.map((r) => r.client_id) ?? []),
			...(clientsRes.data?.map((r) => r.id) ?? []),
			...(polizasRes.data?.map((r) => r.client_id) ?? []),
		]);

		if (matchingIds.size === 0) {
			console.log(`[searchClients] No matches for "${q}"`);
			return { success: true, data: [] };
		}

		const ids = [...matchingIds];

		// Obtener clientes coincidentes con sus datos relacionados
		let clientsMatchQuery = supabase
			.from("clients")
			.select(`*, natural_clients (*), juridic_clients (*), unipersonal_clients (*)`)
			.in("id", ids)
			.order("created_at", { ascending: false })
			.limit(100);

		if (filters?.commercial_owner_id) {
			clientsMatchQuery = clientsMatchQuery.eq("commercial_owner_id", filters.commercial_owner_id);
		}

		const { data: clientsData, error: clientsError } = await clientsMatchQuery;

		if (clientsError) {
			console.error("[searchClients] Error fetching matched clients:", clientsError);
			return { success: false, error: "Error al obtener clientes", details: clientsError };
		}

		if (!clientsData?.length) return { success: true, data: [] };

		// Obtener ejecutivos y pólizas para los resultados
		const executiveIds = [...new Set(
			clientsData.map((c) => c.commercial_owner_id).filter((id): id is string => id !== null)
		)];
		const clientIds = clientsData.map((c) => c.id);

		const [executivesRes, policiesRes] = await Promise.all([
			executiveIds.length > 0
				? supabase.from("profiles_public").select("id, full_name, email").in("id", executiveIds)
				: Promise.resolve({ data: [] }),
			supabase.from("polizas")
				.select(`*, companias_aseguradoras (id, nombre, activo, created_at)`)
				.in("client_id", clientIds),
		]);

		const executivesMap = new Map(
			(executivesRes.data ?? []).map((e) => [e.id, e])
		);
		const policiesByClient = new Map<string, typeof policiesRes.data>();
		for (const policy of policiesRes.data ?? []) {
			const existing = policiesByClient.get(policy.client_id) ?? [];
			existing.push(policy);
			policiesByClient.set(policy.client_id, existing);
		}

		const validatedClients: ClientViewModel[] = [];
		for (const clientData of clientsData) {
			try {
				const queryResult: ClientQueryResult = {
					clients: clientData,
					natural_clients: Array.isArray(clientData.natural_clients)
						? clientData.natural_clients[0] ?? null
						: clientData.natural_clients ?? null,
					juridic_clients: Array.isArray(clientData.juridic_clients)
						? clientData.juridic_clients[0] ?? null
						: clientData.juridic_clients ?? null,
					unipersonal_clients: Array.isArray(clientData.unipersonal_clients)
						? clientData.unipersonal_clients[0] ?? null
						: clientData.unipersonal_clients ?? null,
					executive: clientData.commercial_owner_id
						? executivesMap.get(clientData.commercial_owner_id) ?? null
						: null,
					policies: policiesByClient.get(clientData.id) ?? [],
				};
				const validated = ClientQueryResultSchema.parse(queryResult);
				validatedClients.push(transformClientToViewModel(validated));
			} catch (validationError) {
				console.error(`[searchClients] Validation error for client ${clientData.id}:`, validationError);
			}
		}

		console.log(`[searchClients] Found ${validatedClients.length} matches for "${q}"`);
		return { success: true, data: validatedClients };
	} catch (error) {
		console.error("[searchClients] Unexpected error:", error);
		return { success: false, error: getErrorMessage(error), details: error };
	}
}

/**
 * Get count of active policies for clients
 *
 * @description
 * Returns a map of client IDs to their active policy count
 * Useful for dashboard statistics
 *
 * @returns Action result with map of client ID to active policy count
 */
export async function getClientActivePolicyCounts(): Promise<ActionResult<Map<string, number>>> {
	try {
		const { supabase, user } = await getAuthenticatedClient();

		console.log(`[getClientActivePolicyCounts] User ${user.email} fetching policy counts`);

		// Query active policies grouped by client
		const { data: policiesData, error } = await supabase
			.from("polizas")
			.select("client_id, estado")
			.eq("estado", "activa");

		if (error) {
			console.error("[getClientActivePolicyCounts] Error:", error);
			return {
				success: false,
				error: "Error al obtener conteo de pólizas",
				details: error,
			};
		}

		// Count active policies per client
		const counts = new Map<string, number>();
		if (policiesData) {
			for (const policy of policiesData) {
				const current = counts.get(policy.client_id) || 0;
				counts.set(policy.client_id, current + 1);
			}
		}

		console.log(`[getClientActivePolicyCounts] Counted for ${counts.size} clients`);

		return { success: true, data: counts };
	} catch (error) {
		console.error("[getClientActivePolicyCounts] Unexpected error:", error);
		return {
			success: false,
			error: getErrorMessage(error),
			details: error,
		};
	}
}

// ============================================
// DUPLICATE DETECTION (early warning during client creation)
// ============================================

export type VerificarDocumentoResult = {
	existe: boolean;
	client_id: string | null;
	nombre: string | null;
};

export type VerificarNitResult = {
	existe: boolean;
	client_id: string | null;
	nombre: string | null;
	tipo_cliente: string | null;
};

/**
 * Check if a natural client with the given document already exists.
 * Used for early duplicate detection during client creation.
 */
export async function verificarDocumentoExistente(
	tipo_documento: string,
	numero_documento: string,
): Promise<ActionResult<VerificarDocumentoResult>> {
	try {
		const { supabase } = await getAuthenticatedClient();

		const { data, error } = await supabase.rpc("verificar_documento_existente", {
			p_tipo_documento: tipo_documento,
			p_numero_documento: numero_documento,
		});

		if (error) {
			console.error("[verificarDocumentoExistente] RPC error:", error);
			return { success: false, error: "Error al verificar documento", details: error };
		}

		const row = (data as VerificarDocumentoResult[])?.[0];
		if (!row) {
			return { success: true, data: { existe: false, client_id: null, nombre: null } };
		}

		return { success: true, data: row };
	} catch (error) {
		console.error("[verificarDocumentoExistente] Unexpected error:", error);
		return { success: false, error: getErrorMessage(error), details: error };
	}
}

/**
 * Check if a juridic or unipersonal client with the given NIT already exists.
 * Used for early duplicate detection during client creation.
 */
export async function verificarNitExistente(
	nit: string,
): Promise<ActionResult<VerificarNitResult>> {
	try {
		const { supabase } = await getAuthenticatedClient();

		const { data, error } = await supabase.rpc("verificar_nit_existente", {
			p_nit: nit,
		});

		if (error) {
			console.error("[verificarNitExistente] RPC error:", error);
			return { success: false, error: "Error al verificar NIT", details: error };
		}

		const row = (data as VerificarNitResult[])?.[0];
		if (!row) {
			return { success: true, data: { existe: false, client_id: null, nombre: null, tipo_cliente: null } };
		}

		return { success: true, data: row };
	} catch (error) {
		console.error("[verificarNitExistente] Unexpected error:", error);
		return { success: false, error: getErrorMessage(error), details: error };
	}
}

// ============================================
// FILTER OPTIONS
// ============================================

export type FiltrosClientesOptions = {
	ejecutivos: { id: string; full_name: string }[];
};

/**
 * Fetch distinct executives (commercial_owner) assigned to clients.
 * Used to populate the ejecutivo filter dropdown.
 */
export async function obtenerFiltrosClientes(): Promise<ActionResult<FiltrosClientesOptions>> {
	try {
		const { supabase } = await getAuthenticatedClient();

		// Get distinct commercial_owner_id values from clients
		const { data: rows, error } = await supabase
			.from("clients")
			.select("commercial_owner_id")
			.not("commercial_owner_id", "is", null);

		if (error) {
			console.error("[obtenerFiltrosClientes] Error fetching owner ids:", error);
			return { success: false, error: "Error al obtener filtros", details: error };
		}

		const ownerIds = [...new Set((rows ?? []).map((r) => r.commercial_owner_id).filter(Boolean))] as string[];

		if (ownerIds.length === 0) {
			return { success: true, data: { ejecutivos: [] } };
		}

		const { data: profiles, error: profilesError } = await supabase
			.from("profiles_public")
			.select("id, full_name")
			.in("id", ownerIds);

		if (profilesError) {
			console.error("[obtenerFiltrosClientes] Error fetching profiles:", profilesError);
			return { success: false, error: "Error al obtener ejecutivos", details: profilesError };
		}

		const ejecutivos = (profiles ?? [])
			.filter((p) => p.full_name)
			.sort((a, b) => a.full_name.localeCompare(b.full_name));

		return { success: true, data: { ejecutivos } };
	} catch (error) {
		console.error("[obtenerFiltrosClientes] Unexpected error:", error);
		return { success: false, error: getErrorMessage(error), details: error };
	}
}

// ============================================
// EXPORTS
// ============================================

export { getAllClients as default };
