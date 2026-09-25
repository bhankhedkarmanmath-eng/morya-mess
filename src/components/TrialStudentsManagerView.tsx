import React, { useState, useEffect } from 'react';
import { TrialStudent, TrialStatus, PaymentMode } from '../types/mess';
import { 
  fetchTrialStudents, 
  addTrialStudentInSupabase, 
  convertTrialToRegularCustomer 
} from '../lib/ownerFeaturesApi';
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
  X
} from 'lucide-react';

interface TrialStudentsManagerViewProps {
  onRefreshAllData?: () => void;
}

export const TrialStudentsManagerView: React.FC<TrialStudentsManagerViewProps> = ({
  onRefreshAllData
}) => {
  const [trials, setTrials] = useState<TrialStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ENDING_SOON' | 'EXPIRED' | 'CONVERTED'>('ALL');

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

  useEffect(() => {
    loadTrials();
  }, []);

  const loadTrials = async () => {
    setIsLoading(true);
    const data = await fetchTrialStudents();
    setTrials(data);
    setIsLoading(false);
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

  const filtered = trials.filter(t => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return (
        t.fullName.toLowerCase().includes(term) ||
        t.phone.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Trial Student Management
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800">
              Module 6
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Track test meals, prevent allowance misuse, and convert trial students to permanent members without duplicate records.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Trial Student</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase block">Active Trials</span>
          <span className="text-xl font-black text-slate-900 mt-1 block">
            {trials.filter(t => t.status === 'ACTIVE').length}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase block">Ending Soon</span>
          <span className="text-xl font-black text-amber-600 mt-1 block">
            {trials.filter(t => t.status === 'ENDING_SOON').length}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase block">Converted to Monthly</span>
          <span className="text-xl font-black text-emerald-700 mt-1 block">
            {trials.filter(t => t.status === 'CONVERTED').length}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase block">Expired / Completed</span>
          <span className="text-xl font-black text-slate-600 mt-1 block">
            {trials.filter(t => t.status === 'EXPIRED').length}
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
                  ? 'bg-orange-600 text-white shadow-xs'
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
            placeholder="Search trial student..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      {/* Trial Students List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Student Name</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Trial Period</th>
                <th className="p-3">Meals Used / Limit</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                    Loading trial student records from Supabase...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                    No trial student records found. Click "+ Add Trial Student" to register a trial guest.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const remaining = Math.max(0, t.mealLimit - t.mealsUsed);
                  return (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-slate-900">{t.fullName}</td>
                      <td className="p-3 font-mono text-slate-600">{t.phone}</td>
                      <td className="p-3 text-slate-600">
                        {t.startDate} to {t.endDate}
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-slate-900">{t.mealsUsed}</span> of {t.mealLimit} used
                        <span className="text-slate-400 text-[11px] block font-medium">
                          ({remaining} remaining)
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          t.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.status === 'ENDING_SOON'
                            ? 'bg-amber-100 text-amber-800'
                            : t.status === 'CONVERTED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {t.status !== 'CONVERTED' ? (
                          <button
                            onClick={() => {
                              setConvertingTrial(t);
                              setPlanAmount(2500);
                              setPaidAmount(2500);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
                          >
                            <span>Convert to Customer</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-[11px] font-bold text-emerald-700">
                            ✓ Permanent Member
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

      {/* ADD TRIAL MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-600" />
                <h3 className="font-black text-slate-900 text-sm">Add Trial Student</h3>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTrial} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Name *</label>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Trial Meal Type</label>
                  <select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="both">Both (Lunch & Dinner)</option>
                    <option value="lunch_only">Lunch Only</option>
                    <option value="dinner_only">Dinner Only</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Meal Limit</label>
                  <input
                    type="number"
                    value={mealLimit}
                    onChange={(e) => setMealLimit(Number(e.target.value))}
                    min="1"
                    max="10"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Notes / College</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Referred by Rahul, COEP hostel"
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
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-4">
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
              <p>Preserves existing student ID, historical trial attendance records, notes, and profile without duplication.</p>
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
