import { useNavigate } from 'react-router-dom';

interface Invoice {
  id: number;
  invoice_number: string;
  customer_name: string;
  amount: number;
  status: string;
  due_date: string | null;
  is_recurring: number;
}

interface InvoicesTableProps {
  invoices: Invoice[];
}

export function InvoicesTable({ invoices }: InvoicesTableProps) {
  const navigate = useNavigate();

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, string> = {
      UNPAID: 'badge-danger',
      PAID: 'badge-success',
      PARTIALLY_PAID: 'badge-warning',
      OVERDUE: 'badge-danger',
    };
    return statusMap[status] || 'badge-info';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-dark-border">
            <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">
              Invoice #
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">
              Customer
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-dark-muted">
              Amount
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">
              Status
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">
              Due Date
            </th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr
              key={invoice.id}
              onClick={() => navigate(`/invoices/${invoice.id}`)}
              className="border-b border-dark-border hover:bg-dark-surface cursor-pointer transition-colors"
            >
              <td className="py-3 px-4 text-dark-text font-medium">
                {invoice.invoice_number}
                {invoice.is_recurring === 1 && (
                  <span className="ml-2 text-xs text-primary">(Recurring)</span>
                )}
              </td>
              <td className="py-3 px-4 text-dark-text">
                {invoice.customer_name}
              </td>
              <td className="py-3 px-4 text-right text-dark-text font-medium">
                ${invoice.amount.toLocaleString()}
              </td>
              <td className="py-3 px-4">
                <span className={getStatusBadge(invoice.status)}>
                  {invoice.status.replace('_', ' ')}
                </span>
              </td>
              <td className="py-3 px-4 text-dark-muted">
                {formatDate(invoice.due_date)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {invoices.length === 0 && (
        <div className="text-center py-8 text-dark-muted">
          No invoices found
        </div>
      )}
    </div>
  );
}
