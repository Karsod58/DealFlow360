import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar } from '../components/shared';
import { StatCard } from '../components/dashboard';

interface DealHealthItem {
  deal_id: number;
  quotation_number: string;
  customer_name: string;
  issue: string;
  flagged_date: string;
  action_taken: string | null;
  type: string;
}

export function DealHealthDashboard() {
  const navigate = useNavigate();
  const [dealHealth, setDealHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDealHealth();
  }, []);

  const loadDealHealth = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/dashboard/deal-health', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load deal health data');
      }

      const data = await response.json();
      setDealHealth(data);
    } catch (error) {
      console.error('Failed to load deal health:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEscalate = (dealId: number) => {
    alert(`Escalating deal ${dealId} to Manager...`);
    // In production, call API endpoint to escalate
  };

  const handleNudgeRep = (dealId: number) => {
    alert(`Sending nudge to sales rep for deal ${dealId}...`);
    // In production, call API endpoint to send nudge
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getIssueColor = (type: string) => {
    switch (type) {
      case 'stalled':
        return 'text-warning';
      case 'discount_anomaly':
        return 'text-danger';
      case 'delivery_slippage':
        return 'text-orange-400';
      default:
        return 'text-dark-muted';
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

  if (!dealHealth) {
    return (
      <>
        <NavBar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-danger">Failed to load deal health data</div>
        </div>
      </>
    );
  }

  const { stats, deals } = dealHealth;

  // Empty state check
  const hasIssues = deals.length > 0;

  return (
    <>
      <NavBar />
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">
            Deal Health and Anomaly Dashboard
          </h1>
          <p className="text-dark-muted mt-2">
            Real-time flags for stalled deals and unusual discount patterns
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Stalled Deals"
            value={stats.stalled_deals}
            subtitle={`${stats.stalled_deals} quotes flagged >3 days`}
            bgColor="bg-warning-bg"
            textColor="text-warning"
          />
          <StatCard
            title="Discount Anomalies"
            value={stats.discount_anomalies}
            subtitle={`${stats.discount_anomalies} above avg margin`}
            bgColor="bg-danger-bg"
            textColor="text-danger"
          />
          <StatCard
            title="Delivery Slippage"
            value={stats.delivery_slippage}
            subtitle={`${stats.delivery_slippage} promise dates at risk`}
            bgColor="bg-orange-900/20"
            textColor="text-orange-400"
          />
        </div>

        {/* Deals Table */}
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span>⚠️</span>
            Flagged Deals
          </h2>
          
          {hasIssues ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">
                      Deal
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">
                      Issue
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">
                      Flagged
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">
                      Action
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-dark-muted">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {deals.map((deal: DealHealthItem, index: number) => (
                    <tr
                      key={index}
                      className="border-b border-dark-border hover:bg-dark-surface cursor-pointer transition-colors"
                      onClick={() => navigate(`/quotations/${deal.deal_id}`)}
                    >
                      <td className="py-3 px-4">
                        <div>
                          <div className="text-dark-text font-medium">
                            {deal.quotation_number}
                          </div>
                          <div className="text-sm text-dark-muted">
                            {deal.customer_name}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-medium ${getIssueColor(deal.type)}`}>
                          {deal.issue}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-dark-muted text-sm">
                        {formatDate(deal.flagged_date)}
                      </td>
                      <td className="py-3 px-4">
                        {deal.action_taken ? (
                          <span className="badge-info">{deal.action_taken}</span>
                        ) : (
                          <span className="text-dark-muted">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleEscalate(deal.deal_id)}
                            className="text-sm px-3 py-1 rounded bg-danger hover:bg-red-600 text-white transition-colors"
                          >
                            Escalate
                          </button>
                          <button
                            onClick={() => handleNudgeRep(deal.deal_id)}
                            className="text-sm px-3 py-1 rounded bg-primary hover:bg-blue-600 text-white transition-colors"
                          >
                            Nudge Rep
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-success text-5xl mb-4">✓</div>
              <h3 className="text-xl font-semibold text-dark-text mb-2">
                No deals need attention right now
              </h3>
              <p className="text-dark-muted">
                All deals are progressing smoothly. Check back later for updates.
              </p>
            </div>
          )}
        </div>

        {/* Info Section */}
        {hasIssues && (
          <div className="mt-6 p-4 bg-blue-900/20 border border-primary rounded-lg">
            <h3 className="text-sm font-semibold text-blue-200 mb-2">Detection Rules:</h3>
            <ul className="text-sm text-blue-200 space-y-1">
              <li>• <strong>Stalled:</strong> No status change for ≥3 days</li>
              <li>• <strong>Anomaly:</strong> Discount {'>'} 2× rep's historical average</li>
              <li>• <strong>Slippage:</strong> Approved but not fulfilled within expected timeframe</li>
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
