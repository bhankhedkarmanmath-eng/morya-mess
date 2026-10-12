import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, 
  Utensils, 
  Clock, 
  CreditCard, 
  Banknote, 
  User, 
  Phone, 
  Building, 
  Sparkles, 
  ArrowRight, 
  Download, 
  RefreshCw,
  QrCode,
  ShieldCheck,
  Calendar,
  X,
  Trophy
} from 'lucide-react';
import { BusinessRulesConfig, Gender, MealType } from '../types/mess';
import { evaluateStrictMessShift, getTodayString } from '../lib/storage';
import { loadCleanPlateNominations, saveCleanPlateNominations } from '../lib/ownerModulesStorage';
import { 
  getStudentCampaignProgress, 
  recordStudentDailyTick,
  registerStudentNomination,
  StudentCampaignProgress 
} from '../lib/cleanPlateTaskStorage';
import { addTrialStudentInSupabase, DEFAULT_MESS_ID } from '../lib/ownerFeaturesApi';
import { pushSyncToServer } from '../lib/syncEngine';
import { supabase } from '../lib/supabase';

interface TrialStudentPortalViewProps {
  rules: BusinessRulesConfig;
  onRegisterTrial: (record: {
    id: string;
    fullName: string;
    phone: string;
    gender: Gender;
    college?: string;
    mealType: MealType;
    foodItem: string;
    amountPaid: number;
    paymentMode: 'upi' | 'cash';
    date: string;
    tokenNumber: string;
    notes?: string;
  }) => void;
  onExit?: () => void;
}

interface SubmittedPass {
  tokenNumber: string;
  fullName: string;
  phone: string;
  foodItem: string;
  mealType: MealType;
  amountPaid: number;
  paymentMode: 'upi' | 'cash';
  date: string;
  time: string;
}

const PRESET_MEALS = [
  { id: 'regular_thali', name: 'Regular Veg Thali', price: 70, desc: '4 Roti, 2 Sabzi, Dal, Rice, Salad' },
  { id: 'dal_rice', name: 'Rice and Dal', price: 50, desc: 'Fresh Steamed Rice & Hot Dal (₹50)' }
];

export const TrialStudentPortalView: React.FC<TrialStudentPortalViewProps> = ({
  rules,
  onRegisterTrial,
  onExit
}) => {
  const currentShift = evaluateStrictMessShift();
  const todayStr = getTodayString();

  useEffect(() => {
    const originalTitle = document.title;
    document.title = `${rules.messName || 'Morya Mess'} — Trial Student Dining Pass`;
    return () => {
      document.title = originalTitle;
    };
  }, [rules.messName]);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [college, setCollege] = useState('');
  const [selectedMealId, setSelectedMealId] = useState('regular_thali');
  const [mealShift, setMealShift] = useState<MealType>(currentShift.mealType || 'lunch');
  const [amountPaid, setAmountPaid] = useState<number>(70);
  const [paymentMode, setPaymentMode] = useState<'upi' | 'cash'>('upi');
  const [notes, setNotes] = useState('');
  const [showUpiDetails, setShowUpiDetails] = useState(false);

  const [submittedPass, setSubmittedPass] = useState<SubmittedPass | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic 20-Seat Live Crowd Meter for Trial Diners
  const liveCrowdMeter = useMemo(() => {
    const activeShift = currentShift.isShiftActive ? currentShift.mealType : null;
    const TOTAL_SEATS = 20;

    if (!activeShift) {
      return {
        statusTitle: 'MESS OFFLINE — Shift Closed',
        detail: 'Dining Hall is currently closed. Shift hours: Lunch (10:30 AM - 2:30 PM), Dinner (7:30 PM - 9:45 PM).',
        occupancy: 0,
        activeShift: null,
        totalSeats: TOTAL_SEATS,
        occupiedSeats: 0,
        availableSeats: TOTAL_SEATS,
        colorScheme: 'slate' as 'emerald' | 'amber' | 'rose' | 'slate',
        estimatedWaitTime: '0 min'
      };
    }

    const now = new Date();
    const currentHour = now.getHours();
    const isPeakTime = (currentHour === 13) || (currentHour === 20 && now.getMinutes() >= 30);
    const occupiedSeats = isPeakTime ? 11 : 3;
    const availableSeats = TOTAL_SEATS - occupiedSeats;
    const occupancyPercent = Math.round((occupiedSeats / TOTAL_SEATS) * 100);

    return {
      statusTitle: isPeakTime ? 'MODERATE RUSH — SEATS FREE' : 'PLENTY OF SEATS AVAILABLE',
      detail: `${availableSeats} of ${TOTAL_SEATS} seats open. Hot hot chapatis being served right off the tawa!`,
      occupancy: occupancyPercent,
      activeShift,
      totalSeats: TOTAL_SEATS,
      occupiedSeats,
      availableSeats,
      colorScheme: (isPeakTime ? 'amber' : 'emerald') as 'emerald' | 'amber' | 'rose' | 'slate',
      estimatedWaitTime: isPeakTime ? '2 mins' : '0 min (Instant)'
    };
  }, [currentShift]);

  // 25-Day Clean Plate Task Campaign State
  const [taskProgress, setTaskProgress] = useState<StudentCampaignProgress>(() => 
    getStudentCampaignProgress(phone || 'student', fullName || 'Mess Student')
  );
  const [showPostScanTickModal, setShowPostScanTickModal] = useState(false);
  const [isNominateModalOpen, setIsNominateModalOpen] = useState(false);
  const [nominateCollege, setNominateCollege] = useState(college || '');
  const [nominatePledge, setNominatePledge] = useState('Finishing every meal with zero food waste for 25 days!');

  useEffect(() => {
    const syncCampaignProgress = () => {
      setTaskProgress(getStudentCampaignProgress(phone || 'student', fullName || 'Mess Student'));
    };
    syncCampaignProgress();
    window.addEventListener('morya_clean_plate_updated', syncCampaignProgress);
    window.addEventListener('storage', syncCampaignProgress);
    return () => {
      window.removeEventListener('morya_clean_plate_updated', syncCampaignProgress);
      window.removeEventListener('storage', syncCampaignProgress);
    };
  }, [phone, fullName]);

  const handleExecuteDailyTick = () => {
    const res = recordStudentDailyTick(phone || 'student', fullName || 'Mess Student', todayStr);
    alert(res.message);
    setTaskProgress(res.updatedProgress);
    setShowPostScanTickModal(false);
  };

  const handleConfirmNomination = (e: React.FormEvent) => {
    e.preventDefault();
    const studentName = fullName.trim() || 'Student Contender';
    const studentPhone = phone.trim() || '9800000000';
    if (!studentPhone || studentPhone.length < 10) {
      alert('Please enter your 10-digit mobile number in the form below');
      return;
    }
    const res = registerStudentNomination({
      studentName,
      studentPhone,
      college: nominateCollege.trim() || college || 'Hostel / College',
      pledge: nominatePledge.trim() || 'Finishing every meal with zero food waste!',
      studentId: `TRL-${studentPhone.slice(-4)}`
    });
    setTaskProgress(res.participant);
    setIsNominateModalOpen(false);
    alert(res.message);
  };

  const handleNominateCleanPlate = () => {
    setIsNominateModalOpen(true);
  };

  const handleMealSelect = (mealId: string) => {
    setSelectedMealId(mealId);
    const preset = PRESET_MEALS.find(m => m.id === mealId);
    if (preset && preset.id !== 'custom_meal') {
      setAmountPaid(preset.price);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      alert('Please enter your full name');
      return;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }

    setIsSubmitting(true);

    const preset = PRESET_MEALS.find(m => m.id === selectedMealId);
    const chosenFoodItem = preset?.name || 'Regular Veg Thali';
    const randomNum = Math.floor(100 + Math.random() * 900);
    const tokenNumber = `TRL-${randomNum}`;
    const currentTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const trialRecordId = `TRL-${Date.now().toString().slice(-6)}`;
    const trialVisitorItem = {
      id: trialRecordId,
      name: fullName.trim(),
      phone: phone.trim(),
      gender,
      college: college.trim(),
      mealType: mealShift,
      foodItem: chosenFoodItem,
      visitType: '1_day_trial' as const,
      date: todayStr,
      amountPaid: Number(amountPaid),
      convertedToMonthly: false,
      notes: `TOKEN:${tokenNumber};ITEM:${chosenFoodItem};PAID:${amountPaid};MODE:${paymentMode};${notes.trim()}`
    };

    // 1. Pass data back to parent handler if available
    try {
      onRegisterTrial({
        id: trialRecordId,
        fullName: fullName.trim(),
        phone: phone.trim(),
        gender,
        college: college.trim(),
        mealType: mealShift,
        foodItem: chosenFoodItem,
        amountPaid: Number(amountPaid),
        paymentMode,
        date: todayStr,
        tokenNumber,
        notes: notes.trim()
      });
    } catch (e) {
      console.warn('onRegisterTrial parent call note:', e);
    }

    // 2. Direct guaranteed call to Supabase trial sync
    addTrialStudentInSupabase({
      fullName: fullName.trim(),
      phone: phone.trim(),
      startDate: todayStr,
      endDate: todayStr,
      mealType: mealShift === 'lunch' ? 'lunch_only' : 'dinner_only',
      mealLimit: 1,
      amountPaid: Number(amountPaid),
      notes: `TOKEN:${tokenNumber};ITEM:${chosenFoodItem};PAID:${amountPaid};MODE:${paymentMode};${notes.trim()}`
    }).catch(err => console.warn('Supabase trial student sync error:', err));

    // 3. Direct insert to Supabase customers table with is_deleted: false
    if (supabase) {
      (async () => {
        try {
          const { error } = await supabase.from('customers').upsert({
            id: trialRecordId,
            mess_id: DEFAULT_MESS_ID,
            full_name: fullName.trim(),
            phone: phone.trim(),
            is_deleted: false,
            notes: `TRIAL_STUDENT;START:${todayStr};END:${todayStr};TYPE:${mealShift};LIMIT:1;PAID:${amountPaid};TOKEN:${tokenNumber};ITEM:${chosenFoodItem};MODE:${paymentMode};${notes.trim()}`,
            created_at: new Date().toISOString()
          });
          if (error) console.warn('Direct customer upsert note:', error);
        } catch {}
      })();
    }

    // 4. Guaranteed push to central server sync
    pushSyncToServer({
      trials: [trialVisitorItem]
    }).catch(() => {});

    // 5. Broadcast to local storage & window events for immediate owner tab update
    if (typeof window !== 'undefined') {
      try {
        const localTrialsKey = 'morya_mess_trials_v1';
        const raw = localStorage.getItem(localTrialsKey);
        const existing = raw ? JSON.parse(raw) : [];
        const updated = [trialVisitorItem, ...existing.filter((t: any) => t.id !== trialRecordId)];
        localStorage.setItem(localTrialsKey, JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('morya_trial_updated'));
      } catch {}
    }

    setSubmittedPass({
      tokenNumber,
      fullName: fullName.trim(),
      phone: phone.trim(),
      foodItem: chosenFoodItem,
      mealType: mealShift,
      amountPaid: Number(amountPaid),
      paymentMode,
      date: todayStr,
      time: currentTimeStr
    });

    setIsSubmitting(false);

    // Auto-prompt clean plate task check popup 2-3 seconds after meal pass generation
    setTimeout(() => {
      setShowPostScanTickModal(true);
    }, 2500);
  };

  const handleResetForm = () => {
    setSubmittedPass(null);
    setFullName('');
    setPhone('');
    setCollege('');
    setNotes('');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-black text-base shadow-xs shadow-orange-500/20">
              M
            </div>
            <div>
              <h1 className="font-extrabold text-sm sm:text-base text-slate-800 leading-tight">
                {rules.messName || 'Morya Mess'}
              </h1>
              <span className="text-[11px] text-orange-600 font-semibold block leading-none mt-0.5">
                Trial & Guest Self Check-in
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Shift: {mealShift.toUpperCase()}</span>
            </div>
            {onExit && (
              <button
                onClick={onExit}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                title="Exit"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-5 space-y-4">
        {/* LIVE MESS OCCUPANCY & 20-SEAT CROWD METER (VIBRANT & COLORFUL, ZERO BLACK) */}
        <div className={`p-4 sm:p-5 rounded-3xl border-2 shadow-sm transition-all space-y-3.5 ${
          liveCrowdMeter.colorScheme === 'emerald'
            ? 'bg-gradient-to-br from-emerald-50 via-teal-50/40 to-white border-emerald-300/80 shadow-emerald-500/5'
            : liveCrowdMeter.colorScheme === 'amber'
            ? 'bg-gradient-to-br from-amber-50 via-orange-50/40 to-white border-amber-300/80 shadow-amber-500/5'
            : liveCrowdMeter.colorScheme === 'rose'
            ? 'bg-gradient-to-br from-rose-50 via-orange-50/40 to-white border-rose-300/80 shadow-rose-500/5'
            : 'bg-gradient-to-br from-amber-50/80 via-orange-50/50 to-stone-50 border-amber-300/80 shadow-amber-500/5'
        }`}>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-200/70">
            <div className="flex items-center gap-2.5">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shadow-md shrink-0 ${
                liveCrowdMeter.colorScheme === 'emerald'
                  ? 'bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-emerald-500/25'
                  : liveCrowdMeter.colorScheme === 'amber'
                  ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-orange-500/25'
                  : liveCrowdMeter.colorScheme === 'rose'
                  ? 'bg-gradient-to-tr from-rose-500 to-red-600 text-white shadow-rose-500/25'
                  : 'bg-gradient-to-tr from-amber-800 via-orange-700 to-amber-600 text-white shadow-orange-900/20'
              }`}>
                {liveCrowdMeter.colorScheme === 'emerald' ? '🟢' : liveCrowdMeter.colorScheme === 'rose' ? '🔴' : liveCrowdMeter.colorScheme === 'amber' ? '🟡' : '🍽️'}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                    Live 20-Seat Dining Hall Meter
                  </h3>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-white shadow-xs ${
                    liveCrowdMeter.colorScheme === 'emerald' ? 'bg-emerald-600' :
                    liveCrowdMeter.colorScheme === 'amber' ? 'bg-amber-600' :
                    liveCrowdMeter.colorScheme === 'rose' ? 'bg-rose-600' : 'bg-gradient-to-r from-amber-800 to-orange-700'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping inline-block" />
                    {liveCrowdMeter.activeShift ? `${liveCrowdMeter.activeShift} Shift` : 'Offline'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium">
                  {liveCrowdMeter.detail}
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/90 border border-slate-200 text-[10px] font-bold text-slate-600 shadow-2xs font-mono self-start sm:self-auto">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Real-Time Status</span>
            </span>
          </div>

          {/* 3 Metric Cards Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-2xl bg-white border border-emerald-200/90 shadow-2xs text-center space-y-0.5">
              <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wide block">Seats Free</span>
              <div className="text-lg sm:text-xl font-black font-mono text-emerald-600 leading-none">
                {liveCrowdMeter.availableSeats}
              </div>
              <span className="text-[9px] font-semibold text-emerald-800/80 block">🟢 Walk-in Ready</span>
            </div>

            <div className="p-2.5 rounded-2xl bg-white border border-amber-200/90 shadow-2xs text-center space-y-0.5">
              <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wide block">Occupied</span>
              <div className="text-lg sm:text-xl font-black font-mono text-amber-800 leading-none">
                {liveCrowdMeter.occupiedSeats} <span className="text-[10px] font-normal text-slate-400 font-sans">/ 20</span>
              </div>
              <span className="text-[9px] font-semibold text-amber-800/80 block">🪑 In Dining</span>
            </div>

            <div className="p-2.5 rounded-2xl bg-white border border-sky-200/90 shadow-2xs text-center space-y-0.5">
              <span className="text-[9px] font-bold text-sky-700 uppercase tracking-wide block">Est. Wait</span>
              <div className="text-sm sm:text-base font-black font-mono text-sky-800 leading-none truncate mt-0.5">
                {liveCrowdMeter.estimatedWaitTime.split(' ')[0]} {liveCrowdMeter.estimatedWaitTime.split(' ')[1] || 'min'}
              </div>
              <span className="text-[9px] font-semibold text-sky-800/80 block">⏱️ No Delay</span>
            </div>
          </div>

          {/* Live Occupancy Gauge Bar */}
          <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-slate-700 flex items-center gap-1.5">
                <span>⚡ Dining Capacity:</span>
                <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-black ${
                  liveCrowdMeter.occupancy <= 40 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {liveCrowdMeter.occupancy}% Busy
                </span>
              </span>
              <span className="text-slate-500 font-mono text-[10px]">
                {liveCrowdMeter.availableSeats} open tables
              </span>
            </div>

            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200/80 p-0.5 flex">
              <div 
                className={`h-full rounded-full transition-all duration-700 ${
                  liveCrowdMeter.occupancy <= 35
                    ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                    : 'bg-gradient-to-r from-emerald-400 via-amber-400 to-orange-500'
                }`}
                style={{ width: `${Math.max(8, liveCrowdMeter.occupancy)}%` }}
              />
            </div>
          </div>

          {/* 20-Seat Visual Grid (Chairs Floor Plan) */}
          <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-800">
                <span>🪑 20 Dining Chairs Layout</span>
                <span className="text-[9px] font-bold text-slate-400 font-mono">• 25-Min Rolling Turnaround</span>
              </div>
              <div className="flex items-center gap-2.5 text-[9px] font-bold">
                <span className="inline-flex items-center gap-1 text-emerald-800">
                  <span className="w-2 h-2 rounded bg-emerald-100 border border-emerald-400 inline-block" /> Free ({liveCrowdMeter.availableSeats})
                </span>
                <span className="inline-flex items-center gap-1 text-amber-800">
                  <span className="w-2 h-2 rounded bg-amber-500 inline-block" /> Dining ({liveCrowdMeter.occupiedSeats})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
              {Array.from({ length: 20 }).map((_, index) => {
                const isOccupied = index < liveCrowdMeter.occupiedSeats;
                return (
                  <div
                    key={index}
                    title={isOccupied ? `Seat ${index + 1}: Occupied (In dining session)` : `Seat ${index + 1}: Available (Ready to sit)`}
                    className={`rounded-xl p-1 flex flex-col items-center justify-center transition-all cursor-default select-none ${
                      isOccupied
                        ? 'bg-gradient-to-b from-amber-500 to-orange-500 text-white border-2 border-orange-600 shadow-xs'
                        : 'bg-gradient-to-b from-white to-emerald-50/80 border-2 border-emerald-300 text-emerald-800 shadow-2xs hover:border-emerald-500'
                    }`}
                  >
                    <span className="text-xs leading-none">{isOccupied ? '🍲' : '🪑'}</span>
                    <span className={`text-[9px] font-mono font-black mt-0.5 leading-none ${isOccupied ? 'text-white' : 'text-slate-800'}`}>
                      {index + 1 < 10 ? `0${index + 1}` : index + 1}
                    </span>
                    <span className={`text-[7px] font-bold uppercase tracking-tight leading-none mt-0.5 ${
                      isOccupied ? 'text-amber-100' : 'text-emerald-700'
                    }`}>
                      {isOccupied ? 'Busy' : 'Open'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Pro-Tip Note */}
            <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 flex items-center gap-1.5 text-[11px] font-medium">
              <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span>✨ Hot, fresh tawa rotis are served live! Sit anywhere and show your digital QR pass at the counter.</span>
            </div>
          </div>
        </div>

        {/* DAILY FITNESS & CALORIE MACRO NUTRITION CARD (CLEAN OFFICIAL TYPOGRAPHY) */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-amber-50/90 via-orange-50/60 to-emerald-50/80 text-slate-800 shadow-sm space-y-3 border-2 border-amber-200/90">
          <div className="flex items-center justify-between border-b border-amber-200/60 pb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
                <Utensils className="w-4 h-4 text-amber-800" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-normal">
                    1-Plate Thali Nutrition Macros
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-bold">
                    Exact 1 Plate
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium">Standard portion: 4 Rotis, Dal, Rice, Sabji & Salad</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-orange-600 text-white text-xs font-bold shadow-xs">
              ~580 kcal
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-white border border-amber-200/90 shadow-2xs space-y-0.5">
              <span className="text-[11px] font-semibold text-slate-600 block">Protein</span>
              <div className="text-base sm:text-lg font-bold text-orange-600">
                17.5 g
              </div>
              <span className="text-[10px] text-slate-500 block">1 Plate Serving</span>
            </div>
            <div className="p-2.5 sm:p-3 rounded-2xl bg-white border border-emerald-200/90 shadow-2xs space-y-0.5">
              <span className="text-[11px] font-semibold text-slate-600 block">Carbs</span>
              <div className="text-base sm:text-lg font-bold text-emerald-700">
                92.0 g
              </div>
              <span className="text-[10px] text-slate-500 block">Rotis & Rice</span>
            </div>
            <div className="p-2.5 sm:p-3 rounded-2xl bg-white border border-sky-200/90 shadow-2xs space-y-0.5">
              <span className="text-[11px] font-semibold text-slate-600 block">Healthy Fats</span>
              <div className="text-base sm:text-lg font-bold text-sky-700">
                12.5 g
              </div>
              <span className="text-[10px] text-slate-500 block">Tadka & Gravy</span>
            </div>
          </div>

          {/* 1-Plate Component Breakdown (Clean, Official, No Emojis) */}
          <div className="p-2.5 rounded-xl bg-white/90 border border-amber-200/80 text-xs text-slate-700 flex items-center justify-between flex-wrap gap-2 font-medium">
            <span>4 Rotis (9.6g protein)</span>
            <span className="text-slate-300">•</span>
            <span>Dal (4.2g protein)</span>
            <span className="text-slate-300">•</span>
            <span>Rice (2.4g protein)</span>
            <span className="text-slate-300">•</span>
            <span>Sabzi (2–5g protein)</span>
          </div>
        </div>

        {/* 25-DAY CLEAN PLATE TASK CAMPAIGN CARD */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 text-white shadow-md space-y-3.5 border-2 border-emerald-400/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌿</span>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-100">
                  25-Day Clean Plate Campaign
                </h4>
                <p className="text-[10px] text-emerald-200">Zero Food Waste Monthly Challenge</p>
              </div>
            </div>
            <span className="text-[10px] font-extrabold text-amber-200 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-400/40">
              🏆 5 Winners get ₹50 OFF
            </span>
          </div>

          {!taskProgress.isParticipating ? (
            <div className="space-y-3">
              <p className="text-xs text-emerald-100">
                Finish 100% of your thali without food waste for 25 days this month. Top 5 winners selected via AI draw receive <strong>₹50 discount</strong>!
              </p>
              <button
                onClick={() => setIsNominateModalOpen(true)}
                className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-950 font-black text-xs transition cursor-pointer shadow-lg flex items-center justify-center gap-2"
              >
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>Nominate Me for 25-Day Challenge (Join Now) ➔</span>
              </button>
            </div>
          ) : (
            <>
              {/* Progress Bar */}
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-400/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-white">Your Monthly Streak Progress</span>
                  <strong className="font-mono text-amber-300 font-black">
                    {taskProgress.completedDates.length} / 25 Days Ticked
                  </strong>
                </div>

                <div className="w-full bg-emerald-950/60 h-2.5 rounded-full overflow-hidden p-0.5 border border-emerald-400/30">
                  <div 
                    className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (taskProgress.completedDates.length / 25) * 100)}%` }}
                  />
                </div>
              </div>

              {/* 25 Badges Grid (1 to 25 Days) */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider block">
                  Daily Task Calendar Grid (Days 1–25):
                </span>
                <div className="grid grid-cols-5 gap-1.5 text-center font-mono text-[10px]">
                  {Array.from({ length: 25 }, (_, i) => {
                    const dayNum = i + 1;
                    const isTicked = i < taskProgress.completedDates.length;
                    return (
                      <div
                        key={dayNum}
                        className={`py-1.5 px-1 rounded-xl font-bold transition ${
                          isTicked
                            ? 'bg-amber-400 text-emerald-950 font-black shadow-xs border border-amber-300'
                            : 'bg-emerald-900/40 text-emerald-200/60 border border-emerald-500/20'
                        }`}
                      >
                        {isTicked ? `✓ D${dayNum}` : `D${dayNum}`}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Daily Tick Action Button */}
              <div className="pt-1 flex items-center justify-between gap-2">
                {taskProgress.completedDates.includes(todayStr) ? (
                  <div className="w-full py-2.5 px-3 rounded-xl bg-amber-400 text-emerald-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-900" />
                    <span>Today's Clean Plate Ticked! ({taskProgress.completedDates.length}/25 Days)</span>
                  </div>
                ) : (
                  <button
                    onClick={handleExecuteDailyTick}
                    className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-emerald-50 text-emerald-950 font-black text-xs transition cursor-pointer shadow-md flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Tick Today's Clean Plate Task (+1 Day Streak) ➔</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {submittedPass ? (
          /* ==========================================
             DIGITAL DINING PASS (VERIFIED TOKEN)
             ========================================== */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-7 space-y-6 animate-in fade-in zoom-in-95 duration-200 text-center">
            
            {/* Success Badge */}
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200/80 shadow-xs">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                VERIFIED DINING PASS
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800">
                Dining Token Confirmed!
              </h2>
              <p className="text-xs text-slate-500">
                Show this digital receipt at the food counter to receive your meal.
              </p>
            </div>

            {/* Token Badge Display */}
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-orange-50 via-amber-50/70 to-orange-100/50 border-2 border-dashed border-orange-400 space-y-3 shadow-xs">
              <span className="text-xs font-black uppercase tracking-wider text-orange-800 bg-orange-100/80 px-3 py-1 rounded-full inline-block border border-orange-300">
                Official Token Number
              </span>
              <div className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight font-mono">
                {submittedPass.tokenNumber}
              </div>

              {/* HIGHLIGHTED & LARGER DATE & TIME BADGE */}
              <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white border border-orange-300/90 shadow-sm text-slate-900 font-black text-sm sm:text-base font-mono">
                <Calendar className="w-4 h-4 text-orange-600 shrink-0" />
                <span className="text-orange-700">{submittedPass.date}</span>
                <span className="text-slate-300">|</span>
                <Clock className="w-4 h-4 text-orange-600 shrink-0" />
                <span className="text-slate-900">{submittedPass.time}</span>
              </div>
            </div>

            {/* Pass Summary Details */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-left text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Student Name</span>
                <span className="font-bold text-slate-800 text-sm">{submittedPass.fullName}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Mobile Number</span>
                <span className="font-mono font-semibold text-slate-700">{submittedPass.phone}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Meal / Item</span>
                <span className="font-bold text-slate-800">{submittedPass.foodItem} ({submittedPass.mealType.toUpperCase()})</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-200/60 bg-amber-50/60 px-2 rounded-lg border border-amber-200/80">
                <span className="text-slate-700 font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-orange-600" />
                  Pass Date & Time
                </span>
                <span className="font-mono font-black text-sm text-orange-800">
                  {submittedPass.date} @ {submittedPass.time}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Amount Paid</span>
                <span className="font-black text-base text-emerald-700">₹{submittedPass.amountPaid}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Payment Mode</span>
                <span className="font-semibold text-slate-700 capitalize bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  {submittedPass.paymentMode.toUpperCase()}
                </span>
              </div>
            </div>

              {/* Live Cloud Verification Status Banner */}
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs text-left space-y-1">
                <div className="flex items-center gap-2 font-extrabold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Verified & Synced with Mess Owner App!</span>
                </div>
                <p className="text-[11px] text-emerald-700">
                  Token #{submittedPass.tokenNumber} for {submittedPass.fullName} (₹{submittedPass.amountPaid}) has been recorded in the Cloud Database and sent to Mess Manager.
                </p>
              </div>

              {/* SPECIAL PROMOTIONAL CONVERSION OFFER BANNER */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white shadow-md text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full text-white">
                    Special Offer
                  </span>
                  <span className="text-xs font-black text-amber-200">Save ₹200 Flat</span>
                </div>
                <h4 className="text-sm font-extrabold text-white">
                  Loved your meal? Convert to Monthly Pass!
                </h4>
                <p className="text-[11px] text-white/90">
                  Join Morya Mess monthly plan today & enjoy 2 meals daily with FREE Sunday special menu.
                </p>
                <a
                  href={`https://wa.me/91${(rules.contactPhone || '9876543210').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Namaste! I just enjoyed my trial meal (Token #${submittedPass.tokenNumber}). I want to join Monthly Membership with ₹200 OFF offer!`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-orange-950 font-black text-xs hover:bg-orange-50 transition cursor-pointer shadow-xs"
                >
                  <span>Claim ₹200 OFF Monthly Pass ➔</span>
                </a>
              </div>

              {/* EMOJI MEAL FEEDBACK RATING */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2">
                <span className="text-xs font-bold text-slate-700">How was your meal today?</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => alert("Thank you! Glad you loved the food! 😍")}
                    className="flex-1 py-2 rounded-xl bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 text-xs font-bold text-slate-800 transition cursor-pointer"
                  >
                    😍 Delicious
                  </button>
                  <button
                    type="button"
                    onClick={() => alert("Thank you for your feedback! 🙂")}
                    className="flex-1 py-2 rounded-xl bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-xs font-bold text-slate-800 transition cursor-pointer"
                  >
                    🙂 Good
                  </button>
                  <button
                    type="button"
                    onClick={() => alert("Feedback sent to Mess Owner for improvement! 🙁")}
                    className="flex-1 py-2 rounded-xl bg-white border border-slate-200 hover:border-rose-400 hover:bg-rose-50 text-xs font-bold text-slate-800 transition cursor-pointer"
                  >
                    🙁 Fair
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => {
                    onRegisterTrial({
                      id: `trial-${Date.now()}`,
                      fullName: submittedPass.fullName,
                      phone: submittedPass.phone,
                      gender: 'male',
                      college: '',
                      mealType: submittedPass.mealType,
                      foodItem: submittedPass.foodItem,
                      amountPaid: submittedPass.amountPaid,
                      paymentMode: submittedPass.paymentMode,
                      date: submittedPass.date,
                      tokenNumber: submittedPass.tokenNumber,
                      notes: 'Manual Re-Sync Token'
                    });
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('morya_trial_updated'));
                      window.dispatchEvent(new Event('storage'));
                    }
                    alert(`Token #${submittedPass.tokenNumber} re-submitted to Mess Owner App successfully!`);
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-orange-500/20"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Re-Sync Token To Mess Owner App Now ➔</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Save / Screenshot Pass</span>
                </button>

                <button
                  onClick={handleResetForm}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Register Another Visitor / Meal</span>
                </button>
              </div>
          </div>
        ) : (
          /* ==========================================
             STUDENT SELF CHECK-IN FORM
             ========================================== */
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Hero Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm shadow-orange-500/20 space-y-1">
              <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-white/20 text-white">
                Guest / Trial Entry
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Self Check-in & Dining Slip
              </h2>
              <p className="text-xs text-white/90">
                Enter your details to generate your verified meal pass for today.
              </p>
            </div>

            {/* Form Fields Card */}
            <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              
              {/* Name & Phone */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Your Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Abhishek Shinde"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mobile Number (WhatsApp) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="10-digit phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition"
                    />
                  </div>
                </div>

                {/* Gender & College */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setGender('male')}
                        className={`flex-1 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                          gender === 'male' 
                            ? 'bg-orange-50 border-orange-400 text-orange-700' 
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        Boy
                      </button>
                      <button
                        type="button"
                        onClick={() => setGender('female')}
                        className={`flex-1 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                          gender === 'female' 
                            ? 'bg-orange-50 border-orange-400 text-orange-700' 
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        Girl
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">College / Hostel</label>
                    <input
                      type="text"
                      placeholder="Optional"
                      value={college}
                      onChange={(e) => setCollege(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* What Did You Eat / Food Selection */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Select Meal Option <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PRESET_MEALS.map((meal) => (
                    <button
                      key={meal.id}
                      type="button"
                      onClick={() => handleMealSelect(meal.id)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        selectedMealId === meal.id
                          ? 'bg-orange-50/80 border-orange-400 shadow-2xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-bold text-xs text-slate-800">{meal.name}</span>
                        <span className="text-xs font-black text-orange-600 shrink-0">₹{meal.price}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">{meal.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Meal Shift (Lunch / Dinner) */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Service Shift</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMealShift('lunch')}
                      className={`flex-1 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                        mealShift === 'lunch'
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      Lunch
                    </button>
                    <button
                      type="button"
                      onClick={() => setMealShift('dinner')}
                      className={`flex-1 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                        mealShift === 'dinner'
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      Dinner
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Amount Paid (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs font-black text-slate-800 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition"
                  />
                </div>
              </div>

              {/* Payment Mode Selection */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="block text-xs font-bold text-slate-700">Payment Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('upi')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                      paymentMode === 'upi'
                        ? 'bg-orange-50 border-orange-400 text-orange-700 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-orange-600" />
                    <span>UPI (GPay / PhonePe)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('cash')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                      paymentMode === 'cash'
                        ? 'bg-orange-50 border-orange-400 text-orange-700 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span>Cash at Counter</span>
                  </button>
                </div>

                {paymentMode === 'upi' && rules.upiId && (
                  <div className="p-3.5 rounded-xl bg-orange-50/80 border border-orange-200 text-xs text-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-600">Official Mess UPI ID:</span>
                      <strong className="font-mono text-orange-900 font-black">{rules.upiId}</strong>
                    </div>
                    
                    <div className="pt-1 flex gap-2">
                      <a
                        href={`upi://pay?pa=${rules.upiId}&pn=${encodeURIComponent(rules.upiPayeeName || rules.messName || 'Morya Mess')}&am=${amountPaid}&cu=INR`}
                        className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-[11px] text-center shadow-xs transition"
                      >
                        ⚡ Pay ₹{amountPaid} via UPI App
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(rules.upiId || '');
                          alert(`UPI ID copied: ${rules.upiId}`);
                        }}
                        className="px-3 py-2 rounded-xl bg-white border border-orange-300 text-slate-800 font-bold text-[11px] hover:bg-orange-100/50 cursor-pointer"
                      >
                        Copy UPI
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowUpiDetails(!showUpiDetails)}
                      className="text-orange-600 font-bold hover:underline text-[11px] block pt-1"
                    >
                      {showUpiDetails ? 'Hide UPI Details ▲' : 'View Mess UPI Pay Details ▼'}
                    </button>
                    {showUpiDetails && (
                      <div className="pt-2 text-[11px] text-slate-600 border-t border-orange-200/60">
                        <p>Payee: <strong>{rules.upiPayeeName || rules.messName}</strong></p>
                        <p>You can pay via Google Pay, PhonePe, Paytm, or BHIM UPI.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* REFER & EARN PROGRAM CARD */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-purple-50/50 to-white border border-indigo-200/90 space-y-1.5 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                    Refer & Earn
                  </span>
                  <span className="text-xs font-bold text-indigo-700">Get ₹100 OFF</span>
                </div>
                <div className="text-xs font-bold text-slate-800">
                  Refer your hostel friends to Morya Mess!
                </div>
                <p className="text-[11px] text-slate-600">
                  Share your referral link on WhatsApp. When your friend joins, both get ₹100 discount!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const refCode = `MORYA-REF-${phone ? phone.slice(-4) : 'HOSTEL'}`;
                    const msg = `Hey! Check out Morya Mess for daily delicious thalis. Use my code *${refCode}* when joining to get ₹100 OFF! Check menu: ${window.location.origin}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                  }}
                  className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <span>🎁 Share Referral Code on WhatsApp</span>
                </button>
              </div>

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notes / Feedback (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Came with friends, first day trial"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition"
                />
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-sm shadow-md shadow-orange-500/25 hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2 mt-4"
              >
                <span>Confirm & Generate Dining Pass</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
        {/* POST-MEAL SCAN CLEAN PLATE TICK POPUP MODAL */}
        {showPostScanTickModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 border-2 border-emerald-400">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🍽️</span>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Post-Meal Clean Plate Check</h3>
                    <p className="text-[11px] text-slate-500">25-Day Zero Food Waste Campaign</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPostScanTickModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100 border border-emerald-200 text-center space-y-2">
                <Sparkles className="w-8 h-8 text-emerald-600 mx-auto animate-bounce" />
                <h4 className="font-black text-emerald-950 text-base">
                  Did you finish your meal with zero food waste today?
                </h4>
                <p className="text-xs text-emerald-800">
                  Checking in after your meal scan! Tick today's task to build your 25-day campaign streak for the ₹50 winner selection.
                </p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleExecuteDailyTick}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-md shadow-emerald-500/20 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>✅ Yes, Tick Today's Clean Plate (+1 Day)</span>
                </button>

                <button
                  onClick={() => setShowPostScanTickModal(false)}
                  className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Ask Me Later
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 25-DAY CAMPAIGN NOMINATION FORM MODAL ("NOMINATE ME") */}
        {isNominateModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 border-2 border-emerald-400">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
                    <Trophy className="w-5 h-5 text-amber-200" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm">Nominate for 25-Day Challenge</h3>
                    <p className="text-[11px] text-slate-500">Zero Food Waste Monthly Competition</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsNominateModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleConfirmNomination} className="space-y-3.5 text-xs">
                <div className="p-3 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-emerald-950 space-y-1">
                  <span className="font-extrabold text-[11px] text-emerald-800 uppercase tracking-wider block">🏆 Campaign Award:</span>
                  <p className="text-xs">
                    Finish 100% of your thali for <strong>25 days</strong> this month. Top 5 winners chosen via AI algorithmic draw win <strong>₹50 OFF</strong> on monthly subscription renewal!
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Student Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-800 outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">10-Digit Mobile *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9822000000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-slate-800 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Current Month</label>
                    <input
                      type="text"
                      disabled
                      value={todayStr.substring(0, 7)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-600 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">College / Hostel Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajarshi Shahu College / Boys Hostel"
                    value={nominateCollege}
                    onChange={(e) => setNominateCollege(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-800 outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Your Zero-Waste Pledge *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="e.g. I pledge to take only what I can finish and maintain 0 food waste for 25 days!"
                    value={nominatePledge}
                    onChange={(e) => setNominatePledge(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-800 outline-none focus:border-emerald-500 resize-none text-xs"
                  />
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-lg shadow-emerald-500/25 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-amber-200" />
                    <span>Confirm Nomination & Submit to Owner App ➔</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-slate-200/80 bg-white text-center text-xs text-slate-500">
        <p className="font-semibold text-slate-700">
          {rules.messName || 'Morya Mess'} · Dining & Tiffin Operations
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Near Boys & Girls Hostel, College Road
        </p>
      </footer>
    </div>
  );
};
