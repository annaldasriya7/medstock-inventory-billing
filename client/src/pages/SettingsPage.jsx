import React, { useState, useEffect } from 'react';
import { Settings, Save, Building2, ShieldCheck, RefreshCw, GitFork } from 'lucide-react';
import { api } from '../services/api';

const SettingsPage = () => {
  const [settings, setSettings] = useState({
    pharmacyName: 'MedStock AI Pharmacy',
    tagline: 'Intelligent Inventory & Healthcare Operations',
    address: '101 Healthcare Blvd, Medical District',
    phone: '+91 98765 43210',
    email: 'contact@medstockai.com',
    currencySymbol: '₹',
    taxRatePercent: 12,
    lowStockThresholdUnits: 20,
    criticalStockThresholdUnits: 5,
    nearExpiryThresholdDays: 90,
    criticalExpiryThresholdDays: 30,
    defaultLeadTimeDays: 5,
    safetyStockDays: 7
  });

  const [branches, setBranches] = useState([]);
  const [redistributions, setRedistributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const [setRes, brRes, redisRes] = await Promise.all([
          api.getSettings(),
          api.getBranches(),
          api.getRedistributionSuggestions()
        ]);
        if (setRes.settings) setSettings(setRes.settings);
        setBranches(brRes.branches || []);
        setRedistributions(redisRes.suggestions || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.updateSettings(settings);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      alert(err.message || 'Error updating settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-slate-700" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System & Pharmacy Settings</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure enterprise tax rules, low-stock trigger boundaries, and multi-branch nodes.
          </p>
        </div>

        {savedSuccess && (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-lg">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Settings saved successfully!</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form onSubmit={handleSave} className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-xs">
          <div>
            <h2 className="text-sm font-bold text-slate-800 border-b pb-2 mb-3">Pharmacy Profile</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Pharmacy / Clinic Name</label>
                <input
                  type="text"
                  value={settings.pharmacyName}
                  onChange={(e) => setSettings({ ...settings, pharmacyName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Tagline</label>
                <input
                  type="text"
                  value={settings.tagline}
                  onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Phone</label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Email</label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-800 border-b pb-2 mb-3">Taxation & Currency</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Pharmaceutical GST / Tax Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.taxRatePercent}
                  onChange={(e) => setSettings({ ...settings, taxRatePercent: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Currency Symbol</label>
                <input
                  type="text"
                  value={settings.currencySymbol}
                  onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-800 border-b pb-2 mb-3">Inventory & Expiry Thresholds</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Low Stock (Units)</label>
                <input
                  type="number"
                  min="1"
                  value={settings.lowStockThresholdUnits}
                  onChange={(e) => setSettings({ ...settings, lowStockThresholdUnits: parseInt(e.target.value) || 20 })}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Critical Stock</label>
                <input
                  type="number"
                  min="0"
                  value={settings.criticalStockThresholdUnits}
                  onChange={(e) => setSettings({ ...settings, criticalStockThresholdUnits: parseInt(e.target.value) || 5 })}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Near Expiry (Days)</label>
                <input
                  type="number"
                  min="1"
                  value={settings.nearExpiryThresholdDays}
                  onChange={(e) => setSettings({ ...settings, nearExpiryThresholdDays: parseInt(e.target.value) || 90 })}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Safety Stock (Days)</label>
                <input
                  type="number"
                  min="1"
                  value={settings.safetyStockDays}
                  onChange={(e) => setSettings({ ...settings, safetyStockDays: parseInt(e.target.value) || 7 })}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-sm"
            >
              <Save className="w-4 h-4 text-emerald-400" />
              <span>{saving ? 'Saving Changes...' : 'Save System Settings'}</span>
            </button>
          </div>
        </form>

        {/* Multi-Branch Support & Redistribution (Requirement 31) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
            <div className="flex items-center gap-2 border-b pb-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <h2 className="font-bold text-slate-900">Branch Nodes ({branches.length})</h2>
            </div>
            {branches.map(b => (
              <div key={b._id} className="p-3 bg-slate-50 rounded-xl border flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-800">{b.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">Code: {b.code}</p>
                </div>
                {b.isMain && <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold text-[10px] rounded-full">Main HQ</span>}
              </div>
            ))}
          </div>

          {/* Inter-Branch Redistribution Recommendations */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
            <div className="flex items-center gap-2 border-b pb-2">
              <GitFork className="w-4 h-4 text-purple-600" />
              <h2 className="font-bold text-slate-900">Stock Redistribution AI</h2>
            </div>
            {redistributions.length > 0 ? (
              <div className="space-y-2">
                {redistributions.map((r, idx) => (
                  <div key={idx} className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl space-y-1">
                    <p className="font-bold text-purple-900">{r.medicineName}: Transfer {r.recommendedTransferQuantity} units</p>
                    <p className="text-[10px] text-slate-600">{r.sourceBranch.name} → {r.destinationBranch.name}</p>
                    <p className="text-[10px] text-slate-500 italic">{r.reason}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400">
                No branch imbalances detected. Stock redistribution requires at least 2 branches with surplus/deficit margins.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
