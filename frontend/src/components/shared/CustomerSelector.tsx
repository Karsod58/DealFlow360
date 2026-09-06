import { useState, useEffect } from 'react';

interface Customer {
  id: number;
  name: string;
  company: string;
  tier?: string;
}

interface CustomerSelectorProps {
  onSelect: (customerId: number) => void;
  onCancel: () => void;
}

export function CustomerSelector({ onSelect, onCancel }: CustomerSelectorProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/quotations', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const quotations = await response.json();
        // Extract unique customers from quotations
        const customerMap = new Map<number, Customer>();
        quotations.forEach((q: any) => {
          if (q.customer_id && !customerMap.has(q.customer_id)) {
            customerMap.set(q.customer_id, {
              id: q.customer_id,
              name: q.customer?.name || 'Unknown Customer',
              company: q.customer?.company || '',
              tier: q.customer?.tier || 'Standard',
            });
          }
        });
        setCustomers(Array.from(customerMap.values()));
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="card max-w-2xl w-full max-h-[80vh] flex flex-col" style={{ background: 'rgba(26, 19, 51, 0.95)' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-dark-text">Select Customer</h2>
          <button
            onClick={onCancel}
            className="text-dark-muted hover:text-dark-text transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input w-full"
            autoFocus
          />
        </div>

        {/* Customer List */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {loading ? (
            <div className="text-center py-8 text-dark-muted">Loading customers...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-dark-muted">
              No customers found. {searchTerm && 'Try a different search term.'}
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <button
                key={customer.id}
                onClick={() => onSelect(customer.id)}
                className="w-full text-left p-4 rounded-lg border border-white/10 hover:border-primary hover:bg-white/5 transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-dark-text font-semibold">{customer.name}</div>
                    {customer.company && (
                      <div className="text-sm text-dark-muted">{customer.company}</div>
                    )}
                  </div>
                  {customer.tier && (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      customer.tier === 'Gold' ? 'bg-yellow-500/20 text-yellow-300' :
                      customer.tier === 'Silver' ? 'bg-gray-400/20 text-gray-300' :
                      'bg-blue-500/20 text-blue-300'
                    }`}>
                      {customer.tier}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <button onClick={onCancel} className="btn-secondary w-full">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
