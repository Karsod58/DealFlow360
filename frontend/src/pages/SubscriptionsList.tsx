import { useState, useEffect } from 'react';
import { NavBar, InfoBanner } from '../components/shared';
// import { StatusFilterTabs } from '../components/approvals';
import { SubscriptionsTable } from '../components/subscriptions';

export function SubscriptionsList() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [activeStatus, setActiveStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscriptions();
  }, [activeStatus]);

  const loadSubscriptions = async () => {
    try {
      const token = localStorage.getItem('token');
      const statusParam = activeStatus === 'all' ? '' : `?status=${activeStatus}`;
      
      const response = await fetch(`http://localhost:8000/api/subscriptions${statusParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load subscriptions');
      }

      const data = await response.json();
      setSubscriptions(data);
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCounts = () => {
    return {
      active: subscriptions.filter(s => s.status === 'ACTIVE').length,
      paused: subscriptions.filter(s => s.status === 'PAUSED').length,
      cancelled: subscriptions.filter(s => s.status === 'CANCELLED').length,
    };
  };

  const counts = getCounts();

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

  return (
    <>
      <NavBar />
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-dark-text">Subscriptions (List)</h1>
          <p className="text-dark-muted mt-2">
            Every recurring plan across every customer, regardless of which order it came from
          </p>
        </div>

        {/* Status Filter Badges */}
        <div className="mb-6 flex gap-3">
          <button
            onClick={() => setActiveStatus('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeStatus === 'all'
                ? 'bg-primary text-white'
                : 'bg-dark-surface text-dark-muted hover:bg-dark-border'
            }`}
          >
            All ({subscriptions.length})
          </button>
          <button
            onClick={() => setActiveStatus('active')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeStatus === 'active'
                ? 'bg-success text-white'
                : 'bg-dark-surface text-dark-muted hover:bg-dark-border'
            }`}
          >
            {counts.active} Active
          </button>
          <button
            onClick={() => setActiveStatus('paused')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeStatus === 'paused'
                ? 'bg-warning text-white'
                : 'bg-dark-surface text-dark-muted hover:bg-dark-border'
            }`}
          >
            {counts.paused} Paused
          </button>
          <button
            onClick={() => setActiveStatus('cancelled')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeStatus === 'cancelled'
                ? 'bg-danger text-white'
                : 'bg-dark-surface text-dark-muted hover:bg-dark-border'
            }`}
          >
            {counts.cancelled} Cancelled
          </button>
        </div>

        {/* Subscriptions Table */}
        <div className="card mb-6">
          <SubscriptionsTable subscriptions={subscriptions} />
        </div>

        {/* Info Banner */}
        <InfoBanner>
          Click a subscription row to open its billing detail and proration history.
        </InfoBanner>

        {/* Bottom Action */}
        <div className="mt-6 flex justify-end">
          <button className="btn-secondary">
            + New Plan (Admin)
          </button>
        </div>
      </div>
    </>
  );
}
