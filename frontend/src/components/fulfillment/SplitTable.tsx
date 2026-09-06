interface SplitItem {
  warehouse_name: string;
  warehouse_code: string;
  quantity_fulfilled: number;
  estimated_shipments: number;
  shipping_cost: number;
  is_backorder: boolean;
}

interface SplitTableProps {
  splits: SplitItem[];
}

export function SplitTable({ splits }: SplitTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const totalCost = splits.reduce((sum, split) => sum + split.shipping_cost, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-dark-border">
            <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">Warehouse</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-dark-muted">Qty Fulfilled</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-dark-muted">Est. Shipments</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-dark-muted">Cost</th>
          </tr>
        </thead>
        <tbody>
          {splits.map((split, index) => (
            <tr
              key={index}
              className={`border-b border-dark-border ${split.is_backorder ? 'bg-warning-bg/20' : ''}`}
            >
              <td className="py-3 px-4 text-dark-text">
                {split.warehouse_name}
                {split.is_backorder && (
                  <span className="ml-2 badge-warning text-xs">Backorder</span>
                )}
              </td>
              <td className="py-3 px-4 text-right text-dark-text">
                {split.quantity_fulfilled} units
              </td>
              <td className="py-3 px-4 text-right text-dark-text">
                {split.estimated_shipments}
              </td>
              <td className="py-3 px-4 text-right font-medium text-primary-light">
                {formatCurrency(split.shipping_cost)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-dark-border">
            <td colSpan={3} className="py-3 px-4 text-right font-semibold text-dark-text">
              Total Cost:
            </td>
            <td className="py-3 px-4 text-right font-bold text-primary-light text-lg">
              {formatCurrency(totalCost)}
            </td>
          </tr>
        </tfoot>
      </table>
      
      {splits.length === 0 && (
        <div className="text-center py-12 text-dark-muted">
          No fulfillment splits calculated
        </div>
      )}
    </div>
  );
}
