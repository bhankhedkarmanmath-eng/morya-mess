import React from 'react';
import { Building, GraduationCap, ShieldCheck, ArrowRight, Sparkles, UtensilsCrossed } from 'lucide-react';
import { AuthPortal } from '../lib/authService';

interface PortalSelectionScreenProps {
  onSelectPortal: (portal: AuthPortal) => void;
  messName?: string;
  messSubtitle?: string;
}

export const PortalSelectionScreen: React.FC<PortalSelectionScreenProps> = ({
  onSelectPortal,
  messName = 'MORYA MESS',
  messSubtitle = 'Digital Dining & Mess Operations Management'
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50/40 to-slate-50 flex flex-col justify-between p-4 sm:p-6 lg:p-8 selection:bg-orange-500 selection:text-white">
      {/* Top Header Branding */}
      <header className="max-w-5xl w-full mx-auto pt-6 sm:pt-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-100 to-amber-100 border border-orange-200 text-orange-900 text-xs font-black uppercase tracking-wider mb-4 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-orange-600 animate-spin" style={{ animationDuration: '6s' }} />
          <span>Morya Mess Management System</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight flex items-center justify-center gap-3">
          <span className="bg-gradient-to-r from-orange-600 via-amber-600 to-red-600 bg-clip-text text-transparent font-display">
            ॥ श्री गणेशाय नमः ॥
          </span>
        </h1>
        <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight mt-2 font-display">
          {messName}
        </h2>
        <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto mt-2 font-medium">
          {messSubtitle}
        </p>
      </header>

      {/* Main Choose Portal Selection Card Section */}
      <main className="max-w-3xl w-full mx-auto my-8 sm:my-10">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-orange-200/80 shadow-2xl p-6 sm:p-10">
          <div className="text-center mb-8">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
              Choose Portal
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              Select your role to access your dedicated management portal
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* 1. STUDENT PORTAL OPTION */}
            <div
              onClick={() => onSelectPortal('student')}
              className="group relative flex flex-col justify-between p-6 rounded-2xl border-2 border-slate-200 hover:border-indigo-500 bg-gradient-to-b from-white to-indigo-50/30 hover:to-indigo-50/70 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-xl text-left transform hover:-translate-y-1"
              role="button"
              tabIndex={0}
            >
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center transition-all shadow-md shadow-indigo-500/25 group-hover:scale-105">
                  <GraduationCap className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-black text-slate-900 group-hover:text-indigo-950 font-display">
                      STUDENT
                    </h4>
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                      Pass Portal
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed font-medium">
                    Digital QR dining pass, remaining meal balance, daily menu, payment history, and leave approval requests.
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-800 group-hover:text-indigo-700">
                <span>Access Student Pass</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
              </div>
            </div>

            {/* 2. OWNER / STAFF PORTAL OPTION */}
            <div
              onClick={() => onSelectPortal('owner')}
              className="group relative flex flex-col justify-between p-6 rounded-2xl border-2 border-orange-200 hover:border-orange-500 bg-gradient-to-b from-white to-orange-50/40 hover:to-orange-50/80 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-xl text-left transform hover:-translate-y-1"
              role="button"
              tabIndex={0}
            >
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-600 via-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/25 group-hover:scale-105 transition-all">
                  <Building className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-black text-slate-900 group-hover:text-orange-950 font-display">
                      OWNER / STAFF
                    </h4>
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-900 border border-orange-200">
                      Admin Portal
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed font-medium">
                    Mess administration, gate attendance scanner, student admissions, fee dues, kitchen staff, and financial audits.
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-orange-200/80 flex items-center justify-between text-xs font-bold text-slate-800 group-hover:text-orange-700">
                <span>Sign In as Owner / Staff</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Secure Authentication & Role Separation Enforced</span>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl w-full mx-auto py-4 text-center text-xs text-slate-400">
        <p>© 2026 {messName} • Near Boys & Girls Hostel, College Road</p>
      </footer>
    </div>
  );
};
