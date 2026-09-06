import React, { useState, useEffect } from 'react';
import { NavBar } from '../components/shared';

interface ReportStats {
  total_quotations: number;
  total_value: number;
  approved_quotations: number;
  confirmed_quotations: number;
  avg_deal_size: number;
  conversion_rate: number;
}

const Reports: React.FC = () => {
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  useEffect(() => {
    fetchReportStats();
  }, []);

  const fetchReportStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/reports/summary`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch report stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async (reportType: string) => {
    setExportingPDF(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/reports/export/${reportType}?format=pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('Failed to export PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  const handleExportExcel = async (reportType: string) => {
    setExportingExcel(true);
    try {
      const token = localStorage.getItem('token');
      
      // Fetch data for Excel export
      let endpoint = '';
      switch (reportType) {
        case 'quotations':
          endpoint = '/api/quotations';
          break;
        case 'approvals':
          endpoint = '/api/approvals';
          break;
        case 'invoices':
          endpoint = '/api/invoices';
          break;
        default:
          endpoint = '/api/quotations';
      }

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Convert to CSV (simple Excel format)
        const csv = convertToCSV(data, reportType);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export Excel:', error);
      alert('Failed to export Excel');
    } finally {
      setExportingExcel(false);
    }
  };

  const convertToCSV = (data: any[], reportType: string): string => {
    if (!data || data.length === 0) return '';

    // Different headers based on report type
    const headers: { [key: string]: string[] } = {
      quotations: ['Quotation Number', 'Customer', 'Status', 'Total Value', 'Blended Score', 'Created At'],
      approvals: ['Quotation Number', 'Customer', 'Risk Level', 'Stage', 'Assigned To', 'Created At'],
      invoices: ['Invoice Number', 'Customer', 'Amount', 'Status', 'Due Date', 'Created At'],
    };

    const csvHeaders = headers[reportType] || headers.quotations;
    
    // Map data to CSV rows
    const rows = data.map(item => {
      switch (reportType) {
        case 'quotations':
          return [
            item.quotation_number || '',
            item.customer_name || '',
            item.status || '',
            item.total_value || 0,
            item.blended_score || 0,
            item.created_at || ''
          ];
        case 'approvals':
          return [
            item.quotation_number || '',
            item.customer_name || '',
            item.risk_level || '',
            item.stage || '',
            item.assigned_to || 'N/A',
            item.created_at || ''
          ];
        case 'invoices':
          return [
            item.invoice_number || '',
            item.customer_name || '',
            item.amount || 0,
            item.status || '',
            item.due_date || '',
            item.created_at || ''
          ];
        default:
          return Object.values(item);
      }
    });

    // Combine headers and rows
    const csvContent = [
      csvHeaders.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <div className="text-dark-muted animate-pulse-slow">Loading reports...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <NavBar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">
            Reports & Analytics
          </h1>
          <p className="mt-2 text-dark-muted">
            View, analyze, and export business intelligence reports
          </p>
        </div>

        {/* Summary Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
            <div className="card stat-card-glow animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center">
                <div className="flex-shrink-0 text-4xl">
                  📄
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-dark-muted">Total Quotes</p>
                  <p className="text-2xl font-semibold text-dark-text">{stats.total_quotations}</p>
                </div>
              </div>
            </div>

            <div className="card stat-card-glow animate-fade-in" style={{ animationDelay: '0.15s' }}>
              <div className="flex items-center">
                <div className="flex-shrink-0 text-4xl">
                  💰
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-dark-muted">Total Value</p>
                  <p className="text-2xl font-semibold text-dark-text">
                    ${(stats.total_value / 1000).toFixed(0)}K
                  </p>
                </div>
              </div>
            </div>

            <div className="card stat-card-glow animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center">
                <div className="flex-shrink-0 text-4xl">
                  ✅
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-dark-muted">Approved</p>
                  <p className="text-2xl font-semibold text-dark-text">{stats.approved_quotations}</p>
                </div>
              </div>
            </div>

            <div className="card stat-card-glow animate-fade-in" style={{ animationDelay: '0.25s' }}>
              <div className="flex items-center">
                <div className="flex-shrink-0 text-4xl">
                  👥
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-dark-muted">Confirmed</p>
                  <p className="text-2xl font-semibold text-dark-text">{stats.confirmed_quotations}</p>
                </div>
              </div>
            </div>

            <div className="card stat-card-glow animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center">
                <div className="flex-shrink-0 text-4xl">
                  📈
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-dark-muted">Avg Deal</p>
                  <p className="text-2xl font-semibold text-dark-text">
                    ${(stats.avg_deal_size / 1000).toFixed(0)}K
                  </p>
                </div>
              </div>
            </div>

            <div className="card stat-card-glow animate-fade-in" style={{ animationDelay: '0.35s' }}>
              <div className="flex items-center">
                <div className="flex-shrink-0 text-4xl">
                  🎯
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-dark-muted">Conversion</p>
                  <p className="text-2xl font-semibold text-dark-text">
                    {stats.conversion_rate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Export Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          {/* Quotations Report */}
          <div className="card hover:bg-white/15 transition-all duration-300">
            <div className="flex items-center mb-4">
              <span className="text-4xl mr-3">📄</span>
              <h3 className="text-lg font-semibold text-dark-text">Quotations Report</h3>
            </div>
            <p className="text-sm text-dark-muted mb-6">
              Export all quotations with details: status, value, discounts, and approval status
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleExportPDF('quotations')}
                disabled={exportingPDF}
                className="flex-1 btn-secondary disabled:opacity-50"
              >
                <span className="mr-2">⬇️</span>
                {exportingPDF ? 'Exporting...' : 'PDF'}
              </button>
              <button
                onClick={() => handleExportExcel('quotations')}
                disabled={exportingExcel}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                <span className="mr-2">📊</span>
                {exportingExcel ? 'Exporting...' : 'Excel'}
              </button>
            </div>
          </div>

          {/* Approvals Report */}
          <div className="card hover:bg-white/15 transition-all duration-300">
            <div className="flex items-center mb-4">
              <span className="text-4xl mr-3">✅</span>
              <h3 className="text-lg font-semibold text-dark-text">Approvals Report</h3>
            </div>
            <p className="text-sm text-dark-muted mb-6">
              Export approval workflow data: pending approvals, risk levels, and approval history
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleExportPDF('approvals')}
                disabled={exportingPDF}
                className="flex-1 btn-secondary disabled:opacity-50"
              >
                <span className="mr-2">⬇️</span>
                PDF
              </button>
              <button
                onClick={() => handleExportExcel('approvals')}
                disabled={exportingExcel}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                <span className="mr-2">📊</span>
                Excel
              </button>
            </div>
          </div>

          {/* Invoices Report */}
          <div className="card hover:bg-white/15 transition-all duration-300">
            <div className="flex items-center mb-4">
              <span className="text-4xl mr-3">💰</span>
              <h3 className="text-lg font-semibold text-dark-text">Invoices Report</h3>
            </div>
            <p className="text-sm text-dark-muted mb-6">
              Export financial data: invoices, payments, outstanding balances, and payment history
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleExportPDF('invoices')}
                disabled={exportingPDF}
                className="flex-1 btn-secondary disabled:opacity-50"
              >
                <span className="mr-2">⬇️</span>
                PDF
              </button>
              <button
                onClick={() => handleExportExcel('invoices')}
                disabled={exportingExcel}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                <span className="mr-2">📊</span>
                Excel
              </button>
            </div>
          </div>
        </div>

        {/* Info Note */}
        <div className="mt-8 card animate-fade-in" style={{ 
          animationDelay: '0.5s',
          background: 'rgba(124, 58, 237, 0.1)',
          borderColor: 'rgba(124, 58, 237, 0.3)'
        }}>
          <p className="text-sm text-dark-text">
            <strong className="text-primary-light">Note:</strong> PDF exports generate professional formatted reports. 
            Excel exports provide raw data in CSV format for further analysis in spreadsheet applications.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Reports;
