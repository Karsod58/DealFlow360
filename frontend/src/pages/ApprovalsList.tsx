import { useState, useEffect } from 'react';
import { NavBar, InfoBanner } from '../components/shared';
import { StatusFilterTabs, ApprovalsTable } from '../components/approvals';
import { approvalsApi } from '../services/api';
import { useRealtimeUpdates } from '../contexts/WebSocketContext';

export function ApprovalsList() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [activeStatus, setActiveStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApprovals();
  }, [activeStatus]);

  // Real-time updates via WebSocket
  useRealtimeUpdates('approval_update', () => {
    loadApprovals();
  });

  useRealtimeUpdates('quotation_update', () => {
    loadApprovals();
  });

  const loadApprovals = async () => {
    try {
      const statusFilter = activeStatus === 'all' ? undefined : activeStatus;
      const data = await approvalsApi.getAll(statusFilter);
      setApprovals(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load approvals:', error);
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  };

  const getCounts = () => {
    return {
      pending: approvals.filter(a => a.status === 'PENDING_APPROVAL').length,
      returned: approvals.filter(a => a.status === 'DRAFT').length,
      approved: approvals.filter(a => a.status === 'APPROVED').length,
    };
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

  return (
    <>
      <NavBar />
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-dark-text">Approvals (List)</h1>
          <p className="text-dark-muted mt-2">
            Every quotation that needed a discount review, so it's going through discount approval
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="mb-6">
          <StatusFilterTabs
            activeStatus={activeStatus}
            onStatusChange={setActiveStatus}
            counts={getCounts()}
          />
        </div>

        {/* Approvals Table */}
        <div className="card mb-6">
          <ApprovalsTable approvals={approvals} />
        </div>

        {/* Info Banner */}
        <InfoBanner>
          Click any row to see full approval risk breakdown and audit trail.
        </InfoBanner>
      </div>
    </>
  );
}
