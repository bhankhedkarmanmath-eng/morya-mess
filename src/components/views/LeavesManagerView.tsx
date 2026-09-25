import React, { useState } from 'react';
import { Customer, LeaveRecord } from '../../types/mess';
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
  X
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
  const [filterTab, setFilterTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
  );
  const [reason, setReason] = useState('College Semester Exams / Going Home');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddLeaveOpen, setIsAddLeaveOpen] = useState(false);

  // Extract all leave requests across customers
  const allLeaves = customers.flatMap(c => {
    return (c.leaves || []).map(l => ({
      ...l,
      customer: c
    }));
  });

  const pendingLeaves = allLeaves.filter(l => l.status === 'pending');
  const approvedLeaves = allLeaves.filter(l => l.status === 'approved');
  const rejectedLeaves = allLeaves.filter(l => l.status === 'rejected');

  const displayedLeaves = filterTab === 'pending' 
    ? pendingLeaves 
    : filterTab === 'approved' 
    ? approvedLeaves 
    : filterTab === 'rejected' 
    ? rejectedLeaves 
    : allLeaves;

  const handleCreateLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !startDate || !endDate) return;

    setIsSubmitting(true);
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const matched = customers.find(c => c.id === selectedCustomerId);
    if (matched) {
      const newLeave: LeaveRecord = {
        id: `leave-${Date.now()}`,
        startDate,
        endDate,
        days: Math.max(1, days),
        reason,
        approved: false,
        status: 'pending',
        createdAt: new Date().toISOString(),
        requestedAt: new Date().toISOString()
      };

      const updatedLeaves: LeaveRecord[] = [...(matched.leaves || []), newLeave];
      matched.leaves = updatedLeaves;

      // Trigger re-render by updating window
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage'));
      }
    }

    setIsSubmitting(false);
    setIsAddLeaveOpen(false);
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
              <span>Skip Meal & Student Leaves Manager</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review vacation notices, approve leave pause credits, and extend subscription end dates
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onCreateTestLeave && (
            <button
              onClick={onCreateTestLeave}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              + Demo Leave
            </button>
          )}
          <button
            onClick={() => setIsAddLeaveOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Apply Leave for Diner</span>
          </button>
        </div>
      </div>

      {/* Counters & Filter Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setFilterTab('pending')}
          className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
            filterTab === 'pending'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-bold text-slate-500 uppercase">Pending Review</div>
          <div className="text-2xl font-black text-amber-700 mt-1">{pendingLeaves.length}</div>
          <span className="text-[10px] text-amber-600 font-medium">Requires owner approval</span>
        </button>

        <button
          onClick={() => setFilterTab('approved')}
          className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
            filterTab === 'approved'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-bold text-slate-500 uppercase">Approved Leaves</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{approvedLeaves.length}</div>
          <span className="text-[10px] text-emerald-600 font-medium">Validity extended</span>
        </button>

        <button
          onClick={() => setFilterTab('rejected')}
          className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
            filterTab === 'rejected'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-bold text-slate-500 uppercase">Rejected</div>
          <div className="text-2xl font-black text-rose-700 mt-1">{rejectedLeaves.length}</div>
          <span className="text-[10px] text-rose-600 font-medium">No extension granted</span>
        </button>

        <button
          onClick={() => setFilterTab('all')}
          className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
            filterTab === 'all'
              ? 'bg-slate-100 border-slate-300 ring-2 ring-slate-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-bold text-slate-500 uppercase">All Records</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{allLeaves.length}</div>
          <span className="text-[10px] text-slate-500 font-medium">Total leave history</span>
        </button>
      </div>

      {/* Leave Application Modal */}
      {isAddLeaveOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-slate-900">Apply Leave for Student</h3>
              <button 
                onClick={() => setIsAddLeaveOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLeave} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Diner</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-900"
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone}) - Exp: {c.endDate}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Reason for Absence</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Festival, Exam, Medical, Home visit..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-900"
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
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold"
                >
                  {isSubmitting ? 'Saving...' : 'Submit Leave Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leaves Listing */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {displayedLeaves.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="font-bold text-slate-800 text-sm">No Leave Requests</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              No leave applications found in "{filterTab}" category.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displayedLeaves.map((leave: any) => {
              const cust = leave.customer as Customer;
              const isPending = leave.status === 'pending';

              return (
                <div key={leave.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-slate-900 text-sm">{cust?.name || 'Member'}</span>
                      <span className="text-xs text-slate-400 font-mono">({cust?.phone})</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        leave.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        leave.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {leave.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 font-medium">
                      Reason: <span className="text-slate-800 font-bold">{leave.reason || 'Not specified'}</span>
                    </p>

                    <div className="flex items-center gap-3 text-xs text-slate-500 font-mono pt-1">
                      <span>Period: {leave.startDate} to {leave.endDate}</span>
                      <span>•</span>
                      <span className="font-bold text-orange-600">{leave.days} Day(s)</span>
                      {leave.requestedAt && (
                        <>
                          <span>•</span>
                          <span className="text-slate-400">Requested: {new Date(leave.requestedAt).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    {isPending && onApproveLeave && (
                      <button
                        onClick={() => onApproveLeave(cust.id, leave.id, leave.days)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve (+{leave.days}d)</span>
                      </button>
                    )}
                    {isPending && onRejectLeave && (
                      <button
                        onClick={() => onRejectLeave(cust.id, leave.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    )}
                    {onOpenCustomer360 && (
                      <button
                        onClick={() => onOpenCustomer360(cust)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
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
    </div>
  );
};
