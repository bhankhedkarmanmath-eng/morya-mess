import React from 'react';
import { X, ShieldCheck, UserCheck, Utensils, ArrowRight, Sparkles, Building } from 'lucide-react';
import { Customer } from '../types/mess';

interface PortalSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOwner: () => void;
  onSelectStudent: (customer?: Customer) => void;
  customers: Customer[];
  currentPortal: 'owner' | 'student';
}

export const PortalSwitcherModal: React.FC<PortalSwitcherModalProps> = ({
  isOpen,
  onClose,
  onSelectOwner,
  onSelectStudent,
  customers,
  currentPortal
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-black">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Switch Application View</h3>
              <p className="text-xs text-slate-500">Morya Mess Multi-Role Access</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Portal Options */}
        <div className="p-6 space-y-4">
          {/* Owner Portal Option */}
          <div
            onClick={() => {
              onSelectOwner();
              onClose();
            }}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start justify-between gap-4 ${
              currentPortal === 'owner'
                ? 'border-orange-500 bg-orange-50/40 ring-2 ring-orange-500/20'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Building className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 text-sm">Mess Owner & Admin Dashboard</h4>
                  {currentPortal === 'owner' && (
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-orange-600 text-white">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Gate attendance scanning, student registration, fee dues collection, expenses, kitchen staff & financial P&L audits.
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 shrink-0 mt-2" />
          </div>

          {/* Student Pass Portal Option */}
          <div
            onClick={() => {
              onSelectStudent(customers[0]);
              onClose();
            }}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start justify-between gap-4 ${
              currentPortal === 'student'
                ? 'border-orange-500 bg-orange-50/40 ring-2 ring-orange-500/20'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
                <UserCheck className="w-6 h-6 text-orange-400" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 text-sm">Student Digital Pass & Self-Service</h4>
                  {currentPortal === 'student' && (
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-900 text-white">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Student view: Digital QR Pass, validity countdown, mess meal shifts schedule, and vacation leave requests.
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 shrink-0 mt-2" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Both views synchronize real-time with Supabase</span>
          <button
            onClick={onClose}
            className="font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
