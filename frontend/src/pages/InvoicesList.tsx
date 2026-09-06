import { useState, useEffect } from 'react';
import { NavBar, InfoBanner } from '../components/shared';
import { InvoicesTable } from '../components/invoices';

export function InvoicesList() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [activeStatus, setActiveStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoices();
  }, [activeStatus]);

  const loadInvoices = async () => {
    try {
      const token = localStorage.getItem('token');
      const statusParam = activeStatus === 'all' ? '' : `?status_filter=${activeStatus}`;
      
      const response = await fetch(`http://localhost:8000/api/invoices${statusParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load invoices');
      }

      const data = await response.json();
      setInvoices(data);
    } catch (error) {
      console.error('Failed to load invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCounts = () => {
    return {
      unpaid: invoices.filter(i => i.status === 'UNPAID' || i.status === 'PARTIALLY_PAID').length,
      paid: invoices.filter(i => i.status === 'PAID').length,
    };
  };

  const counts = getCounts();

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
          <h1 className="text-3xl font-bold text-dark-text">Invoices (List)</h1>
          <p className="text-dark-muted mt-2">
            Every invoice generated from one-time and recurring lines
          </p>
        </div>

        {/* Status Filter Badges */}
        <div className="mb-6 flex gap-3">
          <button
            onClick={() => setActiveStatus('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeStatus === 'all'
                ? 'bg-primary text-white'
                : 'bg-dark-surface text-dark-muted hover:bg-dark-border'
            }`}
          >
            All ({invoices.length})
          </button>
          <button
            onClick={() => setActiveStatus('unpaid')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeStatus === 'unpaid'
                ? 'bg-danger text-white'
                : 'bg-dark-surface text-dark-muted hover:bg-dark-border'
            }`}
          >
            {counts.unpaid} Unpaid
          </button>
          <button
            onClick={() => setActiveStatus('paid')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeStatus === 'paid'
                ? 'bg-success text-white'
                : 'bg-dark-surface text-dark-muted hover:bg-dark-border'
            }`}
          >
            {counts.paid} Paid
          </button>
        </div>

        {/* Invoices Table */}
        <div className="card mb-6">
          <InvoicesTable invoices={invoices} />
        </div>

        {/* Info Banner */}
        <InfoBanner>
          Click an invoice to view full payment and delivery reconciliation detail.
        </InfoBanner>
      </div>
    </>
  );
}
