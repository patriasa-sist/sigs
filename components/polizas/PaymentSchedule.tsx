import { Payment } from '@/types/policy';
import { CheckCircle2, Circle } from 'lucide-react';

interface PaymentScheduleProps {
  payments: Payment[];
  showSummary?: boolean;
}

export function PaymentSchedule({ payments, showSummary = true }: PaymentScheduleProps) {
  // Calculate summary statistics
  const paidPayments = payments.filter(p => p.isPaid);
  const totalPaid = paidPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalPending = totalAmount - totalPaid;

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

  return (
    <div className="space-y-4">
      {/* Payment List */}
      <div className="space-y-2">
        {payments.map((payment) => (
          <div
            key={payment.id}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              payment.isPaid
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Payment Status Icon */}
              {payment.isPaid ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-gray-400 flex-shrink-0" />
              )}

              {/* Payment Number and Date */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                <span className="text-sm font-medium text-gray-700">
                  Pago {payment.paymentNumber}/{payments.length}
                </span>
                <span className="text-sm text-gray-600">
                  {formatDate(payment.dueDate)}
                </span>
              </div>
            </div>

            {/* Payment Amount */}
            <div className="text-right">
              <div className="text-sm font-semibold text-gray-900">
                {formatCurrency(payment.amount)}
              </div>
              {payment.isPaid && payment.paidDate && (
                <div className="text-xs text-green-600">
                  Pagado: {formatDate(payment.paidDate)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      {showSummary && (
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total Pagado:</span>
            <span className="font-semibold text-green-600">
              {formatCurrency(totalPaid)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Pendiente:</span>
            <span className="font-semibold text-orange-600">
              {formatCurrency(totalPending)}
            </span>
          </div>
          <div className="flex justify-between text-sm border-t pt-2">
            <span className="font-semibold text-gray-900">Total:</span>
            <span className="font-bold text-gray-900">
              {formatCurrency(totalAmount)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Pagos Realizados:</span>
            <span className="font-medium text-gray-900">
              {paidPayments.length} de {payments.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
