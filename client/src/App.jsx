import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { AlertProvider } from './context/AlertContext';

// Layout
import Layout from './components/layout/Layout';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import NewSalePage from './pages/NewSalePage';
import ScanMedicinePage from './pages/ScanMedicinePage';
import InventoryPage from './pages/InventoryPage';
import BatchesPage from './pages/BatchesPage';
import MedicinesPage from './pages/MedicinesPage';
import SuppliersPage from './pages/SuppliersPage';
import TransactionsPage from './pages/TransactionsPage';
import PredictionsPage from './pages/PredictionsPage';
import ExpiryRiskPage from './pages/ExpiryRiskPage';
import WhatIfSimulatorPage from './pages/WhatIfSimulatorPage';
import ReportsPage from './pages/ReportsPage';
import AlertCenterPage from './pages/AlertCenterPage';
import AiAssistantPage from './pages/AiAssistantPage';
import SettingsPage from './pages/SettingsPage';

// Protected Route Guard
const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-3">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400 font-medium">Initializing MedStock AI Console...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

function App() {
  return (
    <AuthProvider>
      <AlertProvider>
        <CartProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Auth Route */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected Pharmacy Console */}
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/pos" element={<NewSalePage />} />
                  <Route path="/scan" element={<ScanMedicinePage />} />
                  <Route path="/inventory" element={<InventoryPage />} />
                  <Route path="/batches" element={<BatchesPage />} />
                  <Route path="/medicines" element={<MedicinesPage />} />
                  <Route path="/suppliers" element={<SuppliersPage />} />
                  <Route path="/transactions" element={<TransactionsPage />} />
                  <Route path="/predictions" element={<PredictionsPage />} />
                  <Route path="/expiry-risk" element={<ExpiryRiskPage />} />
                  <Route path="/simulator" element={<WhatIfSimulatorPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/alerts" element={<AlertCenterPage />} />
                  <Route path="/assistant" element={<AiAssistantPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Route>

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AlertProvider>
    </AuthProvider>
  );
}

export default App;
