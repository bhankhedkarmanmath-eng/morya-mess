import React, { useState, useMemo, useEffect } from 'react';
import { 
  UtensilsCrossed, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  Check, 
  XCircle, 
  ArrowRight,
  ShieldCheck,
  CalendarDays
} from 'lucide-react';
import { 
  evaluateMealSkipCutoffs, 
  loadMealSkips, 
  toggleStudentMealSkip, 
  MealSkipRecord 
} from '../../../lib/autoPilotSuite';
import { getTodayString } from '../../../lib/storage';

interface AutoMealSkipCardProps {
  studentId: string;
  studentName: string;
  onSkipUpdated?: () => void;
}

export const AutoMealSkipCard: React.FC<AutoMealSkipCardProps> = ({
  studentId,
  studentName,
  onSkipUpdated
}) => {
  const [allSkips, setAllSkips] = useState<MealSkipRecord[]>(() => loadMealSkips());
  const [actionFeedback, setActionFeedback] = useState<{ text: string; isError?: boolean } | null>(null);

  const today = getTodayString();
  const cutoffs = useMemo(() => evaluateMealSkipCutoffs(), []);

  // Today's active skips for this student
  const todayLunchSkip = useMemo(() => {
    return allSkips.find(
      s => s.studentId === studentId && s.date === today && s.mealType === 'lunch' && s.status === 'active'
    );
  }, [allSkips, studentId, today]);

  const todayDinnerSkip = useMemo(() => {
    return allSkips.find(
      s => s.studentId === studentId && s.date === today && s.mealType === 'dinner' && s.status === 'active'
    );
  }, [allSkips, studentId, today]);

  // Monthly usage count (max 3)
  const thisMonthUsage = useMemo(() => {
    const monthPrefix = today.substring(0, 7);
    return allSkips.filter(
      s => s.studentId === studentId && s.date.startsWith(monthPrefix) && s.status === 'active'
    ).length;
  }, [allSkips, studentId, today]);

  const handleToggle = (mealType: 'lunch' | 'dinner') => {
    const res = toggleStudentMealSkip(studentId, studentName, mealType);
    setActionFeedback({ text: res.message, isError: !res.success });
    setAllSkips(loadMealSkips());
    if (onSkipUpdated) onSkipUpdated();

    setTimeout(() => {
      setActionFeedback(null);
    }, 4000);
  };

  return (
    <div className="bg-white rounded-3xl p-5 border-2 border-orange-200/80 shadow-sm space-y-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-28 h-28 bg-orange-400/5 rounded-full blur-xl pointer-events-none -mr-6 -mt-6" />

      {/* HEADER */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-xs">
            <UtensilsCrossed className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900 tracking-tight">
                Smart Meal Skip & Food Saver
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wide">
                Auto-Credit
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Give 2hr advance notice, prevent food wastage, and earn automatic credit!
            </p>
          </div>
        </div>

        {/* MONTHLY USAGE BADGE */}
        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Month Quota</span>
          <span className="text-xs font-black text-slate-800 font-mono">
            {thisMonthUsage} / 3 Skips
          </span>
        </div>
      </div>

      {/* FEEDBACK NOTICE */}
      {actionFeedback && (
        <div className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200 ${
          actionFeedback.isError 
            ? 'bg-rose-50 text-rose-800 border border-rose-200' 
            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
        }`}>
          {actionFeedback.isError ? <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" /> : <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />}
          <span>{actionFeedback.text}</span>
        </div>
      )}

      {/* MEAL CARDS (LUNCH & DINNER) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
        
        {/* 1. LUNCH CARD */}
        <div className={`p-3.5 rounded-2xl border transition-all ${
          todayLunchSkip 
            ? 'bg-amber-50/80 border-amber-300 shadow-2xs' 
            : 'bg-slate-50 border-slate-200/80 hover:border-slate-300'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              ☀️ Today's Lunch
              {todayLunchSkip && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 uppercase">
                  Skipped
                </span>
              )}
            </span>
            <span className="text-[10px] text-slate-400 font-mono font-bold">10:30 AM – 02:30 PM</span>
          </div>

          <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
            {cutoffs.canSkipLunch 
              ? 'Cutoff: 08:30 AM (Cooks start at 08:30 AM).' 
              : 'Prep started at 08:30 AM. Skipping Lunch is locked.'}
          </p>

          <button
            disabled={!cutoffs.canSkipLunch && !todayLunchSkip}
            onClick={() => handleToggle('lunch')}
            className={`w-full py-2 px-3 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
              todayLunchSkip
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                : cutoffs.canSkipLunch
                ? 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs active:scale-98'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {todayLunchSkip ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Cancel Skip (Eat Lunch)</span>
              </>
            ) : (
              <>
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>{cutoffs.canSkipLunch ? 'Skip Lunch (Save Plate)' : 'Lunch Cutoff Passed'}</span>
              </>
            )}
          </button>
        </div>

        {/* 2. DINNER CARD */}
        <div className={`p-3.5 rounded-2xl border transition-all ${
          todayDinnerSkip 
            ? 'bg-purple-50/80 border-purple-300 shadow-2xs' 
            : 'bg-slate-50 border-slate-200/80 hover:border-slate-300'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              🌙 Today's Dinner
              {todayDinnerSkip && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-purple-200 text-purple-900 uppercase">
                  Skipped
                </span>
              )}
            </span>
            <span className="text-[10px] text-slate-400 font-mono font-bold">07:30 PM – 09:45 PM</span>
          </div>

          <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
            {cutoffs.canSkipDinner 
              ? 'Cutoff: 05:30 PM (Cooks start at 05:30 PM).' 
              : 'Prep started at 05:30 PM. Skipping Dinner is locked.'}
          </p>

          <button
            disabled={!cutoffs.canSkipDinner && !todayDinnerSkip}
            onClick={() => handleToggle('dinner')}
            className={`w-full py-2 px-3 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
              todayDinnerSkip
                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs'
                : cutoffs.canSkipDinner
                ? 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs active:scale-98'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {todayDinnerSkip ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Cancel Skip (Eat Dinner)</span>
              </>
            ) : (
              <>
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>{cutoffs.canSkipDinner ? 'Skip Dinner (Save Plate)' : 'Dinner Cutoff Passed'}</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* FOOTER INFO */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Auto-managed rules: zero owner calls or approvals needed.</span>
        </span>
        <span className="font-semibold text-slate-600">₹40 Credit / 0.5 Day</span>
      </div>

    </div>
  );
};
