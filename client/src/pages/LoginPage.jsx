import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Pill, Lock, Mail, User, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { user, login, register, isSetupRequired } = useAuth();

  const [isRegister, setIsRegister] = useState(isSetupRequired);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-4 shadow-lg">
          <Pill className="w-8 h-8 rotate-45" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">MedStock AI</h1>
        <p className="mt-1 text-xs text-slate-400 font-medium">
          Intelligent Medicine Inventory, Billing & Expiry Risk Management
        </p>

        {isSetupRequired && (
          <div className="mt-4 p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Empty database detected. First user will be initialized as Administrator.</span>
          </div>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="bg-slate-800/90 backdrop-blur-xl py-8 px-6 sm:px-10 rounded-2xl border border-slate-700/60 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-700 pb-4">
            <h2 className="text-lg font-bold text-white">
              {isSetupRequired ? 'Initialize Admin Account' : isRegister ? 'Create Staff Account' : 'Sign in to Console'}
            </h2>
            {!isSetupRequired && (
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError('');
                }}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
              >
                {isRegister ? 'Already registered? Sign in' : 'Create new account'}
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
                    placeholder="e.g. Dr. Jane Pharmacist"
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
                  placeholder="admin@medstock.ai"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Password</label>
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
                  <option value="staff">Staff / Pharmacist</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              <span>{loading ? 'Authenticating...' : isSetupRequired ? 'Initialize System' : isRegister ? 'Register Account' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Credentials Info */}
          <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-700/40 text-[11px] text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">Development Seed Credentials (if seed was executed):</p>
            <p>Admin: <span className="font-mono text-emerald-400">admin@medstock.ai</span> / <span className="font-mono text-emerald-400">Admin@123456</span></p>
            <p>Staff: <span className="font-mono text-emerald-400">staff@medstock.ai</span> / <span className="font-mono text-emerald-400">Staff@123456</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
