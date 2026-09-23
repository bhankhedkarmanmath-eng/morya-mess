import React, { useState } from 'react';
import { BusinessRulesConfig, UserRole } from '../types/mess';
import { 
  X, 
  Settings, 
  ShieldCheck, 
  Moon, 
  Clock, 
  AlertTriangle, 
  Save, 
  DollarSign, 
  Bell,
  RefreshCw,
  Database,
  Building,
  Download,
  Globe,
  Smartphone,
  ExternalLink
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: BusinessRulesConfig;
  onSaveRules: (updatedRules: BusinessRulesConfig) => void;
  currentRole: UserRole;
  onResetFactoryData?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  rules,
  onSaveRules,
  currentRole,
  onResetFactoryData
}) => {
  const [formData, setFormData] = useState<BusinessRulesConfig>({ ...rules });
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveRules(formData);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Mess Business Rules & Configuration</h3>
              <p className="text-[11px] text-slate-500">
                Operating policies, strict timings, subscription rates & anti-fraud security
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
          {/* 1. Identity & Branding */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
              <Building className="w-4 h-4 text-orange-600" />
              <span>Mess Identity & Status</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Mess Commercial Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.messName}
                  onChange={e => setFormData({ ...formData, messName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Tagline / Subtitle
                </label>
                <input
                  type="text"
                  value={formData.messSubtitle}
                  onChange={e => setFormData({ ...formData, messSubtitle: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Operational Status
                </label>
                <select
                  value={formData.messStatus}
                  onChange={e => setFormData({ ...formData, messStatus: e.target.value as 'open' | 'closed' })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-500"
                >
                  <option value="open">Open (Normal Service)</option>
                  <option value="closed">Closed (Vacation / Holiday Shutdown)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Expiring Soon Alert Threshold
                </label>
                <select
                  value={formData.expiringSoonAlertDays}
                  onChange={e => setFormData({ ...formData, expiringSoonAlertDays: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-500"
                >
                  <option value={2}>2 Days Before Expiry</option>
                  <option value={3}>3 Days Before Expiry (Recommended)</option>
                  <option value={5}>5 Days Before Expiry</option>
                  <option value={7}>7 Days Before Expiry</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. Fee Structure */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Standard Monthly Rates (30 Days)</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Hostel Girls (2 Meals/Day)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    min="1000"
                    required
                    value={formData.femaleFullRate}
                    onChange={e => setFormData({ ...formData, femaleFullRate: Number(e.target.value) })}
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Boys (2 Meals/Day)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    min="1000"
                    required
                    value={formData.maleFullRate}
                    onChange={e => setFormData({ ...formData, maleFullRate: Number(e.target.value) })}
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  1-Meal/Day Plan (Lunch or Dinner)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    min="800"
                    required
                    value={formData.oneMealRate}
                    onChange={e => setFormData({ ...formData, oneMealRate: Number(e.target.value) })}
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  1-Day Trial Package
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    min="40"
                    required
                    value={formData.trial1DayFee}
                    onChange={e => setFormData({ ...formData, trial1DayFee: Number(e.target.value) })}
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Lost Card Reissue Penalty
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    min="20"
                    required
                    value={formData.lostCardFee}
                    onChange={e => setFormData({ ...formData, lostCardFee: Number(e.target.value) })}
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Anti-Fraud & Gate Timing Rules */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600" />
              <span>Strict Shift Timings & Anti-Fraud Locks</span>
            </h4>

            {/* Sunday Dinner Closure toggle */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span>Enforce Sunday Dinner Shift Closure</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Automatically lock mess gate on Sunday evenings as per standard hostel practice.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.sundayDinnerClosed}
                onChange={e => setFormData({ ...formData, sundayDinnerClosed: e.target.checked })}
                className="w-5 h-5 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
              />
            </div>

            {/* Strict meal timings toggle */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span>Enforce Strict Shift Timings</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Lunch: 10:30 AM – 2:30 PM • Dinner: 8:30 PM – 10:30 PM. Gate automatically blocks outside hours.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.enforceStrictMealTimings}
                onChange={e => setFormData({ ...formData, enforceStrictMealTimings: e.target.checked })}
                className="w-5 h-5 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
              />
            </div>

            {/* Double meal block toggle */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Block Double Meals in Same Shift</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Prevents students or unauthorized friends from scanning the same pass twice during lunch or dinner.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.preventDoubleMealSameShift}
                onChange={e => setFormData({ ...formData, preventDoubleMealSameShift: e.target.checked })}
                className="w-5 h-5 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
              />
            </div>
          </div>

          {/* 6. Instant Free Web & Standalone APK Deployment */}
          <div className="p-4 bg-linear-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-xs">
                    Free Web & APK Hosting (No Google Login Required)
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    Host on Netlify for 100% free lifetime access without asking students for Google/Email login.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/90 p-3 rounded-xl border border-emerald-200 text-slate-700 text-[11px] space-y-2">
              <div className="flex items-start gap-2">
                <span className="font-black text-emerald-700 bg-emerald-100 rounded-full w-4 h-4 flex items-center justify-center shrink-0 text-[10px]">1</span>
                <span>Click the green button below to download the pre-compiled <strong>morya_mess_website.zip</strong></span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-black text-emerald-700 bg-emerald-100 rounded-full w-4 h-4 flex items-center justify-center shrink-0 text-[10px]">2</span>
                <span>Open <a href="https://app.netlify.com/drop" target="_blank" rel="noreferrer" className="text-emerald-700 font-bold underline inline-flex items-center gap-0.5">app.netlify.com/drop <ExternalLink className="w-3 h-3" /></a> and simply drag & drop the zip file.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-black text-emerald-700 bg-emerald-100 rounded-full w-4 h-4 flex items-center justify-center shrink-0 text-[10px]">3</span>
                <span>Instantly get your clean official URL (e.g. <code>morya-mess.netlify.app</code>) with zero login & zero billing!</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href="/morya_mess_website.zip"
                download="morya_mess_website.zip"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Website ZIP (390 KB)</span>
              </a>
              <a
                href="https://app.netlify.com/drop"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl font-semibold text-xs transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Netlify Drop (Free)</span>
              </a>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between">
          <div>
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Settings Saved Successfully</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer text-xs"
            >
              Close
            </button>
            <button
              id="btn-save-settings"
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 shadow-xs cursor-pointer text-xs"
            >
              <Save className="w-4 h-4" />
              <span>Save Rules & Policies</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
