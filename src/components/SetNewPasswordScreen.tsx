import React, { useState } from 'react';
import { 
  KeyRound, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  ShieldAlert, 
  ArrowRight,
  LogOut
} from 'lucide-react';
import { AuthenticatedUser, setPermanentPassword } from '../lib/authService';

interface SetNewPasswordScreenProps {
  user: AuthenticatedUser;
  onPasswordSetSuccessfully: (updatedUser: AuthenticatedUser) => void;
  onCancel: () => void;
  messName?: string;
}

export const SetNewPasswordScreen: React.FC<SetNewPasswordScreenProps> = ({
  user,
  onPasswordSetSuccessfully,
  onCancel,
  messName = 'MORYA MESS'
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newPassword) {
      setError('Please enter your new password.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters in length.');
      return;
    }
    if (newPassword === '112233') {
      setError('Your new permanent password cannot be the default temporary password (112233). Please choose a new secure password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await setPermanentPassword(user, newPassword, confirmPassword);
      if (!result.success || !result.updatedUser) {
        setError(result.error || 'Failed to update permanent password.');
        setIsLoading(false);
        return;
      }

      // Successfully saved!
      onPasswordSetSuccessfully(result.updatedUser);
    } catch (err: any) {
      setError(err?.message || 'An error occurred while saving password.');
    } finally {
      setIsLoading(false);
    }
  };

  const isMinLength = newPassword.length >= 6;
  const isNotDefault = newPassword.length > 0 && newPassword !== '112233';
  const isMatching = newPassword.length > 0 && newPassword === confirmPassword;

  return (
    <div className="min-h-screen bg-linear-to-b from-orange-50 via-slate-50 to-white flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <header className="max-w-md w-full mx-auto pt-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {messName}
        </h1>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          ॥ श्री गणेशाय नमः ॥
        </p>
      </header>

      {/* Main Set New Password Card */}
      <main className="max-w-md w-full mx-auto my-6">
        <div className="bg-white rounded-3xl border-2 border-orange-200 shadow-2xl p-6 sm:p-8 relative overflow-hidden">
          {/* Top Banner Stripe */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-linear-to-r from-orange-500 to-amber-500" />

          {/* Heading */}
          <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Set New Password
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Mandatory First-Time Security Requirement
              </p>
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Dashboard Access Blocked</span>
            </div>
            <p>
              You successfully authenticated with the temporary password <span className="font-mono font-bold bg-amber-200/80 px-1 py-0.5 rounded text-amber-950">112233</span>. You must set your permanent password before entering the {user.role === 'student' ? 'Student Pass' : 'Owner'} Dashboard.
            </p>
            <p className="text-[11px] text-amber-800 pt-1">
              Account: <strong className="font-mono text-amber-950">{user.identifier}</strong>
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-800 font-medium animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new permanent password"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:bg-white rounded-xl text-sm text-slate-900 pl-10 pr-10 py-2.5 outline-none transition-colors"
                  autoFocus
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="p-1 text-slate-400 hover:text-slate-600 absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new permanent password"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:bg-white rounded-xl text-sm text-slate-900 pl-10 pr-10 py-2.5 outline-none transition-colors"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="p-1 text-slate-400 hover:text-slate-600 absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Checklist */}
            <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className={`w-3.5 h-3.5 ${isMinLength ? 'text-emerald-600' : 'text-slate-300'}`} />
                <span className={isMinLength ? 'text-emerald-700 font-semibold' : ''}>At least 6 characters</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className={`w-3.5 h-3.5 ${isNotDefault ? 'text-emerald-600' : 'text-slate-300'}`} />
                <span className={isNotDefault ? 'text-emerald-700 font-semibold' : ''}>Different from default (112233)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className={`w-3.5 h-3.5 ${isMatching ? 'text-emerald-600' : 'text-slate-300'}`} />
                <span className={isMatching ? 'text-emerald-700 font-semibold' : ''}>Passwords match</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !isMinLength || !isNotDefault || !isMatching}
              className={`w-full py-3 px-4 rounded-xl text-white font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 active:scale-98 ${
                (isLoading || !isMinLength || !isNotDefault || !isMatching) ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <span>Saving Permanent Password...</span>
              ) : (
                <>
                  <span>Save Password & Enter Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Cancel & Log out */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={onCancel}
              className="text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cancel & Sign Out</span>
            </button>
            <span className="text-[11px] text-slate-400">Step 2 of 2: Security</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-md w-full mx-auto py-4 text-center text-xs text-slate-400">
        <p>© 2026 {messName} • Account Security Enforced</p>
      </footer>
    </div>
  );
};
