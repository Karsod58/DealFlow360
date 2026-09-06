interface StatCardProps {
  title: string;
  value: string | number;
  onClick?: () => void;
  subtitle?: string;
  bgColor?: string;
  textColor?: string;
}

export function StatCard({ title, value, onClick, subtitle, bgColor, textColor }: StatCardProps) {
  const defaultBgColor = bgColor || 'from-primary/10 to-purple-900/10';
  const defaultTextColor = textColor || 'from-primary to-purple-600';
  
  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden
        bg-gradient-to-br ${defaultBgColor}
        border border-dark-border rounded-lg p-6
        transition-all duration-300
        ${onClick ? 'cursor-pointer hover:scale-105 hover:shadow-glow-primary hover:border-primary/50' : ''}
        group
      `}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-purple-600/0 group-hover:from-primary/5 group-hover:to-purple-600/5 transition-all duration-300"></div>
      
      {/* Content */}
      <div className="relative z-10">
        <h3 className="text-sm font-medium text-dark-muted mb-2 uppercase tracking-wide">
          {title}
        </h3>
        <p className={`text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${defaultTextColor} group-hover:scale-110 transition-transform duration-300`}>
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-dark-muted mt-2">{subtitle}</p>
        )}
      </div>
      
      {/* Hover indicator */}
      {onClick && (
        <div className="absolute bottom-0 right-0 w-0 h-0.5 bg-gradient-to-r from-primary to-purple-600 group-hover:w-full transition-all duration-300"></div>
      )}
    </div>
  );
}
