/**
 * Client Form Draft Storage Utility
 * Manages form state persistence in browser localStorage (no DB usage)
 */

import { ClientFormState } from "@/types/clientForm";

const STORAGE_KEY = "client-form-draft";
const STORAGE_TIMESTAMP_KEY = "client-form-draft-timestamp";

/**
 * Save form draft to localStorage
 * Called on field blur to auto-save user progress
 */
export function saveDraft(formState: ClientFormState): void {
	try {
		const serialized = JSON.stringify(formState, (_key, value) => {
			// Convert Date objects to ISO strings for storage
			if (value instanceof Date) {
				return { __type: "Date", value: value.toISOString() };
			}
			return value;
		});

		localStorage.setItem(STORAGE_KEY, serialized);
		localStorage.setItem(STORAGE_TIMESTAMP_KEY, new Date().toISOString());
	} catch (error) {
		console.error("Failed to save form draft:", error);
	}
}

/**
 * Load form draft from localStorage
 * Returns null if no draft exists or if draft is corrupted
 */
export function loadDraft(): ClientFormState | null {
	try {
		const serialized = localStorage.getItem(STORAGE_KEY);
		if (!serialized) {
			return null;
		}

		const parsed = JSON.parse(serialized, (_key, value) => {
			// Restore Date objects from ISO strings
			if (value && typeof value === "object" && value.__type === "Date") {
				return new Date(value.value);
			}
			return value;
		});

		return parsed as ClientFormState;
	} catch (error) {
		console.error("Failed to load form draft:", error);
		return null;
	}
}

/**
 * Get timestamp of when draft was last saved
 * Returns null if no draft exists
 */
export function getDraftTimestamp(): Date | null {
	try {
		const timestamp = localStorage.getItem(STORAGE_TIMESTAMP_KEY);
		return timestamp ? new Date(timestamp) : null;
	} catch (error) {
		console.error("Failed to get draft timestamp:", error);
		return null;
	}
}

/**
 * Clear form draft from localStorage
 * Called when form is successfully submitted or user cancels
 */
export function clearDraft(): void {
	try {
		localStorage.removeItem(STORAGE_KEY);
		localStorage.removeItem(STORAGE_TIMESTAMP_KEY);
	} catch (error) {
		console.error("Failed to clear form draft:", error);
	}
}

/**
 * Check if a draft exists
 */
export function hasDraft(): boolean {
	return localStorage.getItem(STORAGE_KEY) !== null;
}

/**
 * Format draft age for display
 * Example: "hace 5 minutos", "hace 2 horas", "hace 1 día"
 */
export function formatDraftAge(timestamp: Date): string {
	const now = new Date();
	const diffMs = now.getTime() - timestamp.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffMins < 1) {
		return "hace unos segundos";
	} else if (diffMins === 1) {
		return "hace 1 minuto";
	} else if (diffMins < 60) {
		return `hace ${diffMins} minutos`;
	} else if (diffHours === 1) {
		return "hace 1 hora";
	} else if (diffHours < 24) {
		return `hace ${diffHours} horas`;
	} else if (diffDays === 1) {
		return "hace 1 día";
	} else {
		return `hace ${diffDays} días`;
	}
}
