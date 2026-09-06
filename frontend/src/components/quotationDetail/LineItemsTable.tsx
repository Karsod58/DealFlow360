import type { LineItem } from '../../types';

interface LineItemsTableProps {
  lineItems: LineItem[];
  onUpdateLineItem: (id: number, updates: Partial<LineItem>) => void;
  onRemoveLineItem: (id: number) => void;
}

export function LineItemsTable({
  lineItems,
  onUpdateLineItem,
  onRemoveLineItem,
}: LineItemsTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const calculateLineTotal = (item: LineItem) => {
    const subtotal = item.quantity * item.unit_price;
    const discountAmount = subtotal * (item.discount / 100);
    return subtotal - discountAmount;
  };

  const handleDiscountChange = (id: number, newDiscount: number) => {
    const item = lineItems.find((i) => i.id === id);
    if (!item) return;

    const overage = Math.max(0, newDiscount - item.discount_limit);
    const status = newDiscount <= item.discount_limit ? 'OK' : 'OVER';
    const lineTotal = calculateLineTotal({ ...item, discount: newDiscount });

    onUpdateLineItem(id, {
      discount: newDiscount,
      overage,
      status: status as 'OK' | 'OVER',
      line_total: lineTotal,
    });
  };

  const handleQuantityChange = (id: number, newQuantity: number) => {
    const item = lineItems.find((i) => i.id === id);
    if (!item) return;

    const lineTotal = calculateLineTotal({ ...item, quantity: newQuantity });
    onUpdateLineItem(id, { quantity: newQuantity, line_total: lineTotal });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-dark-border">
            <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">Product</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-dark-muted">Qty</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-dark-muted">Price</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-dark-muted">Discount</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-dark-muted">Limit</th>
            <th className="text-center py-3 px-4 text-sm font-medium text-dark-muted">Status</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-dark-muted">Total</th>
            <th className="py-3 px-4"></th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item) => (
            <tr key={item.id} className="border-b border-dark-border hover:bg-dark-surface/50">
              <td className="py-3 px-4 text-dark-text">{item.product_name}</td>
              <td className="py-3 px-4 text-right">
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-1 bg-dark-bg border border-dark-border rounded text-right text-dark-text focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </td>
              <td className="py-3 px-4 text-right text-dark-text">
                {formatCurrency(item.unit_price)}
              </td>
              <td className="py-3 px-4 text-right">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={item.discount}
                  onChange={(e) => handleDiscountChange(item.id, parseFloat(e.target.value) || 0)}
                  className="w-16 px-2 py-1 bg-dark-bg border border-dark-border rounded text-right text-dark-text focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="ml-1 text-dark-muted">%</span>
              </td>
              <td className="py-3 px-4 text-right text-dark-muted">
                {item.discount_limit}%
              </td>
              <td className="py-3 px-4 text-center">
                {item.status === 'OK' ? (
                  <span className="badge-success">OK</span>
                ) : (
                  <span className="badge-danger">OVER +{item.overage}pt</span>
                )}
              </td>
              <td className="py-3 px-4 text-right font-medium text-dark-text">
                {formatCurrency(item.line_total)}
              </td>
              <td className="py-3 px-4">
                <button
                  onClick={() => onRemoveLineItem(item.id)}
                  className="text-danger hover:text-red-400"
                  title="Remove item"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {lineItems.length === 0 && (
        <div className="text-center py-12 text-dark-muted">
          No line items yet. Add products from the suggestions below or search for products.
        </div>
      )}
    </div>
  );
}
