interface StockItem {
  warehouse_name: string;
  product_name: string;
  in_stock: number;
  reserved: number;
  available: number;
}

interface StockTableProps {
  stockData: StockItem[];
}

export function StockTable({ stockData }: StockTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-dark-border">
            <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">Warehouse</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">Product</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-dark-muted">In Stock</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-dark-muted">Reserved</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-dark-muted">Available</th>
          </tr>
        </thead>
        <tbody>
          {stockData.map((item, index) => (
            <tr key={index} className="border-b border-dark-border hover:bg-dark-surface/50">
              <td className="py-3 px-4 text-dark-text">{item.warehouse_name}</td>
              <td className="py-3 px-4 text-dark-text">{item.product_name}</td>
              <td className="py-3 px-4 text-right text-dark-text">{item.in_stock}</td>
              <td className="py-3 px-4 text-right text-dark-muted">{item.reserved}</td>
              <td className="py-3 px-4 text-right font-medium text-primary-light">{item.available}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {stockData.length === 0 && (
        <div className="text-center py-12 text-dark-muted">
          No stock data available
        </div>
      )}
    </div>
  );
}
