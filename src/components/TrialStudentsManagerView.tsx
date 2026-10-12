import React, { useState, useEffect } from 'react';
import { TrialStudent, TrialStatus, PaymentMode } from '../types/mess';
import { 
  fetchTrialStudents, 
  addTrialStudentInSupabase, 
  convertTrialToRegularCustomer,
  recordTrialMealConsumedInSupabase 
} from '../lib/ownerFeaturesApi';
import { subscribeToSync, pullSyncFromServer } from '../lib/syncEngine';
import { exportToSpreadsheet } from '../lib/exportUtils';
import { 
  Sparkles, 
  Plus, 
  UserCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Calendar, 
  Phone, 
  CreditCard,
  ArrowRight,
  RefreshCw,
  X,
  MessageSquare,
  Utensils,
  QrCode,
  Check,
  Send,
  Zap,
  Radio,
  Download,
  Printer,
  ArrowLeft,
  Flame,
  Award,
  FileSpreadsheet,
  CheckCheck
} from 'lucide-react';

interface TrialStudentsManagerViewProps {
  onRefreshAllData?: () => void;
  onBack?: () => void;
  onOpenTrialQr?: () => void;
}

export const TrialStudentsManagerView: React.FC<TrialStudentsManagerViewProps> = ({
  onRefreshAllData,
  onBack,
  onOpenTrialQr
}) => {
  const [trials, setTrials] = useState<TrialStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ENDING_SOON' | 'EXPIRED' | 'CONVERTED'>('ALL');
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('Just now');

  // Add Trial Form Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [mealType, setMealType] = useState<'both' | 'lunch_only' | 'dinner_only'>('both');
  const [mealLimit, setMealLimit] = useState(2);
  const [amountPaid, setAmountPaid] = useState(70);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Convert Trial Modal
  const [convertingTrial, setConvertingTrial] = useState<TrialStudent | null>(null);
  const [planName, setPlanName] = useState('Monthly Full (Lunch & Dinner)');
  const [subStartDate, setSubStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [subEndDate, setSubEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [planAmount, setPlanAmount] = useState(2500);
  const [paidAmount, setPaidAmount] = useState(2500);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [convertNotes, setConvertNotes] = useState('');
  const [isConverting, setIsConverting] = useState(false);

  // Token Pass Slip Modal
  const [viewingPassStudent, setViewingPassStudent] = useState<TrialStudent | null>(null);

  // Consuming Meal Loading
  const [consumingId, setConsumingId] = useState<string | null>(null);

  useEffect(() => {
    loadTrials();

    // 1. Central sync engine listener
    const unsub = subscribeToSync((state) => {
      if (state.trials) {
        loadTrials(false);
      }
    });

    // 2. Storage and custom events
    const handleUpdate = () => loadTrials(false);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('morya_trial_updated', handleUpdate);

    // 3. Fast auto-poll every 4s so QR scans from phones appear immediately
    const pollInterval = setInterval(() => {
      loadTrials(false);
    }, 4000);

    return () => {
      unsub();
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('morya_trial_updated', handleUpdate);
      clearInterval(pollInterval);
    };
  }, []);

  const loadTrials = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      await pullSyncFromServer();
    } catch {}
    const data = await fetchTrialStudents();
    setTrials(data);
    setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    if (showLoading) setIsLoading(false);
  };

  const handleAddTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) return;

    setIsSubmitting(true);
    const res = await addTrialStudentInSupabase({
      fullName,
      phone,
      startDate,
      endDate,
      mealType,
      mealLimit,
      amountPaid,
      notes
    });

    if (res.success) {
      setIsAddOpen(false);
      setFullName('');
      setPhone('');
      setNotes('');
      await loadTrials();
      if (onRefreshAllData) onRefreshAllData();
    } else {
      alert(res.error || 'Failed to add trial student');
    }
    setIsSubmitting(false);
  };

  const handleExecuteConversion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingTrial) return;

    setIsConverting(true);
    const res = await convertTrialToRegularCustomer({
      trialId: convertingTrial.id,
      planName,
      startDate: subStartDate,
      endDate: subEndDate,
      amount: planAmount,
      paidAmount,
      paymentMode,
      notes: convertNotes
    });

    if (res.success) {
      setConvertingTrial(null);
      await loadTrials();
      if (onRefreshAllData) onRefreshAllData();
    } else {
      alert(res.error || 'Failed to convert trial');
    }
    setIsConverting(false);
  };

  const handleMarkMealConsumed = async (trial: TrialStudent) => {
    setConsumingId(trial.id);
    const res = await recordTrialMealConsumedInSupabase(trial.id, 'lunch');
    if (res.success) {
      await loadTrials(false);
      if (onRefreshAllData) onRefreshAllData();
    } else {
      alert(res.error || 'Failed to record meal');
    }
    setConsumingId(null);
  };

  const handleExport = (format: 'xlsx' | 'csv') => {
    if (trials.length === 0) {
      alert('No trial students to export.');
      return;
    }

    const rows = trials.map(t => {
      const remaining = Math.max(0, t.mealLimit - t.mealsUsed);
      return {
        'Trial ID': t.id,
        'Student Name': t.fullName,
        'Phone Number': t.phone,
        'Start Date': t.startDate,
        'End Date': t.endDate,
        'Meal Shift': (t.mealType || 'both').replace('_', ' ').toUpperCase(),
        'Meals Allowed': t.mealLimit,
        'Meals Eaten': t.mealsUsed,
        'Meals Remaining': remaining,
        'Trial Status': t.status,
        'Notes & Details': t.notes || ''
      };
    });

    exportToSpreadsheet(rows, {
      filename: `Morya_Mess_Trial_Students_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Trial_Logs',
      format
    });
  };

  const filtered = trials.filter(t => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return (
        t.fullName.toLowerCase().includes(term) ||
        t.phone.toLowerCase().includes(term) ||
        t.id.toLowerCase().includes(term) ||
        (t.notes && t.notes.toLowerCase().includes(term))
      );
    }
    return true;
  });

  // Financial calculation of trial guest collections
  const totalTrialRevenue = trials.reduce((sum, t) => {
    const notesStr = t.notes || '';
    let val = 70;
    if (notesStr.includes('PAID:')) {
      const m = notesStr.match(/PAID:(\d+)/);
      if (m) val = Number(m[1]) || 70;
    }
    return sum + val;
  }, 0);

  const convertedCount = trials.filter(t => t.status === 'CONVERTED').length;
  const conversionRate = trials.length > 0 ? Math.round((convertedCount / trials.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Trial Student Records & Logs
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
                Special Standee Radar
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time audit log of guests registered via Standee QR scan, meal consumption punches, and conversion tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenTrialQr && (
            <button
              onClick={onOpenTrialQr}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 font-bold text-xs cursor-pointer shadow-2xs transition"
            >
              <QrCode className="w-4 h-4 text-orange-600" />
              <span>Open Standee Studio</span>
            </button>
          )}

          <button
            onClick={() => handleExport('xlsx')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs cursor-pointer shadow-2xs transition"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black text-xs shadow-xs cursor-pointer transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Walk-In Trial</span>
          </button>
        </div>
      </div>

      {/* Live Cloud Standee Radar Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 rounded-2xl border border-orange-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="font-black text-xs text-slate-900 flex items-center gap-2">
              <span>Live QR Standee Radar & Supabase PostgreSQL Connected</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            </span>
            <span className="text-[11px] text-slate-600 font-medium block">
              Any student scanning the table standee gets a live digital token synced immediately. Last synced: {lastSyncedTime}
            </span>
          </div>
        </div>

        <button
          onClick={() => loadTrials(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-orange-200 rounded-xl text-orange-800 text-xs font-bold hover:bg-orange-50 cursor-pointer shadow-xs transition shrink-0"
          title="Force Sync with Server"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Sync Now</span>
        </button>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase block">Active Trials</span>
          <span className="text-2xl font-black text-emerald-600 block">
            {trials.filter(t => t.status === 'ACTIVE').length}
          </span>
          <span className="text-[10px] text-emerald-600 font-bold block">
            ● Ready to eat today
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-amber-700 uppercase block">Ending Soon</span>
          <span className="text-2xl font-black text-amber-600 block">
            {trials.filter(t => t.status === 'ENDING_SOON').length}
          </span>
          <span className="text-[10px] text-amber-600 font-semibold block">
            1 meal remaining
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-blue-700 uppercase block">Admitted / Converted</span>
          <span className="text-2xl font-black text-blue-600 block">
            {convertedCount}
          </span>
          <span className="text-[10px] text-blue-600 font-semibold block">
            {conversionRate}% conversion rate
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-600 uppercase block">Total Guests</span>
          <span className="text-2xl font-black text-slate-900 block">
            {trials.length}
          </span>
          <span className="text-[10px] text-slate-400 font-semibold block">
            All-time trials recorded
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-orange-700 uppercase block">Trial Inflow</span>
          <span className="text-2xl font-black text-orange-600 block">
            ₹{totalTrialRevenue.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-orange-600 font-semibold block">
            Collected via UPI/Cash
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold text-slate-600">
          {(['ALL', 'ACTIVE', 'ENDING_SOON', 'EXPIRED', 'CONVERTED'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === s
                  ? 'bg-orange-600 text-white shadow-xs font-black'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by student, phone or token..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 font-semibold"
          />
        </div>
      </div>

      {/* Trial Students Records Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Student / Pass Token</th>
                <th className="p-3.5">Mobile & Outreach</th>
                <th className="p-3.5">Valid Window</th>
                <th className="p-3.5">Meals Consumption</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Quick Desk Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-orange-600" />
                    <span>Synchronizing trial student records from Supabase PostgreSQL...</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                    No trial student records match the filter. Click "+ Add Walk-In Trial" to add a guest.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const remaining = Math.max(0, t.mealLimit - t.mealsUsed);
                  const notesStr = t.notes || '';
                  let tokenNum = t.id;
                  let foodItem = 'Veg Thali';
                  let paidVal = '₹70';
                  let modeVal = 'UPI';

                  if (notesStr.includes('TOKEN:')) {
                    const m = notesStr.match(/TOKEN:([^;]+)/);
                    if (m) tokenNum = m[1];
                  }
                  if (notesStr.includes('ITEM:')) {
                    const m = notesStr.match(/ITEM:([^;]+)/);
                    if (m) foodItem = m[1];
                  }
                  if (notesStr.includes('PAID:')) {
                    const m = notesStr.match(/PAID:([^;]+)/);
                    if (m) paidVal = `₹${m[1]}`;
                  }
                  if (notesStr.includes('MODE:')) {
                    const m = notesStr.match(/MODE:([^;]+)/);
                    if (m) modeVal = m[1].toUpperCase();
                  }

                  const cleanPhone = t.phone.replace(/[^0-9]/g, '');

                  return (
                    <tr key={t.id} className="hover:bg-orange-50/30 transition-colors">
                      <td className="p-3.5">
                        <div className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                          <span>{t.fullName}</span>
                          <span className="px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-800 text-[10px] font-mono font-bold">
                            {tokenNum}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-orange-700 font-bold">{foodItem}</span>
                          <span>•</span>
                          <span className="capitalize">{t.mealType?.replace('_', ' ') || 'Meal'}</span>
                          <span>•</span>
                          <span className="text-emerald-700 font-bold">{paidVal} ({modeVal})</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="font-mono text-slate-700 font-bold block">{t.phone}</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          {cleanPhone && (
                            <>
                              <a
                                href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Hello ${t.fullName}! Welcome to Morya Mess. Your trial dining token (${tokenNum}) has been confirmed. How was your meal today? Get ₹200 OFF when you convert to monthly membership this week!`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition inline-flex items-center gap-1 text-[10px] font-bold"
                                title="WhatsApp Welcome"
                              >
                                <MessageSquare className="w-3 h-3 text-emerald-600" />
                                <span>WA</span>
                              </a>
                              <a
                                href={`tel:${cleanPhone}`}
                                className="p-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition inline-flex items-center gap-1 text-[10px] font-bold"
                                title="Call Student"
                              >
                                <Phone className="w-3 h-3 text-blue-600" />
                                <span>Call</span>
                              </a>
                            </>
                          )}
                          <button
                            onClick={() => setViewingPassStudent(t)}
                            className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold border border-slate-200"
                            title="View Digital Token Slip"
                          >
                            Pass
                          </button>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-600 font-medium">
                        <div>{t.startDate}</div>
                        {t.startDate !== t.endDate && (
                          <div className="text-[10px] text-slate-400">to {t.endDate}</div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <div>
                            <span className="font-bold text-slate-900">{t.mealsUsed}</span> of {t.mealLimit} used
                            <span className="text-slate-400 text-[11px] block font-medium">
                              ({remaining} remaining)
                            </span>
                          </div>
                          {t.status === 'ACTIVE' && remaining > 0 && (
                            <button
                              onClick={() => handleMarkMealConsumed(t)}
                              disabled={consumingId === t.id}
                              className="px-2 py-1 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-900 font-bold text-[10px] border border-orange-300 transition cursor-pointer"
                              title="Deduct 1 Meal (Punch In)"
                            >
                              {consumingId === t.id ? '...' : '+ Punch'}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                          t.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : t.status === 'ENDING_SOON'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : t.status === 'CONVERTED'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        {t.status !== 'CONVERTED' ? (
                          <button
                            onClick={() => {
                              setConvertingTrial(t);
                              setPlanAmount(2500);
                              setPaidAmount(2500);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
                          >
                            <span>Convert to Regular</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Permanent Member</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW DIGITAL PASS SLIP MODAL */}
      {viewingPassStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-200 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-orange-600" />
                <h3 className="font-black text-slate-900 text-sm">Trial Dining Token Pass</h3>
              </div>
              <button onClick={() => setViewingPassStudent(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 bg-gradient-to-b from-orange-50 to-amber-50 rounded-2xl border border-orange-200 text-center space-y-2">
              <span className="text-[11px] font-bold text-orange-700 uppercase tracking-widest block">MORYA MESS DINING PASS</span>
              <div className="text-3xl font-black text-slate-900 font-mono py-1">
                {viewingPassStudent.id}
              </div>
              <div className="text-sm font-bold text-slate-800">
                {viewingPassStudent.fullName}
              </div>
              <div className="text-xs text-slate-500 font-mono">
                {viewingPassStudent.phone}
              </div>
              <div className="pt-2 border-t border-orange-200/60 text-xs font-semibold text-slate-700 flex justify-between">
                <span>Valid: {viewingPassStudent.startDate}</span>
                <span>Limit: {viewingPassStudent.mealLimit} Meals</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Print Slip
              </button>
              <button
                onClick={() => setViewingPassStudent(null)}
                className="flex-1 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD TRIAL MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-600" />
                <h3 className="font-black text-slate-900 text-sm">Register Walk-In Trial Student</h3>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTrial} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Student Full Name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Yash Deshmukh"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mobile Phone *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9822012345"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Shift</label>
                  <select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="both">Both</option>
                    <option value="lunch_only">Lunch</option>
                    <option value="dinner_only">Dinner</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Limit (Meals)</label>
                  <input
                    type="number"
                    value={mealLimit}
                    onChange={(e) => setMealLimit(Number(e.target.value))}
                    min="1"
                    max="10"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Amount Paid (₹)</label>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Notes / College / Hostel</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. COEP hostel room 104, referred by Rohan"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-2 rounded-xl text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold cursor-pointer"
                >
                  {isSubmitting ? 'Registering...' : 'Register Trial Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONVERT TRIAL MODAL */}
      {convertingTrial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-700">
                <UserCheck className="w-5 h-5" />
                <h3 className="font-black text-slate-900 text-sm">Convert to Permanent Member</h3>
              </div>
              <button onClick={() => setConvertingTrial(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800">
              <p className="font-bold">Seamless Conversion Guarantee:</p>
              <p>Converts {convertingTrial.fullName} directly into a regular subscriber in Supabase PostgreSQL, keeping attendance history intact.</p>
            </div>

            <form onSubmit={handleExecuteConversion} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Monthly Plan</label>
                <select
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="Monthly Full (Lunch & Dinner)">Monthly Full (Lunch & Dinner) — ₹2,500</option>
                  <option value="Monthly Single Meal (Lunch Only)">Monthly Single Meal (Lunch Only) — ₹1,400</option>
                  <option value="Monthly Single Meal (Dinner Only)">Monthly Single Meal (Dinner Only) — ₹1,400</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Subscription Start</label>
                  <input
                    type="date"
                    value={subStartDate}
                    onChange={(e) => setSubStartDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Subscription End</label>
                  <input
                    type="date"
                    value={subEndDate}
                    onChange={(e) => setSubEndDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Plan Total (₹)</label>
                  <input
                    type="number"
                    value={planAmount}
                    onChange={(e) => setPlanAmount(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Amount Paid Today (₹)</label>
                  <input
                    type="number"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Payment Method</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConvertingTrial(null)}
                  className="px-3 py-2 rounded-xl text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isConverting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                >
                  {isConverting ? 'Converting...' : 'Confirm Conversion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
