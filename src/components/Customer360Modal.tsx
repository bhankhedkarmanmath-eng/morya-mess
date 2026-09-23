import React, { useState, useEffect } from 'react';
import { Customer, MealLog, CustomerStatus } from '../types/mess';
import { calculateDaysRemaining, generateQrToken, createAuditRecord, getTodayString } from '../lib/storage';
import { 
  X, 
  Phone, 
  MapPin, 
  Calendar, 
  CreditCard, 
  QrCode, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2,
  Plus,
  Trash2,
  ShieldCheck,
  MessageCircle,
  Clock,
  Edit3,
  Save,
  Check
} from 'lucide-react';

interface Customer360ModalProps {
  customer: Customer | null;
  mealLogs: MealLog[];
  isOpen: boolean;
  onClose: () => void;
  onOpenCardPrint?: (c: Customer) => void;
  onOpenPrintPass?: (c: Customer) => void;
  onOpenRenew: (c: Customer) => void;
  onOpenLeave?: (c: Customer) => void;
  onOpenPenalty: (c: Customer) => void;
  onOpenPayment?: (c: Customer) => void;
  onUpdateCustomer: (updated: Customer) => Promise<void> | void;
  onDeleteCustomer?: (id: string) => Promise<void> | void;
  rules?: any;
}

export const Customer360Modal: React.FC<Customer360ModalProps> = ({
  customer,
  mealLogs,
  isOpen,
  onClose,
  onOpenCardPrint,
  onOpenPrintPass,
  onOpenRenew,
  onOpenLeave,
  onOpenPenalty,
  onOpenPayment,
  onUpdateCustomer,
  onDeleteCustomer,
  rules
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'edit' | 'meals' | 'leaves' | 'penalties' | 'renewals'>('overview');
  
  // Edit form states
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPlanType, setEditPlanType] = useState<string>('monthly_veg_2meals');
  const [editCollege, setEditCollege] = useState('');
  const [editHostel, setEditHostel] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editTotalAmount, setEditTotalAmount] = useState<number>(0);
  const [editPaidAmount, setEditPaidAmount] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<CustomerStatus>('active');
  const [editNotes, setEditNotes] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sync edit form fields whenever selected customer changes
  useEffect(() => {
    if (customer) {
      setEditName(customer.name || '');
      setEditPhone(customer.phone || '');
      setEditPlanType(customer.planType || 'monthly_veg_2meals');
      setEditCollege(customer.collegeOrWork || '');
      setEditHostel(customer.hostelOrAddress || '');
      setEditStartDate(customer.startDate || '');
      setEditEndDate(customer.endDate || '');
      setEditTotalAmount(customer.totalAmount || 0);
      setEditPaidAmount(customer.paidAmount || 0);
      setEditStatus(customer.status || 'active');
      setEditNotes(customer.notes || '');
      setSaveSuccess(false);
      setShowDeleteConfirm(false);
    }
  }, [customer]);

  if (!isOpen || !customer) return null;

  const todayStr = getTodayString();
  const daysRemaining = calculateDaysRemaining(customer.endDate);
  const isExpired = daysRemaining < 0;
  const isExpiringSoon = daysRemaining >= 0 && daysRemaining <= 3;

  const customerMeals = mealLogs.filter(m => m.customerId === customer.id);
  const todayMeals = customerMeals.filter(m => m.date === todayStr);

  const handlePayPenalty = (penaltyId: string) => {
    const updatedPenalties = (customer.penalties || []).map(p => {
      if (p.id === penaltyId) {
        return { ...p, status: 'paid' as const, paidDate: todayStr };
      }
      return p;
    });
    const updated = {
      ...customer,
      penalties: updatedPenalties,
      penaltyPaid: true
    };
    onUpdateCustomer(updated);
    createAuditRecord('payment', 'PENALTY_PAID', `Penalty marked paid for ${customer.name}`, 'Owner', 'owner', customer.name, customer.id);
  };

  const handlePayBalance = async () => {
    const updated = {
      ...customer,
      paidAmount: customer.totalAmount,
      balance: 0
    };
    await onUpdateCustomer(updated);
    createAuditRecord('payment', 'CLEAR_BALANCE', `Fee balance cleared for ${customer.name}`, 'Owner', 'owner', customer.name, customer.id);
  };

  const handleReissueDigitalPass = () => {
    if (!window.confirm(`Re-issue new digital QR pass for ${customer.name}? This will invalidate previous QR token.`)) {
      return;
    }
    const newToken = generateQrToken();
    const updated: Customer = {
      ...customer,
      qrToken: newToken,
      qrVersion: (customer.qrVersion || 1) + 1,
      qrStatus: 'active',
      qrCreatedAt: todayStr
    };
    onUpdateCustomer(updated);
    createAuditRecord('qr', 'REISSUE_PASS', `Re-issued QR pass version ${updated.qrVersion} for ${customer.name}`, 'Owner', 'owner', customer.name, customer.id);
    alert(`New digital QR pass generated! Previous token revoked.`);
    (onOpenCardPrint || onOpenPrintPass)?.(updated);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingEdit(true);
    const updated: Customer = {
      ...customer,
      name: editName.trim(),
      phone: editPhone.trim(),
      planType: editPlanType,
      collegeOrWork: editCollege.trim(),
      hostelOrAddress: editHostel.trim(),
      startDate: editStartDate,
      endDate: editEndDate,
      totalAmount: Number(editTotalAmount),
      paidAmount: Number(editPaidAmount),
      balance: Math.max(0, Number(editTotalAmount) - Number(editPaidAmount)),
      status: editStatus,
      notes: editNotes.trim()
    };
    await onUpdateCustomer(updated);
    setIsSavingEdit(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // WhatsApp reminder message (English-only, professional)
  const cleanPhone = customer.phone ? customer.phone.replace(/\D/g, '') : '';
  const waReminderMessage = `Dear ${customer.name}, Greetings from Morya Mess Management. ${isExpired 
    ? `This is a reminder that your mess membership expired on ${customer.endDate}. Kindly renew your subscription to continue meal access.`
    : isExpiringSoon
    ? `This is a reminder that your mess membership will expire in ${daysRemaining === 0 ? 'today' : `${daysRemaining} days`} (${customer.endDate}).`
    : `Your mess membership is active and valid until ${customer.endDate}.`} ${customer.balance > 0 ? `\nPending Fee Balance: ₹${customer.balance}. Please clear your dues at your earliest convenience.` : ''}\nThank you,\nMorya Mess Management`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden my-4 max-h-[92vh] flex flex-col">
        {/* Top Profile Header */}
        <div className="px-6 py-5 border-b border-slate-100 bg-white flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-orange-600 flex items-center justify-center text-white font-bold text-lg shadow-xs shrink-0">
              {customer.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">{customer.name}</h3>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  customer.gender === 'female' 
                    ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  {customer.gender === 'female' ? 'Girls Hostel' : 'Boys Hostel'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                  ID: {customer.id}
                </span>
                {customer.phone && (
                  <a
                    href={`tel:${customer.phone}`}
                    className="inline-flex items-center gap-1 text-orange-700 hover:text-orange-950 bg-orange-50 hover:bg-orange-100 px-2 py-0.5 rounded-lg font-bold transition-colors border border-orange-200"
                    title={`Click to direct call ${customer.phone}`}
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{customer.phone}</span>
                    <span className="text-[10px] text-emerald-700 uppercase font-black ml-0.5">Call</span>
                  </a>
                )}
                {customer.hostelOrAddress && (
                  <span className="flex items-center gap-1 truncate max-w-xs text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {customer.hostelOrAddress}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2">
            {customer.phone && (
              <a
                href={`tel:${customer.phone}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs"
                title={`Direct call ${customer.name} on ${customer.phone}`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call</span>
              </a>
            )}
            {cleanPhone && (
              <a
                href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(waReminderMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors border border-emerald-200"
                title="Send WhatsApp Expiry / Balance Reminder"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
            )}
            <button
              onClick={() => (onOpenCardPrint || onOpenPrintPass)?.(customer)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-orange-200 bg-orange-50 text-orange-700 text-xs font-bold hover:bg-orange-100 transition-colors cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Digital Pass</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Action Ribbon */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
              customer.status === 'active' && !isExpired
                ? 'bg-emerald-100 text-emerald-800'
                : isExpired
                ? 'bg-rose-100 text-rose-800'
                : customer.status === 'on_leave'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-amber-100 text-amber-800'
            }`}>
              ● {isExpired ? 'EXPIRED' : customer.status.toUpperCase()}
            </span>
            <span className="text-slate-600 text-[11px]">
              Validity: <strong className="text-slate-800">{customer.startDate}</strong> to <strong className="text-slate-800">{customer.endDate}</strong> ({isExpired ? `${Math.abs(daysRemaining)} days expired` : `${daysRemaining} days remaining`})
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveTab('edit')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold hover:bg-slate-50 cursor-pointer text-[11px]"
            >
              <Edit3 className="w-3 h-3 text-orange-600" />
              <span>Edit Profile</span>
            </button>
            <button
              onClick={() => onOpenRenew(customer)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-600 text-white font-bold hover:bg-orange-700 cursor-pointer text-[11px]"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Renew</span>
            </button>
            {onOpenLeave && (
              <button
                onClick={() => onOpenLeave(customer)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer text-[11px]"
              >
                <Calendar className="w-3 h-3 text-slate-500" />
                <span>Record Leave</span>
              </button>
            )}
            <button
              onClick={() => onOpenPenalty(customer)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 font-bold hover:bg-rose-100 cursor-pointer text-[11px]"
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Fine / Penalty</span>
            </button>
            <button
              onClick={handleReissueDigitalPass}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 font-bold hover:bg-amber-100 cursor-pointer text-[11px]"
              title="Revoke previous QR code and generate new digital QR pass"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Re-issue QR Pass</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-100 bg-white flex items-center gap-6 overflow-x-auto text-xs font-semibold text-slate-500">
          {[
            { id: 'overview', label: 'Subscription & Financials' },
            { id: 'edit', label: 'Edit Member Profile' },
            { id: 'meals', label: `Meal Attendance (${customerMeals.length})` },
            { id: 'leaves', label: `Leaves & Vacations (${customer.leaves?.length || 0})` },
            { id: 'penalties', label: `Penalties & Fees (${customer.penalties?.length || 0})` },
            { id: 'renewals', label: `Renewal History (${customer.renewals?.length || 0})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`py-3 relative cursor-pointer whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'text-orange-600 font-bold border-b-2 border-orange-600'
                  : 'hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Financial KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-500 font-medium block">Total Plan Cost</span>
                  <div className="text-xl font-bold text-slate-900 mt-1">₹{customer.totalAmount}</div>
                  <span className="text-[11px] text-slate-500">
                    {customer.planType === 'monthly_2meals' ? 'Monthly 2 Meals' : 'Single Meal Plan'}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-500 font-medium block">Paid Amount</span>
                  <div className="text-xl font-bold text-emerald-600 mt-1">₹{customer.paidAmount}</div>
                  <span className="text-[11px] text-emerald-700 font-semibold">Account Verified</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-500 font-medium block">Pending Balance</span>
                  <div className={`text-xl font-bold mt-1 ${customer.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    ₹{customer.balance}
                  </div>
                  {customer.balance > 0 ? (
                    <button
                      onClick={handlePayBalance}
                      className="mt-1 text-[11px] font-bold text-orange-600 hover:underline cursor-pointer block"
                    >
                      Clear Balance Now
                    </button>
                  ) : (
                    <span className="text-[11px] text-emerald-700 font-semibold">Fully Paid</span>
                  )}
                </div>
              </div>

              {/* Today's Dining Status */}
              <div className="p-4 rounded-xl bg-orange-50/50 border border-orange-100">
                <h4 className="text-xs font-bold text-orange-900 uppercase tracking-wider mb-2">
                  Today&apos;s Meal Record ({todayMeals.length} taken)
                </h4>
                {todayMeals.length === 0 ? (
                  <p className="text-xs text-slate-500">No meal scanned yet today.</p>
                ) : (
                  <div className="space-y-1.5">
                    {todayMeals.map(m => (
                      <div key={m.id} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-orange-100 shadow-xs">
                        <span className="font-semibold capitalize text-slate-800">{m.mealType}</span>
                        <span className="font-mono text-slate-500">
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="font-bold text-emerald-700 text-[11px]">ALLOWED & SERVED</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Member Details Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 font-bold text-slate-800 flex items-center justify-between">
                  <span>Hostel, College & Registration Details</span>
                  <button
                    onClick={() => setActiveTab('edit')}
                    className="text-orange-600 hover:text-orange-700 font-bold cursor-pointer inline-flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit Info</span>
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  <div className="grid grid-cols-3 px-4 py-2.5">
                    <span className="text-slate-500">Hostel / Flat Address:</span>
                    <span className="col-span-2 font-medium text-slate-800">{customer.hostelOrAddress || 'Not provided'}</span>
                  </div>
                  <div className="grid grid-cols-3 px-4 py-2.5">
                    <span className="text-slate-500">College / Workplace:</span>
                    <span className="col-span-2 font-medium text-slate-800">{customer.collegeOrWork || 'Not provided'}</span>
                  </div>
                  <div className="grid grid-cols-3 px-4 py-2.5">
                    <span className="text-slate-500">Meal Preference:</span>
                    <span className="col-span-2 font-medium text-slate-800 capitalize">
                      {customer.mealPreference ? customer.mealPreference.replace('_', ' ') : 'Lunch & Dinner'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 px-4 py-2.5">
                    <span className="text-slate-500">QR Pass Version:</span>
                    <span className="col-span-2 font-mono text-slate-800 font-bold">
                      v{customer.qrVersion || 1} (Token: {customer.qrToken ? customer.qrToken.substring(0, 14) + '...' : 'Generated'})
                    </span>
                  </div>
                  <div className="grid grid-cols-3 px-4 py-2.5">
                    <span className="text-slate-500">Joined On:</span>
                    <span className="col-span-2 font-mono text-slate-800">{customer.createdAt}</span>
                  </div>
                  {customer.notes && (
                    <div className="grid grid-cols-3 px-4 py-2.5">
                      <span className="text-slate-500">Special Notes:</span>
                      <span className="col-span-2 text-slate-700 italic">{customer.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'edit' && (
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="bg-orange-50/60 p-4 rounded-xl border border-orange-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-orange-950 uppercase tracking-wider">
                    Edit Member Profile & Subscription
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Updates will sync directly to Supabase cloud database in real time.
                  </p>
                </div>
                {saveSuccess && (
                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-bold">
                    <Check className="w-3.5 h-3.5" /> Saved to Database!
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Phone Number (10 digits)</label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">College / Workplace</label>
                  <input
                    type="text"
                    value={editCollege}
                    onChange={e => setEditCollege(e.target.value)}
                    placeholder="e.g. Government Engineering College"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Hostel / Address</label>
                  <input
                    type="text"
                    value={editHostel}
                    onChange={e => setEditHostel(e.target.value)}
                    placeholder="e.g. Anand Hostel Room 204"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Subscription Start Date</label>
                  <input
                    type="date"
                    required
                    value={editStartDate}
                    onChange={e => setEditStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Subscription End Date</label>
                  <input
                    type="date"
                    required
                    value={editEndDate}
                    onChange={e => setEditEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Total Subscription Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editTotalAmount}
                    onChange={e => setEditTotalAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Paid Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editPaidAmount}
                    onChange={e => setEditPaidAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Mess Plan / Meal Type</label>
                  <select
                    value={editPlanType}
                    onChange={e => setEditPlanType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-500 font-semibold"
                  >
                    <option value="monthly_veg_2meals">Monthly Regular (2 Meals / Day)</option>
                    <option value="monthly_veg_1meal">Monthly Regular (1 Meal / Day)</option>
                    <option value="monthly_nonveg_2meals">Monthly Special (2 Meals / Day)</option>
                    <option value="monthly_nonveg_1meal">Monthly Special (1 Meal / Day)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Account Status</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as CustomerStatus)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-500 font-semibold"
                  >
                    <option value="active">Active (Access Allowed)</option>
                    <option value="inactive">Inactive / Suspended</option>
                    <option value="on_leave">On Leave</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Calculated Pending Balance</label>
                  <div className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700">
                    ₹{Math.max(0, Number(editTotalAmount) - Number(editPaidAmount))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Special Notes / Diet Preferences</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="e.g. Vegetarian preference, verified college ID"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isSavingEdit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to Supabase...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'meals' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Full Dining Attendance History
              </h4>
              {customerMeals.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                  No meals recorded yet for this member.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">Date & Time</th>
                        <th className="px-4 py-2.5 font-semibold">Meal Shift</th>
                        <th className="px-4 py-2.5 font-semibold">Status</th>
                        <th className="px-4 py-2.5 font-semibold">Audit Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customerMeals.map(m => (
                        <tr key={m.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-2 font-mono text-slate-700">
                            {m.date} {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-4 py-2 capitalize font-medium text-slate-800">{m.mealType}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              m.scanStatus === 'ALLOW'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {m.scanStatus}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-slate-600">{m.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'leaves' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Recorded Leaves & Vacations
                </h4>
                <button
                  onClick={() => onOpenLeave?.(customer)}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Leave</span>
                </button>
              </div>

              {!customer.leaves || customer.leaves.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                  No leaves registered. All days counted towards active subscription.
                </div>
              ) : (
                <div className="space-y-2">
                  {customer.leaves.map(l => (
                    <div key={l.id} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-800">{l.startDate} to {l.endDate}</span>
                        <span className="ml-2 text-xs font-bold text-orange-700">({l.days} days vacation)</span>
                        <p className="text-[11px] text-slate-500 mt-0.5">Reason: {l.reason}</p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        APPROVED & EXTENDED
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'penalties' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Penalties & Service Fees
                </h4>
                <button
                  onClick={() => onOpenPenalty(customer)}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Penalty</span>
                </button>
              </div>

              {!customer.penalties || customer.penalties.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                  Clean record! No penalties or fines charged.
                </div>
              ) : (
                <div className="space-y-2">
                  {customer.penalties.map(p => (
                    <div key={p.id} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-rose-600">₹{p.amount}</span>
                          <span className="font-semibold text-slate-800">{p.reason}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">Recorded on: {p.date}</p>
                      </div>
                      <div>
                        {p.status === 'pending' ? (
                          <button
                            onClick={() => handlePayPenalty(p.id)}
                            className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 cursor-pointer"
                          >
                            Mark Paid
                          </button>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            PAID ON {p.paidDate || 'Account'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'renewals' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Subscription Renewal History
                </h4>
                <button
                  onClick={() => onOpenRenew(customer)}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Renew Now</span>
                </button>
              </div>

              {!customer.renewals || customer.renewals.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                  First subscription period ongoing. No renewals recorded yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {customer.renewals.map(r => (
                    <div key={r.id} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-800">Period: {r.newStartDate} to {r.newEndDate}</span>
                        <div className="text-slate-500 mt-0.5">
                          Amount: <strong className="text-emerald-700">₹{r.paidAmount}</strong> / ₹{r.amount} (Recorded on {r.date})
                        </div>
                        {r.notes && <p className="text-[11px] text-slate-500 italic">{r.notes}</p>}
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        RENEWED
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-rose-700 font-bold text-xs">
                Really delete member {customer.name}?
              </span>
              <button
                type="button"
                onClick={() => {
                  onDeleteCustomer?.(customer.id);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors cursor-pointer text-xs shadow-xs"
              >
                Yes, Delete Permanently
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold transition-colors cursor-pointer text-xs"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold hover:bg-rose-100 transition-colors cursor-pointer"
              title="Delete / Remove this member permanently"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Member Profile</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
