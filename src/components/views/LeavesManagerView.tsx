import React, { useState, useMemo } from 'react';
import { Customer, LeaveRecord } from '../../types/mess';
import { getTodayString, calculateDaysRemaining } from '../../lib/storage';
import { exportToSpreadsheet } from '../../lib/exportUtils';
import { 
  Clock, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Calendar, 
  AlertCircle, 
  User, 
  Filter, 
  Check, 
  X,
  Utensils,
  Share2,
  Download,
  ChefHat,
  MessageCircle,
  Sparkles,
  Info,
  CalendarCheck2,
  CheckCheck
} from 'lucide-react';

interface LeavesManagerViewProps {
  customers: Customer[];
  onBack: () => void;
  onApproveLeave?: (customerId: string, leaveId: string, days: number) => void;
  onRejectLeave?: (customerId: string, leaveId: string) => void;
  onCreateTestLeave?: () => void;
  onOpenCustomer360?: (customer: Customer) => void;
}

export const LeavesManagerView: React.FC<LeavesManagerViewProps> = ({
  customers,
  onBack,
  onApproveLeave,
  onRejectLeave,
  onCreateTestLeave,
  onOpenCustomer360
}) => {
  const today = getTodayString();

  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [leaveTypeMode, setLeaveTypeMode] = useState<'multi_day' | 'single_meal'>('multi_day');
  
  // Leave Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
  );
  const [singleMealShift, setSingleMealShift] = useState<'lunch' | 'dinner'>('dinner');
  const [singleMealDate, setSingleMealDate] = useState(today);
  const [reason, setReason] = useState('Home Visit / Semester Exams');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddLeaveOpen, setIsAddLeaveOpen] = useState(false);

  // Extract all leave requests across customers
  const allLeaves = useMemo(() => {
    return customers.flatMap(c => {
      return (c.leaves || []).map(l => ({
        ...l,
        customer: c
      }));
    }).sort((a, b) => new Date(b.createdAt || b.startDate).getTime() - new Date(a.createdAt || a.startDate).getTime());
  }, [customers]);

  const pendingLeaves = useMemo(() => allLeaves.filter(l => l.status === 'pending'), [allLeaves]);
  const approvedLeaves = useMemo(() => allLeaves.filter(l => l.status === 'approved'), [allLeaves]);
  const rejectedLeaves = useMemo(() => allLeaves.filter(l => l.status === 'rejected'), [allLeaves]);

  const displayedLeaves = activeTab === 'pending' 
    ? pendingLeaves 
    : activeTab === 'approved' 
    ? approvedLeaves 
    : activeTab === 'rejected' 
    ? rejectedLeaves 
    : allLeaves;

  // Kitchen Headcount Impact for Today
  const todayAbsentCount = useMemo(() => {
    return approvedLeaves.filter(l => {
      return l.startDate <= today && l.endDate >= today;
    }).length;
  }, [approvedLeaves, today]);

  // Handle Form Submission
  const handleCreateLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) return;
    setIsSubmitting(true);

    const matched = customers.find(c => c.id === selectedCustomerId);
    if (!matched) {
      setIsSubmitting(false);
      return;
    }

    let finalStart = startDate;
    let finalEnd = endDate;
    let calculatedDays = 1;
    let finalReason = reason;

    if (leaveTypeMode === 'single_meal') {
      finalStart = singleMealDate;
      finalEnd = singleMealDate;
      calculatedDays = 0.5; // Single meal
      finalReason = `[Single Meal Skip - ${singleMealShift.toUpperCase()}]: ${reason}`;
    } else {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      calculatedDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
    }

    const newLeave: LeaveRecord = {
      id: `leave-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      startDate: finalStart,
      endDate: finalEnd,
      days: calculatedDays,
      reason: finalReason,
      approved: false,
      status: 'pending',
      createdAt: new Date().toISOString(),
      requestedAt: new Date().toISOString()
    };

    const updatedLeaves: LeaveRecord[] = [newLeave, ...(matched.leaves || [])];
    matched.leaves = updatedLeaves;

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
    }

    setIsSubmitting(false);
    setIsAddLeaveOpen(false);
  };

  // Bulk Approve All Pending
  const handleBulkApprove = () => {
    if (pendingLeaves.length === 0) return;
    if (!window.confirm(`Approve all ${pendingLeaves.length} pending leave requests? This will automatically extend each student's subscription end date.`)) return;

    if (onApproveLeave) {
      pendingLeaves.forEach(l => {
        onApproveLeave(l.customer.id, l.id, Math.max(1, Math.round(l.days)));
      });
    }
  };

  // WhatsApp Leave Status Dispatcher
  const handleSendLeaveWhatsApp = (leave: any) => {
    const cust = leave.customer as Customer;
    const cleanPhone = cust.phone.replace(/[^0-9]/g, '');
    const isAppr = leave.status === 'approved';

    let msg = `Namaste ${cust.name}, Morya Mess notice:\n`;
    if (isAppr) {
      msg += `✅ Your leave request from ${leave.startDate} to ${leave.endDate} (${leave.days} days) has been APPROVED.\n`;
      msg += `Your subscription pass validity has been extended accordingly.\nThank you! 🙏`;
    } else {
      msg += `⚠️ Your leave request from ${leave.startDate} to ${leave.endDate} could not be approved due to mess rules/cutoff.\nPlease contact owner desk.`;
    }

    window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Export Leave Register
  const handleExport = (format: 'xlsx' | 'csv') => {
    const rows = displayedLeaves.map(l => ({
      'Student Name': l.customer?.name || '',
      'Mobile': l.customer?.phone || '',
      'Status': (l.status || 'pending').toUpperCase(),
      'Start Date': l.startDate,
      'End Date': l.endDate,
      'Days': l.days,
      'Reason': l.reason,
      'Requested At': l.createdAt || l.requestedAt || ''
    }));

    exportToSpreadsheet(rows, {
      filename: `Morya_Mess_Leaves_Register_${today}`,
      sheetName: 'Leaves',
      format
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <span>Skip Meal & Student Leaves Command Center</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Single-meal skips, vacation leaves, auto-extension of validity, and kitchen food waste prevention
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            onClick={() => handleExport('xlsx')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Register</span>
          </button>

          {onCreateTestLeave && (
            <button
              onClick={onCreateTestLeave}
              className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              + Demo Leave
            </button>
          )}

          <button
            onClick={() => setIsAddLeaveOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 hover:from-orange-600 hover:to-orange-800 text-white font-black text-xs shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Apply Leave / Skip Meal</span>
          </button>
        </div>
      </div>

      {/* Kitchen Headcount & Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Pending Review with Bulk Action */}
        <div
          onClick={() => setActiveTab('pending')}
          className={`p-4 rounded-2xl border transition cursor-pointer relative ${
            activeTab === 'pending' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase text-amber-700 block tracking-wider">Pending Approvals</span>
            {pendingLeaves.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleBulkApprove();
                }}
                className="text-[10px] font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-300 px-2 py-0.5 rounded cursor-pointer"
                title="Approve all at once"
              >
                Approve All
              </button>
            )}
          </div>
          <div className="text-2xl font-black text-amber-800 mt-1">{pendingLeaves.length}</div>
          <span className="text-[11px] text-amber-700 font-semibold">Awaiting owner decision</span>
        </div>

        {/* Approved Leaves */}
        <div
          onClick={() => setActiveTab('approved')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeTab === 'approved' ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20' : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-[10px] font-black uppercase text-emerald-700 block tracking-wider">Approved Leaves</span>
          <div className="text-2xl font-black text-emerald-800 mt-1">{approvedLeaves.length}</div>
          <span className="text-[11px] text-emerald-700 font-semibold">Validity extended</span>
        </div>

        {/* Today's Absentees (Maharaj Kitchen Connect) */}
        <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/50 shadow-2xs">
          <div className="flex items-center gap-1.5 text-blue-700 text-[10px] font-black uppercase tracking-wider">
            <ChefHat className="w-3.5 h-3.5" />
            <span>Today's Kitchen Absentees</span>
          </div>
          <div className="text-2xl font-black text-blue-900 mt-1">{todayAbsentCount} Diners</div>
          <span className="text-[11px] text-blue-700 font-semibold">Deducted from cook sheet</span>
        </div>

        {/* Total Leave History */}
        <div
          onClick={() => setActiveTab('all')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeTab === 'all' ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-[10px] font-black uppercase text-slate-500 block tracking-wider">All History</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{allLeaves.length}</div>
          <span className="text-[11px] text-slate-500 font-medium">Total leave logs</span>
        </div>
      </div>

      {/* Tab Navigation Filter */}
      <div className="flex items-center gap-1 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-2xs text-xs font-bold">
        {[
          { id: 'pending', label: `Pending Queue (${pendingLeaves.length})`, icon: Clock },
          { id: 'approved', label: `Approved History (${approvedLeaves.length})`, icon: CheckCircle2 },
          { id: 'rejected', label: `Rejected (${rejectedLeaves.length})`, icon: XCircle },
          { id: 'all', label: `All Leaves (${allLeaves.length})`, icon: CalendarCheck2 }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition cursor-pointer ${
                activeTab === t.id ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Leaves Listing */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        {displayedLeaves.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Clock className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="font-black text-slate-800 text-sm">No Leave Applications Found</h4>
            <p className="text-xs text-slate-500">
              No leave requests found under "{activeTab}" filter.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displayedLeaves.map((leave: any) => {
              const cust = leave.customer as Customer;
              const isPending = leave.status === 'pending';

              return (
                <div
                  key={leave.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-slate-900 text-sm">{cust?.name || 'Member'}</span>
                      <span className="text-xs text-slate-400 font-mono">({cust?.phone})</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        leave.status === 'approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        leave.status === 'rejected' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                        'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                      }`}>
                        {leave.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 font-medium">
                      Reason: <strong className="text-slate-900">{leave.reason || 'Vacation'}</strong>
                    </p>

                    <div className="flex items-center gap-3 text-xs text-slate-500 font-mono flex-wrap">
                      <span>Period: <strong className="text-slate-800">{leave.startDate}</strong> to <strong className="text-slate-800">{leave.endDate}</strong></span>
                      <span>•</span>
                      <span className="font-bold text-orange-600">{leave.days} Day(s)</span>
                      {cust?.endDate && (
                        <>
                          <span>•</span>
                          <span className="text-slate-400">Pass Expiry: {cust.endDate}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions Matrix */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
                    {/* WhatsApp Status Update */}
                    {cust?.phone && (
                      <button
                        onClick={() => handleSendLeaveWhatsApp(leave)}
                        className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition cursor-pointer"
                        title="Send WhatsApp confirmation to student"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    )}

                    {isPending && onApproveLeave && (
                      <button
                        onClick={() => onApproveLeave(cust.id, leave.id, Math.max(1, Math.round(leave.days)))}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition cursor-pointer"
                        title="Approve leave and extend pass validity"
                      >
                        <Check className="w-4 h-4" />
                        <span>Approve (+{leave.days}d)</span>
                      </button>
                    )}

                    {isPending && onRejectLeave && (
                      <button
                        onClick={() => onRejectLeave(cust.id, leave.id)}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    )}

                    {onOpenCustomer360 && (
                      <button
                        onClick={() => onOpenCustomer360(cust)}
                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                      >
                        Profile
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* APPLY LEAVE / SKIP MEAL MODAL */}
      {isAddLeaveOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900">Apply Leave / Skip Meal</h3>
                <p className="text-xs text-slate-500">Record absence to update cook sheet and extend pass</p>
              </div>
              <button
                onClick={() => setIsAddLeaveOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setLeaveTypeMode('multi_day')}
                className={`flex-1 py-1.5 rounded-xl transition cursor-pointer text-center ${
                  leaveTypeMode === 'multi_day' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                📅 Vacation / Multi-Day Leave
              </button>
              <button
                type="button"
                onClick={() => setLeaveTypeMode('single_meal')}
                className={`flex-1 py-1.5 rounded-xl transition cursor-pointer text-center ${
                  leaveTypeMode === 'single_meal' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                ⚡ Single Meal Skip
              </button>
            </div>

            <form onSubmit={handleCreateLeave} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Diner</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-900"
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone}) - Exp: {c.endDate}
                    </option>
                  ))}
                </select>
              </div>

              {leaveTypeMode === 'single_meal' ? (
                <div className="space-y-3 bg-amber-50/50 p-3.5 rounded-2xl border border-amber-200/80">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Date</label>
                      <input
                        type="date"
                        value={singleMealDate}
                        onChange={(e) => setSingleMealDate(e.target.value)}
                        className="w-full p-2 rounded-xl border border-slate-200 bg-white font-mono text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Shift to Skip</label>
                      <select
                        value={singleMealShift}
                        onChange={(e) => setSingleMealShift(e.target.value as any)}
                        className="w-full p-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-900"
                      >
                        <option value="lunch">Lunch (Afternoon)</option>
                        <option value="dinner">Dinner (Night)</option>
                      </select>
                    </div>
                  </div>
                  <div className="text-[11px] text-amber-800 font-medium">
                    ⚡ Single meal skip will immediately deduct 1 plate count from today's Maharaj Cook Sheet.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Leave Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Leave End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-900"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Reason for Absence</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Festival, Home visit, College exams, Medical..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddLeaveOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black shadow-md transition cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
