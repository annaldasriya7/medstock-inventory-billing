import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, AlertOctagon, CheckCheck, Trash2, RefreshCw, Layers, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { useAlerts } from '../context/AlertContext';

const AlertCenterPage = () => {
  const { refreshAlerts } = useAlerts();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await api.getAlerts();
      setAlerts(res.alerts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleSync = async () => {
    try {
      setSyncing(true);
      await api.syncAlerts();
      await fetchAlerts();
      refreshAlerts();
    } catch (err) {
      alert(err.message || 'Error syncing alerts');
    } finally {
      setSyncing(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllAlertsRead();
      fetchAlerts();
      refreshAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDismiss = async (id) => {
    try {
      await api.dismissAlert(id);
      setAlerts(prev => prev.filter(a => a._id !== id));
      refreshAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-6 h-6 text-rose-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Alert & Notification Center</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Centralized telemetry warnings for stock depletion, near-expiry lots, and demand spikes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>Rescan & Sync Alerts</span>
          </button>

          {alerts.length > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Mark All Read</span>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-2 bg-white rounded-2xl border border-slate-200">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin text-rose-600" />
            <p className="text-xs">Evaluating alert thresholds...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2 bg-white rounded-2xl border border-slate-200">
            <ShieldCheck className="w-12 h-12 mx-auto text-emerald-400 stroke-1" />
            <p className="text-sm font-semibold text-slate-700">0 Active System Alerts</p>
            <p className="text-xs text-slate-400">All registered medicines and batches are within safe operating limits.</p>
          </div>
        ) : (
          alerts.map(a => (
            <div
              key={a._id}
              className={`p-4 rounded-2xl border bg-white shadow-xs flex items-start justify-between gap-4 transition-all ${
                a.severity === 'critical' ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200'
              }`}
            >
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                    a.severity === 'critical' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {a.type}
                  </span>
                  <span className="text-[10px] text-slate-400">{new Date(a.date).toLocaleDateString()} {new Date(a.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="font-semibold text-slate-800 text-xs mt-1">{a.message}</p>
                {a.actionRecommendation && (
                  <p className="text-[11px] text-slate-500 italic mt-0.5">
                    Recommended Action: {a.actionRecommendation}
                  </p>
                )}
              </div>

              <button
                onClick={() => handleDismiss(a._id)}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                title="Dismiss Alert"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AlertCenterPage;
