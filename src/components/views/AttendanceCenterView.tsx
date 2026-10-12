import React, { useState, useMemo, useRef } from 'react';
import { MealLog, MealType, Customer, ScanEligibility } from '../../types/mess';
import { getTodayString, getCurrentMealType, calculateDaysRemaining } from '../../lib/storage';
import { exportToSpreadsheet } from '../../lib/exportUtils';
import { correctAttendanceRecord } from '../../lib/ownerFeaturesApi';
import { 
  Utensils, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  Download, 
  ShieldCheck, 
  ShieldAlert, 
  Moon, 
  Sun, 
  Coffee,
  QrCode,
  Sparkles,
  RefreshCw,
  Plus,
  Edit3,
  Check,
  UserCheck,
  ChevronRight,
  Volume2,
  Users,
  CheckCheck,
  Phone,
  ArrowUpDown
} from 'lucide-react';

interface AttendanceCenterViewProps {
  mealLogs: MealLog[];
  customers?: Customer[];
  onOpenScanner: () => void;
  onOpenUniversalQr?: () => void;
  onRecordManualAttendance?: (customerId: string, shift: MealType, reason: string) => { success: boolean; message: string };
  onRefreshLogs?: () => void;
}

type AttendanceTab = 'quick_mark' | 'live' | 'history' | 'counts' | 'exceptions' | 'corrections';

export const AttendanceCenterView: React.FC<AttendanceCenterViewProps> = ({
  mealLogs,
  customers = [],
  onOpenScanner,
  onOpenUniversalQr,
  onRecordManualAttendance,
  onRefreshLogs
}) => {
  const today = getTodayString();
  const currentShift = getCurrentMealType();

  const [activeTab, setActiveTab] = useState<AttendanceTab>('quick_mark');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>(today);

  // Quick Counter Mark State
  const [quickSearchDiner, setQuickSearchDiner] = useState('');
  const [activeShift, setActiveShift] = useState<MealType>(currentShift === 'dinner' ? 'dinner' : 'lunch');
  const [selectedDinerIds, setSelectedDinerIds] = useState<Set<string>>(new Set());
  const [deskFeedback, setDeskFeedback] = useState<{ id?: string; type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // Correction Modal State
  const [editingLog, setEditingLog] = useState<MealLog | null>(null);
  const [correctionStatus, setCorrectionStatus] = useState<ScanEligibility>('ALLOW');
  const [correctionReason, setCorrectionReason] = useState('');
  const [isCorrecting, setIsCorrecting] = useState(false);

  // Sound Feedback Function
  const playAudioFeedback = (type: 'success' | 'warning' | 'error') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
        osc.start();
        osc.stop(ctx.currentTime + 0.28);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch {
      // Non-blocking fallback
    }
  };

  // Today's Live Logs
  const todayLogs = useMemo(() => {
    return mealLogs.filter(l => l.date === today);
  }, [mealLogs, today]);

  // Today's Attended Sets for Duplicate Detection
  const todayLunchMap = useMemo(() => {
    const map = new Map<string, MealLog>();
    todayLogs.filter(m => m.mealType === 'lunch' && m.scanStatus === 'ALLOW').forEach(m => map.set(m.customerId, m));
    return map;
  }, [todayLogs]);

  const todayDinnerMap = useMemo(() => {
    const map = new Map<string, MealLog>();
    todayLogs.filter(m => m.mealType === 'dinner' && m.scanStatus === 'ALLOW').forEach(m => map.set(m.customerId, m));
    return map;
  }, [todayLogs]);

  // Filtered Logs for History Tab
  const filteredLogs = useMemo(() => {
    return mealLogs.filter(log => {
      const matchesDate = !selectedDate || log.date === selectedDate;
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || 
        log.customerName.toLowerCase().includes(q) ||
        log.customerId.toLowerCase().includes(q) ||
        (log.reason && log.reason.toLowerCase().includes(q));

      const matchesType = filterType === 'ALL' || log.mealType === filterType;
      const matchesStatus = filterStatus === 'ALL' || log.scanStatus === filterStatus;

      return matchesDate && matchesSearch && matchesType && matchesStatus;
    });
  }, [mealLogs, selectedDate, searchTerm, filterType, filterStatus]);

  // Quick Counter Filtered Customers
  const quickFilteredCustomers = useMemo(() => {
    const q = quickSearchDiner.toLowerCase().trim();
    return customers.filter(c => {
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.id.toLowerCase().includes(q) ||
        (c.roomNumber && c.roomNumber.toLowerCase().includes(q)) ||
        (c.hostelOrAddress && c.hostelOrAddress.toLowerCase().includes(q))
      );
    });
  }, [customers, quickSearchDiner]);

  // Counts & Calculations
  const todayAllowed = todayLogs.filter(l => l.scanStatus === 'ALLOW');
  const todayLunchCount = todayLogs.filter(l => l.mealType === 'lunch' && l.scanStatus === 'ALLOW').length;
  const todayDinnerCount = todayLogs.filter(l => l.mealType === 'dinner' && l.scanStatus === 'ALLOW').length;
  const todayBlockedCount = todayLogs.filter(l => l.scanStatus === 'BLOCK').length;
  const exceptionsList = useMemo(() => {
    return mealLogs.filter(l => 
      l.scanStatus === 'BLOCK' || 
      l.scanStatus === 'REVIEW_REQUIRED' || 
      l.reason.toLowerCase().includes('duplicate') ||
      l.reason.toLowerCase().includes('expired')
    );
  }, [mealLogs]);

  const correctedLogs = useMemo(() => {
    return mealLogs.filter(l => l.overrideNotes && l.overrideNotes.includes('[CORRECTION'));
  }, [mealLogs]);

  // Handle 1-Click Quick Attendance Record
  const handleQuickMarkSingle = (customer: Customer, shift: MealType) => {
    const existingEntry = shift === 'lunch' ? todayLunchMap.get(customer.id) : todayDinnerMap.get(customer.id);

    if (existingEntry) {
      playAudioFeedback('warning');
      setDeskFeedback({
        id: customer.id,
        type: 'warning',
        message: `⚠️ DUPLICATE BLOCKED! ${customer.name} already had ${shift.toUpperCase()} today at ${new Date(existingEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
      });
      setTimeout(() => setDeskFeedback(null), 5000);
      return;
    }

    const daysLeft = calculateDaysRemaining(customer.endDate);
    if (daysLeft < 0 || customer.status === 'expired') {
      playAudioFeedback('error');
      if (!window.confirm(`⚠️ ${customer.name}'s pass EXPIRED on ${customer.endDate} (Dues: ₹${customer.balance}). Allow one-time manual override entry?`)) {
        return;
      }
    }

    if (onRecordManualAttendance) {
      const res = onRecordManualAttendance(customer.id, shift, 'Counter Express Desk 1-Tap Entry');
      if (res.success) {
        playAudioFeedback('success');
        setDeskFeedback({
          id: customer.id,
          type: 'success',
          message: `✅ ${shift.toUpperCase()} Marked for ${customer.name}!`
        });
        setTimeout(() => setDeskFeedback(null), 3500);
      } else {
        playAudioFeedback('error');
        setDeskFeedback({
          id: customer.id,
          type: 'error',
          message: res.message || 'Error recording attendance.'
        });
        setTimeout(() => setDeskFeedback(null), 4000);
      }
    }
  };

  // Batch Mark Selected Diners
  const handleBatchMark = (shift: MealType) => {
    if (selectedDinerIds.size === 0) return;
    if (!onRecordManualAttendance) return;

    let successCount = 0;
    selectedDinerIds.forEach(id => {
      const res = onRecordManualAttendance(id, shift, 'Batch Counter Mark (Multiple Diners Entry)');
      if (res.success) successCount++;
    });

    playAudioFeedback('success');
    setDeskFeedback({
      type: 'success',
      message: `🎉 Successfully recorded ${shift.toUpperCase()} for ${successCount} members!`
    });
    setSelectedDinerIds(new Set());
    setTimeout(() => setDeskFeedback(null), 4000);
  };

  const toggleSelectDiner = (id: string) => {
    setSelectedDinerIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Submit Controlled Attendance Correction
  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog) return;
    if (!correctionReason.trim()) {
      alert('Please state the audit reason for correcting this attendance log.');
      return;
    }

    setIsCorrecting(true);
    const res = await correctAttendanceRecord({
      logId: editingLog.id,
      newStatus: correctionStatus,
      overrideReason: correctionReason.trim(),
      correctedBy: 'Mess Owner / Authorized Desk'
    });

    setIsCorrecting(false);
    if (res.success) {
      setEditingLog(null);
      setCorrectionReason('');
      if (onRefreshLogs) onRefreshLogs();
    } else {
      alert(res.error || 'Failed to record correction.');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const data = filteredLogs.map(l => ({
      'Date': l.date,
      'Time': new Date(l.timestamp).toLocaleTimeString(),
      'Customer ID': l.customerId,
      'Customer Name': l.customerName,
      'Meal Shift': l.mealType.toUpperCase(),
      'Scan Status': l.scanStatus,
      'Verification Reason': l.reason,
      'Audit / Override Notes': l.overrideNotes || ''
    }));

    exportToSpreadsheet(data, {
      filename: `Morya_Mess_Attendance_${selectedDate || 'all'}`,
      sheetName: 'Attendance_Logs',
      format: 'xlsx'
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Utensils className="w-5 h-5 text-orange-600" />
            <span>Gate & Counter Attendance Command Center</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            1-Click high-speed counter attendance, duplicate meal prevention, and live scan logs
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer shadow-2xs"
            title="Export filtered log to Excel"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Excel</span>
          </button>

          {onOpenUniversalQr && (
            <button
              onClick={onOpenUniversalQr}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>Universal Standee QR</span>
            </button>
          )}

          <button
            id="btn-open-scanner-from-meals"
            onClick={onOpenScanner}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 hover:from-orange-600 hover:to-orange-800 text-white text-xs font-black shadow-xs transition cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>Launch Gate Scanner</span>
          </button>
        </div>
      </div>

      {/* Real-time Headcount & Security Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider">Today's Lunch Served</span>
            <Sun className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-900 mt-1">{todayLunchCount} Plates</div>
          <span className="text-[11px] text-amber-700 font-semibold">11:00 AM - 2:30 PM shift</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-indigo-200 bg-indigo-50/30 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">Today's Dinner Served</span>
            <Moon className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-900 mt-1">{todayDinnerCount} Plates</div>
          <span className="text-[11px] text-indigo-700 font-semibold">7:30 PM - 10:15 PM shift</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">Total Daily Entries</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-900 mt-1">{todayAllowed.length} Meals</div>
          <span className="text-[11px] text-emerald-700 font-semibold">All authorized scans</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/30 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-rose-700 tracking-wider">Anti-Theft Blocks</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-900 mt-1">{todayBlockedCount} Prevented</div>
          <span className="text-[11px] text-rose-700 font-semibold">Duplicates & expired</span>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-2xs text-xs font-bold">
        {[
          { id: 'quick_mark', label: '⚡ 1-Click Counter Desk', icon: UserCheck },
          { id: 'live', label: `Today's Live Feed (${todayLogs.length})`, icon: Clock },
          { id: 'history', label: `Attendance History (${filteredLogs.length})`, icon: Calendar },
          { id: 'counts', label: 'Meal Shift Headcounts', icon: Utensils },
          { id: 'exceptions', label: `Anti-Fraud Exceptions (${exceptionsList.length})`, icon: ShieldAlert },
          { id: 'corrections', label: `Audit Corrections (${correctedLogs.length})`, icon: Edit3 }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap transition cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: EXPRESS 1-CLICK COUNTER DESK */}
      {activeTab === 'quick_mark' && (
        <div className="space-y-4">
          {/* Desk Banner & Shift Selector */}
          <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 text-white p-5 rounded-3xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-200 block">
                Express Counter Attendance Desk
              </span>
              <h3 className="text-base font-black">Fast 1-Tap Entry for Walk-ins & Phone-Forgotten Diners</h3>
              <p className="text-xs text-orange-100">
                Click "Mark Lunch" or "Mark Dinner" to immediately record attendance with duplicate prevention.
              </p>
            </div>

            {/* Active Shift Buttons */}
            <div className="flex items-center bg-black/20 p-1.5 rounded-2xl gap-1 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveShift('lunch')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                  activeShift === 'lunch' ? 'bg-white text-orange-900 shadow-sm' : 'text-white/80 hover:text-white'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Lunch Shift ☀️</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveShift('dinner')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                  activeShift === 'dinner' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/80 hover:text-white'
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-500" />
                <span>Dinner Shift 🌙</span>
              </button>
            </div>
          </div>

          {/* Feedback Banner */}
          {deskFeedback && (
            <div className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 shadow-xs animate-in fade-in ${
              deskFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-300' :
              deskFeedback.type === 'warning' ? 'bg-amber-50 text-amber-900 border border-amber-300' :
              'bg-rose-50 text-rose-900 border border-rose-300'
            }`}>
              <div className="flex items-center gap-2">
                {deskFeedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-amber-600" />}
                <span className="text-sm">{deskFeedback.message}</span>
              </div>
              <button onClick={() => setDeskFeedback(null)} className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer font-bold">
                ✕
              </button>
            </div>
          )}

          {/* Search Omnibox & Batch Action Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-600" />
                <input
                  type="text"
                  placeholder="Type diner name, room number, or mobile number to fast mark..."
                  value={quickSearchDiner}
                  onChange={(e) => setQuickSearchDiner(e.target.value)}
                  autoFocus
                  className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white"
                />
              </div>

              {/* Batch Action if selected */}
              {selectedDinerIds.size > 0 && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleBatchMark(activeShift)}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-black shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>Mark {selectedDinerIds.size} Selected for {activeShift.toUpperCase()}</span>
                  </button>
                  <button
                    onClick={() => setSelectedDinerIds(new Set())}
                    className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Diners List for 1-Click Marking */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickFilteredCustomers.map(cust => {
              const lunchEntry = todayLunchMap.get(cust.id);
              const dinnerEntry = todayDinnerMap.get(cust.id);
              const isSelected = selectedDinerIds.has(cust.id);

              const daysLeft = calculateDaysRemaining(cust.endDate);
              const isExpired = daysLeft < 0 || cust.status === 'expired';

              return (
                <div
                  key={cust.id}
                  className={`bg-white p-4 rounded-2xl border transition-all space-y-3 relative ${
                    isSelected ? 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/20' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectDiner(cust.id)}
                        className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300 cursor-pointer mt-0.5"
                      />
                      <div>
                        <h4 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                          <span>{cust.name}</span>
                          <span className="text-[10px] font-semibold text-slate-400 capitalize">({cust.gender})</span>
                        </h4>
                        <p className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{cust.phone}</span>
                          {cust.roomNumber && <span className="text-slate-400 font-sans">• Room {cust.roomNumber}</span>}
                        </p>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      isExpired ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {isExpired ? 'EXPIRED' : 'ACTIVE'}
                    </span>
                  </div>

                  {/* Status indicators */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2 rounded-xl font-medium border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Lunch:</span>
                      {lunchEntry ? (
                        <span className="text-emerald-700 font-black flex items-center gap-0.5">
                          ✓ {new Date(lunchEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ) : (
                        <span className="text-slate-400">Not Marked</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Dinner:</span>
                      {dinnerEntry ? (
                        <span className="text-emerald-700 font-black flex items-center gap-0.5">
                          ✓ {new Date(dinnerEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ) : (
                        <span className="text-slate-400">Not Marked</span>
                      )}
                    </div>
                  </div>

                  {/* 1-Tap Mark Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleQuickMarkSingle(cust, 'lunch')}
                      disabled={!!lunchEntry}
                      className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        lunchEntry
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      <span>{lunchEntry ? 'Lunch Done' : 'Mark Lunch'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickMarkSingle(cust, 'dinner')}
                      disabled={!!dinnerEntry}
                      className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        dinnerEntry
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" />
                      <span>{dinnerEntry ? 'Dinner Done' : 'Mark Dinner'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: TODAY'S LIVE FEED */}
      {activeTab === 'live' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-900 text-base">Real-Time Gate Verification Feed</h3>
            <span className="text-xs font-bold text-slate-500">{todayLogs.length} scans recorded today</span>
          </div>

          {todayLogs.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No scans logged yet today. Gate is waiting for first diner scan.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {todayLogs.map(log => {
                const isAllow = log.scanStatus === 'ALLOW';
                const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                return (
                  <div key={log.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black ${
                        isAllow ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {isAllow ? '✓' : '✕'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-900">{log.customerName}</strong>
                          <span className="font-mono text-slate-400 text-[11px]">({log.customerId})</span>
                          <span className="capitalize font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                            {log.mealType}
                          </span>
                        </div>
                        <span className="text-slate-500 text-[11px]">{log.reason}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-slate-600 font-bold block">{timeStr}</span>
                      <span className={`text-[10px] font-black uppercase ${isAllow ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {log.scanStatus}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ATTENDANCE HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-black text-slate-900 text-base">Historical Attendance Records</h3>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-mono font-bold"
              />
              <button
                onClick={() => setSelectedDate('')}
                className="text-xs text-slate-500 font-bold hover:underline"
              >
                All Dates
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black">
                <tr>
                  <th className="p-3">Date & Time</th>
                  <th className="p-3">Diner Name</th>
                  <th className="p-3">Shift</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Audit Reason</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono text-slate-600">
                      {log.date} <span className="text-[10px] text-slate-400 block">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </td>
                    <td className="p-3 font-bold text-slate-900">{log.customerName}</td>
                    <td className="p-3 capitalize font-bold text-slate-700">{log.mealType}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        log.scanStatus === 'ALLOW' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {log.scanStatus}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 text-[11px]">{log.reason}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          setEditingLog(log);
                          setCorrectionStatus(log.scanStatus);
                          setCorrectionReason('');
                        }}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-orange-300 hover:bg-orange-50 text-slate-700 text-[11px] font-bold cursor-pointer"
                      >
                        Correct
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: MEAL COUNTS */}
      {activeTab === 'counts' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Today's Meals Served</span>
            <div className="text-3xl font-black text-slate-900">{todayAllowed.length}</div>
            <p className="text-xs text-slate-500">Verified entries across Lunch + Dinner</p>
          </div>
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Active Diners on Roster</span>
            <div className="text-3xl font-black text-orange-600">{customers.length}</div>
            <p className="text-xs text-slate-500">Total registered members</p>
          </div>
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Blocked Gate Scans</span>
            <div className="text-3xl font-black text-rose-600">{todayBlockedCount}</div>
            <p className="text-xs text-slate-500">Attempted fraudulent or expired entries</p>
          </div>
        </div>
      )}

      {/* TAB 5: EXCEPTIONS */}
      {activeTab === 'exceptions' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-900 text-sm">Security & Exception Logs</h3>
            <span className="text-xs font-bold text-rose-600">{exceptionsList.length} exceptions detected</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {exceptionsList.map(log => (
              <div key={log.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900">{log.customerName}</span>
                    <span className="font-mono text-slate-400">({log.customerId})</span>
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                      {log.scanStatus}
                    </span>
                  </div>
                  <p className="text-rose-700 font-medium text-[11px] mt-0.5">{log.reason}</p>
                </div>

                <button
                  onClick={() => {
                    setEditingLog(log);
                    setCorrectionStatus('ALLOW');
                    setCorrectionReason('Manager Authorized Override after manual ID check');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-900 font-bold text-xs hover:bg-orange-100 cursor-pointer"
                >
                  Override / Allow
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: CORRECTIONS AUDIT */}
      {activeTab === 'corrections' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4">
          <h3 className="font-black text-slate-900 text-base">Audit History of Manual Corrections</h3>
          {correctedLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No manual corrections recorded yet.</div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {correctedLogs.map(log => (
                <div key={log.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900">{log.customerName}</span>
                    <span className="font-mono text-slate-400">{log.date}</span>
                  </div>
                  <p className="text-amber-800 text-[11px] bg-amber-50 p-2 rounded-xl mt-1">{log.overrideNotes}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Controlled Correction Dialog Modal */}
      {editingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-base">Correct Attendance Record</h3>
              <button onClick={() => setEditingLog(null)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-orange-50 border border-orange-200 text-xs space-y-1">
              <p><strong>Member:</strong> {editingLog.customerName} ({editingLog.customerId})</p>
              <p><strong>Meal Shift:</strong> {editingLog.mealType.toUpperCase()} on {editingLog.date}</p>
              <p><strong>Current Status:</strong> {editingLog.scanStatus}</p>
            </div>

            <form onSubmit={handleCorrectionSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Status</label>
                <select
                  value={correctionStatus}
                  onChange={(e) => setCorrectionStatus(e.target.value as ScanEligibility)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                >
                  <option value="ALLOW">ALLOW (Valid Attendance)</option>
                  <option value="BLOCK">BLOCK (Void / Cancelled)</option>
                  <option value="REVIEW_REQUIRED">REVIEW_REQUIRED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Audit Reason for Correction</label>
                <textarea
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="e.g. Student reported incorrect scan; verified college timetable"
                  rows={3}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingLog(null)}
                  disabled={isCorrecting}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCorrecting}
                  className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md"
                >
                  {isCorrecting ? 'Saving...' : 'Save Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
