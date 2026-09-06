import { useNavigate } from 'react-router-dom';

interface Order {
  id: number;
  quotation_number: string;
  customer_name: string;
  status: string;
}

interface OrdersAwaitingTableProps {
  orders: Order[];
}

export function OrdersAwaitingTable({ orders }: OrdersAwaitingTableProps) {
  const navigate = useNavigate();

  const getWarehouseText = (_order: Order) => {
    // Placeholder - in real implementation, this would come from the split calculation
    return 'Split Pending';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-dark-border">
            <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">Order</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">Customer</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">Status</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">Warehouse</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr
              key={order.id}
              onClick={() => navigate(`/fulfillment/${order.id}`)}
              className="border-b border-dark-border hover:bg-dark-surface/50 cursor-pointer"
            >
              <td className="py-3 px-4 text-primary-light font-medium">{order.quotation_number}</td>
              <td className="py-3 px-4 text-dark-text">{order.customer_name}</td>
              <td className="py-3 px-4">
                <span className="badge-warning">{getWarehouseText(order)}</span>
              </td>
              <td className="py-3 px-4 text-dark-muted">—</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {orders.length === 0 && (
        <div className="text-center py-12 text-dark-muted">
          No orders awaiting fulfillment
        </div>
      )}
    </div>
  );
}
