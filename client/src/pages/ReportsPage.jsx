import React, { useState, useEffect } from 'react';
import { FileBarChart2, Download, Calendar, IndianRupee, Package, Layers, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState('sales');
  const [filter, setFilter] = useState('last30days');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    try {
      setLoading(true);
      if (activeTab === 'sales') {
        const res = await api.getSalesReport(`filter=${filter}`);
        setReportData(res);
      } else if (activeTab === 'consumption') {
        const res = await api.getConsumptionReport(`filter=${filter}`);
        setReportData(res);
      } else if (activeTab === 'inventory') {
        const res = await api.getInventoryReport();
        setReportData(res);
      } else if (activeTab === 'expiry') {
        const res = await api.getExpiryReport();
        setReportData(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeTab, filter]);

  const handleDownloadCsv = () => {
    const url = api.getExportCsvUrl(activeTab === 'sales' ? 'sales' : 'inventory', filter);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <FileBarChart2 className="w-6 h-6 text-emerald-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analytics & Reports</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational and financial audit reports with multi-interval filtering and CSV export.
          </p>
        </div>

        <button
          onClick={handleDownloadCsv}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
          {[
            { id: 'sales', label: 'Sales & Revenue' },
            { id: 'consumption', label: 'Stock Consumption' },
            { id: 'inventory', label: 'Inventory Valuation' },
            { id: 'expiry', label: 'Expiry & Wastage' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === t.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Date Filter */}
        {(activeTab === 'sales' || activeTab === 'consumption') && (
          <div className="flex items-center gap-1.5 text-xs font-medium self-end sm:self-auto">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border rounded-xl"
            >
              <option value="today">Today</option>
              <option value="last7days">Last 7 Days</option>
              <option value="last30days">Last 30 Days</option>
            </select>
          </div>
        )}
      </div>

      {/* Report Content */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin text-emerald-600" />
            <p className="text-xs">Generating report...</p>
          </div>
        ) : activeTab === 'sales' ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Total Revenue</span>
                <p className="text-xl font-bold text-slate-900 mt-1">₹{reportData?.summary?.totalRevenue?.toFixed(2) || '0.00'}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Transactions</span>
                <p className="text-xl font-bold text-slate-900 mt-1">{reportData?.summary?.totalTransactions || 0}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Units Sold</span>
                <p className="text-xl font-bold text-slate-900 mt-1">{reportData?.summary?.totalUnitsSold || 0}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Average Order Value</span>
                <p className="text-xl font-bold text-slate-900 mt-1">₹{reportData?.summary?.averageOrderValue?.toFixed(2) || '0.00'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase text-slate-700">Top Performing Medicines</h3>
              <div className="border rounded-xl divide-y text-xs">
                {reportData?.topMedicines?.map((m, idx) => (
                  <div key={idx} className="p-3 flex justify-between items-center">
                    <span className="font-semibold text-slate-800">{m.name}</span>
                    <div className="text-right">
                      <span className="font-bold text-slate-900">₹{m.revenue.toFixed(2)}</span>
                      <span className="text-slate-400 text-[11px] ml-2">({m.units} units)</span>
                    </div>
                  </div>
                ))}
                {(!reportData?.topMedicines || reportData?.topMedicines?.length === 0) && (
                  <p className="p-4 text-center text-slate-400">0 sales recorded in this interval.</p>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'consumption' ? (
          <div className="space-y-4 text-xs">
            <h3 className="font-bold uppercase text-slate-700">Itemized Consumption Log</h3>
            <div className="border rounded-xl divide-y">
              {reportData?.consumptionList?.map((c, idx) => (
                <div key={idx} className="p-3 flex justify-between items-center">
                  <span className="font-semibold text-slate-800">{c.name}</span>
                  <span className="font-bold text-indigo-700">{c.totalConsumed} units consumed across {c.batchesCount} batch(es)</span>
                </div>
              ))}
              {(!reportData?.consumptionList || reportData?.consumptionList?.length === 0) && (
                <p className="p-4 text-center text-slate-400">0 consumption records in this interval.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-600">
            <p className="font-bold text-slate-800 mb-2">Inventory Valuation Summary</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] uppercase text-slate-400">Total Valuation (Selling)</span>
                <p className="font-bold text-slate-900 text-lg">₹{reportData?.summary?.totalValuationSelling || 0}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] uppercase text-slate-400">Total Valuation (Cost)</span>
                <p className="font-bold text-slate-900 text-lg">₹{reportData?.summary?.totalValuationPurchase || 0}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
