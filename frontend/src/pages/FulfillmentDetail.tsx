import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NavBar, InfoBanner } from '../components/shared';
import { SplitTable } from '../components/fulfillment';
import { fulfillmentApi, quotationsApi } from '../services/api';

export function FulfillmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState<any>(null);
  const [calculations, setCalculations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (id) {
      loadData(parseInt(id));
    }
  }, [id]);

  const loadData = async (quotationId: number) => {
    try {
      const [quotationData, splitData] = await Promise.all([
        quotationsApi.getById(String(quotationId)),
        fulfillmentApi.calculateSplit(quotationId),
      ]);
      
      setQuotation(quotationData);
      setCalculations(Array.isArray(splitData) ? splitData : []);
    } catch (error) {
      console.error('Failed to load fulfillment data:', error);
      navigate('/fulfillment');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSplit = async () => {
    if (!id) return;

    setAccepting(true);
    try {
      await fulfillmentApi.acceptSplit(parseInt(id));
      alert('Fulfillment split accepted successfully!');
      navigate('/fulfillment');
    } catch (error) {
      console.error('Failed to accept split:', error);
      alert('Failed to accept split');
    } finally {
      setAccepting(false);
    }
  };

  const handleManualOverride = () => {
    alert('Manual override feature coming soon');
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

  if (!quotation) {
    return null;
  }

  const hasBackorder = calculations.some(calc => calc.backorder_quantity > 0);

  return (
    <>
      <NavBar />
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-dark-text">
            Fulfillment Detail: {quotation.quotation_number} ({quotation.customer_name})
          </h1>
          <p className="text-dark-muted mt-2">
            Warehouse split calculated using greedy allocation algorithm
          </p>
        </div>

        {/* Line Items with Splits */}
        {calculations.map((calc, index) => (
          <div key={index} className="card mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-dark-text">
                {calc.product_name}
              </h2>
              <div className="text-dark-muted">
                Total Quantity: <span className="text-dark-text font-medium">{calc.total_quantity}</span>
              </div>
            </div>
            
            <SplitTable splits={calc.splits} />
            
            {calc.backorder_quantity > 0 && (
              <div className="mt-4 p-3 bg-warning-bg border border-warning rounded-lg">
                <p className="text-sm text-yellow-200">
                  <strong>Backorder:</strong> {calc.backorder_quantity} units cannot be fulfilled from current stock.
                  Check for restock to consolidate remaining backorder.
                </p>
              </div>
            )}
          </div>
        ))}

        {/* Info Banner */}
        {hasBackorder && (
          <div className="mb-6">
            <InfoBanner>
              "Consolidate Remaining Backorder" prompt appears automatically once warehouses restock.
            </InfoBanner>
          </div>
        )}

        {/* Summary */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold text-dark-text mb-4">Summary</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-dark-muted">Total Line Items</div>
              <div className="text-2xl font-bold text-primary-light">{calculations.length}</div>
            </div>
            <div>
              <div className="text-sm text-dark-muted">Warehouses Used</div>
              <div className="text-2xl font-bold text-primary-light">
                {new Set(calculations.flatMap(c => c.splits.map((s: any) => s.warehouse_code))).size}
              </div>
            </div>
            <div>
              <div className="text-sm text-dark-muted">Total Shipping Cost</div>
              <div className="text-2xl font-bold text-primary-light">
                ${calculations.reduce((sum, c) => sum + c.total_cost, 0).toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <button
            onClick={handleManualOverride}
            className="btn-secondary"
          >
            Manual Override
          </button>
          <button
            onClick={handleAcceptSplit}
            disabled={accepting}
            className="btn-primary disabled:opacity-50"
          >
            {accepting ? 'Accepting...' : 'Accept Suggested Split'}
          </button>
        </div>
      </div>
    </>
  );
}
