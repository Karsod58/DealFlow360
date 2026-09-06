interface RiskScoreBadgeProps {
  score: number;
}

export function RiskScoreBadge({ score }: RiskScoreBadgeProps) {
  if (score === 0) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-green-900/30 border border-success">
        <div className="w-2 h-2 rounded-full bg-success"></div>
        <span className="text-sm font-medium text-success-light">
          No Risk (Auto-approved)
        </span>
      </div>
    );
  }

  const riskLevel = score < 5 ? 'Low' : score < 15 ? 'Medium' : 'High';
  const colorClass =
    score < 5
      ? 'bg-blue-900/30 border-blue-600 text-blue-300'
      : score < 15
      ? 'bg-warning-bg border-warning text-warning-light'
      : 'bg-red-900/30 border-danger text-danger-light';

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border ${colorClass}`}>
      <div className={`w-2 h-2 rounded-full ${score < 5 ? 'bg-blue-400' : score < 15 ? 'bg-warning' : 'bg-danger'}`}></div>
      <span className="text-sm font-medium">
        Risk Score: {score}pt ({riskLevel})
      </span>
    </div>
  );
}
