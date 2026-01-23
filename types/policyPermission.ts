/**
 * Policy Edit Permission Types
 * @module types/policyPermission
 * @description TypeScript types for policy edit permissions system
 */

import { z } from "zod";

// ============================================
// DATABASE TYPES
// ============================================

/**
 * Raw policy edit permission from database
 */
export interface PolicyEditPermission {
	id: string;
	poliza_id: string;
	user_id: string;
	granted_by: string;
	granted_at: string;
	expires_at: string | null;
	revoked_at: string | null;
	revoked_by: string | null;
	notes: string | null;
}

// ============================================
// VIEW MODEL TYPES
// ============================================

/**
 * Policy edit permission with enriched user information
 * Used for display in UI components
 */
export interface PolicyEditPermissionViewModel {
	id: string;
	poliza_id: string;
	numero_poliza?: string;
	user_id: string;
	user_name: string;
	user_email: string;
	granted_by: string;
	granted_by_name: string;
	granted_at: string;
	expires_at: string | null;
	is_active: boolean;
	notes: string | null;
}

// ============================================
// PERMISSION CHECK TYPES
// ============================================

/**
 * Result of checking if user can edit a policy
 */
export interface PolicyPermissionCheckResult {
	canEdit: boolean;
	reason: string;
	isAdmin: boolean;
	permission?: {
		id: string;
		expires_at: string | null;
		granted_by_name: string;
	};
}

// ============================================
// INPUT TYPES WITH VALIDATION
// ============================================

/**
 * Schema for granting policy edit permission
 */
export const GrantPolicyPermissionInputSchema = z.object({
	poliza_id: z.string().uuid("ID de póliza inválido"),
	user_id: z.string().uuid("ID de usuario inválido"),
	expires_at: z.string().optional(),
	notes: z.string().max(500, "Las notas no pueden exceder 500 caracteres").optional(),
});

export type GrantPolicyPermissionInput = z.infer<typeof GrantPolicyPermissionInputSchema>;

// ============================================
// COMERCIAL USER TYPE
// ============================================

/**
 * Comercial user for permission granting dropdown
 */
export interface ComercialUser {
	id: string;
	full_name: string;
	email: string;
}

// ============================================
// ACTION RESULT TYPES
// ============================================

/**
 * Generic action result type
 */
export type ActionResult<T> =
	| { success: true; data: T }
	| { success: false; error: string };
