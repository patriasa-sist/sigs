// utils/letterReferences.ts - Letter reference number generation and management

import { createClient } from "@/utils/supabase/client";
import { getCurrentUser } from "@/utils/auth/getCurrentUser";
import { findExecutiveByName, getDefaultExecutive } from "@/utils/executiveHelper";
import { excecutives } from "@/types/pdf";

export interface LetterReference {
	id: string;
	executive_glyph: string;
	year: number;
	month: number;
	current_number: number;
	created_at: string;
	updated_at: string;
}

/**
 * Generate a unique letter reference number for the current executive
 * Format: SCPSA-[executive_glyph]-[sequential_number]/[year]-[month]
 * Example: SCPSA-TTD-00001/2025-09
 */
export async function generateLetterReference(): Promise<string> {
	try {
		const supabase = createClient();

		// Get current user and their executive information
		const user = await getCurrentUser();
		if (!user) {
			throw new Error("User not authenticated");
		}

		// Find executive by user email or use default (Tamara)
		// For now, we'll determine the executive based on email domain or use default
		let executive = getDefaultExecutive(); // Default to admin account

		// Try to match executive by full email first, then by email prefix
		if (user.email) {
			const emailLower = user.email.toLowerCase();
			const foundByEmail = excecutives.find((exec) => exec.mail.toLowerCase() === emailLower);
			if (foundByEmail) {
				executive = foundByEmail;
			} else {
				// Fallback to email prefix matching
				const emailPrefix = user.email.split("@")[0]?.toLowerCase();
				if (emailPrefix) {
					const foundExecutive = findExecutiveByName(emailPrefix);
					if (foundExecutive) {
						executive = foundExecutive;
					}
				}
			}
		}

		const now = new Date();
		const year = now.getFullYear();
		const month = now.getMonth() + 1; // JavaScript months are 0-indexed, we need 1-12

		// Try to get or create the letter reference record for this executive/month/year
		const { data: existingRef, error: selectError } = await supabase
			.from("letter_references")
			.select("*")
			.eq("executive_glyph", executive.glyph)
			.eq("year", year)
			.eq("month", month)
			.single();

		if (selectError && selectError.code !== "PGRST116") {
			// PGRST116 = no rows found
			throw new Error(`Failed to fetch letter reference: ${selectError.message}`);
		}

		let sequentialNumber: number;

		if (existingRef) {
			// Update existing record to increment the counter
			sequentialNumber = existingRef.current_number + 1;

			if (sequentialNumber > 99999) {
				throw new Error(
					`Maximum letter count (99999) reached for ${executive.glyph} in ${year}-${month
						.toString()
						.padStart(2, "0")}`
				);
			}

			const { error: updateError } = await supabase
				.from("letter_references")
				.update({ current_number: sequentialNumber })
				.eq("id", existingRef.id);

			if (updateError) {
				throw new Error(`Failed to update letter reference: ${updateError.message}`);
			}
		} else {
			// Create new record for this executive/month/year
			sequentialNumber = 1;

			const { error: insertError } = await supabase.from("letter_references").insert({
				executive_glyph: executive.glyph,
				year,
				month,
				current_number: sequentialNumber,
			});

			if (insertError) {
				throw new Error(`Failed to create letter reference: ${insertError.message}`);
			}
		}

		// Format the reference number: SCPSA-[glyph]-[#####]/[year]-[month]
		const paddedNumber = sequentialNumber.toString().padStart(5, "0");
		const paddedMonth = month.toString().padStart(2, "0");
		const referenceNumber = `SCPSA-${executive.glyph}-${paddedNumber}/${year}-${paddedMonth}`;

		return referenceNumber;
	} catch (error) {
		console.error("Error generating letter reference:", error);

		// Fallback to a timestamp-based reference if database fails
		const now = new Date();
		const year = now.getFullYear();
		const month = (now.getMonth() + 1).toString().padStart(2, "0");
		const timestamp = now.getTime().toString().slice(-5); // Last 5 digits of timestamp

		return `SCPSA-ERR-${timestamp}/${year}-${month}`;
	}
}

/**
 * Get current letter count for an executive in the current month
 */
export async function getCurrentLetterCount(executiveGlyph: string): Promise<number> {
	try {
		const supabase = createClient();
		const now = new Date();
		const year = now.getFullYear();
		const month = now.getMonth() + 1;

		const { data, error } = await supabase
			.from("letter_references")
			.select("current_number")
			.eq("executive_glyph", executiveGlyph)
			.eq("year", year)
			.eq("month", month)
			.single();

		if (error && error.code !== "PGRST116") {
			throw new Error(`Failed to fetch current count: ${error.message}`);
		}

		return data?.current_number || 0;
	} catch (error) {
		console.error("Error fetching current letter count:", error);
		return 0;
	}
}

/**
 * Get letter reference history for an executive
 */
export async function getLetterReferenceHistory(executiveGlyph: string, limit = 10): Promise<LetterReference[]> {
	try {
		const supabase = createClient();

		const { data, error } = await supabase
			.from("letter_references")
			.select("*")
			.eq("executive_glyph", executiveGlyph)
			.order("year", { ascending: false })
			.order("month", { ascending: false })
			.limit(limit);

		if (error) {
			throw new Error(`Failed to fetch letter history: ${error.message}`);
		}

		return data || [];
	} catch (error) {
		console.error("Error fetching letter reference history:", error);
		return [];
	}
}
