import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar, CustomerSelector } from '../components/shared';
import { StatCard, ActivityFeedItem } from '../components/dashboard';
import { dashboardApi } from '../services/api';
import type { DashboardStats, ActivityItem } from '../types';
import { useRealtimeUpdates } from '../contexts/WebSocketContext';
import { useAuth } from '../contexts/AuthContext';

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    pending_approvals: 0,
    open_quotations: 0,
    at_risk_deals: 0,
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingQuotation, setCreatingQuotation] = useState(false);
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);

  // Only REP and ADMIN can create quotations
  const canCreateQuotation = user && ['REP', 'ADMIN'].includes(user.role);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Real-time updates for quotations
  useRealtimeUpdates('quotation_update', (data) => {
    console.log('📊 Quotation update received:', data);
    // Refresh stats when quotations change
    loadDashboardData();
  });

  // Real-time updates for approvals
  useRealtimeUpdates('approval_update', (data) => {
    console.log('✅ Approval update received:', data);
    // Refresh stats when approvals change
    loadDashboardData();
  });

  const loadDashboardData = async () => {
    try {
      setError(null);
      const [statsData, activityData] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getRecentActivity(),
      ]);
      setStats(statsData);
      setRecentActivity(activityData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewQuotation = async (customerId: number) => {
    setCreatingQuotation(true);
    setShowCustomerSelector(false);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/quotations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_id: customerId,
          price_list_id: 'default',
        }),
      });

      if (response.ok) {
        const newQuotation = await response.json();
        navigate(`/quotations/${newQuotation.id}`);
      } else {
        const error = await response.json();
        alert(`Failed to create quotation: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to create quotation:', error);
      alert('Failed to create quotation. Please try again.');
    } finally {
      setCreatingQuotation(false);
    }
  };

  if (loading) {
    return (
      <>
        <NavBar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <div className="text-dark-muted animate-pulse-slow">Loading dashboard...</div>
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <NavBar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="text-danger text-5xl">⚠️</div>
            <h2 className="text-2xl font-bold text-dark-text">Unable to Load Dashboard</h2>
            <p className="text-dark-muted text-center max-w-md">{error}</p>
            <button onClick={loadDashboardData} className="btn-primary mt-4">
              Try Again
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <NavBar />
      <div className="container mx-auto px-4 py-8">
        {/* Page Header with fade-in animation */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">
            Sales Dashboard / Home
          </h1>
          <p className="text-dark-muted mt-2">
            Central hub, links out to every module below
          </p>
        </div>

        {/* Stat Cards with staggered animation */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <StatCard
              title="Pending Approvals"
              value={`${stats.pending_approvals} quotations waiting`}
              onClick={() => navigate('/approvals')}
            />
          </div>
          <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <StatCard
              title="Open Quotations"
              value={`${stats.open_quotations} active deals`}
              onClick={() => navigate('/quotations')}
            />
          </div>
          <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <StatCard
              title="At-Risk Deals"
              value={`${stats.at_risk_deals} flagged by Deal Health`}
              onClick={() => navigate('/deal-health')}
            />
          </div>
        </div>

        {/* Action Buttons with slide animation - Only for REP and ADMIN */}
        {canCreateQuotation && (
          <div className="flex gap-4 mb-8 animate-slide-in-right">
            <button 
              onClick={() => setShowCustomerSelector(true)} 
              className="btn-primary"
              disabled={creatingQuotation}
            >
              {creatingQuotation ? (
                <span className="flex items-center">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                  Creating...
                </span>
              ) : (
                '+ New Quotation'
              )}
            </button>
            <button onClick={() => navigate('/approvals')} className="btn-secondary">
              View Approvals
            </button>
          </div>
        )}

        {/* Customer Selector Modal - Only for REP and ADMIN */}
        {canCreateQuotation && showCustomerSelector && (
          <CustomerSelector
            onSelect={handleNewQuotation}
            onCancel={() => setShowCustomerSelector(false)}
          />
        )}

        {/* Recent Activity Feed with fade animation */}
        <div className="card animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <h2 className="text-xl font-semibold text-dark-text mb-4">Recent Activity</h2>
          <div>
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div 
                  key={activity.id} 
                  className="animate-fade-in"
                  style={{ animationDelay: `${0.5 + index * 0.1}s` }}
                >
                  <ActivityFeedItem activity={activity} />
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <p className="text-dark-muted text-center">
                  No recent activity to display
                </p>
                <p className="text-dark-muted text-sm text-center mt-2">
                  Activity will appear here as you work with quotations
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
