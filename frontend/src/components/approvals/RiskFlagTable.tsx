interface LineItem {
  product_name: string;
  discount: number;
  discount_limit: number;
  status: string;
  overage: number;
}

interface RiskFlagTableProps {
  lineItems: LineItem[];
}

export function RiskFlagTable({ lineItems }: RiskFlagTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-dark-border">
            <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">Line</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-dark-muted">Discount Given</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-dark-muted">Limit Allowed</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-dark-muted">Over By</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item, index) => (
            <tr key={index} className="border-b border-dark-border">
              <td className="py-3 px-4 text-dark-text">{item.product_name}</td>
              <td className="py-3 px-4 text-right text-dark-text">
                {item.discount.toFixed(1)}%
              </td>
              <td className="py-3 px-4 text-right text-dark-muted">
                {item.discount_limit.toFixed(1)}%
              </td>
              <td className="py-3 px-4 text-right">
                {item.status === 'OK' ? (
                  <span className="badge-success">OK</span>
                ) : (
                  <span className="badge-danger">{item.overage.toFixed(1)}pt OVER</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {lineItems.length === 0 && (
        <div className="text-center py-8 text-dark-muted">
          No line items
        </div>
      )}
    </div>
  );
}
