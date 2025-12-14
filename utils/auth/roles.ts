/**
 * Sistema centralizado de configuración de roles
 * ÚNICA FUENTE DE VERDAD para todos los roles del sistema
 *
 * Para agregar un nuevo rol:
 * 1. Agregar al tipo UserRole en utils/auth/helpers.ts
 * 2. Agregar al constraint en la base de datos (migración SQL)
 * 3. Agregar configuración a ROLE_CONFIG abajo
 */

import type { UserRole } from "./helpers";
import { Crown, UserCheck, Shield, Users, UserX, Ban } from "lucide-react";

/**
 * Array de todos los roles válidos del sistema
 * Úsalo para iteraciones, validaciones, etc.
 */
export const VALID_ROLES: readonly UserRole[] = [
	"admin",
	"usuario",
	"agente",
	"comercial",
	"cobranza",
	"invitado",
	"desactivado"
] as const;

/**
 * Roles que pueden ser asignados desde la UI de administración
 * Excluye roles internos o especiales si es necesario
 */
export const ASSIGNABLE_ROLES: readonly UserRole[] = [
	"admin",
	"usuario",
	"agente",
	"comercial",
	"cobranza",
	"invitado",
	"desactivado"
] as const;

/**
 * Roles que tienen acceso operativo al sistema
 * Excluye invitado y desactivado
 */
export const OPERATIONAL_ROLES: readonly UserRole[] = [
	"admin",
	"usuario",
	"agente",
	"comercial",
	"cobranza"
] as const;

/**
 * Configuración completa de cada rol
 * Incluye metadata para UI, permisos, etc.
 */
export const ROLE_CONFIG = {
	admin: {
		label: "Administrator",
		labelEs: "Administrador",
		description: "Full administrative privileges including user management, invitations, and access to all features",
		descriptionEs: "Privilegios administrativos completos incluyendo gestión de usuarios, invitaciones y acceso a todas las funcionalidades",
		color: "orange",
		icon: Crown,
		colorClasses: {
			bg: "bg-orange-50",
			text: "text-orange-600",
			border: "border-orange-200",
			gradient: "from-orange-50 to-white"
		},
		permissions: {
			canManageUsers: true,
			canManageRoles: true,
			canSendInvitations: true,
			canValidatePolicies: true,
			canCreatePolicies: true,
			canViewPayments: true,
			canManagePayments: true,
			canDeleteDocuments: true
		}
	},
	usuario: {
		label: "Usuario",
		labelEs: "Usuario",
		description: "Standard user access with validation permissions",
		descriptionEs: "Acceso de usuario estándar con permisos de validación",
		color: "blue",
		icon: UserCheck,
		colorClasses: {
			bg: "bg-blue-50",
			text: "text-blue-600",
			border: "border-blue-200",
			gradient: "from-blue-50 to-white"
		},
		permissions: {
			canManageUsers: false,
			canManageRoles: false,
			canSendInvitations: false,
			canValidatePolicies: true,
			canCreatePolicies: false,
			canViewPayments: true,
			canManagePayments: false,
			canDeleteDocuments: false
		}
	},
	agente: {
		label: "Agente",
		labelEs: "Agente",
		description: "Agent-level access for policy creation and management",
		descriptionEs: "Acceso nivel agente para creación y gestión de pólizas",
		color: "green",
		icon: Shield,
		colorClasses: {
			bg: "bg-green-50",
			text: "text-green-600",
			border: "border-green-200",
			gradient: "from-green-50 to-white"
		},
		permissions: {
			canManageUsers: false,
			canManageRoles: false,
			canSendInvitations: false,
			canValidatePolicies: false,
			canCreatePolicies: true,
			canViewPayments: true,
			canManagePayments: false,
			canDeleteDocuments: false
		}
	},
	comercial: {
		label: "Comercial",
		labelEs: "Comercial",
		description: "Commercial access for policy creation and sales",
		descriptionEs: "Acceso comercial para creación de pólizas y ventas",
		color: "cyan",
		icon: Users,
		colorClasses: {
			bg: "bg-cyan-50",
			text: "text-cyan-600",
			border: "border-cyan-200",
			gradient: "from-cyan-50 to-white"
		},
		permissions: {
			canManageUsers: false,
			canManageRoles: false,
			canSendInvitations: false,
			canValidatePolicies: false,
			canCreatePolicies: true,
			canViewPayments: true,
			canManagePayments: false,
			canDeleteDocuments: false
		}
	},
	cobranza: {
		label: "Cobranza",
		labelEs: "Cobranza",
		description: "Collections access for payment management and tracking",
		descriptionEs: "Acceso de cobranza para gestión y seguimiento de pagos",
		color: "violet",
		icon: UserCheck,
		colorClasses: {
			bg: "bg-violet-50",
			text: "text-violet-600",
			border: "border-violet-200",
			gradient: "from-violet-50 to-white"
		},
		permissions: {
			canManageUsers: false,
			canManageRoles: false,
			canSendInvitations: false,
			canValidatePolicies: false,
			canCreatePolicies: false,
			canViewPayments: true,
			canManagePayments: true,
			canDeleteDocuments: false
		}
	},
	invitado: {
		label: "Invitado",
		labelEs: "Invitado",
		description: "Limited guest access to the system",
		descriptionEs: "Acceso limitado de invitado al sistema",
		color: "yellow",
		icon: UserX,
		colorClasses: {
			bg: "bg-yellow-50",
			text: "text-yellow-600",
			border: "border-yellow-200",
			gradient: "from-yellow-50 to-white"
		},
		permissions: {
			canManageUsers: false,
			canManageRoles: false,
			canSendInvitations: false,
			canValidatePolicies: false,
			canCreatePolicies: false,
			canViewPayments: false,
			canManagePayments: false,
			canDeleteDocuments: false
		}
	},
	desactivado: {
		label: "Desactivado",
		labelEs: "Desactivado",
		description: "Deactivated account with no system access",
		descriptionEs: "Cuenta desactivada sin acceso al sistema",
		color: "gray",
		icon: Ban,
		colorClasses: {
			bg: "bg-gray-50",
			text: "text-gray-600",
			border: "border-gray-200",
			gradient: "from-gray-50 to-white"
		},
		permissions: {
			canManageUsers: false,
			canManageRoles: false,
			canSendInvitations: false,
			canValidatePolicies: false,
			canCreatePolicies: false,
			canViewPayments: false,
			canManagePayments: false,
			canDeleteDocuments: false
		}
	}
} as const;

/**
 * Helper para obtener configuración de un rol
 */
export function getRoleConfig(role: UserRole) {
	return ROLE_CONFIG[role];
}

/**
 * Helper para obtener el label de un rol (español por defecto)
 */
export function getRoleLabel(role: UserRole, lang: "es" | "en" = "es"): string {
	const config = ROLE_CONFIG[role];
	return lang === "es" ? config.labelEs : config.label;
}

/**
 * Helper para obtener la descripción de un rol (español por defecto)
 */
export function getRoleDescription(role: UserRole, lang: "es" | "en" = "es"): string {
	const config = ROLE_CONFIG[role];
	return lang === "es" ? config.descriptionEs : config.description;
}

/**
 * Helper para verificar si un rol es asignable desde UI
 */
export function isAssignableRole(role: UserRole): boolean {
	return ASSIGNABLE_ROLES.includes(role);
}

/**
 * Helper para verificar si un rol es operativo
 */
export function isOperationalRole(role: UserRole): boolean {
	return OPERATIONAL_ROLES.includes(role);
}

/**
 * Helper para verificar si un rol tiene un permiso específico
 */
export function hasPermission(role: UserRole, permission: keyof typeof ROLE_CONFIG.admin.permissions): boolean {
	return ROLE_CONFIG[role].permissions[permission];
}
