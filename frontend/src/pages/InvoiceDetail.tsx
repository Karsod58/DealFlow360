import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NavBar, InfoBanner } from '../components/shared';
import { ApprovalStepper } from '../components/approvals';

export function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    payment_method: '',
  });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadInvoiceDetail(parseInt(id));
    }
  }, [id]);

  const loadInvoiceDetail = async (invoiceId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:8000/api/invoices/${invoiceId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load invoice detail');
      }

      const data = await response.json();
      setInvoiceData(data);
      setPaymentForm({
        amount: data.amount_remaining,
        payment_method: 'Credit Card',
      });
    } catch (error) {
      console.error('Failed to load invoice detail:', error);
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!id) return;

    if (paymentForm.amount <= 0) {
      alert('Payment amount must be greater than 0');
      return;
    }

    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:8000/api/invoices/${id}/record-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(paymentForm),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to record payment');
      }

      const result = await response.json();
      alert(result.message);
      setShowPaymentModal(false);
      loadInvoiceDetail(parseInt(id));
    } catch (error: any) {
      alert(error.message || 'Failed to record payment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownload = () => {
    alert('PDF generation coming soon');
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

  if (!invoiceData) {
    return null;
  }

  const { invoice, line_items, payments, total_paid, amount_remaining, progress_steps } = invoiceData;

  // Map progress steps to ApprovalStepper format
  const stepperSteps = [
    {
      approver_role: 'Order Confirmed',
      status: progress_steps.order_confirmed ? 'APPROVED' : 'PENDING',
      step_order: 1,
    },
    {
      approver_role: 'Shipped',
      status: progress_steps.shipped ? 'APPROVED' : 'PENDING',
      step_order: 2,
    },
    {
      approver_role: 'Invoiced',
      status: progress_steps.invoiced ? 'APPROVED' : 'PENDING',
      step_order: 3,
    },
    {
      approver_role: 'Paid',
      status: progress_steps.paid ? 'APPROVED' : 'PENDING',
      step_order: 4,
    },
  ];

  return (
    <>
      <NavBar />
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-dark-text">
            Invoice Detail: {invoice.invoice_number} ({invoice.customer_name})
          </h1>
          <div className="mt-4 flex gap-4 items-center">
            <span className={`badge-${invoice.status === 'PAID' ? 'success' : invoice.status === 'UNPAID' ? 'danger' : 'warning'}`}>
              {invoice.status.replace('_', ' ')}
            </span>
            {invoice.is_recurring === 1 && (
              <span className="badge-info">Recurring</span>
            )}
          </div>
        </div>

        {/* Progress Stepper */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold text-dark-text mb-6">
            Payment Progress
          </h2>
          <ApprovalStepper 
            steps={stepperSteps} 
            currentStatus={progress_steps.paid ? 'APPROVED' : 'PENDING_APPROVAL'} 
          />
        </div>

        {/* Invoice Lines Table */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold text-dark-text mb-4">
            Invoice Lines
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">
                    Product
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-dark-muted">
                    Quantity
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-dark-muted">
                    Unit Price
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-dark-muted">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {line_items.map((item: any) => (
                  <tr key={item.id} className="border-b border-dark-border">
                    <td className="py-3 px-4 text-dark-text">{item.product_name}</td>
                    <td className="py-3 px-4 text-right text-dark-muted">{item.quantity}</td>
                    <td className="py-3 px-4 text-right text-dark-muted">
                      ${item.unit_price.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-dark-text font-medium">
                      ${item.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-dark-border">
                  <td colSpan={3} className="py-3 px-4 text-right text-dark-text font-semibold">
                    Total:
                  </td>
                  <td className="py-3 px-4 text-right text-dark-text font-semibold">
                    ${invoice.amount.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payment Summary */}
          <div className="mt-4 p-4 bg-dark-bg rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-dark-muted">Total Amount:</span>
                <span className="text-dark-text ml-2 font-medium">
                  ${invoice.amount.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-dark-muted">Amount Paid:</span>
                <span className="text-success ml-2 font-medium">
                  ${total_paid.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-dark-muted">Amount Remaining:</span>
                <span className={`ml-2 font-medium ${amount_remaining > 0 ? 'text-danger' : 'text-success'}`}>
                  ${amount_remaining.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment History */}
        {payments.length > 0 && (
          <div className="card mb-6">
            <h2 className="text-xl font-semibold text-dark-text mb-4">
              Payment History
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">
                      Method
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-dark-muted">
                      Amount
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment: any) => (
                    <tr key={payment.id} className="border-b border-dark-border">
                      <td className="py-3 px-4 text-dark-text">
                        {new Date(payment.payment_date || payment.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-dark-muted">
                        {payment.payment_method || '—'}
                      </td>
                      <td className="py-3 px-4 text-right text-dark-text font-medium">
                        ${payment.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`badge-${payment.status === 'COMPLETED' ? 'success' : 'warning'}`}>
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Info Banner */}
        <InfoBanner>
          Partial invoicing stays reconciled with partial delivery, nothing is billed before it ships.
        </InfoBanner>

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-dark-surface border border-dark-border rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-dark-text mb-4">
                Record Payment
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-muted mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text"
                    max={amount_remaining}
                  />
                  <p className="text-xs text-dark-muted mt-1">
                    Maximum: ${amount_remaining.toFixed(2)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-muted mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text"
                  >
                    <option value="Credit Card">Credit Card</option>
                    <option value="Wire Transfer">Wire Transfer</option>
                    <option value="ACH">ACH</option>
                    <option value="Check">Check</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="btn-secondary flex-1"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRecordPayment}
                  className="btn-primary flex-1"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end mt-6">
          <button
            onClick={handleDownload}
            className="btn-secondary"
          >
            Download Summary
          </button>
          <button
            onClick={() => setShowPaymentModal(true)}
            className="btn-primary"
            disabled={amount_remaining <= 0}
          >
            Record Payment
          </button>
        </div>
      </div>
    </>
  );
}
