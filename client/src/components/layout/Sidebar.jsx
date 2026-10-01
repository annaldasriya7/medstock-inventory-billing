import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  ScanLine,
  Boxes,
  Layers,
  Pill,
  Truck,
  ReceiptText,
  TrendingUp,
  AlertTriangle,
  SlidersHorizontal,
  FileBarChart2,
  Bell,
  Bot,
  Settings
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAlerts } from '../../context/AlertContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, isAdmin } = useAuth();
  const { unreadCount } = useAlerts();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'New Sale (POS)', path: '/pos', icon: ShoppingCart, highlight: true },
    { label: 'Scan Medicine', path: '/scan', icon: ScanLine },
    { label: 'Inventory', path: '/inventory', icon: Boxes },
    { label: 'Batches (FEFO)', path: '/batches', icon: Layers },
    { label: 'Medicines Catalog', path: '/medicines', icon: Pill },
    { label: 'Suppliers', path: '/suppliers', icon: Truck },
    { label: 'Transactions', path: '/transactions', icon: ReceiptText },
    { label: 'AI Demand Forecast', path: '/predictions', icon: TrendingUp },
    { label: 'Expiry & Wastage Risk', path: '/expiry-risk', icon: AlertTriangle },
    { label: 'What-If Simulator', path: '/simulator', icon: SlidersHorizontal },
    { label: 'Reports & Analytics', path: '/reports', icon: FileBarChart2 },
    { label: 'Alert Center', path: '/alerts', icon: Bell, badge: unreadCount },
    { label: 'AI Inventory Assistant', path: '/assistant', icon: Bot, aiBadge: true },
    { label: 'Settings', path: '/settings', icon: Settings, adminOnly: true }
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 bg-slate-900 text-slate-200 border-r border-slate-800 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Pill className="w-6 h-6 rotate-45" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg tracking-tight text-white">MedStock</span>
              <span className="px-1.5 py-0.5 text-xs font-semibold uppercase bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30">
                AI
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Smart Pharmacy System</p>
          </div>
        </div>

        {/* User Role Indicator Card */}
        <div className="px-4 py-3 mx-3 my-2 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-between">
          <div className="truncate">
            <p className="text-xs font-semibold text-white truncate">{user?.name || 'Staff Member'}</p>
            <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              isAdmin
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            {user?.role || 'Staff'}
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-500 text-white font-semibold shadow-sm'
                      : item.highlight
                      ? 'text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300'
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold text-white bg-rose-600 rounded-full animate-pulse">
                    {item.badge}
                  </span>
                )}
                {item.aiBadge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase text-cyan-300 bg-cyan-500/20 border border-cyan-500/30 rounded">
                    AI
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer Info */}
        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
          <span>v1.0.0 Final Year Project</span>
          <span className="text-emerald-500">FEFO Active</span>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
