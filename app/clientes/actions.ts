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
}): Promise<PaginatedResult<ClientViewModel>> {
	try {
		const { supabase, user } = await getAuthenticatedClient();

		const page = options?.page ?? 1;
		const pageSize = options?.pageSize ?? 20;
		const offset = (page - 1) * pageSize;

		console.log(`[getAllClients] User ${user.email} fetching clients (page ${page}, size ${pageSize})`);

		// Get total count first (lightweight query)
		const { count: totalRecords, error: countError } = await supabase
			.from("clients")
			.select("*", { count: "exact", head: true });

		if (countError) {
			console.error("[getAllClients] Error counting clients:", countError);
			return {
				success: false,
				error: "Error al contar clientes",
				details: countError,
			};
		}

		// Query base clients with type-specific data (paginated)
		const { data: clientsData, error: clientsError } = await supabase
			.from("clients")
			.select(
				`
				*,
				natural_clients (*),
				juridic_clients (*),
				unipersonal_clients (*)
			`
			)
			.order("created_at", { ascending: false })
			.range(offset, offset + pageSize - 1);

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
				const queryResult: ClientQueryResult = {
					clients: clientData,
					natural_clients: Array.isArray(clientData.natural_clients)
						? clientData.natural_clients[0] ?? null
						: clientData.natural_clients ?? null,
					juridic_clients: Array.isArray(clientData.juridic_clients)
						? clientData.juridic_clients[0] ?? null
						: clientData.juridic_clients ?? null,
					unipersonal_clients: null, // Not in current DB schema
					policies: policiesByClient.get(clientData.id) ?? [],
				};

				// Validate with Zod
				const validated = ClientQueryResultSchema.parse(queryResult);

				// Transform to view model
				const viewModel = transformClientToViewModel(validated);
				validatedClients.push(viewModel);
			} catch (validationError) {
				// Log validation error but continue processing other clients
				const errorMsg =
					validationError instanceof ZodError
						? validationError.issues.map((e) => e.message).join(", ")
						: getErrorMessage(validationError);

				console.error(`[getAllClients] Validation error for client ${clientData.id}:`, errorMsg);
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
			unipersonal_clients: null, // Not in current DB schema
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
export async function searchClients(query: string): Promise<ActionResult<ClientViewModel[]>> {
	try {
		const { user } = await getAuthenticatedClient();

		const trimmedQuery = query.trim();
		if (!trimmedQuery) {
			// Return all clients if query is empty (first page)
			const result = await getAllClients({ page: 1, pageSize: 20 });
			if (!result.success) {
				return result;
			}
			return { success: true, data: result.data };
		}

		console.log(`[searchClients] User ${user.email} searching for: "${trimmedQuery}"`);

		// Get all clients for search (increase page size for comprehensive search)
		const allClientsResult = await getAllClients({ page: 1, pageSize: 1000 });

		if (!allClientsResult.success) {
			return { success: false, error: allClientsResult.error, details: allClientsResult.details };
		}

		const allClients = allClientsResult.data;
		const searchTerm = trimmedQuery.toLowerCase();

		// Filter clients by search term
		const matchedClients = allClients.filter((client) => {
			// Search in name
			if (client.fullName.toLowerCase().includes(searchTerm)) {
				return true;
			}

			// Search in ID number
			if (client.idNumber.toLowerCase().includes(searchTerm)) {
				return true;
			}

			// Search in NIT
			if (client.nit?.toLowerCase().includes(searchTerm)) {
				return true;
			}

			// Search in email
			if (client.email?.toLowerCase().includes(searchTerm)) {
				return true;
			}

			// Search in phone
			if (client.phone?.includes(searchTerm)) {
				return true;
			}

			// Search in policies
			return client.policies.some((policy) => policy.policyNumber.toLowerCase().includes(searchTerm));
		});

		console.log(`[searchClients] Found ${matchedClients.length} matches for "${trimmedQuery}"`);

		return { success: true, data: matchedClients };
	} catch (error) {
		console.error("[searchClients] Unexpected error:", error);
		return {
			success: false,
			error: getErrorMessage(error),
			details: error,
		};
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
// EXPORTS
// ============================================

export { getAllClients as default };
