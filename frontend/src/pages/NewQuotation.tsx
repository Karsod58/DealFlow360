import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NavBar } from '../components/shared';
import { quotationsApi, productsApi, customersApi } from '../services/api';
import type { Quotation, Product, Customer } from '../types';

export function NewQuotation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [discount, setDiscount] = useState<number>(0);
  const [upsellProducts, setUpsellProducts] = useState<Product[]>([]);

  useEffect(() => {
    loadInitialData();
  }, [id]);

  const loadInitialData = async () => {
    try {
      setError(null);
      
      // Load quotation if editing
      if (id) {
        const quotationData = await quotationsApi.getById(id);
        setQuotation(quotationData);
        if (quotationData.customer_id) {
          setSelectedCustomer(Number(quotationData.customer_id));
        }
        
        // Load upsell suggestions for this quotation
        try {
          const upsells = await productsApi.getUpsellSuggestions(id);
          setUpsellProducts(upsells);
        } catch (err) {
          console.log('No upsell suggestions available');
        }
      }

      // Load customers and products
      const [customersData, productsData] = await Promise.all([
        customersApi.getAll(),
        productsApi.getAll(),
      ]);

      setCustomers(customersData as Customer[]);
      setProducts(productsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Failed to load form data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLineItem = async () => {
    if (!quotation || !selectedProduct) {
      setError('Please select a product');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const product = products.find(p => p.id === selectedProduct);
      if (!product) return;

      const lineItem = {
        product_id: product.product_id,
        product_name: product.name,
        quantity,
        unit_price: product.price,
        discount,
        discount_limit: product.discount_limit,
      };

      await quotationsApi.addLineItem(quotation.id, lineItem);
      
      // Reload quotation
      const updatedQuotation = await quotationsApi.getById(quotation.id.toString());
      setQuotation(updatedQuotation);

      // Reset form
      setSelectedProduct(null);
      setQuantity(1);
      setDiscount(0);
    } catch (error) {
      console.error('Failed to add line item:', error);
      setError('Failed to add line item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveLineItem = async (lineItemId: number) => {
    if (!quotation) return;

    try {
      setSaving(true);
      setError(null);

      await quotationsApi.deleteLineItem(quotation.id, lineItemId);
      
      // Reload quotation
      const updatedQuotation = await quotationsApi.getById(quotation.id.toString());
      setQuotation(updatedQuotation);
    } catch (error) {
      console.error('Failed to remove line item:', error);
      setError('Failed to remove line item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCustomer = async () => {
    if (!quotation || !selectedCustomer) {
      setError('Please select a customer');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await quotationsApi.update(quotation.id, {
        customer_id: selectedCustomer.toString(),
      } as Partial<Quotation>);

      // Reload quotation
      const updatedQuotation = await quotationsApi.getById(quotation.id.toString());
      setQuotation(updatedQuotation);
    } catch (error) {
      console.error('Failed to update customer:', error);
      setError('Failed to update customer. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!quotation) return;

    if (!quotation.customer_id || quotation.line_items.length === 0) {
      setError('Please add a customer and at least one line item before submitting.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await quotationsApi.submit(quotation.id);
      navigate('/quotations');
    } catch (error) {
      console.error('Failed to submit quotation:', error);
      setError('Failed to submit quotation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
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
    return (
      <>
        <NavBar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-danger">Quotation not found</div>
        </div>
      </>
    );
  }

  return (
    <>
      <NavBar />
      <div className="container mx-auto px-4 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-danger/10 border border-danger rounded-lg text-danger">
            ⚠ {error}
          </div>
        )}

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">
            {quotation.quotation_number ? `Edit Quotation ${quotation.quotation_number}` : 'New Quotation'}
          </h1>
          <p className="text-dark-muted mt-2">
            Build your quotation by selecting customer and adding line items
          </p>
        </div>

        {/* Customer Selection */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Customer</h2>
          <div className="flex gap-4">
            <select
              value={selectedCustomer || ''}
              onChange={(e) => setSelectedCustomer(Number(e.target.value))}
              className="input flex-1"
              disabled={saving}
            >
              <option value="">Select a customer...</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} ({customer.email})
                </option>
              ))}
            </select>
            <button
              onClick={handleUpdateCustomer}
              disabled={saving || !selectedCustomer}
              className="btn-primary disabled:opacity-50"
            >
              {saving ? 'Updating...' : 'Update Customer'}
            </button>
          </div>
          {quotation.customer_name && (
            <div className="mt-4 p-3 bg-success/10 border border-success/30 rounded-lg text-success">
              ✓ Selected: {quotation.customer_name}
            </div>
          )}
        </div>

        {/* Add Line Items */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Add Line Items</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <select
              value={selectedProduct || ''}
              onChange={(e) => setSelectedProduct(Number(e.target.value))}
              className="input md:col-span-2"
              disabled={saving}
            >
              <option value="">Select a product...</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} - {formatCurrency(product.price)}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              placeholder="Quantity"
              className="input"
              disabled={saving}
            />
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              placeholder="Discount %"
              className="input"
              disabled={saving}
            />
            <button
              onClick={handleAddLineItem}
              disabled={saving || !selectedProduct}
              className="btn-primary disabled:opacity-50"
            >
              {saving ? 'Adding...' : '+ Add'}
            </button>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Line Items</h2>
          
          {quotation.line_items && quotation.line_items.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">Product</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-dark-muted">Qty</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-dark-muted">Unit Price</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-dark-muted">Discount</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-dark-muted">Total</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-dark-muted">Status</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-dark-muted">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotation.line_items.map((item) => (
                      <tr key={item.id} className="border-b border-dark-border/50">
                        <td className="py-3 px-4 text-white">{item.product_name}</td>
                        <td className="py-3 px-4 text-right text-white">{item.quantity}</td>
                        <td className="py-3 px-4 text-right text-white">{formatCurrency(item.unit_price)}</td>
                        <td className="py-3 px-4 text-right">
                          <span className={item.discount > item.discount_limit ? 'text-warning' : 'text-success'}>
                            {item.discount.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-primary-light">
                          {formatCurrency(item.line_total)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.status === 'OVER' ? (
                            <span className="px-2 py-1 rounded text-xs bg-warning/20 text-warning">Over</span>
                          ) : (
                            <span className="px-2 py-1 rounded text-xs bg-success/20 text-success">OK</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleRemoveLineItem(item.id)}
                            disabled={saving}
                            className="text-danger hover:text-danger/80 disabled:opacity-50"
                          >
                            🗑️ Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total */}
              <div className="mt-6 pt-6 border-t border-dark-border flex justify-between items-center">
                <div className="text-dark-muted">
                  <div className="text-sm">Total Items: {quotation.line_items.length}</div>
                  <div className="text-sm">Risk Score: {quotation.blended_score?.toFixed(2) || '0.00'}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-dark-muted mb-1">Total Value</div>
                  <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                    {formatCurrency(quotation.total_value || 0)}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-dark-muted">
              No line items yet. Add products above to get started.
            </div>
          )}
        </div>

        {/* Upsell Suggestions */}
        {upsellProducts.length > 0 && (
          <div className="card mb-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span>💡</span>
              Recommended Add-ons
            </h2>
            <p className="text-dark-muted text-sm mb-4">
              High-margin products that complement this quotation
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upsellProducts.map((product) => (
                <div 
                  key={product.id}
                  className="bg-dark-border/20 rounded-lg p-4 border border-dark-border hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedProduct(product.id);
                    setQuantity(1);
                    setDiscount(0);
                  }}
                >
                  <div className="font-semibold text-white mb-2">{product.name}</div>
                  <div className="text-sm text-dark-muted mb-2">{product.category || 'General'}</div>
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold text-primary-light">
                      {formatCurrency(product.price)}
                    </div>
                    {product.margin && (
                      <div className="text-xs px-2 py-1 bg-success/20 text-success rounded">
                        {product.margin}% margin
                      </div>
                    )}
                  </div>
                  {product.promo_discount && (
                    <div className="mt-2 text-xs text-warning">
                      🎯 Promo: {product.promo_discount}% off
                    </div>
                  )}
                  <button 
                    className="mt-3 w-full btn-secondary text-sm py-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProduct(product.id);
                      handleAddLineItem();
                    }}
                  >
                    + Quick Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 justify-between">
          <button
            onClick={() => navigate('/quotations')}
            className="btn-secondary"
          >
            ← Back
          </button>
          <button
            onClick={handleSubmitForApproval}
            disabled={saving || !quotation.customer_id || quotation.line_items.length === 0}
            className="btn-primary disabled:opacity-50"
          >
            {saving ? 'Submitting...' : '📤 Submit for Approval'}
          </button>
        </div>
      </div>
    </>
  );
}
