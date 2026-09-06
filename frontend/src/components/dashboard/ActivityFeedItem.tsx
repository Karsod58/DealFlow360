import type { ActivityItem } from '../../types';

interface ActivityFeedItemProps {
  activity: ActivityItem;
}

export function ActivityFeedItem({ activity }: ActivityFeedItemProps) {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else {
      return `${diffDays} days ago`;
    }
  };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-dark-border last:border-0">
      <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
      <div className="flex-1">
        <p className="text-dark-text">{activity.message}</p>
        <p className="text-sm text-dark-muted mt-1">
          {formatTimestamp(activity.timestamp)}
        </p>
      </div>
    </div>
  );
}
