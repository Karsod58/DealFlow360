import { useNavigate } from 'react-router-dom';
import { RiskBadge } from './RiskBadge';

interface ApprovalItem {
  id: number;
  quotation_number: string;
  customer_name: string;
  blended_score: number;
  risk_level: string;
  stage: string;
  assigned_to: string | null;
}

interface ApprovalsTableProps {
  approvals: ApprovalItem[];
}

export function ApprovalsTable({ approvals }: ApprovalsTableProps) {
  const navigate = useNavigate();

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-dark-border">
            <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">Quotation</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">Customer</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">Blended Risk</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">Stage</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">Assigned To</th>
          </tr>
        </thead>
        <tbody>
          {approvals.map((approval) => (
            <tr
              key={approval.id}
              onClick={() => navigate(`/approvals/${approval.id}`)}
              className="border-b border-dark-border hover:bg-dark-surface/50 cursor-pointer"
            >
              <td className="py-3 px-4 text-primary-light font-medium">
                {approval.quotation_number}
              </td>
              <td className="py-3 px-4 text-dark-text">
                {approval.customer_name}
              </td>
              <td className="py-3 px-4">
                <RiskBadge level={approval.risk_level} score={approval.blended_score} />
              </td>
              <td className="py-3 px-4 text-dark-text">
                {approval.stage}
              </td>
              <td className="py-3 px-4 text-dark-muted">
                {approval.assigned_to || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {approvals.length === 0 && (
        <div className="text-center py-12 text-dark-muted">
          No approvals found
        </div>
      )}
    </div>
  );
}
