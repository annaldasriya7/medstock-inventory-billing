import React, { useState } from 'react';
import {
  KeyRound,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  X,
  Lock
} from 'lucide-react';
import { api } from '../../services/api';

const AdminResetPasswordModal = ({ isOpen, onClose, staff, onResetSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !staff) return null;

  const handleClose = () => {
    setLoading(false);
    setError('');
    setTempPassword('');
    setCopied(false);
    onClose();
  };

  const handleConfirmReset = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.adminResetPassword(staff._id);
      setTempPassword(res.temporaryPassword);
      if (onResetSuccess) {
        onResetSuccess(staff);
      }
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!tempPassword) return;
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Admin Reset Password</h3>
              <p className="text-[11px] text-slate-500">Staff Account: {staff.name}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="my-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* State A: Confirmation */}
        {!tempPassword ? (
          <div className="pt-4 space-y-4">
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-amber-900">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Security Notice</span>
              </div>
              <p className="leading-relaxed text-[11px]">
                Resetting password for <strong className="text-slate-900">{staff.name}</strong> ({staff.email}) will generate a random temporary password and immediately invalidate all their existing login sessions across devices.
              </p>
              <p className="leading-relaxed text-[11px] font-medium text-amber-900">
                The staff member will be required to create a new password on their next sign-in.
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Staff Member:</span>
                <span className="font-semibold text-slate-900">{staff.name}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Email Address:</span>
                <span className="font-mono text-slate-900">{staff.email}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Account Role:</span>
                <span className="capitalize font-semibold text-purple-700">{staff.role}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={loading}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Confirm & Reset</span>}
              </button>
            </div>
          </div>
        ) : (
          /* State B: Temporary Password Display */
          <div className="pt-4 space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Password successfully reset! Provide this temporary code to the staff member.</span>
            </div>

            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-center space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Temporary Password
              </span>
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl font-mono font-bold text-emerald-400 tracking-wider">
                  {tempPassword}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                  title="Copy to clipboard"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              {copied && (
                <span className="text-[11px] text-emerald-400 font-semibold block">
                  Copied to clipboard!
                </span>
              )}
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
              <p className="font-semibold text-slate-800">Next Steps:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Give this temporary password to <strong>{staff.name}</strong>.</li>
                <li>Upon sign-in, MedStock AI will automatically force them to set their own new password.</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-full py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors"
            >
              Done & Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminResetPasswordModal;
