import { useNavigate } from 'react-router-dom';

interface Subscription {
  id: number;
  customer_name: string;
  plan_name: string;
  billing_cycle: string;
  next_bill_date: string | null;
  status: string;
  amount: number;
}

interface SubscriptionsTableProps {
  subscriptions: Subscription[];
}

export function SubscriptionsTable({ subscriptions }: SubscriptionsTableProps) {
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
      ACTIVE: 'badge-success',
      PAUSED: 'badge-warning',
      CANCELLED: 'badge-danger',
    };
    return statusMap[status] || 'badge-info';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-dark-border">
            <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">
              Customer
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">
              Plan
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">
              Cycle
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">
              Next Bill
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">
              Status
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-dark-muted">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {subscriptions.map((subscription) => (
            <tr
              key={subscription.id}
              onClick={() => navigate(`/subscriptions/${subscription.id}`)}
              className="border-b border-dark-border hover:bg-dark-surface cursor-pointer transition-colors"
            >
              <td className="py-3 px-4 text-dark-text font-medium">
                {subscription.customer_name}
              </td>
              <td className="py-3 px-4 text-dark-text">
                {subscription.plan_name}
              </td>
              <td className="py-3 px-4 text-dark-muted">
                {subscription.billing_cycle}
              </td>
              <td className="py-3 px-4 text-dark-muted">
                {formatDate(subscription.next_bill_date)}
              </td>
              <td className="py-3 px-4">
                <span className={getStatusBadge(subscription.status)}>
                  {subscription.status}
                </span>
              </td>
              <td className="py-3 px-4 text-right text-dark-text font-medium">
                ${subscription.amount.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {subscriptions.length === 0 && (
        <div className="text-center py-8 text-dark-muted">
          No subscriptions found
        </div>
      )}
    </div>
  );
}
