import type { Product } from '../../types';

interface UpsellCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

export function UpsellCard({ product, onAdd }: UpsellCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="bg-dark-bg border border-dark-border rounded-lg p-4 hover:border-primary transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-dark-text">{product.name}</h4>
          <p className="text-primary-light font-semibold mt-1">
            {formatCurrency(product.price)}
          </p>
          {product.margin && (
            <p className="text-success text-sm mt-1">
              Margin +{formatCurrency(product.margin)}
            </p>
          )}
          {product.promo_discount && (
            <p className="text-warning text-sm mt-1">
              Promo {product.promo_discount}% off
            </p>
          )}
        </div>
        <button
          onClick={() => onAdd(product)}
          className="ml-4 w-8 h-8 rounded-full bg-primary hover:bg-primary-hover text-white flex items-center justify-center transition-colors"
          title="Add to quotation"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
