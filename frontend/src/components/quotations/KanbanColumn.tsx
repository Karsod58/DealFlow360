import type { Quotation, QuotationStatus } from '../../types';
import { QuotationCard } from './QuotationCard';
import { useDroppable } from '@dnd-kit/core';

interface KanbanColumnProps {
  title: string;
  status: QuotationStatus;
  quotations: Quotation[];
}

export function KanbanColumn({ title, status, quotations }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <div className="flex-1 min-w-[250px]">
      <div className="bg-dark-surface border border-dark-border rounded-lg">
        {/* Column Header */}
        <div className="px-4 py-3 border-b border-dark-border">
          <h3 className="font-semibold text-dark-text">
            {title}
            <span className="ml-2 text-sm text-dark-muted">
              ({quotations.length})
            </span>
          </h3>
        </div>

        {/* Drop Zone */}
        <div
          ref={setNodeRef}
          className={`p-3 space-y-3 min-h-[200px] transition-colors ${
            isOver ? 'bg-primary/10 border-2 border-primary border-dashed' : ''
          }`}
        >
          {quotations.map((quotation) => (
            <QuotationCard key={quotation.id} quotation={quotation} />
          ))}
          
          {quotations.length === 0 && (
            <div className="flex items-center justify-center h-32 text-dark-muted text-sm">
              {isOver ? 'Drop here' : 'No quotations'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
