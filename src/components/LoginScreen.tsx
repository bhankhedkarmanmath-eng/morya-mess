import React, { useState } from 'react';
import { 
  Building, 
  GraduationCap, 
  ArrowLeft, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  ShieldCheck, 
  KeyRound,
  Sparkles
} from 'lucide-react';
import { AuthPortal, AuthenticatedUser, authenticateOwnerOrStaff, authenticateStudent } from '../lib/authService';
import { Customer } from '../types/mess';

interface LoginScreenProps {
  portal: AuthPortal;
  onBack: () => void;
  onRequirePasswordReset: (user: AuthenticatedUser) => void;
  onAuthenticated: (user: AuthenticatedUser) => void;
  allCustomers: Customer[];
  messName?: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  portal,
  onBack,
  onRequirePasswordReset,
  onAuthenticated,
  allCustomers,
  messName = 'MORYA MESS'
}) => {
  const isOwner = portal === 'owner';
  const [identifier, setIdentifier] = useState(isOwner ? 'bhankhedkarmanmath3@gmail.com' : '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim()) {
      setError(isOwner ? 'Please enter your username or email.' : 'Please enter your Student ID or Mobile Number.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);

    try {
      if (isOwner) {
        const result = await authenticateOwnerOrStaff(identifier, password);
        if (!result.success) {
          setError(result.error || 'Authentication failed. Please check your credentials.');
          setIsLoading(false);
          return;
        }

        if (result.requiresPasswordReset && result.user) {
          // First-time login with temporary password 112233
          // Do NOT log into dashboard automatically!
          onRequirePasswordReset(result.user);
        } else if (result.user) {
          // Normal authenticated login with permanent password
          onAuthenticated(result.user);
        }
      } else {
        // Student login
        const result = await authenticateStudent(identifier, password, allCustomers);
        if (!result.success) {
          setError(result.error || 'Student authentication failed.');
          setIsLoading(false);
          return;
        }

        if (result.requiresPasswordReset && result.user) {
          onRequirePasswordReset(result.user);
        } else if (result.user) {
          onAuthenticated(result.user);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-orange-50 via-slate-50 to-white flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <header className="max-w-md w-full mx-auto pt-6 text-center">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-orange-600 transition-colors mb-4 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Choose Portal</span>
        </button>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {messName}
        </h1>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          ॥ श्री गणेशाय नमः ॥
        </p>
      </header>

      {/* Main Login Card */}
      <main className="max-w-md w-full mx-auto my-6">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8">
          {/* Portal Badge */}
          <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              isOwner ? 'bg-orange-600 text-white' : 'bg-slate-900 text-orange-400'
            }`}>
              {isOwner ? <Building className="w-6 h-6" /> : <GraduationCap className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {isOwner ? 'Owner / Staff Portal' : 'Student Pass Portal'}
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {isOwner ? 'Admin' : 'Student'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {isOwner 
                  ? 'Sign in to manage mess operations' 
                  : 'Sign in to access your digital meal pass'}
              </p>
            </div>
          </div>

          {/* First-time login banner info */}
          <div className="mt-5 p-3.5 rounded-xl bg-orange-50/80 border border-orange-200/80 flex items-start gap-2.5 text-xs text-orange-900">
            <KeyRound className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-orange-950">First-time login setup:</p>
              <p className="text-[11px] text-orange-800 mt-0.5">
                Use initial temporary password <span className="font-mono font-black bg-orange-200/80 px-1.5 py-0.5 rounded text-orange-950">112233</span>. You will be prompted to set your permanent password before dashboard access is granted.
              </p>
            </div>
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
                {isOwner ? 'Username or Registered Email' : 'Student ID or Mobile Number'}
              </label>
              <div className="relative">
                <input
                  type={isOwner ? 'text' : 'text'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={isOwner ? 'e.g. bhankhedkarmanmath3@gmail.com' : 'e.g. 9822100001 or MM-2026-001'}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:bg-white rounded-xl text-sm text-slate-900 pl-10 pr-4 py-2.5 outline-none transition-colors"
                  autoFocus
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter temporary (112233) or permanent password"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:bg-white rounded-xl text-sm text-slate-900 pl-10 pr-10 py-2.5 outline-none transition-colors"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-slate-400 hover:text-slate-600 absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-xl text-white font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isOwner 
                  ? 'bg-orange-600 hover:bg-orange-700 active:scale-98' 
                  : 'bg-slate-900 hover:bg-slate-800 active:scale-98'
              } ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Portal Switch Link */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <button
              onClick={onBack}
              className="text-xs font-semibold text-slate-500 hover:text-orange-600 transition-colors cursor-pointer"
            >
              Need to access the other portal? <span className="underline">Choose Portal</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-md w-full mx-auto py-4 text-center text-xs text-slate-400">
        <p>© 2026 {messName} • Safe & Secure Dining Management</p>
      </footer>
    </div>
  );
};
