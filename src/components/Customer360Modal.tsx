import React, { useState, useEffect } from 'react';
import { Customer } from '../types/mess';
import { 
  Customer360Data, 
  fetchCustomer360Profile, 
  toggleCustomerActiveStatus 
} from '../lib/ownerFeaturesApi';
import { 
  X, 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowUpRight, 
  DollarSign, 
  Plus, 
  FileText, 
  ShieldCheck, 
  UserX, 
  UserCheck, 
  MessageCircle, 
  RefreshCw,
  Utensils
} from 'lucide-react';

interface Customer360ModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenPayment?: (c: Customer) => void;
  onOpenRenew?: (c: Customer) => void;
  onOpenPrintPass?: (c: Customer) => void;
  onOpenStatement?: (c: Customer) => void;
  onCustomerUpdated?: () => void;
}

export const Customer360Modal: React.FC<Customer360ModalProps> = ({
  customer,
  isOpen,
  onClose,
  onOpenPayment,
  onOpenRenew,
  onOpenPrintPass,
  onOpenStatement,
  onCustomerUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'subscription' | 'attendance' | 'payments' | 'ledger' | 'activity'>('profile');
  const [data360, setData360] = useState<Customer360Data | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  useEffect(() => {
    if (isOpen && customer?.id) {
      load360();
    }
  }, [isOpen, customer?.id]);

  const load360 = async () => {
    if (!customer?.id) return;
    setIsLoading(true);
    const result = await fetchCustomer360Profile(customer.id);
    if (result) {
      setData360(result);
    }
    setIsLoading(false);
  };

  if (!isOpen || !customer) return null;

  const activeCust = data360?.customer || customer;
  const payments = data360?.payments || [];
  const attendanceLogs = data360?.attendanceLogs || [];
  const counts = data360?.attendanceCount || { today: false, currentMonth: 0, total: 0, lunch: 0, dinner: 0 };

  const totalPaid = payments
    .filter(p => p.status === 'verified')
    .reduce((sum, p) => sum + p.amount, 0);

  const handleToggleActive = async () => {
    const nextState = !activeCust.status || activeCust.status === 'active' ? false : true;
    const confirmText = nextState 
      ? `Reactivate ${activeCust.name}? This will restore active meal access.`
      : `Deactivate ${activeCust.name}? All historical attendance, payments, and ledger records will be preserved safely.`;

    if (!window.confirm(confirmText)) return;

    setIsDeactivating(true);
    const success = await toggleCustomerActiveStatus(activeCust.id, nextState);
    if (success) {
      await load360();
      if (onCustomerUpdated) onCustomerUpdated();
    }
    setIsDeactivating(false);
  };

  const handleWhatsApp = () => {
    const phoneClean = activeCust.phone.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(`Namaste ${activeCust.name}, regarding your membership at Morya Mess. Your current due balance is ₹${activeCust.balance}.`);
    window.open(`https://wa.me/91${phoneClean}?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div 
        className="w-full max-w-4xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="p-5 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-600 text-white font-black text-xl flex items-center justify-center shadow-xs">
              {activeCust.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900">{activeCust.name}</h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  activeCust.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-300'
                }`}>
                  {activeCust.status === 'active' ? 'Active Member' : 'Deactivated'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                <span className="font-mono">ID: {activeCust.id}</span>
                <span>•</span>
                <span>{activeCust.phone}</span>
                {activeCust.collegeOrWork && (
                  <>
                    <span>•</span>
                    <span>{activeCust.collegeOrWork}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsApp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 border-b border-slate-200 bg-slate-50 flex items-center gap-1 overflow-x-auto text-xs font-bold text-slate-600 no-scrollbar">
          {[
            { id: 'profile', label: 'Profile' },
            { id: 'subscription', label: 'Subscription' },
            { id: 'attendance', label: `Attendance (${counts.total})` },
            { id: 'payments', label: `Payments (${payments.length})` },
            { id: 'ledger', label: 'Ledger Statement' },
            { id: 'activity', label: 'Activity & Leaves' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`py-3 px-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === t.id
                  ? 'border-orange-600 text-orange-700 font-extrabold bg-white rounded-t-lg'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 text-xs text-slate-700 space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-10 gap-2 text-slate-500 font-medium">
              <RefreshCw className="w-4 h-4 animate-spin text-orange-600" />
              <span>Fetching latest database records...</span>
            </div>
          )}

          {/* TAB 1: PROFILE */}
          {!isLoading && activeTab === 'profile' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider text-orange-600">
                  Student Demographics
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Full Name</span>
                    <span className="font-bold text-slate-900">{activeCust.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Mobile Phone</span>
                    <span className="font-bold font-mono text-slate-900">{activeCust.phone}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Gender</span>
                    <span className="font-bold capitalize text-slate-900">{activeCust.gender}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">College / Institute</span>
                    <span className="font-bold text-slate-900">{activeCust.collegeOrWork || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Hostel & Room</span>
                    <span className="font-bold text-slate-900">{activeCust.hostelOrAddress || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Joined Date</span>
                    <span className="font-bold text-slate-900">{activeCust.createdAt?.split('T')[0] || activeCust.startDate}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider text-orange-600">
                  Financial Status
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Plan Rate</span>
                    <span className="font-bold text-slate-900">₹{activeCust.totalAmount}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Total Paid Amount</span>
                    <span className="font-bold text-emerald-600">₹{totalPaid || activeCust.paidAmount}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Current Balance Due</span>
                    <span className={`font-black ${activeCust.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      ₹{activeCust.balance}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap gap-2">
                  {onOpenPayment && (
                    <button
                      onClick={() => onOpenPayment(activeCust)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Collect Dues</span>
                    </button>
                  )}
                  {onOpenStatement && (
                    <button
                      onClick={() => onOpenStatement(activeCust)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Statement</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SUBSCRIPTION */}
          {!isLoading && activeTab === 'subscription' && (
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-slate-900 text-sm">{activeCust.planType}</h4>
                  <p className="text-slate-500 text-xs">Standard Hostel Dining Membership</p>
                </div>
                {onOpenRenew && (
                  <button
                    onClick={() => onOpenRenew(activeCust)}
                    className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs cursor-pointer"
                  >
                    Renew Subscription
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[11px] text-slate-500 block">Start Date</span>
                  <span className="font-bold text-slate-900">{activeCust.startDate}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[11px] text-slate-500 block">End Date</span>
                  <span className="font-bold text-slate-900">{activeCust.endDate}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[11px] text-slate-500 block">Plan Cost</span>
                  <span className="font-bold text-slate-900">₹{activeCust.totalAmount}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[11px] text-slate-500 block">Meals Covered</span>
                  <span className="font-bold text-slate-900">Lunch & Dinner</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ATTENDANCE */}
          {!isLoading && activeTab === 'attendance' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <span className="text-[11px] text-emerald-700 font-bold block">Ate Today?</span>
                  <span className="text-base font-black text-emerald-900">{counts.today ? 'YES' : 'NO'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-600 font-bold block">This Month</span>
                  <span className="text-base font-black text-slate-900">{counts.currentMonth} Meals</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-600 font-bold block">Lunch Total</span>
                  <span className="text-base font-black text-slate-900">{counts.lunch}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-600 font-bold block">Dinner Total</span>
                  <span className="text-base font-black text-slate-900">{counts.dinner}</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Meal Shift</th>
                      <th className="p-2.5">Timestamp</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendanceLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-slate-400">
                          No gate attendance scanned yet for this student.
                        </td>
                      </tr>
                    ) : (
                      attendanceLogs.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-900">{a.mealDate}</td>
                          <td className="p-2.5 uppercase font-semibold text-slate-700">{a.mealShift}</td>
                          <td className="p-2.5 font-mono text-slate-500">
                            {new Date(a.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Verified
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: PAYMENTS */}
          {!isLoading && activeTab === 'payments' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">Payment Transactions</span>
                {onOpenPayment && (
                  <button
                    onClick={() => onOpenPayment(activeCust)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 text-white font-bold text-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Record Payment
                  </button>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Amount</th>
                      <th className="p-2.5">Mode</th>
                      <th className="p-2.5">Reference / Notes</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400">
                          No payment transactions recorded yet.
                        </td>
                      </tr>
                    ) : (
                      payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-900">{p.createdAt?.split('T')[0]}</td>
                          <td className="p-2.5 font-extrabold text-emerald-700">₹{p.amount}</td>
                          <td className="p-2.5 uppercase font-semibold text-slate-700">{p.paymentMode}</td>
                          <td className="p-2.5 text-slate-500 font-mono text-[11px] truncate max-w-[200px]">
                            {p.transactionReference || p.notes || '—'}
                          </td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.status === 'verified'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: LEDGER */}
          {!isLoading && activeTab === 'ledger' && (
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider">
                  Chronological Financial Ledger
                </h4>
                <span className="font-extrabold text-xs">
                  Net Balance Due: <span className="text-rose-600">₹{activeCust.balance}</span>
                </span>
              </div>

              <div className="space-y-2 divide-y divide-slate-100 text-xs">
                <div className="flex justify-between py-2">
                  <div>
                    <span className="font-bold text-slate-900">{activeCust.startDate} — Membership Plan Charge</span>
                    <p className="text-[11px] text-slate-400">{activeCust.planType}</p>
                  </div>
                  <span className="font-bold text-slate-900">+₹{activeCust.totalAmount}</span>
                </div>

                {payments.map(p => (
                  <div key={p.id} className="flex justify-between py-2">
                    <div>
                      <span className="font-bold text-emerald-700">
                        {p.createdAt?.split('T')[0]} — {p.paymentMode.toUpperCase()} Payment
                      </span>
                      <p className="text-[11px] text-slate-400">{p.transactionReference || p.notes || 'Counter payment'}</p>
                    </div>
                    <span className="font-bold text-emerald-700">-₹{p.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: ACTIVITY & LEAVES */}
          {!isLoading && activeTab === 'activity' && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 text-xs">Leave Requests & Break History</h4>
              {(data360?.leaveHistory || []).length === 0 ? (
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 text-center text-slate-400 text-xs">
                  No leave requests recorded for this customer.
                </div>
              ) : (
                <div className="space-y-2">
                  {(data360?.leaveHistory || []).map(l => (
                    <div key={l.id} className="p-3 rounded-xl border border-slate-200 bg-white flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{l.startDate} to {l.endDate}</span>
                        <p className="text-[11px] text-slate-500">{l.reason}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        l.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {l.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          {/* Non-destructive soft deactivation */}
          <button
            onClick={handleToggleActive}
            disabled={isDeactivating}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
              activeCust.status === 'active'
                ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            {activeCust.status === 'active' ? (
              <>
                <UserX className="w-3.5 h-3.5" />
                <span>Deactivate Member</span>
              </>
            ) : (
              <>
                <UserCheck className="w-3.5 h-3.5" />
                <span>Reactivate Member</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            {onOpenPrintPass && (
              <button
                onClick={() => onOpenPrintPass(activeCust)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Print ID Pass
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
