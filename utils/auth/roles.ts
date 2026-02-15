/**
 * Sistema centralizado de configuración de roles
 * ÚNICA FUENTE DE VERDAD para todos los roles del sistema
 *
 * Para agregar un nuevo rol:
 * 1. Agregar al tipo UserRole en utils/auth/helpers.ts
 * 2. Agregar al constraint en la base de datos (migración SQL)
 * 3. Agregar configuración a ROLE_CONFIG abajo
 * 4. Agregar permisos por defecto en role_permissions (BD)
 *
 * Para agregar un nuevo permiso:
 * 1. Agregar al tipo Permission en utils/auth/helpers.ts
 * 2. INSERT en tabla permissions (BD)
 * 3. Asignar a roles en role_permissions (BD)
 * 4. Agregar al array defaultPermissions del rol correspondiente abajo
 */

import type { UserRole, Permission } from "./helpers";
import { Crown, UserCheck, Shield, Users, UserX, Ban, FileWarning } from "lucide-react";

/**
 * Array de todos los permisos del sistema.
 * Debe coincidir con el tipo Permission y con la tabla permissions en BD.
 */
export const ALL_PERMISSIONS: readonly Permission[] = [
	"polizas.ver",
	"polizas.crear",
	"polizas.editar",
	"polizas.validar",
	"polizas.exportar",
	"clientes.ver",
	"clientes.crear",
	"clientes.editar",
	"clientes.trazabilidad",
	"cobranzas.ver",
	"cobranzas.gestionar",
	"siniestros.ver",
	"siniestros.crear",
	"siniestros.editar",
	"vencimientos.ver",
	"vencimientos.generar",
	"documentos.descartar",
	"documentos.restaurar",
	"documentos.eliminar",
	"admin.usuarios",
	"admin.roles",
	"admin.invitaciones",
	"admin.reportes",
	"admin.permisos",
	"admin.equipos",
] as const;

/**
 * Módulos del sistema con sus labels para la UI
 */
export const PERMISSION_MODULES: Record<string, string> = {
	polizas: "Pólizas",
	clientes: "Clientes",
	cobranzas: "Cobranzas",
	siniestros: "Siniestros",
	vencimientos: "Vencimientos",
	documentos: "Documentos",
	admin: "Administración",
};

/**
 * Labels legibles para cada acción de permiso
 */
export const PERMISSION_ACTION_LABELS: Record<string, string> = {
	ver: "Ver",
	crear: "Crear",
	editar: "Editar",
	validar: "Validar",
	exportar: "Exportar",
	gestionar: "Gestionar",
	trazabilidad: "Trazabilidad",
	descartar: "Descartar",
	restaurar: "Restaurar",
	eliminar: "Eliminar",
	usuarios: "Usuarios",
	roles: "Roles",
	invitaciones: "Invitaciones",
	reportes: "Reportes",
	permisos: "Permisos",
	equipos: "Equipos",
};

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
	"siniestros",
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
	"siniestros",
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
	"cobranza",
	"siniestros"
] as const;

/**
 * Configuración completa de cada rol
 * Incluye metadata para UI y permisos por defecto.
 * Los permisos reales se gestionan en BD (role_permissions + user_permissions).
 * defaultPermissions es referencia para la UI de admin y seed inicial.
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
		defaultPermissions: [...ALL_PERMISSIONS] as Permission[]
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
		defaultPermissions: [
			"polizas.ver",
			"polizas.validar",
			"polizas.exportar",
			"clientes.ver",
			"clientes.trazabilidad",
			"cobranzas.ver",
			"siniestros.ver",
			"vencimientos.ver",
		] as Permission[]
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
		defaultPermissions: [
			"polizas.ver",
			"polizas.crear",
			"polizas.editar",
			"clientes.ver",
			"clientes.crear",
			"clientes.editar",
			"vencimientos.ver",
			"vencimientos.generar",
			"cobranzas.ver",
			"documentos.descartar",
		] as Permission[]
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
		defaultPermissions: [
			"polizas.ver",
			"polizas.crear",
			"polizas.editar",
			"clientes.ver",
			"clientes.crear",
			"clientes.editar",
			"vencimientos.ver",
			"vencimientos.generar",
			"cobranzas.ver",
			"siniestros.ver",
			"siniestros.crear",
			"siniestros.editar",
			"documentos.descartar",
		] as Permission[]
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
		defaultPermissions: [
			"cobranzas.ver",
			"cobranzas.gestionar",
			"polizas.ver",
			"clientes.ver",
		] as Permission[]
	},
	siniestros: {
		label: "Siniestros",
		labelEs: "Siniestros",
		description: "Claims management access for reporting and tracking insurance claims",
		descriptionEs: "Acceso de gestión de siniestros para registro y seguimiento de reclamaciones",
		color: "amber",
		icon: FileWarning,
		colorClasses: {
			bg: "bg-amber-50",
			text: "text-amber-600",
			border: "border-amber-200",
			gradient: "from-amber-50 to-white"
		},
		defaultPermissions: [
			"siniestros.ver",
			"siniestros.crear",
			"siniestros.editar",
			"polizas.ver",
			"clientes.ver",
			"cobranzas.ver",
		] as Permission[]
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
		defaultPermissions: [] as Permission[]
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
		defaultPermissions: [] as Permission[]
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
 * Helper para extraer módulo y acción de un permission ID
 */
export function parsePermission(permissionId: Permission): { module: string; action: string } {
	const [module, action] = permissionId.split(".");
	return { module, action };
}

/**
 * Helper para obtener el label legible de un permiso
 */
export function getPermissionLabel(permissionId: Permission): string {
	const { module, action } = parsePermission(permissionId);
	const moduleLabel = PERMISSION_MODULES[module] || module;
	const actionLabel = PERMISSION_ACTION_LABELS[action] || action;
	return `${moduleLabel}: ${actionLabel}`;
}
