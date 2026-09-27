import React from 'react';
import { MessShiftAudit } from '../../../types/mess';
import { Clock, Sun, Moon, AlertCircle, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react';

interface StudentTimingsTabProps {
  shiftAudit: MessShiftAudit;
}

export const StudentTimingsTab: React.FC<StudentTimingsTabProps> = ({ shiftAudit }) => {
  const isSunday = new Date().getDay() === 0;

  return (
    <div className="w-full max-w-full sm:max-w-2xl space-y-4">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-orange-600 tracking-wider block">
              Daily Service Hours
            </span>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Mess Timings & Shift Schedule
            </h2>
          </div>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Morya Mess serves hot, freshly prepared vegetarian meals twice daily. Please adhere strictly to meal shift hours.
        </p>
      </div>

      {/* Live Kitchen Status Card */}
      <div className={`p-5 rounded-3xl border shadow-md flex items-center justify-between gap-4 ${
        shiftAudit.isShiftActive 
          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white' 
          : 'bg-gradient-to-r from-slate-900 to-slate-800 text-white'
      }`}>
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 shadow-inner">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest bg-white/25 px-2 py-0.5 rounded-full text-white inline-block mb-1">
              Current Live Status
            </span>
            <h3 className="text-base sm:text-lg font-black tracking-tight">
              {shiftAudit.shiftTitle}
            </h3>
            <p className="text-xs text-white/90">
              {shiftAudit.reason}
            </p>
          </div>
        </div>

        <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase shrink-0 ${
          shiftAudit.isShiftActive 
            ? 'bg-white text-emerald-800 shadow-sm' 
            : 'bg-slate-800 text-amber-300 border border-slate-700'
        }`}>
          {shiftAudit.isShiftActive ? '● DINING OPEN' : 'DINING CLOSED'}
        </span>
      </div>

      {/* Meal Shifts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Lunch Shift Box */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">Lunch Shift (दुपारचे जेवण)</h4>
                <span className="text-[10px] text-slate-400 font-medium">Daily Service</span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
              Shift 1
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Serving Window:</span>
              <strong className="text-slate-900 font-mono text-sm">10:30 AM – 02:30 PM</strong>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Gate QR Active:</span>
              <span className="font-mono font-bold text-orange-600">10:15 AM – 02:30 PM</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Sunday Feast:</span>
              <span className="font-bold text-emerald-700">11:00 AM – 03:00 PM</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Freshly baked chapatis, seasonal vegetable sabzi, dal tadka, rice, and salad served warm.
          </p>
        </div>

        {/* Dinner Shift Box */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">Dinner Shift (संध्याकाळचे जेवण)</h4>
                <span className="text-[10px] text-slate-400 font-medium">Mon – Sat</span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
              Shift 2
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Serving Window:</span>
              <strong className="text-slate-900 font-mono text-sm">08:30 PM – 10:30 PM</strong>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Gate QR Active:</span>
              <span className="font-mono font-bold text-orange-600">08:15 PM – 10:30 PM</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Sunday Dinner:</span>
              <span className="font-black text-rose-600 uppercase">CLOSED</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Evening sabzi, jowar bhakri / chapati, kadhi/dal, and steamed rice. Hot & hygienic.
          </p>
        </div>
      </div>

      {/* Special Sunday Policy */}
      <div className="p-4 rounded-3xl bg-amber-50 border border-amber-200 flex items-start gap-3.5 text-xs text-amber-950">
        <div className="w-9 h-9 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center shrink-0">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="font-black text-xs uppercase tracking-wider text-amber-900">
            Sunday Dinner Kitchen Closure Policy
          </h4>
          <p className="leading-relaxed text-[11px] text-amber-800">
            The mess dining hall is <strong>closed on Sunday night</strong> for full deep-cleaning, kitchen sanitization, pest prevention, and staff weekly rest. Sunday Lunch operates with an extended feast menu!
          </p>
        </div>
      </div>

      {/* Grace Period & Attendance Rules */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-3">
        <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">
          Shift Access & Standee Scanner Rules
        </h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
              1
            </span>
            <p className="text-slate-600 leading-relaxed">
              <strong>15-Minute Entry Grace:</strong> Gate standee scanner opens 15 minutes before the shift to allow smooth entry without queues.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
              2
            </span>
            <p className="text-slate-600 leading-relaxed">
              <strong>Strict Cutoff:</strong> The scanner and kitchen serving line close promptly at 02:30 PM (Lunch) and 10:30 PM (Dinner). Late arrivals will not be admitted.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
              3
            </span>
            <p className="text-slate-600 leading-relaxed">
              <strong>Advance Leave Notice:</strong> If you are skipping a meal or going out of town, apply via the "Leaves" tab at least 1 day prior.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
