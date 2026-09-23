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
    <div className="min-h-screen bg-linear-to-b from-orange-50 via-slate-50 to-white flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Header Branding */}
      <header className="max-w-5xl w-full mx-auto pt-6 sm:pt-10 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100 border border-orange-200 text-orange-800 text-xs font-bold uppercase tracking-wider mb-4 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-orange-600" />
          <span>Morya Mess Management System</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-3">
          <span className="text-orange-600">॥ श्री गणेशाय नमः ॥</span>
        </h1>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-2">
          {messName}
        </h2>
        <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto mt-2 font-medium">
          {messSubtitle}
        </p>
      </header>

      {/* Main Choose Portal Selection Card Section */}
      <main className="max-w-3xl w-full mx-auto my-8 sm:my-12">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-10">
          <div className="text-center mb-8">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
              Choose Portal
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Select your role to log into your designated access area
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* 1. STUDENT PORTAL OPTION */}
            <div
              onClick={() => onSelectPortal('student')}
              className="group relative flex flex-col justify-between p-6 rounded-2xl border-2 border-slate-200 hover:border-orange-500 bg-white hover:bg-orange-50/40 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-lg text-left"
              role="button"
              tabIndex={0}
            >
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 text-orange-400 group-hover:bg-orange-600 group-hover:text-white flex items-center justify-center transition-colors shadow-sm">
                  <GraduationCap className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-bold text-slate-900 group-hover:text-orange-950">
                      STUDENT
                    </h4>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 group-hover:bg-orange-200 group-hover:text-orange-900">
                      Pass Portal
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    Digital QR dining pass, remaining meal balance, daily menu, payment history, and leave approval requests.
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 group-hover:text-orange-700">
                <span>Access Student Pass</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* 2. OWNER / STAFF PORTAL OPTION */}
            <div
              onClick={() => onSelectPortal('owner')}
              className="group relative flex flex-col justify-between p-6 rounded-2xl border-2 border-slate-200 hover:border-orange-500 bg-white hover:bg-orange-50/40 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-lg text-left"
              role="button"
              tabIndex={0}
            >
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-sm group-hover:bg-orange-700 transition-colors">
                  <Building className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-bold text-slate-900 group-hover:text-orange-950">
                      OWNER / STAFF
                    </h4>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                      Admin Portal
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    Mess administration, gate attendance scanner, student admissions, fee dues, kitchen staff, and financial audits.
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 group-hover:text-orange-700">
                <span>Sign In as Owner / Staff</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
