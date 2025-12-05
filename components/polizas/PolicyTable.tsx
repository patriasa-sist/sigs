import { Policy, PolicySearchResult } from '@/types/policy';
import { getPaymentStats } from '@/utils/mockPolicies';
import { ChevronRight, FileX } from 'lucide-react';

interface PolicyTableProps {
  policies: (Policy | PolicySearchResult)[];
  onPolicyClick?: (policy: Policy | PolicySearchResult) => void;
}

export function PolicyTable({ policies, onPolicyClick }: PolicyTableProps) {
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

  // Check if field is highlighted
  const isHighlighted = (policy: Policy | PolicySearchResult, field: string) => {
    return 'matchedFields' in policy && policy.matchedFields.includes(field);
  };

  if (policies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <FileX className="h-16 w-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          No se encontraron pólizas
        </h3>
        <p className="text-sm text-gray-500 text-center max-w-md">
          No hay pólizas que coincidan con tu búsqueda. Intenta con otros términos o
          limpia los filtros.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Nº Póliza
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Producto
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Cliente
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              CI
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Total Pagos
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Pagos Realizados
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Estado
            </th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {policies.map((policy) => {
            const paymentStats = getPaymentStats(policy);
            const paymentPercentage = Math.round(
              (paymentStats.paidPayments / paymentStats.totalPayments) * 100
            );

            return (
              <tr
                key={policy.id}
                onClick={() => onPolicyClick?.(policy)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                {/* Policy ID */}
                <td className="px-4 py-4">
                  <span
                    className={`text-sm font-medium text-gray-900 ${
                      isHighlighted(policy, 'policyId') ? 'bg-yellow-200' : ''
                    }`}
                  >
                    {policy.policyId}
                  </span>
                </td>

                {/* Product Type */}
                <td className="px-4 py-4">
                  <span
                    className={`text-sm text-gray-700 ${
                      isHighlighted(policy, 'productType') ? 'bg-yellow-200' : ''
                    }`}
                  >
                    {policy.productType}
                  </span>
                </td>

                {/* Client Name */}
                <td className="px-4 py-4">
                  <span
                    className={`text-sm text-gray-900 ${
                      isHighlighted(policy, 'clientName') ? 'bg-yellow-200' : ''
                    }`}
                  >
                    {policy.clientName}
                  </span>
                </td>

                {/* Client ID */}
                <td className="px-4 py-4">
                  <span
                    className={`text-sm text-gray-600 ${
                      isHighlighted(policy, 'clientId') ? 'bg-yellow-200' : ''
                    }`}
                  >
                    {policy.clientId}
                  </span>
                </td>

                {/* Total Payments */}
                <td className="px-4 py-4">
                  <span className="text-sm text-gray-700">
                    {paymentStats.totalPayments} pagos
                  </span>
                </td>

                {/* Paid Payments with Progress */}
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {paymentStats.paidPayments}/{paymentStats.totalPayments}
                    </span>
                    <div className="flex-1 min-w-[60px]">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            paymentPercentage === 100
                              ? 'bg-green-500'
                              : paymentPercentage >= 50
                              ? 'bg-blue-500'
                              : 'bg-orange-500'
                          }`}
                          style={{ width: `${paymentPercentage}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 min-w-[35px]">
                      {paymentPercentage}%
                    </span>
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      statusColors[policy.status]
                    }`}
                  >
                    {statusLabels[policy.status]}
                  </span>
                </td>

                {/* Chevron */}
                <td className="px-4 py-4">
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
