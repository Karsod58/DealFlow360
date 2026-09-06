import { useState, useEffect } from 'react';
import { NavBar, InfoBanner } from '../components/shared';

interface DiscountCeiling {
  id?: number;
  tier: string | null;
  category: string | null;
  max_discount: number;
}

export function DiscountConfig() {
  const [tierCeilings, setTierCeilings] = useState<DiscountCeiling[]>([]);
  const [categoryCeilings, setCategoryCeilings] = useState<DiscountCeiling[]>([]);
  const [approvalRules, setApprovalRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      const token = localStorage.getItem('token');

      // Load discount ceilings
      const ceilingsResponse = await fetch('http://localhost:8000/api/admin/discount-ceilings', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (ceilingsResponse.ok) {
        const ceilings = await ceilingsResponse.json();
        
        // Separate tier and category ceilings
        const tiers = ceilings.filter((c: DiscountCeiling) => c.tier && !c.category);
        const categories = ceilings.filter((c: DiscountCeiling) => c.category && !c.tier);
        
        setTierCeilings(tiers.length > 0 ? tiers : [
          { tier: 'Bronze', category: null, max_discount: 5.0 },
          { tier: 'Silver', category: null, max_discount: 10.0 },
          { tier: 'Gold', category: null, max_discount: 15.0 },
        ]);
        
        setCategoryCeilings(categories.length > 0 ? categories : [
          { tier: null, category: 'Hardware', max_discount: 15.0 },
          { tier: null, category: 'Services', max_discount: 10.0 },
        ]);
      }

      // Load approval rules
      const rulesResponse = await fetch('http://localhost:8000/api/admin/approval-rules', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (rulesResponse.ok) {
        const rulesData = await rulesResponse.json();
        setApprovalRules(rulesData.rules);
      }
    } catch (error) {
      console.error('Failed to load configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTierCeiling = (index: number, field: keyof DiscountCeiling, value: any) => {
    const updated = [...tierCeilings];
    (updated[index] as any)[field] = value;
    setTierCeilings(updated);
  };

  const updateCategoryCeiling = (index: number, field: keyof DiscountCeiling, value: any) => {
    const updated = [...categoryCeilings];
    (updated[index] as any)[field] = value;
    setCategoryCeilings(updated);
  };

  const addTierCeiling = () => {
    setTierCeilings([...tierCeilings, { tier: '', category: null, max_discount: 0 }]);
  };

  const addCategoryCeiling = () => {
    setCategoryCeilings([...categoryCeilings, { tier: null, category: '', max_discount: 0 }]);
  };

  const removeTierCeiling = (index: number) => {
    setTierCeilings(tierCeilings.filter((_, i) => i !== index));
  };

  const removeCategoryCeiling = (index: number) => {
    setCategoryCeilings(categoryCeilings.filter((_, i) => i !== index));
  };

  const handleSaveConfiguration = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const allCeilings = [...tierCeilings, ...categoryCeilings];

      const response = await fetch('http://localhost:8000/api/admin/save-configuration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(allCeilings),
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      const result = await response.json();
      alert(result.message);
      loadConfiguration();
    } catch (error: any) {
      alert(error.message || 'Failed to save configuration');
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

  return (
    <>
      <NavBar />
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-dark-text">
            Discount Tiers and Approval Chains
          </h1>
          <p className="text-dark-muted mt-2">
            Configure discount ceilings and approval routing rules
          </p>
        </div>

        {/* Tier Discount Ceilings */}
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-dark-text">
              Tier Discount Ceilings
            </h2>
            <button onClick={addTierCeiling} className="btn-secondary text-sm">
              + Add Tier
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">
                    Tier
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-dark-muted">
                    Max Discount %
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-dark-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {tierCeilings.map((ceiling, index) => (
                  <tr key={index} className="border-b border-dark-border">
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={ceiling.tier || ''}
                        onChange={(e) => updateTierCeiling(index, 'tier', e.target.value)}
                        className="w-full px-3 py-1 bg-dark-bg border border-dark-border rounded text-dark-text"
                        placeholder="e.g., Bronze"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        step="0.1"
                        value={ceiling.max_discount}
                        onChange={(e) => updateTierCeiling(index, 'max_discount', parseFloat(e.target.value))}
                        className="w-24 px-3 py-1 bg-dark-bg border border-dark-border rounded text-dark-text text-right ml-auto"
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => removeTierCeiling(index)}
                        className="text-danger hover:text-red-400 text-sm"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category Discount Ceilings */}
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-dark-text">
              Category Discount Ceilings
            </h2>
            <button onClick={addCategoryCeiling} className="btn-secondary text-sm">
              + Add Category
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">
                    Category
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-dark-muted">
                    Max Discount %
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-dark-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {categoryCeilings.map((ceiling, index) => (
                  <tr key={index} className="border-b border-dark-border">
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={ceiling.category || ''}
                        onChange={(e) => updateCategoryCeiling(index, 'category', e.target.value)}
                        className="w-full px-3 py-1 bg-dark-bg border border-dark-border rounded text-dark-text"
                        placeholder="e.g., Hardware"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        step="0.1"
                        value={ceiling.max_discount}
                        onChange={(e) => updateCategoryCeiling(index, 'max_discount', parseFloat(e.target.value))}
                        className="w-24 px-3 py-1 bg-dark-bg border border-dark-border rounded text-dark-text text-right ml-auto"
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => removeCategoryCeiling(index)}
                        className="text-danger hover:text-red-400 text-sm"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Approval Routing Rules */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold text-dark-text mb-4">
            Approval Routing Rules
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">
                    Discount Range
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">
                    Blended Score
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {approvalRules.map((rule, index) => (
                  <tr key={index} className="border-b border-dark-border">
                    <td className="py-3 px-4 text-dark-text">{rule.discount_range}</td>
                    <td className="py-3 px-4 text-dark-muted">{rule.blended_score}</td>
                    <td className="py-3 px-4 text-dark-text">{rule.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Banner */}
        <InfoBanner>
          When a quote spans multiple category ceilings, the system must compute a blended risk
          score and route to the highest required level. All approvals, rejections, and edits
          must be logged with user, timestamp, and reason.
        </InfoBanner>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSaveConfiguration}
            className="btn-primary px-8"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </>
  );
}
