import { useNavigate } from 'react-router-dom';
import type { Quotation } from '../../types';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface QuotationCardProps {
  quotation: Quotation;
  isDragging?: boolean;
}

export function QuotationCard({ quotation, isDragging = false }: QuotationCardProps) {
  const navigate = useNavigate();
  
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: quotation.id,
    disabled: isDragging, // Disable dragging on the overlay copy
  });

  const style = transform ? {
    transform: CSS.Transform.toString(transform),
  } : undefined;

  // Safety check for null/undefined quotation
  if (!quotation) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  // Risk badge color: red for high (≥10), amber for medium (<10), green for low (=0)
  const getRiskBadgeClass = (score: number) => {
    if (score >= 10) return 'badge-danger';
    if (score > 0) return 'badge-warning';
    return 'badge-success';
  };

  const getRiskLabel = (score: number) => {
    if (score >= 10) return 'High Risk';
    if (score > 0) return 'Medium Risk';
    return 'Low Risk';
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => {
        // Only navigate if not dragging
        if (!isDragging) {
          navigate(`/quotations/${quotation.id}`);
        }
      }}
      className={`bg-dark-bg border border-dark-border rounded-lg p-4 cursor-pointer hover:border-primary transition-all duration-300 hover:shadow-lg ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="font-medium text-dark-text">
        {quotation.customer_name || 'Unknown Customer'}
      </div>
      <div className="text-primary-light font-semibold mt-1">
        {formatCurrency(quotation.total_value)}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className={`${getRiskBadgeClass(quotation.blended_score)} text-xs`}>
          {getRiskLabel(quotation.blended_score)} ({quotation.blended_score}pt)
        </span>
      </div>
    </div>
  );
}
