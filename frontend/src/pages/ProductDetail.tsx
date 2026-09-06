import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NavBar, InfoBanner } from '../components/shared';

export function ProductDetail() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [_variants, setVariants] = useState<any[]>([]);
  const [_pricelists, setPricelists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isNewProduct = productId === 'new';

  useEffect(() => {
    if (!isNewProduct && productId) {
      loadProductDetail(productId);
    } else {
      setProduct({
        product_id: '',
        name: '',
        price: 0,
        category: '',
        description: '',
        tax_rate: 0,
        unit: 'Each',
        is_subscription: 0,
        recurring_cycle: 'MONTHLY',
        quantity_on_hand: 0,
        status: 'Active',
        discount_limit: 15.0,
      });
      setLoading(false);
    }
  }, [productId]);

  const loadProductDetail = async (prodId: string) => {
    try {
      const token = localStorage.getItem('token');
      
      // Load product
      const productResponse = await fetch(`http://localhost:8000/api/products/${prodId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (productResponse.ok) {
        const productData = await productResponse.json();
        setProduct(productData);
      }

      // Load variants
      const variantsResponse = await fetch(`http://localhost:8000/api/products/${prodId}/variants`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (variantsResponse.ok) {
        const variantsData = await variantsResponse.json();
        setVariants(variantsData);
      } else {
        setVariants([]);
      }

      // Load pricelists
      const pricelistsResponse = await fetch(`http://localhost:8000/api/products/${prodId}/pricelists`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (pricelistsResponse.ok) {
        const pricelistsData = await pricelistsResponse.json();
        setPricelists(pricelistsData);
      } else {
        setPricelists([]);
      }
    } catch (error) {
      console.error('Failed to load product detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const url = isNewProduct
        ? 'http://localhost:8000/api/products'
        : `http://localhost:8000/api/products/${productId}`;
      
      const method = isNewProduct ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(product),
      });

      if (!response.ok) {
        throw new Error('Failed to save product');
      }

      const result = await response.json();
      alert('Product saved successfully!');
      
      if (isNewProduct) {
        navigate(`/admin/products/${result.product_id}`);
      }
    } catch (error: any) {
      alert(error.message || 'Failed to save product');
    } finally {
      setSaving(false);
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

  if (!product) {
    return null;
  }

  return (
    <>
      <NavBar />
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-dark-text">
            {isNewProduct ? 'New Product' : `Product: ${product.name}`}
          </h1>
          <p className="text-dark-muted mt-2">
            Product and pricelist configuration
          </p>
        </div>

        {/* General Info */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold text-dark-text mb-4">
            General Information
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-muted mb-1">
                Product ID
              </label>
              <input
                type="text"
                value={product.product_id}
                onChange={(e) => setProduct({ ...product, product_id: e.target.value })}
                className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text"
                disabled={!isNewProduct}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-muted mb-1">
                Product Name
              </label>
              <input
                type="text"
                value={product.name}
                onChange={(e) => setProduct({ ...product, name: e.target.value })}
                className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-muted mb-1">
                Category
              </label>
              <input
                type="text"
                value={product.category || ''}
                onChange={(e) => setProduct({ ...product, category: e.target.value })}
                className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text"
                placeholder="e.g., Hardware, Services"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-muted mb-1">
                Price
              </label>
              <input
                type="number"
                step="0.01"
                value={product.price}
                onChange={(e) => setProduct({ ...product, price: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-muted mb-1">
                Tax %
              </label>
              <input
                type="number"
                step="0.1"
                value={product.tax_rate || 0}
                onChange={(e) => setProduct({ ...product, tax_rate: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-muted mb-1">
                Unit
              </label>
              <input
                type="text"
                value={product.unit || 'Each'}
                onChange={(e) => setProduct({ ...product, unit: e.target.value })}
                className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-dark-muted mb-1">
                Description
              </label>
              <textarea
                value={product.description || ''}
                onChange={(e) => setProduct({ ...product, description: e.target.value })}
                className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text min-h-[80px]"
                placeholder="Product description..."
              />
            </div>
          </div>

          {/* Subscription Toggle */}
          <div className="mt-6 p-4 bg-dark-bg rounded-lg">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={product.is_subscription === 1}
                onChange={(e) => setProduct({ ...product, is_subscription: e.target.checked ? 1 : 0 })}
                className="mr-3"
              />
              <span className="text-dark-text font-medium">Subscription Product</span>
            </label>

            {product.is_subscription === 1 && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-muted mb-1">
                    Recurring Cycle
                  </label>
                  <select
                    value={product.recurring_cycle || 'MONTHLY'}
                    onChange={(e) => setProduct({ ...product, recurring_cycle: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-lg text-dark-text"
                  >
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-muted mb-1">
                    Quantity on Hand
                  </label>
                  <input
                    type="number"
                    value={product.quantity_on_hand || 0}
                    onChange={(e) => setProduct({ ...product, quantity_on_hand: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-dark-surface border border-dark-border rounded-lg text-dark-text"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Banner */}
        <InfoBanner>
          Products should be filled first. Recurring order with the product will be accessed at
          the beginning of the period.
        </InfoBanner>

        {/* Save Button */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => navigate('/admin/products')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn-primary"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </div>
    </>
  );
}
