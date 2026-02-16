/**
 * Client Helper Functions
 * @module utils/clientHelpers
 * @description Utility functions for client data operations
 */

import type { Client, Policy } from "@/types/client";

/**
 * Get count of active policies for a client
 * @param client - Client object with policies array
 * @returns Number of active policies
 */
export function getActivePolicyCount(client: Client): number {
	return client.policies.filter((policy) => policy.status === "activa").length;
}

/**
 * Get count of policies by status
 * @param client - Client object with policies array
 * @returns Record of status counts
 */
export function getPolicyCountsByStatus(client: Client): Record<string, number> {
	const counts: Record<string, number> = {
		pendiente: 0,
		activa: 0,
		vencida: 0,
		cancelada: 0,
		renovada: 0,
	};

	client.policies.forEach((policy) => {
		if (policy.status in counts) {
			counts[policy.status]++;
		}
	});

	return counts;
}

/**
 * Get user-friendly status label
 * @param status - Policy status
 * @returns Display label for status
 */
export function getStatusLabel(
	status: Policy["status"] | string
): { label: string; color: "green" | "yellow" | "red" | "gray" | "blue" } {
	switch (status) {
		case "activa":
			return { label: "VIGENTE", color: "green" };
		case "vencida":
			return { label: "VENCIDA", color: "red" };
		case "cancelada":
			return { label: "CANCELADA", color: "gray" };
		case "pendiente":
			return { label: "PENDIENTE", color: "yellow" };
		case "renovada":
			return { label: "RENOVADA", color: "blue" };
		case "rechazada":
			return { label: "RECHAZADA", color: "red" };
		default:
			return { label: String(status).toUpperCase(), color: "gray" };
	}
}

/**
 * Format currency amount
 * @param amount - Numeric amount
 * @param currency - Currency code
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = "Bs"): string {
	return `${currency} ${amount.toLocaleString("es-ES", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

/**
 * Format date for display
 * @param date - Date object or ISO string
 * @returns Formatted date string
 */
export function formatDate(date: Date | string): string {
	const dateObj = typeof date === "string" ? new Date(date) : date;
	return dateObj.toLocaleDateString("es-ES", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
}

/**
 * Check if a policy is about to expire (within 30 days)
 * @param policy - Policy object
 * @returns true if expiring soon
 */
export function isPolicyExpiringSoon(policy: Policy): boolean {
	const expirationDate = new Date(policy.expirationDate);
	const today = new Date();
	const daysUntilExpiration = Math.floor((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
	return daysUntilExpiration > 0 && daysUntilExpiration <= 30;
}

/**
 * Get days until policy expiration
 * @param policy - Policy object
 * @returns Number of days (negative if already expired)
 */
export function getDaysUntilExpiration(policy: Policy): number {
	const expirationDate = new Date(policy.expirationDate);
	const today = new Date();
	return Math.floor((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
