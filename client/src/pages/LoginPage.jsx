import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import { Pill, Lock, Mail, User, ShieldCheck, ArrowRight, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AccountSwitcherModal from '../components/auth/AccountSwitcherModal';
import ForgotPasswordModal from '../components/auth/ForgotPasswordModal';

const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, login, register, isSetupRequired, savedAccounts } = useAuth();

  // If user explicitly passed ?action=add-account or ?form=true, start with form
  const shouldShowFormInitially = searchParams.get('action') === 'add-account' || savedAccounts.length === 0 || isSetupRequired;

  const [showLoginForm, setShowLoginForm] = useState(shouldShowFormInitially);
  const [isRegister, setIsRegister] = useState(isSetupRequired);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isSetupRequired) {
      setShowLoginForm(true);
      setIsRegister(true);
    }
  }, [isSetupRequired]);

  // If already logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister || isSetupRequired) {
        await register(formData);
      } else {
        await login(formData.email, formData.password);
      }
      navigate('/');
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-3 shadow-lg">
          <Pill className="w-8 h-8 rotate-45" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">MedStock AI</h1>
        <p className="mt-1 text-xs text-slate-400 font-medium">
          Intelligent Medicine Inventory, Billing & Account Management System
        </p>

        {isSetupRequired && (
          <div className="mt-4 p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Empty database detected. First user will be initialized as Administrator.</span>
          </div>
        )}
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        {!showLoginForm && savedAccounts.length > 0 && !isSetupRequired ? (
          /* ================= INSTAGRAM-STYLE ACCOUNT SWITCHER VIEW ================= */
          <div className="bg-slate-800/90 backdrop-blur-xl py-6 px-6 sm:px-8 rounded-3xl border border-slate-700/60 shadow-2xl">
            <AccountSwitcherModal
              isOpen={true}
              isStandalone={true}
              onAddNewAccount={() => setShowLoginForm(true)}
            />
          </div>
        ) : (
          /* ================= CREDENTIALS LOGIN / REGISTER FORM ================= */
          <div className="bg-slate-800/90 backdrop-blur-xl py-8 px-6 sm:px-10 rounded-3xl border border-slate-700/60 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-700 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {isSetupRequired ? 'Initialize Admin Account' : isRegister ? 'Create Staff Account' : 'Sign in with Password'}
                </h2>
                {savedAccounts.length > 0 && !isSetupRequired && (
                  <button
                    type="button"
                    onClick={() => setShowLoginForm(false)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 mt-1"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Back to Saved Accounts</span>
                  </button>
                )}
              </div>
              {!isSetupRequired && (
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setError('');
                  }}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                >
                  {isRegister ? 'Sign in' : 'Create account'}
                </button>
              )}
            </div>

            {error && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {(isRegister || isSetupRequired) && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="user@medstock.ai"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-semibold">Password</label>
                  {!isRegister && !isSetupRequired && (
                    <button
                      type="button"
                      onClick={() => setIsForgotPasswordOpen(true)}
                      className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {isRegister && !isSetupRequired && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="staff">Staff (Billing, Scan)</option>
                    <option value="pharmacist">Pharmacist (Stock, FEFO, Adjust)</option>
                    <option value="admin">Administrator (Full Privileges)</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                <span>{loading ? 'Authenticating...' : isSetupRequired ? 'Initialize System' : isRegister ? 'Register & Remember Account' : 'Sign In & Remember Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-700/40 text-[11px] text-slate-400 space-y-1">
              <p className="font-semibold text-slate-300">Device Remembrance:</p>
              <p>Once signed in, this account will be securely remembered on this device for 1-click Instagram-style switching.</p>
            </div>
          </div>
        )}
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        initialEmail={formData.email}
      />
    </div>
  );
};

export default LoginPage;
