import React, { useState, useEffect } from 'react';
import { Customer, MealLog } from '../types/mess';
import { 
  Customer360Data, 
  fetchCustomer360Profile, 
  toggleCustomerActiveStatus,
  fetchOwnerNotifications
} from '../lib/ownerFeaturesApi';
import { loadSecurityLogs } from '../lib/ownerModulesStorage';
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
  Utensils,
  Star,
  Bell,
  Send,
  History,
  AlertTriangle,
  QrCode,
  Layers,
  ChevronRight
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

type TabType = 
  | 'overview' 
  | 'subscription' 
  | 'attendance' 
  | 'leaves' 
  | 'payments' 
  | 'ledger' 
  | 'statement' 
  | 'complaints' 
  | 'reviews' 
  | 'notifications' 
  | 'whatsapp' 
  | 'activity';

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
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [data360, setData360] = useState<Customer360Data | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // WhatsApp communication state
  const [customWhatsAppMsg, setCustomWhatsAppMsg] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('due_reminder');

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
  const leaves = data360?.leaveHistory || [];
  const complaints = data360?.complaints || [];
  const reviews = data360?.reviews || [];

  // Security logs related to this customer
  const relatedLogs = loadSecurityLogs().filter(
    l => l.relatedId === activeCust.id || l.details.toLowerCase().includes(activeCust.name.toLowerCase())
  );

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

  // WhatsApp sender
  const handleSendWhatsApp = (msgText?: string) => {
    const phoneClean = activeCust.phone.replace(/[^0-9]/g, '');
    let text = msgText || customWhatsAppMsg;

    if (!text) {
      if (selectedTemplate === 'due_reminder') {
        text = `Namaste ${activeCust.name}, greetings from Morya Mess.\nYour mess fee balance is ₹${activeCust.balance}.\nPlease clear your dues via UPI or cash to ensure uninterrupted meal access.\nThank you!`;
      } else if (selectedTemplate === 'renewal') {
        text = `Namaste ${activeCust.name},\nYour mess pass expires on ${activeCust.endDate}.\nPlease renew your plan to continue having delicious meals without interruption.\nThank you, Morya Mess.`;
      } else if (selectedTemplate === 'general') {
        text = `Namaste ${activeCust.name},\nRegarding your membership at Morya Mess.\nPlease contact the office counter for an update.`;
      }
    }

    window.open(`https://wa.me/91${phoneClean}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'overview', label: '1. Overview' },
    { id: 'subscription', label: '2. Subscription' },
    { id: 'attendance', label: '3. Attendance', count: counts.total },
    { id: 'leaves', label: '4. Leaves', count: leaves.length },
    { id: 'payments', label: '5. Payments', count: payments.length },
    { id: 'ledger', label: '6. Ledger' },
    { id: 'statement', label: '7. Statement' },
    { id: 'complaints', label: '8. Complaints', count: complaints.length },
    { id: 'reviews', label: '9. Ratings', count: reviews.length },
    { id: 'notifications', label: '10. Alerts' },
    { id: 'whatsapp', label: '11. WhatsApp' },
    { id: 'activity', label: '12. Audit History', count: relatedLogs.length }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div 
        className="w-full max-w-5xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ==================================================== */}
        {/* CUSTOMER 360 HEADER                                  */}
        {/* ==================================================== */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-600 text-white font-black text-xl flex items-center justify-center shadow-md">
              {activeCust.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-900">{activeCust.name}</h2>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  activeCust.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-300'
                }`}>
                  {activeCust.status === 'active' ? 'Active Member' : 'Deactivated'}
                </span>
                <span className="text-[10px] font-bold bg-orange-50 text-orange-800 px-2 py-0.5 rounded-full border border-orange-200">
                  {activeCust.gender === 'female' ? 'Hostel Girl' : 'Hostel Boy'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                <span className="font-mono font-bold text-slate-600">ID: {activeCust.id}</span>
                <span>•</span>
                <span>{activeCust.phone}</span>
                {activeCust.collegeOrWork && (
                  <>
                    <span>•</span>
                    <span className="text-slate-600">{activeCust.collegeOrWork}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleSendWhatsApp()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            <button
              onClick={handleToggleActive}
              disabled={isDeactivating}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                activeCust.status === 'active'
                  ? 'border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100'
                  : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
              }`}
            >
              {activeCust.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
              <span>{activeCust.status === 'active' ? 'Deactivate' : 'Reactivate'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ==================================================== */}
        {/* CUSTOMER 360 SUMMARY BAR                             */}
        {/* ==================================================== */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 px-5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block font-bold">STATUS</span>
            <span className="font-bold text-slate-900 capitalize">{activeCust.status}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-bold">JOINED</span>
            <span className="font-bold text-slate-900">{activeCust.startDate}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-bold">PLAN</span>
            <span className="font-bold text-slate-900 truncate block">{activeCust.planType}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-bold">VALIDITY</span>
            <span className="font-bold text-slate-900">{activeCust.endDate}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-bold">ATTENDANCE</span>
            <span className="font-bold text-emerald-700">{counts.total} Meals</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-bold">TOTAL PAID</span>
            <span className="font-bold text-emerald-700">₹{totalPaid}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-bold">BALANCE DUE</span>
            <span className={`font-black ${activeCust.balance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
              ₹{activeCust.balance}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-bold">LEAVES</span>
            <span className="font-bold text-slate-800">{leaves.length} Approved</span>
          </div>
        </div>

        {/* ==================================================== */}
        {/* 12-TAB NAVIGATION (HORIZONTAL SCROLL)                */}
        {/* ==================================================== */}
        <div className="px-4 border-b border-slate-200 bg-white flex items-center gap-1 overflow-x-auto text-xs font-bold text-slate-600">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`py-3 px-3 border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === t.id
                  ? 'border-orange-600 text-orange-700 font-black bg-orange-50/40'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              <span>{t.label}</span>
              {t.count !== undefined && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === t.id ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ==================================================== */}
        {/* TAB BODIES                                           */}
        {/* ==================================================== */}
        <div className="flex-1 overflow-y-auto p-5 text-xs text-slate-700 space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-10 gap-2 text-slate-500 font-medium">
              <RefreshCw className="w-4 h-4 animate-spin text-orange-600" />
              <span>Fetching live Supabase records...</span>
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {!isLoading && activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                <h4 className="font-black text-xs uppercase tracking-wider text-orange-600 flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  <span>Student Profile Demographics</span>
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Full Name</span>
                    <span className="font-bold text-slate-900">{activeCust.name}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Phone Number</span>
                    <span className="font-bold font-mono text-slate-900">{activeCust.phone}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Gender</span>
                    <span className="font-bold capitalize text-slate-900">{activeCust.gender}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">College / Work</span>
                    <span className="font-bold text-slate-900">{activeCust.collegeOrWork || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Hostel Address / Room</span>
                    <span className="font-bold text-slate-900">{activeCust.hostelOrAddress || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Joined Date</span>
                    <span className="font-bold text-slate-900">{activeCust.startDate}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3 flex flex-col justify-between">
                <div>
                  <h4 className="font-black text-xs uppercase tracking-wider text-orange-600 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4" />
                    <span>Quick Operations</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">Direct shortcut actions for this student pass:</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  {onOpenPayment && (
                    <button
                      onClick={() => onOpenPayment(activeCust)}
                      className="p-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>Record Payment</span>
                    </button>
                  )}
                  {onOpenRenew && (
                    <button
                      onClick={() => onOpenRenew(activeCust)}
                      className="p-3 rounded-xl border border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-900 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Renew Pass</span>
                    </button>
                  )}
                  {onOpenPrintPass && (
                    <button
                      onClick={() => onOpenPrintPass(activeCust)}
                      className="p-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>Print QR Pass</span>
                    </button>
                  )}
                  {onOpenStatement && (
                    <button
                      onClick={() => onOpenStatement(activeCust)}
                      className="p-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Monthly Statement</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SUBSCRIPTION */}
          {!isLoading && activeTab === 'subscription' && (
            <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-slate-900 text-sm">{activeCust.planType}</h4>
                  <p className="text-slate-500 text-xs">Hostel Dining Membership Subscription</p>
                </div>
                {onOpenRenew && (
                  <button
                    onClick={() => onOpenRenew(activeCust)}
                    className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                  >
                    Renew / Extend
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] text-slate-400 block font-bold">START DATE</span>
                  <span className="font-bold text-slate-900">{activeCust.startDate}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] text-slate-400 block font-bold">END DATE</span>
                  <span className="font-bold text-slate-900">{activeCust.endDate}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] text-slate-400 block font-bold">MONTHLY RATE</span>
                  <span className="font-bold text-slate-900">₹{activeCust.totalAmount}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] text-slate-400 block font-bold">BALANCE DUE</span>
                  <span className={`font-black ${activeCust.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    ₹{activeCust.balance}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ATTENDANCE */}
          {!isLoading && activeTab === 'attendance' && (
            <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-slate-900 text-sm">Authoritative Attendance Records</h4>
                  <p className="text-slate-500 text-xs">Directly from Supabase attendance logs</p>
                </div>
                <div className="text-right">
                  <span className="font-black text-emerald-700 text-sm">{counts.total} Meals</span>
                  <span className="text-[11px] text-slate-400 block">
                    {counts.lunch} Lunch • {counts.dinner} Dinner
                  </span>
                </div>
              </div>

              {attendanceLogs.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl text-slate-400">
                  No attendance records logged for this member yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {attendanceLogs.map(log => (
                    <div key={log.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <div>
                          <span className="font-bold text-slate-900 capitalize">{log.mealShift} Meal</span>
                          <span className="text-[10px] text-slate-400 ml-2 font-mono">{log.mealDate}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        Verified
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: LEAVES */}
          {!isLoading && activeTab === 'leaves' && (
            <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
              <h4 className="font-black text-slate-900 text-sm">Student Vacation & Skip Meal Applications</h4>
              {leaves.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl text-slate-400">
                  No leave requests recorded for this member.
                </div>
              ) : (
                <div className="space-y-2">
                  {leaves.map(leave => (
                    <div key={leave.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{leave.startDate} to {leave.endDate}</span>
                        <p className="text-[11px] text-slate-500 mt-0.5">Reason: {leave.reason || 'Personal'}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        leave.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {leave.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PAYMENTS */}
          {!isLoading && activeTab === 'payments' && (
            <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-slate-900 text-sm">Payment Transactions</h4>
                  <p className="text-slate-500 text-xs">Directly from Supabase payment_logs</p>
                </div>
                {onOpenPayment && (
                  <button
                    onClick={() => onOpenPayment(activeCust)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                  >
                    + Record Payment
                  </button>
                )}
              </div>

              {payments.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl text-slate-400">
                  No payments recorded yet for this member.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {payments.map(p => (
                    <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-sm">₹{p.amount}</span>
                          <span className="uppercase text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                            {p.paymentMode}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                          {p.date || p.createdAt?.split('T')[0]} • Ref: {p.transactionReference || 'N/A'}
                        </span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        p.status === 'verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {p.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: LEDGER */}
          {!isLoading && activeTab === 'ledger' && (
            <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
              <h4 className="font-black text-slate-900 text-sm">Student Credit & Debit Ledger Statement</h4>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-3 gap-3 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">TOTAL BILLED</span>
                  <span className="text-base font-black text-slate-900">₹{activeCust.totalAmount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">TOTAL PAID</span>
                  <span className="text-base font-black text-emerald-600">₹{totalPaid}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">CURRENT BALANCE</span>
                  <span className={`text-base font-black ${activeCust.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    ₹{activeCust.balance}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: STATEMENT */}
          {!isLoading && activeTab === 'statement' && (
            <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4 text-center">
              <FileText className="w-10 h-10 text-orange-600 mx-auto" />
              <h4 className="font-black text-slate-900 text-base">Monthly Statement Generator</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Generate and print an official monthly mess statement for {activeCust.name} including shift breakdown, leave credit days, and payment receipts.
              </p>
              {onOpenStatement && (
                <button
                  onClick={() => onOpenStatement(activeCust)}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  Open Full Monthly Statement
                </button>
              )}
            </div>
          )}

          {/* TAB 8: COMPLAINTS */}
          {!isLoading && activeTab === 'complaints' && (
            <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
              <h4 className="font-black text-slate-900 text-sm">Complaints & Attendance Disputes</h4>
              {complaints.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl text-slate-400">
                  No complaints or attendance disputes reported by this student.
                </div>
              ) : (
                <div className="space-y-3">
                  {complaints.map(c => (
                    <div key={c.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{c.subject}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                          {c.status}
                        </span>
                      </div>
                      <p className="text-slate-600 whitespace-pre-wrap">{c.description}</p>
                      {c.response && (
                        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 mt-2 text-[11px]">
                          <strong>Owner Reply:</strong> {c.response}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 9: REVIEWS */}
          {!isLoading && activeTab === 'reviews' && (
            <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
              <h4 className="font-black text-slate-900 text-sm">Meal Ratings & Food Feedback</h4>
              {reviews.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl text-slate-400">
                  No meal reviews posted by this student yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {reviews.map(r => (
                    <div key={r.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-1 text-amber-500 font-bold">
                          {Array.from({ length: r.rating }).map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-current" />
                          ))}
                          <span className="ml-1 text-slate-900">{r.rating}/5</span>
                        </div>
                        <p className="text-slate-600 italic mt-1">{r.comment || 'Good food'}</p>
                      </div>
                      <span className="text-[10px] text-slate-400">{r.createdAt?.split('T')[0]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 10: NOTIFICATIONS */}
          {!isLoading && activeTab === 'notifications' && (
            <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
              <h4 className="font-black text-slate-900 text-sm">Notifications Sent to Member</h4>
              <div className="p-4 rounded-xl bg-orange-50/60 border border-orange-200 text-xs text-orange-950 space-y-1">
                <p className="font-bold">Automated Notification System Active</p>
                <p>System automatically notifies this member on gate scan verification, payment verification, and leave approval.</p>
              </div>
            </div>
          )}

          {/* TAB 11: WHATSAPP */}
          {!isLoading && activeTab === 'whatsapp' && (
            <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-600" />
                <div>
                  <h4 className="font-black text-slate-900 text-sm">WhatsApp Communication Desk</h4>
                  <p className="text-slate-500 text-xs">Send pre-filled notices directly to +91 {activeCust.phone}</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block font-bold text-slate-700 text-xs mb-1">Select Message Template</label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium"
                  >
                    <option value="due_reminder">Outstanding Fee Balance Reminder (₹{activeCust.balance})</option>
                    <option value="renewal">Pass Expiry / Renewal Notice (Expires {activeCust.endDate})</option>
                    <option value="general">General Mess Desk Update</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 text-xs mb-1">Custom Message (Optional)</label>
                  <textarea
                    value={customWhatsAppMsg}
                    onChange={(e) => setCustomWhatsAppMsg(e.target.value)}
                    placeholder="Type custom note to override template..."
                    rows={3}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <button
                  onClick={() => handleSendWhatsApp()}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Send className="w-4 h-4" />
                  <span>Send WhatsApp Message</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 12: ACTIVITY / AUDIT HISTORY */}
          {!isLoading && activeTab === 'activity' && (
            <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
              <h4 className="font-black text-slate-900 text-sm">System Security & Activity Audit Log</h4>
              {relatedLogs.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl text-slate-400">
                  No security audit events recorded for this member.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {relatedLogs.map(log => (
                    <div key={log.id} className="py-2.5 flex items-start justify-between gap-3">
                      <div>
                        <span className="font-bold text-slate-900">{log.action}</span>
                        <p className="text-[11px] text-slate-500">{log.details}</p>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
