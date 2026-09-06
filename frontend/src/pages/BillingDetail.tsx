import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NavBar } from '../components/shared';

export function BillingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [billingData, setBillingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [modifyForm, setModifyForm] = useState({
    plan_name: '',
    amount: 0,
    billing_cycle: 'MONTHLY',
  });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadBillingDetail(parseInt(id));
    }
  }, [id]);

  const loadBillingDetail = async (subscriptionId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:8000/api/subscriptions/${subscriptionId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load billing detail');
      }

      const data = await response.json();
      setBillingData(data);
      setModifyForm({
        plan_name: data.subscription.plan_name,
        amount: data.subscription.amount,
        billing_cycle: data.subscription.billing_cycle,
      });
    } catch (error) {
      console.error('Failed to load billing detail:', error);
      navigate('/subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const handleModifySubscription = async () => {
    if (!id) return;

    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:8000/api/subscriptions/${id}/modify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(modifyForm),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to modify subscription');
      }

      const result = await response.json();
      alert(result.message);
      setShowModifyModal(false);
      loadBillingDetail(parseInt(id));
    } catch (error: any) {
      alert(error.message || 'Failed to modify subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!id) return;

    if (!window.confirm('Are you sure you want to cancel this subscription? This action cannot be undone.')) {
      return;
    }

    const reason = prompt('Please provide a reason for cancellation (optional):');

    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:8000/api/subscriptions/${id}/cancel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ reason }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      const result = await response.json();
      alert(result.message);
      loadBillingDetail(parseInt(id));
    } catch (error: any) {
      alert(error.message || 'Failed to cancel subscription');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <NavBar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-dark-muted">Loading...</div>
        </div>
      </>
    );
  }

  if (!billingData) {
    return null;
  }

  const { subscription, quotation_number, one_time_lines, recurring_lines } = billingData;

  return (
    <>
      <NavBar />
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-dark-text">
            Billing Detail: {subscription.customer_name} – {subscription.plan_name}
          </h1>
          <p className="text-dark-muted mt-2">
            Opened by clicking a row on the Subscriptions list
          </p>
          {quotation_number && (
            <p className="text-dark-muted mt-1">
              Originated from quotation: <span className="text-primary">{quotation_number}</span>
            </p>
          )}
        </div>

        {/* One-Time Lines */}
        {one_time_lines.length > 0 && (
          <div className="card mb-6">
            <h2 className="text-xl font-semibold text-dark-text mb-4">
              One-Time Lines (from originating order)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">
                      Product
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-dark-muted">
                      Qty
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-dark-muted">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {one_time_lines.map((line: any, index: number) => (
                    <tr key={index} className="border-b border-dark-border">
                      <td className="py-3 px-4 text-dark-text">{line.product}</td>
                      <td className="py-3 px-4 text-right text-dark-muted">{line.quantity}</td>
                      <td className="py-3 px-4 text-right text-dark-text font-medium">
                        ${line.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recurring Lines */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold text-dark-text mb-4">
            Recurring Lines
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">
                    Plan
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">
                    Cycle
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">
                    Next Bill Date
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-dark-muted">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {recurring_lines.map((line: any, index: number) => (
                  <tr key={index} className="border-b border-dark-border">
                    <td className="py-3 px-4 text-dark-text">{line.plan}</td>
                    <td className="py-3 px-4 text-dark-muted">{line.cycle}</td>
                    <td className="py-3 px-4 text-dark-muted">
                      {line.next_bill_date
                        ? new Date(line.next_bill_date).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-right text-dark-text font-medium">
                      ${line.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modify Subscription Modal */}
        {showModifyModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-dark-surface border border-dark-border rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-dark-text mb-4">
                Modify Subscription
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-muted mb-1">
                    Plan Name
                  </label>
                  <input
                    type="text"
                    value={modifyForm.plan_name}
                    onChange={(e) => setModifyForm({ ...modifyForm, plan_name: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-muted mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={modifyForm.amount}
                    onChange={(e) => setModifyForm({ ...modifyForm, amount: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-muted mb-1">
                    Billing Cycle
                  </label>
                  <select
                    value={modifyForm.billing_cycle}
                    onChange={(e) => setModifyForm({ ...modifyForm, billing_cycle: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text"
                  >
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
              </div>

              <p className="text-sm text-dark-muted mt-4">
                Day-based proration will be calculated and shown before confirming.
              </p>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowModifyModal(false)}
                  className="btn-secondary flex-1"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleModifySubscription}
                  className="btn-primary flex-1"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <button
            onClick={() => setShowModifyModal(true)}
            className="btn-primary"
            disabled={actionLoading || subscription.status === 'CANCELLED'}
          >
            Modify Subscription
          </button>
          <button
            onClick={handleCancelSubscription}
            className="btn-danger"
            disabled={actionLoading || subscription.status === 'CANCELLED'}
          >
            Cancel Subscription
          </button>
        </div>
      </div>
    </>
  );
}
