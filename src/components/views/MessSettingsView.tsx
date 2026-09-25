import React, { useState } from 'react';
import { BusinessRulesConfig } from '../../types/mess';
import { 
  Settings, 
  ArrowLeft, 
  Save, 
  CheckCircle2, 
  ShieldCheck, 
  Building2, 
  Phone, 
  MapPin, 
  Smartphone,
  Calendar
} from 'lucide-react';

interface MessSettingsViewProps {
  rules: BusinessRulesConfig;
  onBack: () => void;
  onSaveRules: (updated: BusinessRulesConfig) => void;
}

export const MessSettingsView: React.FC<MessSettingsViewProps> = ({
  rules,
  onBack,
  onSaveRules
}) => {
  const [form, setForm] = useState<BusinessRulesConfig>({ ...rules });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveRules(form);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-orange-600" />
              <span>Mess Administration & Operational Settings</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Official identity, dining hall address, leave quotas, and operational cutoffs
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Settings Saved Successfully!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Identity & Address */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 className="w-4 h-4 text-orange-600" />
              <span>Mess Brand & Contact Information</span>
            </h3>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Official Mess Name</label>
                <input
                  type="text"
                  required
                  value={form.messName}
                  onChange={(e) => setForm({ ...form, messName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Official Contact Phone</label>
                <input
                  type="tel"
                  value={form.contactPhone || '9822001122'}
                  onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mess Full Address</label>
                <textarea
                  rows={2}
                  value={form.address || 'Opposite Boys Hostel, Near Government College of Engineering, College Road, Latur - 413512'}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Operational Policy & Quotas */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <ShieldCheck className="w-4 h-4 text-orange-600" />
              <span>Leave Quota & Meal Cutoff Limits</span>
            </h3>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Maximum Allowed Leave Days Per Month</label>
                <input
                  type="number"
                  min="0"
                  max="15"
                  value={form.maxLeaveDaysPerMonth || 4}
                  onChange={(e) => setForm({ ...form, maxLeaveDaysPerMonth: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Approved leaves extend end date by 1 day per skip</span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Total Dining Hall Seating Capacity</label>
                <input
                  type="number"
                  value={form.hallCapacity || 120}
                  onChange={(e) => setForm({ ...form, hallCapacity: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.strictShiftEnforcement ?? true}
                    onChange={(e) => setForm({ ...form, strictShiftEnforcement: e.target.checked })}
                    className="w-4 h-4 text-orange-600 rounded"
                  />
                  <span>Enforce Strict Shift Timings on QR Scanners</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs shadow-md transition cursor-pointer flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Mess Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
