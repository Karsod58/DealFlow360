interface StatusFilterTabsProps {
  activeStatus: string;
  onStatusChange: (status: string) => void;
  counts: {
    pending: number;
    returned: number;
    approved: number;
  };
}

export function StatusFilterTabs({ activeStatus, onStatusChange, counts }: StatusFilterTabsProps) {
  const tabs = [
    { key: 'all', label: 'All', count: counts.pending + counts.returned + counts.approved },
    { key: 'pending', label: 'Pending', count: counts.pending, color: 'orange' },
    { key: 'returned', label: 'Returned', count: counts.returned, color: 'yellow' },
    { key: 'approved', label: 'Approved', count: counts.approved, color: 'green' },
  ];

  const getTabClass = (tab: typeof tabs[0]) => {
    const baseClass = 'px-4 py-2 rounded-lg text-sm font-medium transition-colors';
    
    if (activeStatus === tab.key) {
      if (tab.color === 'orange') return `${baseClass} bg-warning text-white`;
      if (tab.color === 'yellow') return `${baseClass} bg-yellow-600 text-white`;
      if (tab.color === 'green') return `${baseClass} bg-success text-white`;
      return `${baseClass} bg-primary text-white`;
    }
    
    return `${baseClass} bg-dark-surface text-dark-text hover:bg-dark-border`;
  };

  return (
    <div className="flex gap-2 flex-wrap">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onStatusChange(tab.key)}
          className={getTabClass(tab)}
        >
          {tab.label}
          <span className="ml-2 px-2 py-0.5 rounded-full bg-black/20 text-xs">
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  );
}
