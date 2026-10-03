import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import AccountSwitcherModal from '../auth/AccountSwitcherModal';
import ForcedChangePasswordModal from '../auth/ForcedChangePasswordModal';
import { useAuth } from '../../context/AuthContext';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isSwitcherOpen, closeSwitcher } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Navbar onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Global In-App Account Switcher Modal */}
      <AccountSwitcherModal
        isOpen={isSwitcherOpen}
        onClose={closeSwitcher}
        isStandalone={false}
      />

      {/* Mandatory Forced Change Password Modal */}
      <ForcedChangePasswordModal />
    </div>
  );
};

export default Layout;
