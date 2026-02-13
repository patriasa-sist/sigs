/**
 * Poliza Form Draft Storage Utility
 * Manages form state persistence in browser localStorage (no DB usage)
 * Documents with File objects are excluded (not serializable) - only metadata is saved
 */

import type { PolizaFormState } from "@/types/poliza";
import { formatDraftAge } from "@/utils/clientFormStorage";

const STORAGE_KEY = "poliza-form-draft";
const STORAGE_TIMESTAMP_KEY = "poliza-form-draft-timestamp";

// Re-export for convenience
export { formatDraftAge };

/**
 * Save poliza form draft to localStorage
 * Filters out File objects from documentos (not serializable)
 */
export function savePolizaDraft(formState: PolizaFormState): void {
	try {
		// Strip File objects from documentos before serializing
		const stateToSave = {
			...formState,
			documentos: formState.documentos.map(({ file, ...rest }) => rest),
		};

		const serialized = JSON.stringify(stateToSave, (_key, value) => {
			if (value instanceof Date) {
				return { __type: "Date", value: value.toISOString() };
			}
			return value;
		});

		localStorage.setItem(STORAGE_KEY, serialized);
		localStorage.setItem(STORAGE_TIMESTAMP_KEY, new Date().toISOString());
	} catch (error) {
		console.error("Failed to save poliza form draft:", error);
	}
}

/**
 * Load poliza form draft from localStorage
 * Returns null if no draft exists or if draft is corrupted
 */
export function loadPolizaDraft(): PolizaFormState | null {
	try {
		const serialized = localStorage.getItem(STORAGE_KEY);
		if (!serialized) {
			return null;
		}

		const parsed = JSON.parse(serialized, (_key, value) => {
			if (value && typeof value === "object" && value.__type === "Date") {
				return new Date(value.value);
			}
			return value;
		});

		return parsed as PolizaFormState;
	} catch (error) {
		console.error("Failed to load poliza form draft:", error);
		return null;
	}
}

/**
 * Get timestamp of when draft was last saved
 */
export function getPolizaDraftTimestamp(): Date | null {
	try {
		const timestamp = localStorage.getItem(STORAGE_TIMESTAMP_KEY);
		return timestamp ? new Date(timestamp) : null;
	} catch (error) {
		console.error("Failed to get poliza draft timestamp:", error);
		return null;
	}
}

/**
 * Clear poliza form draft from localStorage
 */
export function clearPolizaDraft(): void {
	try {
		localStorage.removeItem(STORAGE_KEY);
		localStorage.removeItem(STORAGE_TIMESTAMP_KEY);
	} catch (error) {
		console.error("Failed to clear poliza form draft:", error);
	}
}

/**
 * Check if a poliza draft exists
 */
export function hasPolizaDraft(): boolean {
	return localStorage.getItem(STORAGE_KEY) !== null;
}
