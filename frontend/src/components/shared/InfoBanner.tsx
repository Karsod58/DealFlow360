interface InfoBannerProps {
  children: React.ReactNode;
  type?: 'info' | 'warning' | 'success' | 'error';
}

export function InfoBanner({ children, type = 'warning' }: InfoBannerProps) {
  const styles = {
    info: 'bg-blue-900/30 border-blue-600 text-blue-200',
    warning: 'bg-warning-bg border-warning text-yellow-200',
    success: 'bg-green-900/30 border-success text-green-200',
    error: 'bg-red-900/30 border-danger text-red-200',
  };

  return (
    <div className={`border rounded-lg p-4 ${styles[type]}`}>
      {children}
    </div>
  );
}
