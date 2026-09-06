import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NavBar } from '../components/shared';
import {
  RiskBadge,
  RiskFlagTable,
  ApprovalStepper,
  AuditTrailTable,
} from '../components/approvals';
import { approvalsApi } from '../services/api';

export function ApprovalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [approvalDetail, setApprovalDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState('');
  const [pendingAction, setPendingAction] = useState<'approve' | 'reject' | 'return' | null>(null);

  useEffect(() => {
    if (id) {
      loadApprovalDetail(parseInt(id));
    }
  }, [id]);

  const loadApprovalDetail = async (quotationId: number) => {
    try {
      const data = await approvalsApi.getDetail(quotationId);
      setApprovalDetail(data);
    } catch (error) {
      console.error('Failed to load approval detail:', error);
      navigate('/approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action: 'approve' | 'reject' | 'return') => {
    setPendingAction(action);
    setShowNoteInput(true);
  };

  const confirmAction = async () => {
    if (!id || !pendingAction) return;

    setActionLoading(true);
    try {
      const quotationId = parseInt(id);

      if (pendingAction === 'approve') {
        await approvalsApi.approve(quotationId, note);
        alert('Quotation approved successfully!');
      } else if (pendingAction === 'reject') {
        await approvalsApi.reject(quotationId, note);
        alert('Quotation rejected.');
      } else if (pendingAction === 'return') {
        await approvalsApi.returnForRevision(quotationId, note);
        alert('Quotation returned for revision.');
      }

      navigate('/approvals');
    } catch (error) {
      console.error(`Failed to ${pendingAction} quotation:`, error);
      alert(`Failed to ${pendingAction} quotation`);
    } finally {
      setActionLoading(false);
      setShowNoteInput(false);
      setNote('');
      setPendingAction(null);
    }
  };

  const cancelAction = () => {
    setShowNoteInput(false);
    setNote('');
    setPendingAction(null);
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

  if (!approvalDetail) {
    return null;
  }

  const { quotation, approval_steps, audit_logs, risk_level, customer_tier } = approvalDetail;

  return (
    <>
      <NavBar />
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-dark-text">
            Approval Detail: {quotation.quotation_number} ({quotation.customer_name})
          </h1>
          <div className="flex gap-4 mt-4">
            <RiskBadge level={risk_level} score={quotation.blended_score} />
            <span className="badge-info">Customer Tier: {customer_tier}</span>
          </div>
        </div>

        {/* Why This Quote Was Flagged */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold text-dark-text mb-4">
            Why This Quote Was Flagged
          </h2>
          <RiskFlagTable lineItems={quotation.line_items} />
          <div className="mt-4 p-3 bg-warning-bg border border-warning rounded-lg">
            <p className="text-sm text-yellow-200">
              Each line's discount is checked against its own limit. Lines exceeding their limit contribute to the blended risk score.
            </p>
          </div>
        </div>

        {/* Approval Progress Stepper */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold text-dark-text mb-6">
            Approval Progress
          </h2>
          <ApprovalStepper steps={approval_steps} currentStatus={quotation.status} />
        </div>

        {/* Audit Trail */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold text-dark-text mb-4">
            Audit Trail
          </h2>
          <AuditTrailTable auditLogs={audit_logs} />
        </div>

        {/* Note Input Modal */}
        {showNoteInput && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-dark-surface border border-dark-border rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-dark-text mb-4">
                {pendingAction === 'approve' && 'Approve Quotation'}
                {pendingAction === 'reject' && 'Reject Quotation'}
                {pendingAction === 'return' && 'Return for Revision'}
              </h3>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note (optional)..."
                className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text placeholder-dark-muted focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={cancelAction}
                  className="btn-secondary flex-1"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAction}
                  className={`flex-1 ${
                    pendingAction === 'approve'
                      ? 'bg-success hover:bg-green-600'
                      : pendingAction === 'reject'
                      ? 'bg-danger hover:bg-red-600'
                      : 'bg-warning hover:bg-yellow-600'
                  } text-white px-4 py-2 rounded-lg font-medium transition-colors`}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <button
            onClick={() => handleAction('return')}
            className="px-6 py-2 rounded-lg font-medium bg-warning hover:bg-yellow-600 text-white transition-colors"
            disabled={actionLoading || quotation.status !== 'PENDING_APPROVAL'}
          >
            Return for Revision
          </button>
          <button
            onClick={() => handleAction('reject')}
            className="btn-danger px-6 py-2"
            disabled={actionLoading || quotation.status !== 'PENDING_APPROVAL'}
          >
            Reject
          </button>
          <button
            onClick={() => handleAction('approve')}
            className="px-6 py-2 rounded-lg font-medium bg-success hover:bg-green-600 text-white transition-colors"
            disabled={actionLoading || quotation.status !== 'PENDING_APPROVAL'}
          >
            Approve
          </button>
        </div>
      </div>
    </>
  );
}
