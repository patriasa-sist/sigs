/**
 * Client Module Type Definitions
 * Defines data structures for client and policy management
 */

// Policy status types
export type PolicyStatus = 'vigente' | 'vencida' | 'cancelada' | 'pendiente';

// Insurance type
export type InsuranceType = 'salud' | 'automotor' | 'vida' | 'general';

/**
 * Policy associated with a client
 */
export interface Policy {
  id: string;
  policyNumber: string;
  insuranceType: InsuranceType;
  status: PolicyStatus;
  startDate: Date;
  expirationDate: Date;
  premium: number;
  beneficiaryName?: string;
  coverageDetails?: string;
  notes?: string;
}

/**
 * Client record with all searchable fields
 */
export interface Client {
  id: string;
  // Personal Information
  fullName: string;
  idNumber: string; // Carnet/ID
  nit?: string; // Tax identification number

  // Contact Information
  email?: string;
  phone?: string;
  address?: string;

  // Vehicle Information (for automotive policies)
  carMatricula?: string; // License plate
  carBrand?: string;
  carModel?: string;
  carYear?: number;

  // Associated Policies
  policies: Policy[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
}

/**
 * Search criteria for client filtering
 */
export interface ClientSearchParams {
  query: string; // Multi-field search query
  insuranceType?: InsuranceType;
  policyStatus?: PolicyStatus;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Client with computed search relevance
 */
export interface ClientSearchResult extends Client {
  matchedFields: string[]; // Fields that matched the search
  relevanceScore: number; // Search relevance (0-1)
}
