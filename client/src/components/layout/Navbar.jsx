import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  ScanLine,
  Bell,
  LogOut,
  User as UserIcon,
  ShoppingCart,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useAlerts } from '../../context/AlertContext';

const Navbar = ({ onOpenSidebar }) => {
  const { user, logout, isAdmin } = useAuth();
  const { cartItemCount } = useCart();
  const { unreadCount } = useAlerts();
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/inventory?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-white border-b border-slate-200">
      {/* Left Area: Toggle & Search */}
      <div className="flex items-center gap-3 md:gap-4 flex-1 max-w-lg">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="p-2 text-slate-500 rounded-lg hover:bg-slate-100 lg:hidden"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search medicine, generic, brand, barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
          />
        </form>
      </div>

      {/* Right Area: Shortcuts, Notifications, POS Cart, User */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Quick Scan Button */}
        <button
          onClick={() => navigate('/scan')}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
          title="Open Camera Scanner"
        >
          <ScanLine className="w-4 h-4 text-emerald-600" />
          <span>Scanner</span>
        </button>

        {/* Quick AI Assistant Button */}
        <button
          onClick={() => navigate('/assistant')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-lg transition-colors"
          title="Ask AI Assistant"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
          <span className="hidden sm:inline">AI Query</span>
        </button>

        {/* POS Cart Shortcut */}
        <button
          onClick={() => navigate('/pos')}
          className="relative p-2 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors"
          title="Point of Sale Cart"
        >
          <ShoppingCart className="w-5 h-5" />
          {cartItemCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-emerald-500 rounded-full border-2 border-white">
              {cartItemCount}
            </span>
          )}
        </button>

        {/* Notification Bell */}
        <button
          onClick={() => navigate('/alerts')}
          className="relative p-2 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors"
          title="Alert Center"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-rose-500 rounded-full border-2 border-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        <div className="h-6 w-px bg-slate-200 mx-1" />

        {/* User Pill & Logout */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-semibold text-slate-800 leading-tight">{user?.name}</span>
            <span className="text-[10px] text-slate-500 capitalize">{user?.role}</span>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Log out of system"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline text-xs font-medium">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
