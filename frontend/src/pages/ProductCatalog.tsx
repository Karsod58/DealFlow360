import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar } from '../components/shared';
import { StatCard } from '../components/dashboard';

export function ProductCatalog() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/products', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStats = () => {
    const totalProducts = products.length;
    const pricelists = new Set(products.map(p => p.price_list_id || 'default')).size;
    const categories = new Set(products.map(p => p.category).filter(Boolean)).size;

    return { totalProducts, pricelists, categories };
  };

  const stats = getStats();

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
          <h1 className="text-3xl font-bold text-dark-text">Product Catalog</h1>
          <p className="text-dark-muted mt-2">
            Every product, variant and price list in one place
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mb-6 flex gap-3">
          <button 
            onClick={() => navigate('/admin/products/new')}
            className="btn-primary"
          >
            + New Product
          </button>
          <button className="btn-secondary">
            Manage Price Fields
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total Products"
            value={stats.totalProducts}
            subtitle={`${stats.totalProducts} products in catalog`}
            bgColor="bg-primary-bg"
            textColor="text-primary"
          />
          <StatCard
            title="Pricelists"
            value={stats.pricelists}
            subtitle={`${stats.pricelists} active pricelists`}
            bgColor="bg-success-bg"
            textColor="text-success"
          />
          <StatCard
            title="Categories"
            value={stats.categories}
            subtitle={`${stats.categories} product categories`}
            bgColor="bg-warning-bg"
            textColor="text-warning"
          />
        </div>

        {/* Products Table */}
        <div className="card">
          <h2 className="text-xl font-semibold text-dark-text mb-4">
            Products
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">
                    Product Name
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">
                    Category
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-dark-muted">
                    Price
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">
                    Unit
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-dark-muted">
                    Tax %
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.id}
                    onClick={() => navigate(`/admin/products/${product.product_id}`)}
                    className="border-b border-dark-border hover:bg-dark-surface cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 text-dark-text font-medium">
                      {product.name}
                      {product.is_subscription === 1 && (
                        <span className="ml-2 text-xs text-primary">(Subscription)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-dark-muted">
                      {product.category || '—'}
                    </td>
                    <td className="py-3 px-4 text-right text-dark-text">
                      ${product.price.toFixed(2)}
                      {product.is_subscription === 1 && product.recurring_cycle && (
                        <span className="text-xs text-dark-muted">/{product.recurring_cycle.toLowerCase()}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-dark-muted">
                      {product.unit || 'Each'}
                    </td>
                    <td className="py-3 px-4 text-right text-dark-muted">
                      {product.tax_rate || 0}%
                    </td>
                    <td className="py-3 px-4">
                      <span className={product.status === 'Active' ? 'badge-success' : 'badge-danger'}>
                        {product.status || 'Active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {products.length === 0 && (
              <div className="text-center py-8 text-dark-muted">
                No products found. Click "+ New Product" to add one.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
