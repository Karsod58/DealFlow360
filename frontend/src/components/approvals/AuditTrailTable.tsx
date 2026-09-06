interface AuditLog {
  id: number;
  action: string;
  note: string | null;
  created_at: string;
  user_id: number;
}

interface AuditTrailTableProps {
  auditLogs: AuditLog[];
  users?: any; // In a real app, you'd fetch user details
}

export function AuditTrailTable({ auditLogs }: AuditTrailTableProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getUserName = (userId: number) => {
    // Placeholder - in real app, fetch user details
    const userMap: Record<number, string> = {
      1: 'J. Rao',
      2: 'M. Shah',
      3: 'R. Iyer',
    };
    return userMap[userId] || `User ${userId}`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-dark-border">
            <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">User</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">Action</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">Date</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">Note</th>
          </tr>
        </thead>
        <tbody>
          {auditLogs.map((log) => (
            <tr key={log.id} className="border-b border-dark-border">
              <td className="py-3 px-4 text-dark-text font-medium">
                {getUserName(log.user_id)}
              </td>
              <td className="py-3 px-4">
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    log.action === 'Approved'
                      ? 'bg-success/20 text-success'
                      : log.action === 'Rejected'
                      ? 'bg-danger/20 text-danger'
                      : log.action === 'Returned'
                      ? 'bg-warning/20 text-warning'
                      : 'bg-blue-900/20 text-blue-300'
                  }`}
                >
                  {log.action}
                </span>
              </td>
              <td className="py-3 px-4 text-dark-muted text-sm">
                {formatDate(log.created_at)}
              </td>
              <td className="py-3 px-4 text-dark-text text-sm">
                {log.note || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {auditLogs.length === 0 && (
        <div className="text-center py-8 text-dark-muted">
          No audit trail entries
        </div>
      )}
    </div>
  );
}
