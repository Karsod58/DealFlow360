import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CustomerPortalLayout } from '../layouts/CustomerPortalLayout';

interface LineItemNegotiation {
  line_item_id: number;
  product_name: string;
  current_discount: number;
  customer_comment: string;
  counter_discount: number | null;
  requested_delivery_date: string | null;
  rep_response: string | null;
}

export function CustomerPortal() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [quotation, setQuotation] = useState<any>(null);
  const [negotiations, setNegotiations] = useState<LineItemNegotiation[]>([]);
  const [status, setStatus] = useState<string>('');
  const [canEdit, setCanEdit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadPortalData(token);
    }
  }, [token]);

  const loadPortalData = async (magicToken: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/portal/negotiate/${magicToken}`);
      
      if (!response.ok) {
        throw new Error('Invalid or expired portal link');
      }

      const data = await response.json();

      // Check for stale session
      if (data.error === 'stale_session') {
        setError(data.message);
        setLoading(false);
        return;
      }

      setQuotation(data.quotation);
      setStatus(data.status);
      setCanEdit(data.can_edit);

      // Initialize negotiations from line items
      const lineItemNegs: LineItemNegotiation[] = data.line_items.map((item: any) => {
        const existingNeg = data.negotiations.find((n: any) => n.line_item_id === item.id);
        return {
          line_item_id: item.id,
          product_name: item.product_name,
          current_discount: item.discount,
          customer_comment: existingNeg?.customer_comment || '',
          counter_discount: existingNeg?.counter_discount || null,
          requested_delivery_date: existingNeg?.requested_delivery_date || null,
          rep_response: existingNeg?.rep_response || null,
        };
      });

      setNegotiations(lineItemNegs);
    } catch (err: any) {
      console.error('Failed to load portal data:', err);
      setError(err.message || 'Failed to load quotation');
    } finally {
      setLoading(false);
    }
  };

  const updateNegotiation = (index: number, field: string, value: any) => {
    const updated = [...negotiations];
    (updated[index] as any)[field] = value;
    setNegotiations(updated);
  };

  const handleSubmitRequest = async () => {
    if (!token) return;

    setSubmitting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/portal/negotiate/${token}/submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'submit_request',
            negotiations: negotiations.map(neg => ({
              line_item_id: neg.line_item_id,
              customer_comment: neg.customer_comment || null,
              counter_discount: neg.counter_discount,
              requested_delivery_date: neg.requested_delivery_date,
            })),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to submit request');
      }

      const result = await response.json();
      alert(result.message);

      if (result.requires_approval) {
        setCanEdit(false);
        setStatus('PENDING_APPROVAL');
      }
    } catch (err: any) {
      console.error('Submit request error:', err);
      alert(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmQuotation = async () => {
    if (!token) return;

    if (!window.confirm('Are you sure you want to confirm this quotation?')) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/portal/negotiate/${token}/submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'confirm_quotation',
            negotiations: [],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to confirm quotation');
      }

      const result = await response.json();
      alert(result.message);
      setCanEdit(false);
      setStatus('CONFIRMED');
    } catch (err: any) {
      alert(err.message || 'Failed to confirm quotation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <CustomerPortalLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-gray-300 text-lg animate-pulse">Loading your quotation...</div>
          </div>
        </div>
      </CustomerPortalLayout>
    );
  }

  if (error) {
    return (
      <CustomerPortalLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-8 max-w-md backdrop-blur-sm">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-white mb-4">Access Error</h2>
              <p className="text-gray-300 mb-6">{error}</p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      </CustomerPortalLayout>
    );
  }

  if (!quotation) {
    return null;
  }

  const getStatusBadge = () => {
    const statusMap: Record<string, { label: string; className: string }> = {
      SENT: { label: 'Sent to You', className: 'bg-blue-500/20 text-blue-300 border border-blue-500/50' },
      DRAFT: { label: 'In Preparation', className: 'bg-gray-500/20 text-gray-300 border border-gray-500/50' },
      UNDER_NEGOTIATION: { label: 'In Discussion', className: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50' },
      NEGOTIATION: { label: 'In Discussion', className: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50' },
      PENDING_APPROVAL: { label: 'Under Review', className: 'bg-orange-500/20 text-orange-300 border border-orange-500/50' },
      APPROVED: { label: 'Ready to Confirm', className: 'bg-green-500/20 text-green-300 border border-green-500/50' },
      CONFIRMED: { label: 'Confirmed', className: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50' },
    };

    const statusInfo = statusMap[status] || statusMap.SENT;
    return (
      <span className={`px-4 py-2 rounded-lg text-sm font-semibold ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  return (
    <CustomerPortalLayout>
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">;

        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-3">
            Your Quotation
          </h1>
          <p className="text-gray-300 text-lg">
            Review the details below and let us know if you have any questions or requests
          </p>
          <div className="mt-4 flex justify-center">
            {getStatusBadge()}
          </div>
        </div>

        {/* Quotation Summary Card */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <span>📋</span>
            Quotation {quotation.quotation_number}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="text-sm text-gray-400">Customer</div>
              <div className="text-lg font-semibold text-white">{quotation.customer_name}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-400">Total Value</div>
              <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                ${quotation.total_value.toLocaleString()}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-400">Price List</div>
              <div className="text-lg text-white">{quotation.price_list_id}</div>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <span>💬</span>
            Line Items & Your Comments
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300">Product</th>
                  <th className="text-right py-4 px-4 text-sm font-semibold text-gray-300">Current Discount</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300">Your Comment</th>
                  <th className="text-right py-4 px-4 text-sm font-semibold text-gray-300">Counter Offer %</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300">Our Response</th>
                </tr>
              </thead>
              <tbody>
                {negotiations.map((neg, index) => (
                  <tr key={neg.line_item_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 text-white font-medium">{neg.product_name}</td>
                    <td className="py-4 px-4 text-right">
                      <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-semibold">
                        {neg.current_discount.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <input
                        type="text"
                        value={neg.customer_comment}
                        onChange={(e) =>
                          updateNegotiation(index, 'customer_comment', e.target.value)
                        }
                        placeholder="e.g., Can we get 15% discount?"
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        disabled={!canEdit || submitting}
                      />
                    </td>
                    <td className="py-4 px-4">
                      <input
                        type="number"
                        step="0.1"
                        value={neg.counter_discount || ''}
                        onChange={(e) =>
                          updateNegotiation(
                            index,
                            'counter_discount',
                            e.target.value ? parseFloat(e.target.value) : null
                          )
                        }
                        placeholder="0.0"
                        className="w-28 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-right placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        disabled={!canEdit || submitting}
                      />
                    </td>
                    <td className="py-4 px-4">
                      {neg.rep_response ? (
                        <div className="px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg text-green-300 text-sm">
                          {neg.rep_response}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm italic">Awaiting response</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-5 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <span className="text-2xl">ℹ️</span>
            <div className="flex-1">
              <h3 className="text-white font-semibold mb-1">How It Works</h3>
              <p className="text-blue-200 text-sm">
                If your requested terms exceed our approval thresholds, your quote will automatically be sent for internal review. 
                We'll notify you as soon as we have an update!
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {canEdit && (
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <button
              onClick={handleSubmitRequest}
              className="px-8 py-4 rounded-xl font-semibold bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white transition-all duration-200 transform hover:scale-105 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              disabled={submitting}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Submitting...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>📤</span>
                  Submit Request for Changes
                </span>
              )}
            </button>
            <button
              onClick={handleConfirmQuotation}
              className="px-8 py-4 rounded-xl font-semibold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white transition-all duration-200 transform hover:scale-105 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              disabled={submitting || quotation.blended_score > 0}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Confirming...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>✅</span>
                  Accept & Confirm Quotation
                </span>
              )}
            </button>
          </div>
        )}

        {!canEdit && (
          <div className="text-center py-8">
            <div className="inline-block bg-gray-700/50 backdrop-blur-sm border border-gray-600 rounded-xl px-8 py-6">
              <div className="text-4xl mb-3">⏳</div>
              <p className="text-gray-300 text-lg font-medium">
                This quotation is currently being processed
              </p>
              <p className="text-gray-400 text-sm mt-2">
                You'll be notified once it's ready for review
              </p>
            </div>
          </div>
        )}
      </div>
    </CustomerPortalLayout>
  );
}
