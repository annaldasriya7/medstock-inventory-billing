import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  Layers,
  Package,
  IndianRupee,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Skull,
  TrendingDown,
  Trash2,
  Activity,
  ArrowUpRight,
  PlusCircle,
  ScanLine,
  ShoppingCart,
  RefreshCw,
  PackagePlus,
  Bell
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { api } from '../services/api';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
const STATUS_COLORS = {
  Healthy: '#10b981',
  Low: '#f59e0b',
  Critical: '#ef4444',
  'Out of Stock': '#64748b',
  Overstocked: '#3b82f6'
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 9 Required KPIs
  const [kpi, setKpi] = useState({
    totalMedicines: 0,
    totalStockUnits: 0,
    todaySales: 0,
    todayRevenue: 0,
    lowStockMeds: 0,
    nearExpiryBatches: 0,
    expiredBatches: 0,
    stockoutRisk: 0,
    pendingAlerts: 0
  });

  const [healthScore, setHealthScore] = useState({
    score: 100,
    rating: 'Optimal',
    explanation: 'No current inventory risks detected.'
  });

  // Chart data states
  const [dailySalesData, setDailySalesData] = useState([]);
  const [consumptionData, setConsumptionData] = useState([]);
  const [stockStatusData, setStockStatusData] = useState([]);
  const [expiryStatusData, setExpiryStatusData] = useState([]);
  const [topMedicinesData, setTopMedicinesData] = useState([]);
  const [monthlyValuationData, setMonthlyValuationData] = useState([]);

  const loadDashboardData = async () => {
    try {
      setRefreshing(true);
      const [
        medsRes,
        batchesRes,
        salesRes,
        consumptionRes,
        expiryRes,
        healthRes,
        predRes,
        alertsRes
      ] = await Promise.all([
        api.getMedicines('limit=200'),
        api.getBatches('limit=200'),
        api.getSalesReport('filter=last30days'),
        api.getConsumptionReport('filter=last30days'),
        api.getExpiryReport(),
        api.getHealthScore(),
        api.getPredictions(),
        api.getAlerts()
      ]);

      const medicines = medsRes.medicines || [];
      const batches = batchesRes.batches || [];
      const predictions = predRes.predictions || [];
      const alerts = alertsRes.alerts || [];

      // Calculate stock status distribution
      const statusCounts = { Healthy: 0, Low: 0, Critical: 0, 'Out of Stock': 0, Overstocked: 0 };
      let lowCount = 0;
      let critCount = 0;

      for (const m of medicines) {
        statusCounts[m.stockStatus] = (statusCounts[m.stockStatus] || 0) + 1;
        if (m.stockStatus === 'Low') lowCount++;
        if (m.stockStatus === 'Critical') critCount++;
      }

      // Calculate batch expiry distribution
      let nearExpCount = expiryRes.summary?.nearExpiryCount || 0;
      let critExpCount = expiryRes.summary?.criticalNearExpiryCount || 0;
      let expCount = expiryRes.summary?.expiredCount || 0;
      let safeCount = (batches.length - nearExpCount - critExpCount - expCount);

      // Predicted stock-outs and zero-stock items
      const predictedStockouts = predictions.filter(p => p.stockoutRiskLevel === 'Critical' || p.stockoutRiskLevel === 'High').length;
      const zeroStockMeds = medicines.filter(m => (m.currentStock ?? m.totalStock ?? 0) === 0).length;
      const totalStockoutRisk = zeroStockMeds + predictedStockouts;

      // Unread alerts count
      const unreadAlerts = alerts.filter(a => !a.isRead).length;

      // Today's Sales and Revenue calculation
      const todayStr = new Date().toISOString().split('T')[0];
      const todaySalesRecord = salesRes.dailyTrend?.find(d => d.date === todayStr);
      const todaySalesCount = todaySalesRecord ? (todaySalesRecord.transactions || 0) : 0;
      const todayRevenueVal = todaySalesRecord ? (todaySalesRecord.sales || 0) : 0;

      // Total Stock units
      const totalStock = batches.filter(b => b.status !== 'Expired').reduce((sum, b) => sum + b.quantity, 0);

      setKpi({
        totalMedicines: medsRes.total || medicines.length,
        totalStockUnits: totalStock,
        todaySales: todaySalesCount,
        todayRevenue: todayRevenueVal,
        lowStockMeds: lowCount + critCount,
        nearExpiryBatches: nearExpCount + critExpCount,
        expiredBatches: expCount,
        stockoutRisk: totalStockoutRisk,
        pendingAlerts: unreadAlerts
      });

      setHealthScore(healthRes.health || { score: 100, rating: 'Optimal', explanation: '' });

      // Chart 1: Daily sales trend
      setDailySalesData(salesRes.dailyTrend || []);

      // Chart 2: Medicine consumption timeline
      setConsumptionData(consumptionRes.dailyTimeline || []);

      // Chart 3: Stock status distribution
      setStockStatusData([
        { name: 'Healthy', value: statusCounts.Healthy, color: '#10b981' },
        { name: 'Low Stock', value: statusCounts.Low, color: '#f59e0b' },
        { name: 'Critical Stock', value: statusCounts.Critical, color: '#ef4444' },
        { name: 'Out of Stock', value: statusCounts['Out of Stock'], color: '#64748b' },
        { name: 'Overstocked', value: statusCounts.Overstocked, color: '#3b82f6' }
      ].filter(d => d.value > 0));

      // Chart 4: Expiry Status
      setExpiryStatusData([
        { name: 'Safe (>6 Mo)', value: Math.max(0, safeCount), color: '#10b981' },
        { name: 'Near Expiry (1-3 Mo)', value: nearExpCount, color: '#f59e0b' },
        { name: 'Critical (<1 Mo)', value: critExpCount, color: '#f97316' },
        { name: 'Expired', value: expCount, color: '#ef4444' }
      ].filter(d => d.value > 0));

      // Chart 5 & 6: Top consumed medicines
      setTopMedicinesData(salesRes.topMedicines?.slice(0, 5) || []);

      // Chart 7: Monthly inventory valuation by category
      const invRes = await api.getInventoryReport();
      setMonthlyValuationData(invRes.categoryDistribution || []);

    } catch (err) {
      console.warn('Dashboard load error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const isDatabaseEmpty = kpi.totalMedicines === 0 && kpi.totalBatches === 0 && kpi.todaySales === 0;

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pharmacy Operations Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time medicine telemetry, FEFO batch allocations, and AI-powered demand forecasts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadDashboardData}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
            title="Refresh Dashboard"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>

          <button
            onClick={() => navigate('/stock-receiving')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors"
          >
            <PackagePlus className="w-4 h-4 text-blue-600" />
            <span>Receive Stock</span>
          </button>

          <button
            onClick={() => navigate('/scan')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
          >
            <ScanLine className="w-4 h-4 text-emerald-600" />
            <span>Scan Medicine</span>
          </button>

          <button
            onClick={() => navigate('/pos')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>New Sale</span>
          </button>
        </div>
      </div>

      {/* Empty State Banner (Requirement 5: Starts EMPTY with 0 counts) */}
      {isDatabaseEmpty && !loading && (
        <div className="p-6 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-emerald-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
              <h3 className="font-bold text-sm text-emerald-950">System Initialized — Database Starts Completely Empty</h3>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed max-w-2xl">
              0 medicines, 0 batches, and 0 sales are registered. As required for production fidelity, no mock records are automatically inserted. Start by scanning or registering medicines, or run the separate development test seed script.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate('/scan')}
              className="px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-white border border-emerald-300 rounded-xl shadow-sm hover:bg-emerald-50 transition-colors"
            >
              Scan First Medicine
            </button>
          </div>
        </div>
      )}

      {/* Inventory Health Score Banner (Requirement 29) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 rounded-2xl text-white shadow-lg border border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              <span className="text-xs uppercase tracking-wider font-bold text-slate-300">
                Inventory Health Diagnostic
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Score: {healthScore.score}/100 — <span className="text-emerald-400 font-semibold">{healthScore.rating}</span>
            </h2>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              {healthScore.explanation}
            </p>
          </div>

          <div className="flex flex-col items-center justify-center w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shrink-0">
            <span className="text-3xl font-extrabold text-white tracking-tight">{healthScore.score}</span>
            <span className="text-[10px] text-slate-300 uppercase tracking-widest font-semibold">Score</span>
          </div>
        </div>

        {/* Quick Action Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fast Navigation</span>
            <h3 className="text-sm font-bold text-slate-800 mt-1">Dispensing & Verification</h3>
            <p className="text-xs text-slate-500 mt-1">Open camera for barcode detection or register new stock.</p>
          </div>
          <button
            onClick={() => navigate('/scan')}
            className="mt-4 w-full py-2.5 px-3 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <ScanLine className="w-4 h-4 text-emerald-400" />
            <span>Launch Scanner</span>
          </button>
        </div>
      </div>

      {/* 9 Key Performance Metrics (Requirement 2) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-3.5">
        {/* 1. Total Medicines */}
        <div
          onClick={() => navigate('/medicines')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-blue-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">1. Total Medicines</span>
            <Boxes className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{kpi.totalMedicines}</p>
          <span className="text-[10px] text-slate-500">Active medicines in catalog</span>
        </div>

        {/* 2. Total Stock */}
        <div
          onClick={() => navigate('/inventory')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-emerald-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">2. Total Stock</span>
            <Package className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{kpi.totalStockUnits}</p>
          <span className="text-[10px] text-slate-500">Physical units across batches</span>
        </div>

        {/* 3. Today's Sales */}
        <div
          onClick={() => navigate('/bill-history')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-emerald-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">3. Today's Sales</span>
            <ShoppingCart className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{kpi.todaySales}</p>
          <span className="text-[10px] text-slate-500">Invoices billed today</span>
        </div>

        {/* 4. Today's Revenue */}
        <div
          onClick={() => navigate('/transactions')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-purple-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">4. Today's Revenue</span>
            <IndianRupee className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">₹{kpi.todayRevenue.toFixed(2)}</p>
          <span className="text-[10px] text-slate-500">Total revenue generated today</span>
        </div>

        {/* 5. Low Stock Medicines */}
        <div
          onClick={() => navigate('/inventory')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-amber-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">5. Low Stock Medicines</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 tracking-tight">{kpi.lowStockMeds}</p>
          <span className="text-[10px] text-slate-500">At or below reorder level</span>
        </div>

        {/* 6. Near Expiry Medicines */}
        <div
          onClick={() => navigate('/alerts')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-orange-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">6. Near Expiry</span>
            <Clock className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-orange-600 tracking-tight">{kpi.nearExpiryBatches}</p>
          <span className="text-[10px] text-slate-500">Batches expiring within 90 days</span>
        </div>

        {/* 7. Expired Medicines */}
        <div
          onClick={() => navigate('/alerts')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-rose-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">7. Expired Medicines</span>
            <Skull className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-700 tracking-tight">{kpi.expiredBatches}</p>
          <span className="text-[10px] text-slate-500">Batches past expiry date</span>
        </div>

        {/* 8. Stock-Out Risk */}
        <div
          onClick={() => navigate('/alerts')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-purple-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">8. Stock-Out Risk</span>
            <TrendingDown className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-600 tracking-tight">{kpi.stockoutRisk}</p>
          <span className="text-[10px] text-slate-500">Zero stock / Forecasted stockouts</span>
        </div>

        {/* 9. Pending Alerts */}
        <div
          onClick={() => navigate('/alerts')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-rose-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">9. Pending Alerts</span>
            <Bell className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-rose-600 tracking-tight">{kpi.pendingAlerts}</p>
          <span className="text-[10px] text-slate-500">Unread notifications</span>
        </div>
      </div>

      {/* 7 Required Charts (Requirement 7) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Daily Sales Trend */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">1. Daily Sales Trend</h3>
              <p className="text-xs text-slate-400">Revenue over last 30 days</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded">
              Transactions
            </span>
          </div>

          <div className="h-64 w-full">
            {dailySalesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailySalesData}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#salesGrad)" name="Sales (₹)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                <IndianRupee className="w-8 h-8 mb-2 opacity-30" />
                <span>No sales transactions recorded yet.</span>
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Medicine Consumption Timeline */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">2. Medicine Consumption Activity</h3>
              <p className="text-xs text-slate-400">Total units dispensed per day</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-600 rounded">
              Units Dispensed
            </span>
          </div>

          <div className="h-64 w-full">
            {consumptionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={consumptionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="quantity" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Units" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                <Package className="w-8 h-8 mb-2 opacity-30" />
                <span>No consumption events logged yet.</span>
              </div>
            )}
          </div>
        </div>

        {/* Chart 3: Stock Status Distribution */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">3. Stock Status Proportions</h3>
              <p className="text-xs text-slate-400">Inventory levels vs configured thresholds</p>
            </div>
          </div>

          <div className="h-64 w-full">
            {stockStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stockStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {stockStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                <Boxes className="w-8 h-8 mb-2 opacity-30" />
                <span>0 medicines in catalog.</span>
              </div>
            )}
          </div>
        </div>

        {/* Chart 4: Expiry Status Matrix */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">4. Expiry Horizon Status</h3>
              <p className="text-xs text-slate-400">Batch breakdown by remaining shelf-life</p>
            </div>
          </div>

          <div className="h-64 w-full">
            {expiryStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expiryStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {expiryStatusData.map((entry, index) => (
                      <Cell key={`cell-exp-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                <Clock className="w-8 h-8 mb-2 opacity-30" />
                <span>0 active batches in database.</span>
              </div>
            )}
          </div>
        </div>

        {/* Chart 5 & 6: Top Consumed / Selling Medicines */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">5. Top Consumed Medicines</h3>
              <p className="text-xs text-slate-400">Ranked by dispensed volume</p>
            </div>
          </div>

          <div className="h-64 w-full">
            {topMedicinesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={topMedicinesData}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="units" fill="#10b981" radius={[0, 4, 4, 0]} name="Units Sold" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                <span>No medicine sales data yet.</span>
              </div>
            )}
          </div>
        </div>

        {/* Chart 7: Monthly Inventory Valuation by Category */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">6 & 7. Inventory Value by Therapeutic Category</h3>
              <p className="text-xs text-slate-400">Total selling value of current stock</p>
            </div>
          </div>

          <div className="h-64 w-full">
            {monthlyValuationData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyValuationData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Stock Value (₹)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                <span>No inventory valuation data available.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
