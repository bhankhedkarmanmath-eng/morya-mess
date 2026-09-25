import React, { useState } from 'react';
import { 
  Clock, 
  ArrowLeft, 
  Save, 
  CheckCircle2, 
  Utensils, 
  ShieldAlert,
  Moon,
  Sun
} from 'lucide-react';

interface MealRateTimingViewProps {
  onBack: () => void;
}

export const MealRateTimingView: React.FC<MealRateTimingViewProps> = ({ onBack }) => {
  const [lunchStart, setLunchStart] = useState('11:00');
  const [lunchEnd, setLunchEnd] = useState('14:30');
  const [dinnerStart, setDinnerStart] = useState('19:30');
  const [dinnerEnd, setDinnerEnd] = useState('22:15');
  const [lunchRate, setLunchRate] = useState('80');
  const [dinnerRate, setDinnerRate] = useState('80');
  const [sundayDinnerClosed, setSundayDinnerClosed] = useState(true);
  const [lateGraceMinutes, setLateGraceMinutes] = useState('15');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
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
              <Clock className="w-5 h-5 text-orange-600" />
              <span>Meal Rate & Shift Timings Configuration</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Operating hours, QR gate cutoff limits, Sunday off rules, and guest plate pricing
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Shift Timings Saved!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lunch Shift Settings */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Lunch Shift Schedule</span>
              </h3>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full uppercase">
                Active Mon - Sun
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Gate Opens</label>
                <input
                  type="time"
                  value={lunchStart}
                  onChange={(e) => setLunchStart(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Gate Closes</label>
                <input
                  type="time"
                  value={lunchEnd}
                  onChange={(e) => setLunchEnd(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Guest Plate Rate (₹)</label>
                <input
                  type="number"
                  value={lunchRate}
                  onChange={(e) => setLunchRate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-black text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Late Grace Cutoff (Mins)</label>
                <input
                  type="number"
                  value={lateGraceMinutes}
                  onChange={(e) => setLateGraceMinutes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Dinner Shift Settings */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <Moon className="w-4 h-4 text-indigo-600" />
                <span>Dinner Shift Schedule</span>
              </h3>
              <span className="text-[10px] font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">
                Active Mon - Sat
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Gate Opens</label>
                <input
                  type="time"
                  value={dinnerStart}
                  onChange={(e) => setDinnerStart(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Gate Closes</label>
                <input
                  type="time"
                  value={dinnerEnd}
                  onChange={(e) => setDinnerEnd(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Guest Plate Rate (₹)</label>
                <input
                  type="number"
                  value={dinnerRate}
                  onChange={(e) => setDinnerRate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-black text-slate-900"
                />
              </div>

              <div className="flex items-center gap-3 pt-6">
                <input
                  type="checkbox"
                  id="sundayNightOff"
                  checked={sundayDinnerClosed}
                  onChange={(e) => setSundayDinnerClosed(e.target.checked)}
                  className="w-4 h-4 text-orange-600 rounded"
                />
                <label htmlFor="sundayNightOff" className="font-bold text-slate-700 text-xs cursor-pointer">
                  Sunday Night Strictly Closed
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
            <span>Save Timing Rules</span>
          </button>
        </div>
      </form>
    </div>
  );
};
