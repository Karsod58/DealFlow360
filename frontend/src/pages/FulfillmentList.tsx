import { useState, useEffect } from 'react';
import { NavBar, InfoBanner } from '../components/shared';
import { StockTable, OrdersAwaitingTable } from '../components/fulfillment';
import { fulfillmentApi } from '../services/api';

export function FulfillmentList() {
  const [stockData, setStockData] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [stock, ordersData] = await Promise.all([
        fulfillmentApi.getStock(),
        fulfillmentApi.getOrdersAwaiting(),
      ]);
      
      // Transform stock data for display
      const stockItems = (stock as any[]).map((item: any) => ({
        warehouse_name: item.warehouse.name,
        product_name: item.stock.product_name,
        in_stock: item.stock.in_stock,
        reserved: item.stock.reserved,
        available: item.stock.available,
      }));
      
      setStockData(stockItems);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
    } catch (error) {
      console.error('Failed to load fulfillment data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <NavBar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-dark-muted">Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <NavBar />
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-dark-text">Fulfillment and Stock (List)</h1>
          <p className="text-dark-muted mt-2">
            Live stock per warehouse, plus every order that still needs fulfilling
          </p>
        </div>

        {/* Stock Table */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold text-dark-text mb-4">Stock Levels</h2>
          <StockTable stockData={stockData} />
        </div>

        {/* Orders Awaiting Fulfillment */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold text-dark-text mb-4">
            Orders Awaiting Fulfillment
          </h2>
          <OrdersAwaitingTable orders={orders} />
        </div>

        {/* Info Banner */}
        <InfoBanner>
          Click an order to open its warehouse split detail.
        </InfoBanner>
      </div>
    </>
  );
}
