/**
 * Mock Client Data Utility
 * Provides sample client data for development until database tables are ready
 */

import { Client, Policy, ClientSearchResult } from "@/types/client";

/**
 * Generate mock policies
 */
function generateMockPolicies(clientId: string, count: number): Policy[] {
	const types = ["salud", "automotor", "vida", "general"] as const;
	const statuses = ["vigente", "vencida", "cancelada", "pendiente"] as const;

	const policies: Policy[] = [];

	for (let i = 0; i < count; i++) {
		const startDate = new Date();
		startDate.setMonth(startDate.getMonth() - Math.floor(Math.random() * 24));

		const expirationDate = new Date(startDate);
		expirationDate.setFullYear(expirationDate.getFullYear() + 1);

		policies.push({
			id: `${clientId}-POL${i + 1}`,
			policyNumber: `POL-${Math.floor(1000 + Math.random() * 9000)}`,
			insuranceType: types[Math.floor(Math.random() * types.length)],
			status: i === 0 ? "vigente" : statuses[Math.floor(Math.random() * statuses.length)],
			startDate,
			expirationDate,
			premium: Math.floor(500 + Math.random() * 4500),
			beneficiaryName: Math.random() > 0.5 ? `Beneficiario ${i + 1}` : undefined,
			coverageDetails: `Cobertura completa tipo ${i + 1}`,
		});
	}

	return policies;
}

/**
 * Generate mock client data (75 sample clients for pagination testing)
 */
export function generateMockClients(): Client[] {
	const firstNames = [
		"Juan",
		"María",
		"Carlos",
		"Ana",
		"Pedro",
		"Laura",
		"José",
		"Carmen",
		"Luis",
		"Isabel",
		"Roberto",
		"Sofía",
		"Diego",
		"Elena",
		"Miguel",
	];
	const lastNames = [
		"García",
		"Rodríguez",
		"Martínez",
		"López",
		"González",
		"Pérez",
		"Sánchez",
		"Ramírez",
		"Torres",
		"Flores",
		"Vargas",
		"Morales",
		"Ortiz",
		"Mendoza",
		"Silva",
	];
	const executives = [
		"Carmen Ferrufino Howard",
		"Flavio Colombo Vargas",
		"Maria Ercilia Vargas Becerra",
		"Eliana Ortiz Chávez",
		"Tamara Torrez Dencker",
		"Diego Gandarillas Ferrufino",
	];

	const clients: Client[] = [];
	const now = new Date();

	for (let i = 0; i < 75; i++) {
		const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
		const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
		const fullName = `${firstName} ${lastName}`;

		// Generate realistic Bolivian ID (Carnet)
		const departmentCode = Math.floor(1 + Math.random() * 9);
		const idNumber = `${departmentCode}${Math.floor(100000 + Math.random() * 900000)}`;

		// Generate NIT (some clients may not have it)
		const nit = Math.random() > 0.3 ? `${Math.floor(1000000 + Math.random() * 9000000)}` : undefined;

		const createdAt = new Date(now);
		createdAt.setDate(createdAt.getDate() - (75 - i)); // Last 75 days

		const client: Client = {
			id: `CLIENT-${String(i + 1).padStart(3, "0")}`,
			fullName,
			idNumber,
			nit,
			email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
			phone: `${Math.floor(60000000 + Math.random() * 19999999)}`,
			address: `Av. ${lastName} #${Math.floor(100 + Math.random() * 900)}`,
			executiveInCharge: executives[Math.floor(Math.random() * executives.length)],
			policies: generateMockPolicies(
				`CLIENT-${String(i + 1).padStart(3, "0")}`,
				Math.floor(1 + Math.random() * 4)
			),
			createdAt,
			updatedAt: createdAt,
			notes: Math.random() > 0.7 ? "Cliente preferencial" : undefined,
		};

		clients.push(client);
	}

	// Sort by most recent first
	return clients.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Search clients by query across multiple fields
 * Returns clients with matched fields highlighted
 */
export function searchClients(clients: Client[], query: string): ClientSearchResult[] {
	if (!query.trim()) {
		return clients.map((client) => ({
			...client,
			matchedFields: [],
			relevanceScore: 0,
		}));
	}

	const searchTerm = query.toLowerCase().trim();

	const results: ClientSearchResult[] = clients
		.map((client) => {
			const matchedFields: string[] = [];
			let relevanceScore = 0;

			// Search in client fields
			if (client.fullName.toLowerCase().includes(searchTerm)) {
				matchedFields.push("fullName");
				relevanceScore += 10;
			}

			if (client.idNumber.toLowerCase().includes(searchTerm)) {
				matchedFields.push("idNumber");
				relevanceScore += 10;
			}

			if (client.nit?.toLowerCase().includes(searchTerm)) {
				matchedFields.push("nit");
				relevanceScore += 10;
			}

			// Search in policies
			client.policies.forEach((policy) => {
				if (policy.policyNumber.toLowerCase().includes(searchTerm)) {
					matchedFields.push("policyNumber");
					relevanceScore += 8;
				}

				if (policy.beneficiaryName?.toLowerCase().includes(searchTerm)) {
					matchedFields.push("beneficiaryName");
					relevanceScore += 5;
				}
			});

			// Search in contact info (lower priority)
			if (client.email?.toLowerCase().includes(searchTerm)) {
				matchedFields.push("email");
				relevanceScore += 3;
			}

			if (client.phone?.includes(searchTerm)) {
				matchedFields.push("phone");
				relevanceScore += 3;
			}

			return {
				...client,
				matchedFields: [...new Set(matchedFields)], // Remove duplicates
				relevanceScore,
			};
		})
		.filter((result) => result.relevanceScore > 0)
		.sort((a, b) => b.relevanceScore - a.relevanceScore);

	return results;
}

/**
 * Get the last N clients added
 */
export function getRecentClients(clients: Client[], count: number = 20): Client[] {
	return clients.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, count);
}

/**
 * Count active (vigente) policies for a client
 */
export function getActivePolicyCount(client: Client): number {
	return client.policies.filter((policy) => policy.status === "vigente").length;
}
