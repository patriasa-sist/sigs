import { Policy, PolicySearchResult } from '@/types/policy';
import { getPaymentStats } from '@/utils/mockPolicies';
import { FileText, User, CreditCard, Calendar, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { PaymentSchedule } from './PaymentSchedule';

interface PolicyCardProps {
  policy: Policy | PolicySearchResult;
}

export function PolicyCard({ policy }: PolicyCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isSearchResult = 'matchedFields' in policy;
  const paymentStats = getPaymentStats(policy);

  // Status color mapping
  const statusColors = {
    active: 'bg-green-100 text-green-800 border-green-200',
    expired: 'bg-red-100 text-red-800 border-red-200',
    cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  };

  // Status labels
  const statusLabels = {
    active: 'Vigente',
    expired: 'Vencida',
    cancelled: 'Cancelada',
    pending: 'Pendiente'
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: 'BOB',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-BO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(date));
  };

  // Check if field is highlighted
  const isHighlighted = (field: string) => {
    return isSearchResult && policy.matchedFields.includes(field);
  };

  return (
    <div
      className={`bg-white rounded-lg border p-5 hover:shadow-lg transition-shadow ${
        isSearchResult ? 'ring-2 ring-primary/20' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-gray-500" />
            <h3
              className={`text-lg font-semibold ${
                isHighlighted('policyId') ? 'bg-yellow-200' : ''
              }`}
            >
              {policy.policyId}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-medium ${
                isHighlighted('productType') ? 'bg-yellow-200' : 'text-gray-600'
              }`}
            >
              {policy.productType}
            </span>
          </div>
        </div>
        <div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
              statusColors[policy.status]
            }`}
          >
            {statusLabels[policy.status]}
          </span>
        </div>
      </div>

      {/* Client Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-gray-400" />
          <span
            className={`text-sm ${
              isHighlighted('clientName') ? 'bg-yellow-200 font-semibold' : 'text-gray-700'
            }`}
          >
            {policy.clientName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-gray-400" />
          <span
            className={`text-sm ${
              isHighlighted('clientId') ? 'bg-yellow-200 font-semibold' : 'text-gray-600'
            }`}
          >
            CI: {policy.clientId}
          </span>
        </div>
      </div>

      {/* Policy Details */}
      <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b">
        <div>
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
            <Calendar className="h-3 w-3" />
            Inicio
          </div>
          <div className="text-sm font-medium">{formatDate(policy.startDate)}</div>
        </div>
        <div>
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
            <Calendar className="h-3 w-3" />
            Vencimiento
          </div>
          <div className="text-sm font-medium">{formatDate(policy.expirationDate)}</div>
        </div>
        <div>
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
            <DollarSign className="h-3 w-3" />
            Prima Total
          </div>
          <div className="text-sm font-semibold text-green-600">
            {formatCurrency(policy.totalPremium)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Pagos</div>
          <div className="text-sm font-semibold">
            <span className="text-green-600">{paymentStats.paidPayments}</span>
            <span className="text-gray-400">/</span>
            <span className="text-gray-700">{paymentStats.totalPayments}</span>
          </div>
        </div>
      </div>

      {/* Payment Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Progreso de Pagos</span>
          <span>
            {Math.round((paymentStats.paidPayments / paymentStats.totalPayments) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{
              width: `${(paymentStats.paidPayments / paymentStats.totalPayments) * 100}%`
            }}
          />
        </div>
      </div>

      {/* Expandable Payment Schedule */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <span className="text-sm font-medium text-gray-700">
          Ver Cronograma de Pagos
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <PaymentSchedule payments={policy.payments} />
        </div>
      )}
    </div>
  );
}
