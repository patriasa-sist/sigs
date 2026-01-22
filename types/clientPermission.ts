/**
 * Client Edit Permission Types
 * @module types/clientPermission
 * @description Types for the client edit permission system
 */

import { z } from "zod";

// ============================================
// DATABASE SCHEMA
// ============================================

/**
 * Schema for client edit permission records from database
 */
export const ClientEditPermissionSchema = z.object({
	id: z.string().uuid(),
	client_id: z.string().uuid(),
	user_id: z.string().uuid(),
	granted_by: z.string().uuid(),
	granted_at: z.string(),
	expires_at: z.string().nullable(),
	revoked_at: z.string().nullable(),
	revoked_by: z.string().uuid().nullable(),
	notes: z.string().nullable(),
});

export type ClientEditPermission = z.infer<typeof ClientEditPermissionSchema>;

// ============================================
// VIEW MODEL (enriched with user info)
// ============================================

/**
 * Permission data enriched with user names for display
 */
export interface ClientEditPermissionViewModel {
	id: string;
	client_id: string;
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
// INPUT TYPES
// ============================================

/**
 * Schema for granting a new permission
 */
export const GrantPermissionInputSchema = z.object({
	client_id: z.string().uuid("ID de cliente inválido"),
	user_id: z.string().uuid("ID de usuario inválido"),
	expires_at: z.string().optional(),
	notes: z.string().max(500, "Las notas no pueden exceder 500 caracteres").optional(),
});

export type GrantPermissionInput = z.infer<typeof GrantPermissionInputSchema>;

// ============================================
// PERMISSION CHECK RESULT
// ============================================

/**
 * Result of checking if a user can edit a client
 */
export interface PermissionCheckResult {
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
// USER TYPES FOR DROPDOWNS
// ============================================

/**
 * Comercial user for permission granting dropdown
 */
export interface ComercialUser {
	id: string;
	full_name: string;
	email: string;
}
