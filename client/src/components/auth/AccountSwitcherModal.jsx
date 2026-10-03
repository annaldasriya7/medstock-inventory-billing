import React, { useState } from 'react';
import {
  Users,
  Shield,
  Crown,
  User as UserIcon,
  Plus,
  X,
  Lock,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Trash2,
  RefreshCw,
  Sparkles,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ForgotPasswordModal from './ForgotPasswordModal';

const AccountSwitcherModal = ({
  isOpen,
  onClose,
  onAddNewAccount,
  isStandalone = false // true when embedded directly in LoginPage
}) => {
  const {
    user: currentUser,
    savedAccounts,
    switchToStaffAccount,
    verifyAndSwitchToAdmin,
    removeSavedAccount,
    logoutAllAccounts
  } = useAuth();
  const navigate = useNavigate();

  // Admin Password Verification Modal State
  const [adminAuthTarget, setAdminAuthTarget] = useState(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);

  // Account Removal Confirmation State
  const [accountToRemove, setAccountToRemove] = useState(null);

  // Forgot Password State
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotPasswordTargetEmail, setForgotPasswordTargetEmail] = useState('');

  if (!isOpen && !isStandalone) return null;

  const handleSelectAccount = async (account) => {
    setAuthError('');

    // If account is already the active user, simply close
    if (currentUser && (currentUser.id === account.id || currentUser._id === account.id)) {
      if (onClose) onClose();
      navigate('/');
      return;
    }

    // Admin account ALWAYS requires password verification
    if (account.role === 'admin') {
      setAdminAuthTarget(account);
      setAdminPassword('');
      return;
    }

    // Staff account: Switch immediately without password
    try {
      setLoading(true);
      await switchToStaffAccount(account);
      if (onClose) onClose();
      navigate('/');
    } catch (err) {
      setAuthError(err.message || 'Failed to switch account.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminVerify = async (e) => {
    e.preventDefault();
    if (!adminAuthTarget || !adminPassword.trim()) return;

    setLoading(true);
    setAuthError('');

    try {
      const identifier = adminAuthTarget.email || adminAuthTarget.name || 'riya@medstock.ai';
      await verifyAndSwitchToAdmin(identifier, adminPassword.trim());
      setAdminAuthTarget(null);
      setAdminPassword('');
      if (onClose) onClose();
      navigate('/');
    } catch (err) {
      setAuthError(err.message || 'Incorrect administrator password.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRemove = () => {
    if (!accountToRemove) return;
    try {
      removeSavedAccount(accountToRemove.id);
      setAccountToRemove(null);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const content = (
    <div className={`relative w-full ${isStandalone ? 'max-w-md mx-auto' : 'max-w-md bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl p-6 overflow-hidden'}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-700/60 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">MedStock AI Switcher</h2>
            <p className="text-[11px] text-slate-400 font-medium">Select an authorized account to continue</p>
          </div>
        </div>
        {!isStandalone && onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {authError && (
        <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{authError}</span>
        </div>
      )}

      {/* Saved Accounts List */}
      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
        {savedAccounts.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-2 bg-slate-900/40 rounded-2xl border border-slate-700/50">
            <UserIcon className="w-10 h-10 mx-auto text-slate-500 stroke-1" />
            <p className="text-xs font-semibold text-slate-300">No accounts saved on this device</p>
            <p className="text-[11px] text-slate-500">Sign in once with credentials to enable 1-click switching.</p>
          </div>
        ) : (
          savedAccounts.map((acc) => {
            const isActive = currentUser && (currentUser.id === acc.id || currentUser._id === acc.id);
            const isAdmin = acc.role === 'admin';

            return (
              <div
                key={acc.id || acc.email}
                className={`group relative flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30 shadow-md'
                    : 'bg-slate-900/50 hover:bg-slate-700/40 border-slate-700/60 hover:border-slate-600'
                }`}
                onClick={() => handleSelectAccount(acc)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar Icon */}
                  <div
                    className={`relative w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                      isAdmin
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    {isAdmin ? <Crown className="w-5 h-5 text-amber-400" /> : <UserIcon className="w-5 h-5 text-emerald-400" />}
                    {isActive && (
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center" />
                    )}
                  </div>

                  {/* Account Metadata */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-white truncate">{acc.name}</span>
                      {isAdmin && (
                        <span className="px-1.5 py-0.2 text-[9px] font-extrabold uppercase rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                          Admin 👑
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="capitalize">{acc.role || 'Staff'}</span>
                      <span>•</span>
                      <span className="truncate text-slate-500">{acc.email}</span>
                    </div>
                  </div>
                </div>

                {/* Right Action / Active Pill */}
                <div className="flex items-center gap-2 shrink-0">
                  {isActive ? (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      <span>Active</span>
                    </span>
                  ) : isAdmin ? (
                    <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-400" />
                      <span className="hidden sm:inline">Requires PIN</span>
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                      <span>Switch</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  )}

                  {/* Remove button for non-admin accounts */}
                  {!isAdmin && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAccountToRemove(acc);
                      }}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Remove from this device"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add New Account / Login Form Trigger */}
      <div className="pt-4 mt-3 border-t border-slate-700/60">
        <button
          type="button"
          onClick={() => {
            if (onAddNewAccount) {
              onAddNewAccount();
            } else {
              if (onClose) onClose();
              navigate('/login?action=add-account');
            }
          }}
          className="w-full py-2.5 px-4 rounded-xl border border-dashed border-slate-600 hover:border-emerald-500 text-xs font-semibold text-slate-300 hover:text-white hover:bg-emerald-500/10 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>+ Add or Sign in with Another Account</span>
        </button>

        <button
          type="button"
          onClick={() => {
            logoutAllAccounts();
            if (onClose) onClose();
            navigate('/login');
          }}
          className="w-full mt-2 py-2 px-3 rounded-xl border border-transparent hover:border-rose-500/30 text-[11px] font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all flex items-center justify-center gap-1.5"
          title="Sign out of active session and clear all saved accounts from this device"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log Out All Accounts from This Device</span>
        </button>
      </div>

      {/* Admin Re-Authentication Modal */}
      {adminAuthTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl p-6">
            <div className="text-center pb-4 border-b border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center mx-auto mb-2">
                <Crown className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-sm font-bold text-white">Administrator Verification</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Switching to <span className="font-semibold text-white">{adminAuthTarget.name}</span> requires the Admin password.
              </p>
            </div>

            <form onSubmit={handleAdminVerify} className="pt-4 space-y-4">
              {authError && (
                <div className="p-2.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-300">
                    Admin Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotPasswordTargetEmail(adminAuthTarget.email || 'riya@medstock.ai');
                      setIsForgotPasswordOpen(true);
                    }}
                    className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    autoFocus
                    required
                    placeholder="Enter Admin password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAdminAuthTarget(null);
                    setAdminPassword('');
                    setAuthError('');
                  }}
                  className="flex-1 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !adminPassword.trim()}
                  className="flex-1 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-xl disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>Verify & Unlock</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Account Confirmation Dialog */}
      {accountToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white">Remove Account from Device?</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Remove <span className="font-semibold text-white">{accountToRemove.name}</span> from this device's switcher?
            </p>
            <p className="text-[10px] text-emerald-400 mt-2 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
              Note: This will NOT delete the staff account from MedStock AI database. You can re-add it at any time.
            </p>

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => setAccountToRemove(null)}
                className="flex-1 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-xl"
              >
                Keep Account
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        initialEmail={forgotPasswordTargetEmail}
      />
    </div>
  );

  if (isStandalone) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      {content}
    </div>
  );
};

export default AccountSwitcherModal;
