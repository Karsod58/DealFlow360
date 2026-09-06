interface RiskBadgeProps {
  level: string;
  score?: number;
}

export function RiskBadge({ level, score }: RiskBadgeProps) {
  const getColorClass = () => {
    switch (level.toUpperCase()) {
      case 'HIGH':
        return 'badge-danger';
      case 'MEDIUM':
        return 'badge-warning';
      case 'LOW':
        return 'badge-success';
      default:
        return 'badge-info';
    }
  };

  return (
    <span className={getColorClass()}>
      {level.toUpperCase()}
      {score !== undefined && ` (${score}pt)`}
    </span>
  );
}
