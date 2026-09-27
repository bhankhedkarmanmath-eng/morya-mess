import React, { useState, useMemo } from 'react';
import { MealLog, MealType, Customer, ScanEligibility } from '../../types/mess';
import { getTodayString, getCurrentMealType } from '../../lib/storage';
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
  ChevronRight
} from 'lucide-react';

interface AttendanceCenterViewProps {
  mealLogs: MealLog[];
  customers?: Customer[];
  onOpenScanner: () => void;
  onOpenUniversalQr?: () => void;
  onRecordManualAttendance?: (customerId: string, shift: MealType, reason: string) => { success: boolean; message: string };
  onRefreshLogs?: () => void;
}

type AttendanceTab = 'live' | 'history' | 'counts' | 'exceptions' | 'manual' | 'corrections';

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

  const [activeTab, setActiveTab] = useState<AttendanceTab>('live');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>(today);

  // Manual Attendance Form State
  const [manualCustomerId, setManualCustomerId] = useState('');
  const [manualShift, setManualShift] = useState<MealType>(currentShift === 'dinner' ? 'dinner' : 'lunch');
  const [manualReason, setManualReason] = useState('Counter Verification (Card/Mobile Verified)');
  const [manualSuccessMsg, setManualSuccessMsg] = useState<string | null>(null);

  // Correction Modal State
  const [editingLog, setEditingLog] = useState<MealLog | null>(null);
  const [correctionStatus, setCorrectionStatus] = useState<ScanEligibility>('ALLOW');
  const [correctionReason, setCorrectionReason] = useState('');
  const [isCorrecting, setIsCorrecting] = useState(false);

  // Filtered Logs
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

  // Today's Live Logs
  const todayLogs = useMemo(() => {
    return mealLogs.filter(l => l.date === today);
  }, [mealLogs, today]);

  // Counts & Calculations
  const todayAllowed = todayLogs.filter(l => l.scanStatus === 'ALLOW');
  const todayLunch = todayLogs.filter(l => l.mealType === 'lunch' && l.scanStatus === 'ALLOW').length;
  const todayDinner = todayLogs.filter(l => l.mealType === 'dinner' && l.scanStatus === 'ALLOW').length;
  const todayBlocked = todayLogs.filter(l => l.scanStatus === 'BLOCK').length;
  const todayReview = todayLogs.filter(l => l.scanStatus === 'REVIEW_REQUIRED').length;

  const activeCustomerCount = customers.filter(c => c.status === 'active').length;
  const expectedMeals = activeCustomerCount * 2;
  const attendancePercentage = expectedMeals > 0 ? Math.round((todayAllowed.length / expectedMeals) * 100) : 0;

  // Exceptions list (Blocked, Duplicate, Review Required)
  const exceptionsList = useMemo(() => {
    return mealLogs.filter(l => 
      l.scanStatus === 'BLOCK' || 
      l.scanStatus === 'REVIEW_REQUIRED' || 
      l.reason.toLowerCase().includes('duplicate') ||
      l.reason.toLowerCase().includes('expired') ||
      l.reason.toLowerCase().includes('inactive')
    );
  }, [mealLogs]);

  // Corrected logs list (audit history)
  const correctedLogs = useMemo(() => {
    return mealLogs.filter(l => l.overrideNotes && l.overrideNotes.includes('[CORRECTION'));
  }, [mealLogs]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      alert('No attendance logs match the current filters to export.');
      return;
    }

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

  // Submit Manual Attendance
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCustomerId.trim()) {
      alert('Please enter or select a Member ID.');
      return;
    }

    if (onRecordManualAttendance) {
      const res = onRecordManualAttendance(manualCustomerId.trim(), manualShift, manualReason);
      if (res.success) {
        setManualSuccessMsg(`Marked ${manualShift.toUpperCase()} meal for ${manualCustomerId}`);
        setManualCustomerId('');
        setTimeout(() => setManualSuccessMsg(null), 4000);
      } else {
        alert(res.message);
      }
    } else {
      alert('Manual recording handler ready.');
    }
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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Utensils className="w-5 h-5 text-orange-600" />
            <span>Attendance Command Center</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Authoritative gate verification logs, live meal counts, fraud protection, and manual overrides
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer shadow-2xs"
            title="Export filtered log to Excel/CSV"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Excel</span>
          </button>

          {onOpenUniversalQr && (
            <button
              onClick={onOpenUniversalQr}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span>Universal QR</span>
            </button>
          )}

          <button
            id="btn-open-scanner-from-meals"
            onClick={onOpenScanner}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-orange-600 text-white text-xs font-black hover:bg-orange-700 shadow-xs transition cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>Gate Scanner</span>
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs text-xs font-bold">
        {[
          { id: 'live', label: `Today's Live Feed (${todayLogs.length})`, icon: Clock },
          { id: 'history', label: `Attendance History (${filteredLogs.length})`, icon: Calendar },
          { id: 'counts', label: 'Meal Shift Counts', icon: Utensils },
          { id: 'exceptions', label: `Exceptions & Blocks (${exceptionsList.length})`, icon: ShieldAlert },
          { id: 'manual', label: 'Mark Manual Attendance', icon: UserCheck },
          { id: 'corrections', label: `Audit Corrections (${correctedLogs.length})`, icon: Edit3 }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AttendanceTab)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap transition cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-orange-600 text-white font-black shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==================================================== */}
      {/* SECTION 4.A: LIVE ATTENDANCE FEED                    */}
      {/* ==================================================== */}
      {activeTab === 'live' && (
        <div className="space-y-4">
          {/* Quick Shift Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-800 uppercase">Today's Meals Allowed</span>
              <div className="text-2xl font-black text-emerald-900 mt-1">{todayAllowed.length}</div>
              <span className="text-[10px] text-emerald-700">Verified entries</span>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
              <span className="text-[10px] font-bold text-amber-800 uppercase">Lunch Served</span>
              <div className="text-2xl font-black text-amber-900 mt-1">{todayLunch}</div>
              <span className="text-[10px] text-amber-700">Afternoon shift</span>
            </div>
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200">
              <span className="text-[10px] font-bold text-indigo-800 uppercase">Dinner Served</span>
              <div className="text-2xl font-black text-indigo-900 mt-1">{todayDinner}</div>
              <span className="text-[10px] text-indigo-700">Night shift</span>
            </div>
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
              <span className="text-[10px] font-bold text-rose-800 uppercase">Blocked / Double Meals</span>
              <div className="text-2xl font-black text-rose-900 mt-1">{todayBlocked}</div>
              <span className="text-[10px] text-rose-700">{todayReview} review attempts</span>
            </div>
          </div>

          {/* Live Recent Scans List */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-sm">Today's Real-time Gate Entries ({today})</h3>
              <span className="text-[11px] text-slate-500 font-mono">Current Shift: {currentShift.toUpperCase()}</span>
            </div>

            {todayLogs.length === 0 ? (
              <div className="p-10 text-center bg-slate-50 rounded-2xl space-y-2">
                <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">No meal entries logged yet today.</p>
                <button
                  onClick={onOpenScanner}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs"
                >
                  Open QR Scanner
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {todayLogs.map(log => {
                  const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const isAllow = log.scanStatus === 'ALLOW';
                  return (
                    <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          log.mealType === 'lunch' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {log.mealType === 'lunch' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 text-sm">{log.customerName}</span>
                            <span className="text-[10px] font-mono text-slate-400 font-bold">({log.customerId})</span>
                            <span className="text-[10px] font-bold capitalize text-slate-600 px-2 py-0.2 rounded-full bg-slate-100">
                              {log.mealType}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{log.reason || 'Verified Entry'}</p>
                          {log.overrideNotes && (
                            <p className="text-[10px] text-amber-700 font-medium mt-0.5">{log.overrideNotes}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <span className="text-[11px] font-mono text-slate-400 font-bold">{timeStr}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isAllow ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isAllow ? 'Verified' : 'Blocked'}
                        </span>
                        <button
                          onClick={() => {
                            setEditingLog(log);
                            setCorrectionStatus(log.scanStatus);
                            setCorrectionReason('');
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition cursor-pointer"
                          title="Correct this record"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SECTION 4.D: ATTENDANCE HISTORY                      */}
      {/* ==================================================== */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search student name, ID, or audit note..."
                className="w-full p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="p-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold"
              />

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="p-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold"
              >
                <option value="ALL">All Shifts</option>
                <option value="lunch">Lunch Only</option>
                <option value="dinner">Dinner Only</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="p-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold"
              >
                <option value="ALL">All Statuses</option>
                <option value="ALLOW">Verified (ALLOW)</option>
                <option value="BLOCK">Blocked (BLOCK)</option>
                <option value="REVIEW_REQUIRED">Review Required</option>
              </select>
            </div>
          </div>

          {/* Historical Records Table */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            {filteredLogs.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs">
                No attendance logs found matching filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                    <tr>
                      <th className="p-3.5">Date & Time</th>
                      <th className="p-3.5">Member Name & ID</th>
                      <th className="p-3.5">Shift</th>
                      <th className="p-3.5">Audit Reason</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLogs.map(log => {
                      const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const isAllow = log.scanStatus === 'ALLOW';
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition">
                          <td className="p-3.5 font-mono">
                            <span className="font-bold text-slate-800">{log.date}</span>
                            <span className="text-slate-400 block text-[11px]">{timeStr}</span>
                          </td>
                          <td className="p-3.5">
                            <span className="font-black text-slate-900">{log.customerName}</span>
                            <span className="text-[11px] font-mono text-slate-400 block">{log.customerId}</span>
                          </td>
                          <td className="p-3.5 capitalize font-bold text-slate-700">
                            {log.mealType}
                          </td>
                          <td className="p-3.5 max-w-xs text-slate-600">
                            <span>{log.reason}</span>
                            {log.overrideNotes && (
                              <span className="block text-[10px] text-amber-700 font-medium">{log.overrideNotes}</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              isAllow ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {log.scanStatus}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => {
                                setEditingLog(log);
                                setCorrectionStatus(log.scanStatus);
                                setCorrectionReason('');
                              }}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-orange-300 hover:bg-orange-50 text-slate-700 hover:text-orange-900 text-[11px] font-bold cursor-pointer"
                            >
                              Correct
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SECTION 4.E: MEAL COUNTS                             */}
      {/* ==================================================== */}
      {activeTab === 'counts' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Today's Total Meals Served</span>
              <div className="text-3xl font-black text-slate-900">{todayAllowed.length}</div>
              <p className="text-xs text-slate-500">Verified entries across Lunch + Dinner</p>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Expected Active Diners</span>
              <div className="text-3xl font-black text-orange-600">{expectedMeals}</div>
              <p className="text-xs text-slate-500">~2 meals per active subscriber ({activeCustomerCount} members)</p>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Attendance Turnover Rate</span>
              <div className="text-3xl font-black text-emerald-600">{attendancePercentage}%</div>
              <p className="text-xs text-slate-500">Percentage of expected subscriber meals consumed</p>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SECTION 4.F: EXCEPTIONS & BLOCKS                     */}
      {/* ==================================================== */}
      {activeTab === 'exceptions' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-950 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
              <span>
                <strong>{exceptionsList.length} exceptions</strong> detected (duplicate meal attempts, expired passes, or outside timings).
              </span>
            </div>
            <button
              onClick={handleExportCSV}
              className="text-xs font-bold text-rose-800 hover:underline cursor-pointer"
            >
              Export
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-3">
            <h3 className="font-black text-slate-900 text-sm">Security & Exception Scans Log</h3>
            {exceptionsList.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400">
                No exceptions or rejected scan attempts logged. Anti-fraud filters operating normally.
              </div>
            ) : (
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
                      <span className="text-slate-400 font-mono text-[10px]">{log.date} at {new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>

                    <button
                      onClick={() => {
                        setEditingLog(log);
                        setCorrectionStatus('ALLOW');
                        setCorrectionReason('Manager Authorized Override after manual ID check');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-900 font-bold text-xs hover:bg-orange-100 cursor-pointer"
                    >
                      Authorize / Override
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SECTION 4.C: MANUAL ATTENDANCE MARKING               */}
      {/* ==================================================== */}
      {activeTab === 'manual' && (
        <div className="max-w-2xl bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
          <div>
            <h3 className="font-black text-slate-900 text-base">Authorized Manual Attendance Marking</h3>
            <p className="text-xs text-slate-500">Record counter attendance for members with uncharged phones or forgotten cards</p>
          </div>

          {manualSuccessMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{manualSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select or Enter Member</label>
              <select
                value={manualCustomerId}
                onChange={(e) => setManualCustomerId(e.target.value)}
                className="w-full p-3 rounded-2xl border border-slate-200 text-xs font-bold bg-slate-50"
              >
                <option value="">-- Choose Member from Active List --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id}) - {c.phone} [{c.status}]
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Meal Shift</label>
                <select
                  value={manualShift}
                  onChange={(e) => setManualShift(e.target.value as MealType)}
                  className="w-full p-3 rounded-2xl border border-slate-200 text-xs font-bold bg-slate-50"
                >
                  <option value="lunch">Lunch Shift</option>
                  <option value="dinner">Dinner Shift</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Verification Method / Reason</label>
                <input
                  type="text"
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-slate-200 text-xs bg-slate-50"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Record & Authorize Attendance</span>
            </button>
          </form>
        </div>
      )}

      {/* ==================================================== */}
      {/* SECTION 4.G: AUDIT CORRECTIONS HISTORY               */}
      {/* ==================================================== */}
      {activeTab === 'corrections' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4">
          <div>
            <h3 className="font-black text-slate-900 text-sm">Controlled Attendance Corrections Audit Log</h3>
            <p className="text-xs text-slate-500">Every manual correction is logged with author, timestamp, and audit reason</p>
          </div>

          {correctedLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No historical records have been manually corrected yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {correctedLogs.map(log => (
                <div key={log.id} className="py-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900">{log.customerName}</span>
                      <span className="font-mono text-slate-400">({log.customerId})</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                        Status: {log.scanStatus}
                      </span>
                    </div>
                    <p className="text-amber-800 text-[11px] font-medium mt-1 bg-amber-50/70 p-2 rounded-xl border border-amber-200">
                      {log.overrideNotes}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">{log.date}</span>
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
              <button
                onClick={() => setEditingLog(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
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
