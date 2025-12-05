// Policy status classification
export type PolicyStatus = 'active' | 'expired' | 'cancelled' | 'pending';

// Product/Insurance types
export type ProductType = 'Auto' | 'Vida' | 'Salud' | 'Hogar' | 'Comercio' | 'RC' | 'Otros';

// Individual payment within a policy
export interface Payment {
  id: string;
  paymentNumber: number;      // 1, 2, 3, etc.
  dueDate: Date;              // When payment is expected
  amount: number;             // Payment amount
  isPaid: boolean;            // Payment status
  paidDate?: Date;            // Actual date paid (if paid)
}

// Main policy data structure
export interface Policy {
  id: string;
  policyId: string;           // Policy number (e.g., "CASF-234568")
  productType: ProductType;   // Type of insurance product
  clientName: string;         // Client's full name
  clientId: string;           // Client's CI/ID number
  status: PolicyStatus;       // Current policy status
  startDate: Date;            // Policy start date
  expirationDate: Date;       // Policy expiration date
  totalPremium: number;       // Total policy premium
  payments: Payment[];        // Payment schedule
  notes?: string;             // Optional notes
  createdAt: Date;
  updatedAt: Date;
}

// Search result with relevance scoring
export interface PolicySearchResult extends Policy {
  matchedFields: string[];    // Fields that matched search
  relevanceScore: number;     // 0-1 score
}

// Helper type for payment statistics
export interface PaymentStats {
  totalPayments: number;
  paidPayments: number;
  pendingPayments: number;
  totalPaid: number;
  totalPending: number;
}
