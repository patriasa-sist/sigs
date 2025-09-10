// utils/executiveHelper.ts - Helper functions for executive information
import { excecutives } from "@/types/pdf";

export interface Executive {
	user: string;
	name: string;
	glyph: string;
	charge: string;
	telf: string;
	mail: string;
	signature: string;
}

/**
 * Find executive information based on name from letter data
 * @param executiveName - The executive name from the letter
 * @returns Executive information or null if not found
 */
export function findExecutiveByName(executiveName: string): Executive | null {
	if (!executiveName) return null;
	
	// Normalize the search name (remove extra spaces, convert to lowercase)
	const searchName = executiveName.trim().toLowerCase();
	
	// First try exact match with the 'user' field (short name)
	const exactUserMatch = excecutives.find(exec => 
		exec.user.toLowerCase() === searchName
	);
	if (exactUserMatch) return exactUserMatch;
	
	// Try exact match with full name
	const exactNameMatch = excecutives.find(exec => 
		exec.name.toLowerCase() === searchName
	);
	if (exactNameMatch) return exactNameMatch;
	
	// Try partial match with user field (for cases like "Tamara" matching "tamara")
	const partialUserMatch = excecutives.find(exec => 
		searchName.includes(exec.user.toLowerCase()) || exec.user.toLowerCase().includes(searchName)
	);
	if (partialUserMatch) return partialUserMatch;
	
	// Try partial match with full name (for cases where only first name or last name is provided)
	const partialNameMatch = excecutives.find(exec => {
		const execNameLower = exec.name.toLowerCase();
		const execNameParts = execNameLower.split(' ');
		
		// Check if search name contains any part of the executive's name
		return execNameParts.some(part => 
			part.length > 2 && (searchName.includes(part) || part.includes(searchName))
		);
	});
	
	return partialNameMatch || null;
}

/**
 * Get default executive information (fallback)
 * @returns Default executive (first in the list)
 */
export function getDefaultExecutive(): Executive {
	return excecutives[0]; // Returns Tamara as default
}

/**
 * Get all available executives
 * @returns Array of all executives
 */
export function getAllExecutives(): Executive[] {
	return excecutives;
}