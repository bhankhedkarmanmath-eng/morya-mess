import React, { useState, useMemo } from 'react';
import { Worker, CleaningInspection, Customer, MealLog } from '../types/mess';
import { getTodayString, evaluateStrictMessShift } from '../lib/storage';
import { getTodayActiveSkipsCount } from '../lib/autoPilotSuite';
import { 
  Users, 
  Sparkles, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Phone, 
  ChefHat, 
  Trash2, 
  X,
  Calendar,
  Send,
  Copy,
  Check,
  Flame,
  AlertTriangle
} from 'lucide-react';

interface WorkersAndKitchenViewProps {
  workers: Worker[];
  cleanings: CleaningInspection[];
  customers?: Customer[];
  mealLogs?: MealLog[];
  onAddWorker: (worker: Worker) => void;
  onUpdateWorkerAttendance: (workerId: string, date: string, status: 'present' | 'absent' | 'half_day') => void;
  onDeleteWorker: (id: string) => void;
  onAddCleaning: (inspection: CleaningInspection) => void;
  onOpenKitchenEstimator?: () => void;
  onOpenMaharajCookSheet?: () => void;
}

export const WorkersAndKitchenView: React.FC<WorkersAndKitchenViewProps> = ({
  workers,
  cleanings,
  customers = [],
  mealLogs = [],
  onAddWorker,
  onUpdateWorkerAttendance,
  onDeleteWorker,
  onAddCleaning,
  onOpenKitchenEstimator,
  onOpenMaharajCookSheet
}) => {
  const today = getTodayString();
  const shiftAudit = evaluateStrictMessShift();
  const [activeTab, setActiveTab] = useState<'workers' | 'kitchen' | 'roti_calculator'>('workers');
  const [rotiShift, setRotiShift] = useState<'lunch' | 'dinner'>(
    shiftAudit.mealType === 'dinner' ? 'dinner' : 'lunch'
  );
  const [copiedRoti, setCopiedRoti] = useState(false);

  // Categorized Roti Calculation (Boys eat 4, Girls eat 3)
  const activeMembers = useMemo(() => customers.filter(c => c.status === 'active'), [customers]);
  const boysMembers = useMemo(() => activeMembers.filter(c => c.gender === 'male' || (c.gender !== 'female' && c.gender !== 'other')), [activeMembers]);
  const girlsMembers = useMemo(() => activeMembers.filter(c => c.gender === 'female'), [activeMembers]);

  const allLeaves = useMemo(() => {
    return customers.flatMap(c => (c.leaves || []).map(l => ({
      ...l,
      customerId: c.id,
      customerGender: c.gender
    })));
  }, [customers]);

  const leavesTodayRecords = useMemo(() => {
    return allLeaves.filter(l => (l.approved || (l as any).status === 'approved') && l.startDate <= today && l.endDate >= today);
  }, [allLeaves, today]);

  const boysOnLeave = useMemo(() => leavesTodayRecords.filter(l => l.customerGender !== 'female').length, [leavesTodayRecords]);
  const girlsOnLeave = useMemo(() => leavesTodayRecords.filter(l => l.customerGender === 'female').length, [leavesTodayRecords]);

  const totalSkips = getTodayActiveSkipsCount(rotiShift);
  const boysRatio = boysMembers.length / Math.max(1, activeMembers.length);
  const boysSkips = Math.round(totalSkips * boysRatio);
  const girlsSkips = Math.max(0, totalSkips - boysSkips);

  const netBoys = Math.max(0, boysMembers.length - boysOnLeave - boysSkips);
  const netGirls = Math.max(0, girlsMembers.length - girlsOnLeave - girlsSkips);
  const totalRotiDiners = netBoys + netGirls;

  // Boys: 4 rotis, Girls: 3 rotis
  const rotisBoys = netBoys * 4;
  const rotisGirls = netGirls * 3;
  const grandTotalRotis = rotisBoys + rotisGirls;
  const attaKgBoys = +((rotisBoys * 0.035).toFixed(1));
  const attaKgGirls = +((rotisGirls * 0.035).toFixed(1));
  const totalAttaKg = +((grandTotalRotis * 0.035).toFixed(1));

  // Staff assigned to roti / chapati making
  const chapatiMakers = workers.filter(w => w.role === 'chapati_maker' || w.role === 'head_cook');
  const chapatiMakersPresent = chapatiMakers.filter(w => w.attendance[today] === 'present').length;

  const handleCopyRotiSummary = () => {
    const text = `🥖 MORYA MESS - ROTI ORDER (${rotiShift.toUpperCase()})\n` +
      `• Boys: ${netBoys} Diners × 4 = ${rotisBoys} Rotis (${attaKgBoys} kg Atta)\n` +
      `• Girls: ${netGirls} Diners × 3 = ${rotisGirls} Rotis (${attaKgGirls} kg Atta)\n` +
      `👉 Grand Total: ${grandTotalRotis} Fresh Chapatis (${totalAttaKg} KG Flour)\n` +
      `🫓 Dough Balls: ${grandTotalRotis} balls (~40g each)`;
    navigator.clipboard.writeText(text);
    setCopiedRoti(true);
    setTimeout(() => setCopiedRoti(false), 2000);
  };

  // Add Worker Modal
  const [isAddWorkerOpen, setIsAddWorkerOpen] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<'head_cook' | 'helper_cook' | 'chapati_maker' | 'cleaning_dishwashing' | 'server'>('head_cook');
  const [phone, setPhone] = useState('');
  const [monthlySalary, setMonthlySalary] = useState<number | ''>(12000);

  // Add Cleaning Modal
  const [isAddCleaningOpen, setIsAddCleaningOpen] = useState(false);
  const [area, setArea] = useState<'cooking_area' | 'dining_tables' | 'dishwashing_sink' | 'vegetable_prep' | 'storage_rack'>('cooking_area');
  const [inspectorName, setInspectorName] = useState('Manager');
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [isSanitized, setIsSanitized] = useState(true);
  const [notes, setNotes] = useState('');

  const presentCount = workers.filter(w => w.attendance[today] === 'present').length;
  const totalPayroll = workers.reduce((sum, w) => sum + w.monthlySalary, 0);

  const handleCreateWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !monthlySalary) return;

    const newWorker: Worker = {
      id: `w-${Date.now()}`,
      name: name.trim(),
      role,
      phone: phone.trim() || 'N/A',
      monthlySalary: Number(monthlySalary),
      advanceTaken: 0,
      attendance: {
        [today]: 'present'
      },
      joiningDate: today
    };

    onAddWorker(newWorker);
    setIsAddWorkerOpen(false);
    setName('');
    setPhone('');
  };

  const handleCreateCleaning = (e: React.FormEvent) => {
    e.preventDefault();
    const newInsp: CleaningInspection = {
      id: `cl-${Date.now()}`,
      area,
      inspectorName: inspectorName.trim() || 'Owner',
      rating,
      isSanitized,
      notes: notes.trim(),
      timestamp: new Date().toISOString()
    };

    onAddCleaning(newInsp);
    setIsAddCleaningOpen(false);
    setNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Kitchen Staff & Hygiene Operations</h2>
          <p className="text-xs text-slate-500">
            Cooks, Chapati Makers, Dishwashers, Daily Attendance & Cleaning Audits
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {activeTab === 'workers' ? (
            <button
              id="btn-add-worker-open"
              onClick={() => setIsAddWorkerOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 hover:from-orange-600 hover:to-orange-800 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Staff Member</span>
            </button>
          ) : (
            <button
              id="btn-add-cleaning-open"
              onClick={() => setIsAddCleaningOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 hover:from-orange-600 hover:to-orange-800 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Log Hygiene Check</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200/90 gap-6 text-xs font-bold text-slate-500 overflow-x-auto">
        <button
          onClick={() => setActiveTab('workers')}
          className={`pb-3 relative cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === 'workers'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'hover:text-slate-900'
          }`}
        >
          Staff & Attendance ({workers.length})
        </button>
        <button
          onClick={() => setActiveTab('roti_calculator')}
          className={`pb-3 relative cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'roti_calculator'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'hover:text-slate-900'
          }`}
        >
          <span>🥖 Daily Roti & Diet Planner</span>
          <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[10px] font-black border border-orange-200/80">
            Boys 4 • Girls 3
          </span>
        </button>
        <button
          onClick={() => setActiveTab('kitchen')}
          className={`pb-3 relative cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === 'kitchen'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'hover:text-slate-900'
          }`}
        >
          Kitchen Hygiene & Cleaning ({cleanings.length})
        </button>
      </div>

      {/* TAB 1: WORKERS */}
      {activeTab === 'workers' && (
        <div className="space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Present Today ({today})</span>
              <div className="text-2xl font-bold text-emerald-600 mt-1">
                {presentCount} / {workers.length}
              </div>
              <span className="text-[11px] text-slate-500">Kitchen staff on duty</span>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Total Monthly Payroll</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                ₹{totalPayroll.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-500">Total salaries liability</span>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Head Cooks & Chapati Makers</span>
              <div className="text-2xl font-bold text-orange-700 mt-1">
                {workers.filter(w => w.role === 'head_cook' || w.role === 'chapati_maker').length}
              </div>
              <span className="text-[11px] text-slate-500">Core culinary artisans</span>
            </div>
          </div>

          {/* Workers Table or Empty State */}
          {workers.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
              <ChefHat className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Kitchen Staff Added Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Add your Maharaj (head cook), chapati maker, helper cook, and cleaning staff to track their daily attendance and payroll.
              </p>
              <button
                onClick={() => setIsAddWorkerOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Worker</span>
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Staff Member</th>
                      <th className="px-4 py-3 font-semibold">Role</th>
                      <th className="px-4 py-3 font-semibold">Mobile</th>
                      <th className="px-4 py-3 font-semibold">Monthly Salary</th>
                      <th className="px-4 py-3 font-semibold">Today's Attendance</th>
                      <th className="px-4 py-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {workers.map(w => {
                      const att = w.attendance[today] || 'absent';
                      return (
                        <tr key={w.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900">{w.name}</div>
                            <span className="font-mono text-[10px] text-slate-400">Joined: {w.joiningDate}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize bg-orange-50 text-orange-700">
                              {w.role.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600">{w.phone}</td>
                          <td className="px-4 py-3 font-bold text-slate-900">
                            ₹{w.monthlySalary.toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                              <button
                                onClick={() => onUpdateWorkerAttendance(w.id, today, 'present')}
                                className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                  att === 'present'
                                    ? 'bg-emerald-600 text-white'
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                Present
                              </button>
                              <button
                                onClick={() => onUpdateWorkerAttendance(w.id, today, 'half_day')}
                                className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                  att === 'half_day'
                                    ? 'bg-amber-500 text-white'
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                Half Day
                              </button>
                              <button
                                onClick={() => onUpdateWorkerAttendance(w.id, today, 'absent')}
                                className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                  att === 'absent'
                                    ? 'bg-rose-600 text-white'
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                Absent
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete staff member ${w.name}?`)) {
                                  onDeleteWorker(w.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: KITCHEN HYGIENE */}
      {activeTab === 'kitchen' && (
        <div className="space-y-6">
          {cleanings.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
              <Sparkles className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Kitchen Cleaning Logs Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Maintain 100% student trust with recorded daily sanitization logs of the cooking stoves, dining tables, and dish sinks.
              </p>
              <button
                onClick={() => setIsAddCleaningOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log First Inspection</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cleanings.map(c => (
                <div key={c.id} className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm capitalize">
                      {c.area.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      c.isSanitized ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {c.isSanitized ? '✓ Sanitized' : 'Attention Needed'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex justify-between">
                    <span>Inspector: {c.inspectorName}</span>
                    <span className="font-mono">{new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {c.notes && (
                    <p className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded-lg">
                      "{c.notes}"
                    </p>
                  )}
                  <div className="flex items-center gap-1 text-amber-500 text-xs">
                    {'★'.repeat(c.rating || 5)}{'☆'.repeat(5 - (c.rating || 5))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DAILY ROTI & DIET PLANNER (BOYS: 4, GIRLS: 3) */}
      {activeTab === 'roti_calculator' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Header Banner & Shift Selector */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-white border-2 border-amber-300 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center text-2xl shadow-md shadow-orange-500/20 shrink-0">
                🥖
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    Daily Roti & Chapati Production Planner
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-black uppercase">
                    Zero Shortage AI
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automatic separate calculation for Boys (4 Rotis) and Girls (3 Rotis) based on active mess attendance
                </p>
              </div>
            </div>

            {/* Shift Picker & Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex rounded-xl bg-white p-1 border border-amber-200 shadow-2xs">
                <button
                  onClick={() => setRotiShift('lunch')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                    rotiShift === 'lunch'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ☀️ Lunch Shift
                </button>
                <button
                  onClick={() => setRotiShift('dinner')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                    rotiShift === 'dinner'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🌙 Dinner Shift
                </button>
              </div>

              <button
                onClick={handleCopyRotiSummary}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition cursor-pointer shadow-2xs"
              >
                {copiedRoti ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedRoti ? 'Copied' : 'Copy'}</span>
              </button>

              {onOpenKitchenEstimator && (
                <button
                  onClick={onOpenKitchenEstimator}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-xs font-black transition cursor-pointer shadow-xs"
                >
                  <ChefHat className="w-3.5 h-3.5 text-amber-200" />
                  <span>Full Estimator</span>
                </button>
              )}
            </div>
          </div>

          {/* Category Cards (Boys 4 vs Girls 3) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* BOYS CATEGORY */}
            <div className="p-5 rounded-2xl bg-white border-2 border-blue-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center text-xl font-black">
                    👦
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-blue-950 uppercase tracking-wide">
                      Boys Category
                    </h4>
                    <span className="text-[11px] text-blue-700 font-extrabold flex items-center gap-1">
                      <Flame className="w-3 h-3 text-orange-500" /> 4 Rotis / Boy
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-black font-mono">
                  {netBoys} Diners
                </span>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Enrolled Active:</span>
                  <strong className="font-mono text-slate-800">{boysMembers.length}</strong>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>On Approved Leave:</span>
                  <strong className="font-mono">-{boysOnLeave}</strong>
                </div>
                <div className="flex justify-between text-purple-600">
                  <span>Meal Skips ({rotiShift}):</span>
                  <strong className="font-mono">-{boysSkips}</strong>
                </div>
              </div>

              <div className="pt-2 border-t border-blue-100 flex items-end justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Boys Order</span>
                  <span className="text-xs font-bold text-slate-700 font-mono">{netBoys} × 4 Rotis</span>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-blue-700 font-mono leading-none">
                    {rotisBoys}
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                    Rotis ({attaKgBoys} kg Atta)
                  </span>
                </div>
              </div>
            </div>

            {/* GIRLS CATEGORY */}
            <div className="p-5 rounded-2xl bg-white border-2 border-pink-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-700 flex items-center justify-center text-xl font-black">
                    👧
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-pink-950 uppercase tracking-wide">
                      Girls Category
                    </h4>
                    <span className="text-[11px] text-pink-700 font-extrabold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-pink-500" /> 3 Rotis / Girl
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-pink-50 border border-pink-200 text-pink-800 text-xs font-black font-mono">
                  {netGirls} Diners
                </span>
              </div>

              <div className="p-3 rounded-xl bg-pink-50/60 border border-pink-100 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Enrolled Active:</span>
                  <strong className="font-mono text-slate-800">{girlsMembers.length}</strong>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>On Approved Leave:</span>
                  <strong className="font-mono">-{girlsOnLeave}</strong>
                </div>
                <div className="flex justify-between text-purple-600">
                  <span>Meal Skips ({rotiShift}):</span>
                  <strong className="font-mono">-{girlsSkips}</strong>
                </div>
              </div>

              <div className="pt-2 border-t border-pink-100 flex items-end justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Girls Order</span>
                  <span className="text-xs font-bold text-slate-700 font-mono">{netGirls} × 3 Rotis</span>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-pink-700 font-mono leading-none">
                    {rotisGirls}
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                    Rotis ({attaKgGirls} kg Atta)
                  </span>
                </div>
              </div>
            </div>

            {/* COMBINED ROTI PRODUCTION TOTAL */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white shadow-lg space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full">
                    Total Shift Production
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-100">
                    {totalRotiDiners} Students
                  </span>
                </div>
                <div className="mt-3">
                  <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white leading-none">
                    {grandTotalRotis}
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-amber-200 mt-1 block">
                    Hot Fresh Chapatis
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/15 backdrop-blur-xs space-y-1.5 text-xs text-amber-100 border border-white/10">
                <div className="flex justify-between">
                  <span>🌾 Wheat Flour (Atta):</span>
                  <strong className="font-mono text-white">{totalAttaKg} KG</strong>
                </div>
                <div className="flex justify-between">
                  <span>🫓 Dough Balls (पेढे):</span>
                  <strong className="font-mono text-white">{grandTotalRotis} balls (~40g)</strong>
                </div>
                <div className="flex justify-between text-[11px] text-amber-200 pt-1 border-t border-white/10">
                  <span>Calculation:</span>
                  <span className="font-mono">({rotisBoys} Boys + {rotisGirls} Girls)</span>
                </div>
              </div>

              {onOpenMaharajCookSheet && (
                <button
                  onClick={onOpenMaharajCookSheet}
                  className="w-full py-2 px-3 rounded-xl bg-white text-orange-700 hover:bg-amber-50 text-xs font-black transition cursor-pointer shadow-xs text-center"
                >
                  View Complete Cook Sheet ➔
                </button>
              )}
            </div>
          </div>

          {/* CHAPATI MAKER STAFF DUTY & ATTENDANCE VERIFICATION */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-orange-600" />
                <h4 className="text-sm font-bold text-slate-900">
                  Chapati Maker & Kitchen Staff Duty Status
                </h4>
              </div>
              <span className="text-xs text-slate-500">
                {chapatiMakersPresent} / {chapatiMakers.length} Staff Present Today
              </span>
            </div>

            {chapatiMakers.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                <span>No dedicated Chapati Maker staff added yet. Head cook will prepare rotis.</span>
                <button
                  onClick={() => {
                    setRole('chapati_maker');
                    setIsAddWorkerOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-600 text-white text-[11px] font-bold hover:bg-amber-700"
                >
                  + Add Chapati Maker
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {chapatiMakers.map(worker => {
                  const status = worker.attendance[today] || 'absent';
                  return (
                    <div 
                      key={worker.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{worker.name}</div>
                        <div className="text-[10px] text-slate-500 capitalize">{worker.role.replace('_', ' ')} • {worker.phone}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          status === 'present' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : status === 'half_day' 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quality & Zero-Shortage Notice */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Zero-Hunger Operating Standard:</strong> Chapati maker must complete the mandatory quota of <strong>{grandTotalRotis} hot rotis</strong> ({rotisBoys} for Boys + {rotisGirls} for Girls) before completing duty, ensuring no student faces roti shortages!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Worker Modal */}
      {isAddWorkerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden my-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                  <ChefHat className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add Staff Member</h3>
                  <p className="text-[11px] text-slate-500">Cooks, Chapati Makers, Helpers & Cleaners</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddWorkerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWorker} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Maharaj"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Job Role *
                  </label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-600"
                  >
                    <option value="head_cook">Head Cook (Maharaj)</option>
                    <option value="chapati_maker">Chapati Maker</option>
                    <option value="helper_cook">Helper Cook</option>
                    <option value="cleaning_dishwashing">Cleaning & Utensil Dishwasher</option>
                    <option value="server">Dining Server</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Monthly Salary (₹) *
                  </label>
                  <input
                    type="number"
                    min="1000"
                    required
                    value={monthlySalary}
                    onChange={e => setMonthlySalary(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  placeholder="10-digit number"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddWorkerOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save Staff Member</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Cleaning Modal */}
      {isAddCleaningOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden my-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Kitchen Sanitization Audit</h3>
                  <p className="text-[11px] text-slate-500">Record cleanliness & food safety inspection</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddCleaningOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCleaning} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Kitchen Area Inspected *
                </label>
                <select
                  value={area}
                  onChange={e => setArea(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-600"
                >
                  <option value="cooking_area">Cooking Stoves & Burners</option>
                  <option value="dining_tables">Dining Tables & Benches</option>
                  <option value="dishwashing_sink">Utensil Dishwashing Sinks</option>
                  <option value="vegetable_prep">Vegetable Prep Station</option>
                  <option value="storage_rack">Atta & Ration Storage Racks</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Inspector Name
                  </label>
                  <input
                    type="text"
                    value={inspectorName}
                    onChange={e => setInspectorName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Cleanliness Rating
                  </label>
                  <select
                    value={rating}
                    onChange={e => setRating(Number(e.target.value) as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-600"
                  >
                    <option value={5}>5 Stars - Spotless & Sanitized</option>
                    <option value={4}>4 Stars - Clean</option>
                    <option value={3}>3 Stars - Acceptable</option>
                    <option value={2}>2 Stars - Needs Mopping</option>
                    <option value={1}>1 Star - Poor Hygiene</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Observations / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bleach wash completed, exhaust chimney cleaned"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddCleaningOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 shadow-xs cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Log Sanitization Check</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
