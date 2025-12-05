import { Policy, Payment, ProductType, PolicyStatus, PolicySearchResult } from '@/types/policy';

// Sample client names for mock data
const clientNames = [
  'Juan Carlos Pérez',
  'María Elena Rodríguez',
  'Carlos Alberto Mendoza',
  'Ana Patricia López',
  'Roberto Carlos Sánchez',
  'Laura Gabriela Torres',
  'Diego Fernando Morales',
  'Claudia Patricia Gutiérrez',
  'José Luis Ramírez',
  'Sandra Milena Castro',
  'Miguel Ángel Vargas',
  'Patricia Isabel Rojas',
  'Fernando José Díaz',
  'Carmen Rosa Flores',
  'Andrés Felipe Herrera',
  'Mónica Andrea Silva',
  'Ricardo Javier Cruz',
  'Gabriela Victoria Reyes',
  'Hernán Eduardo Ortiz',
  'Valeria Sofía Moreno',
  'Luis Alberto Castillo',
  'Daniela Marcela Ruiz',
  'Jorge Esteban Vega',
  'Carolina Beatriz Romero',
  'Pablo Sebastián Medina',
  'Alejandra Isabel Paredes',
  'Gustavo Adolfo Navarro',
  'Beatriz Elena Suárez',
  'Francisco Javier Jiménez',
  'Natalia Andrea Gómez'
];

// Generate random CI/ID number
function generateClientId(): string {
  const number = Math.floor(Math.random() * 90000000) + 10000000;
  return number.toString();
}

// Generate random policy ID
function generatePolicyId(productType: ProductType, index: number): string {
  const prefix = productType.substring(0, 2).toUpperCase();
  const suffix = String(index + 234568).padStart(6, '0');
  return `${prefix}SF-${suffix}`;
}

// Generate payment schedule for a policy
function generatePayments(
  paymentCount: number,
  totalPremium: number,
  startDate: Date
): Payment[] {
  const payments: Payment[] = [];
  const monthlyAmount = totalPremium / paymentCount;

  for (let i = 0; i < paymentCount; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    // Randomly determine if payment is paid (higher probability for earlier payments)
    const isPaid = Math.random() < (1 - (i / paymentCount)) * 0.8;

    const payment: Payment = {
      id: `payment-${i + 1}`,
      paymentNumber: i + 1,
      dueDate,
      amount: Math.round(monthlyAmount * 100) / 100, // Round to 2 decimals
      isPaid,
      paidDate: isPaid ? new Date(dueDate.getTime() - Math.random() * 5 * 24 * 60 * 60 * 1000) : undefined
    };

    payments.push(payment);
  }

  return payments;
}

// Generate a single mock policy
function generateMockPolicy(index: number): Policy {
  const productTypes: ProductType[] = ['Auto', 'Vida', 'Salud', 'Hogar', 'Comercio', 'RC', 'Otros'];
  const productType = productTypes[Math.floor(Math.random() * productTypes.length)];

  const clientName = clientNames[index % clientNames.length];
  const clientId = generateClientId();
  const policyId = generatePolicyId(productType, index);

  // Random start date in the past year
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - Math.floor(Math.random() * 12));
  startDate.setDate(Math.floor(Math.random() * 28) + 1);

  // Expiration date 1 year from start
  const expirationDate = new Date(startDate);
  expirationDate.setFullYear(expirationDate.getFullYear() + 1);

  // Determine payment count (6, 12, or 24 months)
  const paymentCounts = [6, 12, 24];
  const paymentCount = paymentCounts[Math.floor(Math.random() * paymentCounts.length)];

  // Random premium amount
  const totalPremium = Math.floor(Math.random() * 10000) + 1000;

  // Generate payments
  const payments = generatePayments(paymentCount, totalPremium, startDate);

  // Determine status based on dates and payments
  let status: PolicyStatus;
  const now = new Date();
  if (expirationDate < now) {
    status = 'expired';
  } else if (Math.random() < 0.05) {
    status = 'cancelled';
  } else if (startDate > now) {
    status = 'pending';
  } else {
    status = 'active';
  }

  return {
    id: `policy-${index + 1}`,
    policyId,
    productType,
    clientName,
    clientId,
    status,
    startDate,
    expirationDate,
    totalPremium,
    payments,
    notes: Math.random() < 0.3 ? 'Póliza con descuento corporativo' : undefined,
    createdAt: startDate,
    updatedAt: new Date()
  };
}

// Generate array of mock policies
export function generateMockPolicies(count: number = 30): Policy[] {
  const policies: Policy[] = [];

  for (let i = 0; i < count; i++) {
    policies.push(generateMockPolicy(i));
  }

  return policies;
}

// Search policies across multiple fields
export function searchPolicies(policies: Policy[], query: string): PolicySearchResult[] {
  if (!query.trim()) {
    return [];
  }

  const lowerQuery = query.toLowerCase().trim();
  const results: PolicySearchResult[] = [];

  for (const policy of policies) {
    const matchedFields: string[] = [];
    let relevanceScore = 0;

    // Search in policy ID
    if (policy.policyId.toLowerCase().includes(lowerQuery)) {
      matchedFields.push('policyId');
      relevanceScore += 0.3;
    }

    // Search in client name
    if (policy.clientName.toLowerCase().includes(lowerQuery)) {
      matchedFields.push('clientName');
      relevanceScore += 0.4;
    }

    // Search in client ID
    if (policy.clientId.includes(lowerQuery)) {
      matchedFields.push('clientId');
      relevanceScore += 0.2;
    }

    // Search in product type
    if (policy.productType.toLowerCase().includes(lowerQuery)) {
      matchedFields.push('productType');
      relevanceScore += 0.1;
    }

    if (matchedFields.length > 0) {
      results.push({
        ...policy,
        matchedFields,
        relevanceScore
      });
    }
  }

  // Sort by relevance score (descending)
  results.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return results;
}

// Get payment statistics for a policy
export function getPaymentStats(policy: Policy) {
  const paidPayments = policy.payments.filter(p => p.isPaid).length;
  const totalPaid = policy.payments
    .filter(p => p.isPaid)
    .reduce((sum, p) => sum + p.amount, 0);

  return {
    totalPayments: policy.payments.length,
    paidPayments,
    pendingPayments: policy.payments.length - paidPayments,
    totalPaid: Math.round(totalPaid * 100) / 100,
    totalPending: Math.round((policy.totalPremium - totalPaid) * 100) / 100
  };
}
