/**
 * Client Module Type Definitions
 * Defines data structures for client and policy management
 *
 * NOTE: These types are now compatible with the database layer (types/database/client.ts)
 * Import ClientViewModel from database layer for type-safe database operations
 */

import type { ClientViewModel, PolicyViewModel } from "./database/client";

// ============================================
// RE-EXPORTS FROM DATABASE LAYER
// ============================================

/**
 * Client type - re-exported from database layer for consistency
 */
export type Client = ClientViewModel;

/**
 * Policy type - re-exported from database layer for consistency
 */
export type Policy = PolicyViewModel;

// ============================================
// LEGACY TYPE ALIASES (for backward compatibility)
// ============================================

/**
 * @deprecated Use PolicyStatus from database layer instead
 * Policy status types - kept for backward compatibility
 */
export type PolicyStatus = "pendiente" | "activa" | "vencida" | "cancelada" | "renovada" | "rechazada";

/**
 * @deprecated Use specific ramo strings instead
 * Insurance type - simplified for display purposes
 */
export type InsuranceType = "salud" | "automotor" | "vida" | "general" | string;

// ============================================
// SEARCH AND FILTERING TYPES
// ============================================

/**
 * Search criteria for client filtering
 */
export interface ClientSearchParams {
	query: string; // Multi-field search query
	insuranceType?: string; // Ramo/insurance type
	policyStatus?: PolicyStatus;
	dateFrom?: Date;
	dateTo?: Date;
}

/**
 * Client with computed search relevance
 */
export interface ClientSearchResult extends Client {
	matchedFields: string[]; // Fields that matched the search
	relevanceScore: number; // Search relevance (0-100)
}
