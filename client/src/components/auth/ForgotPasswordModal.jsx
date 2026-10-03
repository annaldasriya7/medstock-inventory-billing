import React, { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  X,
  Eye,
  EyeOff,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { api } from '../../services/api';

const ForgotPasswordModal = ({ isOpen, onClose, initialEmail = '' }) => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password, 4: Success
  const [email, setEmail] = useState(initialEmail || '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  // Handle resend countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const handleClose = () => {
    setStep(1);
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setInfoMessage('');
    onClose();
  };

  // Step 1: Send OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.forgotPassword({ email: email.trim() });
      setInfoMessage(res.message || 'If an account matches this email, a 6-digit code has been dispatched.');
      setResendCooldown(60);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Unable to request password reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.forgotPassword({ email: email.trim() });
      setInfoMessage('A new 6-digit verification code has been dispatched.');
      setResendCooldown(60);
    } catch (err) {
      setError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.verifyResetOtp({ email: email.trim(), otp: otp.trim() });
      setError('');
      setStep(3);
    } catch (err) {
      setError(err.message || 'Incorrect or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation password do not match.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.resetPassword({
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
        confirmPassword
      });
      setStep(4);
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Reset Account Password</h3>
              <p className="text-[11px] text-slate-400">Step {step} of 3 • Secure Verification</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        {step <= 3 && (
          <div className="w-full bg-slate-800 h-1 rounded-full my-4 overflow-hidden">
            <div
              className="bg-emerald-400 h-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        )}

        {/* Feedback Messages */}
        {error && (
          <div className="my-3 p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {infoMessage && step === 2 && (
          <div className="my-3 p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* ================= STEP 1: ENTER EMAIL ================= */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4 pt-2">
            <p className="text-xs text-slate-300 leading-relaxed">
              Enter your registered pharmacy staff email address. We will dispatch a 6-digit verification code valid for 10 minutes.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="e.g. rahul@medstock.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="flex-1 py-2.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Send Code</span>}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>
        )}

        {/* ================= STEP 2: ENTER OTP ================= */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4 pt-2">
            <p className="text-xs text-slate-300 leading-relaxed">
              Enter the 6-digit one-time verification code sent to <strong className="text-white">{email}</strong>.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">6-Digit Code</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={6}
                  placeholder="••••••"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full py-3 text-center tracking-[0.5em] text-lg font-mono font-bold bg-slate-950 border border-slate-700 rounded-xl text-emerald-400 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>Valid for 10 minutes</span>
                </span>
                <button
                  type="button"
                  disabled={resendCooldown > 0 || loading}
                  onClick={handleResendOtp}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold disabled:text-slate-600"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setError('');
                }}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-xl flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="flex-1 py-2.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Verify Code</span>}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>
        )}

        {/* ================= STEP 3: SET NEW PASSWORD ================= */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4 pt-2">
            <p className="text-xs text-slate-300 leading-relaxed">
              Code verified! Create a strong new password for <strong className="text-white">{email}</strong>.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">New Password (min 8 chars)</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  minLength={8}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Checklist */}
            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1.5 text-[11px]">
              <div className={`flex items-center gap-1.5 ${newPassword.length >= 8 ? 'text-emerald-400' : 'text-slate-400'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>At least 8 characters long</span>
              </div>
              <div className={`flex items-center gap-1.5 ${newPassword && newPassword === confirmPassword ? 'text-emerald-400' : 'text-slate-400'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Passwords match</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep(2);
                  setError('');
                }}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-xl"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || newPassword.length < 8 || newPassword !== confirmPassword}
                className="flex-1 py-2.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Update Password</span>}
                {!loading && <ShieldCheck className="w-4 h-4" />}
              </button>
            </div>
          </form>
        )}

        {/* ================= STEP 4: SUCCESS ================= */}
        {step === 4 && (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Password Updated!</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Your password has been reset successfully and previous sessions have been invalidated. You can now log in with your new credentials.
              </p>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-full py-3 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-md"
            >
              Sign In Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
