import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Customer, Gender, MealPreference } from '../types/mess';
import { getTodayString, generateQrToken, createAuditRecord, getStandardFee } from '../lib/storage';
import { DatabaseTariffPlan, checkStudentAlreadyExists } from '../lib/supabaseSync';
import { fetchMessUpiConfig, recordNewPaymentInSupabase } from '../lib/ownerFeaturesApi';
import { 
  X, 
  UserPlus, 
  Calendar, 
  CreditCard, 
  Building, 
  Phone, 
  User, 
  AlertCircle,
  CheckCircle2,
  Share2,
  Banknote,
  Smartphone,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd?: (customer: Customer) => Promise<{ success: boolean; error?: string }> | void;
  onAddCustomer?: (customer: Customer) => void;
  existingCount?: number;
  messId?: string;
  availablePlans?: DatabaseTariffPlan[];
  rules?: any;
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  onAddCustomer,
  existingCount = 0,
  messId = '',
  rules
}) => {
  const today = getTodayString();
  const defaultEnd = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  })();

  // Core Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<Gender>('female'); // Default female as per mess majority
  const [hostelOrAddress, setHostelOrAddress] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [collegeOrWork, setCollegeOrWork] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [dietaryType, setDietaryType] = useState<'pure_veg' | 'jain' | 'regular'>('regular');
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);

  // Subscription Plan & Duration
  const [durationPreset, setDurationPreset] = useState<'15_days' | '30_days' | '60_days' | '90_days'>('30_days');
  const [planType, setPlanType] = useState('monthly_2meals');
  const [mealPreference, setMealPreference] = useState<MealPreference>('lunch_dinner');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(defaultEnd);

  // Financials & Payment Collection
  const [totalAmount, setTotalAmount] = useState(2500);
  const [paidAmount, setPaidAmount] = useState(2500);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'pay_later'>('cash');
  const [notes, setNotes] = useState('');

  // UPI Config
  const [messVpa, setMessVpa] = useState<string>('moryamess@oksbi');
  const [merchantName, setMerchantName] = useState<string>('Morya Mess');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState<Customer | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setPhone('');
      setHostelOrAddress('');
      setRoomNumber('');
      setCollegeOrWork('');
      setGuardianPhone('');
      setNotes('');
      setSubmitError('');
      setRegistrationSuccess(null);
      setIsSubmitting(false);
      setShowOptionalDetails(false);
      setStartDate(today);
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setEndDate(d.toISOString().split('T')[0]);
      setDurationPreset('30_days');
      setPlanType('monthly_2meals');
      setMealPreference('lunch_dinner');
      const base = getStandardFee(gender, 'monthly_2meals');
      setTotalAmount(base);
      setPaidAmount(base);
      setPaymentMode('cash');
    }
  }, [isOpen]);

  // Load Mess UPI Config
  useEffect(() => {
    fetchMessUpiConfig().then(cfg => {
      if (cfg?.upiId) setMessVpa(cfg.upiId);
      if (cfg?.upiPayeeName) setMerchantName(cfg.upiPayeeName);
    });
  }, []);

  // Re-calculate price whenever gender, plan or duration preset changes
  const updatePriceForGenderAndPlan = (selectedGender: Gender, selectedPlan: string, preset: string) => {
    let base = getStandardFee(selectedGender, selectedPlan);
    if (preset === '15_days') base = Math.round(base * 0.55);
    else if (preset === '60_days') base = Math.round(base * 1.95);
    else if (preset === '90_days') base = Math.round(base * 2.85);

    setTotalAmount(base);
    setPaidAmount(base);
  };

  const handleGenderChange = (newGender: Gender) => {
    setGender(newGender);
    updatePriceForGenderAndPlan(newGender, planType, durationPreset);
  };

  const handleDurationPresetChange = (preset: '15_days' | '30_days' | '60_days' | '90_days') => {
    setDurationPreset(preset);
    const start = new Date(startDate || today);
    const d = new Date(start);
    let daysToAdd = 30;
    if (preset === '15_days') daysToAdd = 15;
    else if (preset === '30_days') daysToAdd = 30;
    else if (preset === '60_days') daysToAdd = 60;
    else if (preset === '90_days') daysToAdd = 90;

    d.setDate(d.getDate() + daysToAdd);
    setEndDate(d.toISOString().split('T')[0]);
    updatePriceForGenderAndPlan(gender, planType, preset);
  };

  const handlePlanChange = (newPlan: string) => {
    setPlanType(newPlan);
    if (newPlan === 'monthly_1meal') {
      setMealPreference('lunch_only');
    } else {
      setMealPreference('lunch_dinner');
    }
    updatePriceForGenderAndPlan(gender, newPlan, durationPreset);
  };

  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart);
    const d = new Date(newStart);
    let daysToAdd = 30;
    if (durationPreset === '15_days') daysToAdd = 15;
    else if (durationPreset === '60_days') daysToAdd = 60;
    else if (durationPreset === '90_days') daysToAdd = 90;
    d.setDate(d.getDate() + daysToAdd);
    setEndDate(d.toISOString().split('T')[0]);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setSubmitError('Please enter the customer / student name.');
      return;
    }
    setSubmitError('');
    setIsSubmitting(true);

    try {
      // Check duplicate mobile in Supabase
      if (messId && phone.trim()) {
        const dup = await checkStudentAlreadyExists(messId, phone.trim());
        if (dup.exists) {
          setSubmitError(`Student with mobile ${phone.trim()} is already registered (${dup.studentName}). Duplicate mobile is not allowed.`);
          setIsSubmitting(false);
          return;
        }
      }

      // Generate collision-proof customer ID
      const yearStr = new Date().getFullYear().toString();
      const seqNum = Math.max(existingCount + 1, 1);
      const uniqueSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const newId = `MM-${yearStr}-${String(seqNum).padStart(3, '0')}-${uniqueSuffix}`;
      const token = generateQrToken();

      const calculatedBalance = Math.max(0, Number(totalAmount) - Number(paidAmount));

      const newCustomer: Customer = {
        id: newId,
        name: name.trim(),
        phone: phone.trim() || '',
        gender,
        hostelOrAddress: [hostelOrAddress.trim(), roomNumber.trim() ? `Room: ${roomNumber.trim()}` : ''].filter(Boolean).join(' • '),
        roomNumber: roomNumber.trim(),
        collegeOrWork: collegeOrWork.trim(),
        college: collegeOrWork.trim(),
        planType,
        mealPreference,
        startDate,
        endDate,
        totalAmount: Number(totalAmount),
        paidAmount: Number(paidAmount),
        balance: calculatedBalance,
        status: 'active',
        qrToken: token,
        qrVersion: 1,
        qrStatus: 'active',
        qrCreatedAt: today,
        penaltyAmount: 0,
        penaltyPaid: true,
        penalties: [],
        renewals: [],
        leaves: [],
        notes: [
          notes.trim(),
          guardianPhone.trim() ? `Parent Contact: ${guardianPhone.trim()}` : '',
          dietaryType !== 'regular' ? `Diet: ${dietaryType.toUpperCase()}` : ''
        ].filter(Boolean).join(' | '),
        createdAt: today,
        createdBy: 'Owner'
      };

      if (onAdd) {
        const res = await onAdd(newCustomer);
        if (res && !res.success) {
          setSubmitError(res.error || 'Failed to save student in database.');
          setIsSubmitting(false);
          return;
        }
      } else if (onAddCustomer) {
        onAddCustomer(newCustomer);
      }

      // If initial payment was collected, auto-record in Supabase ledger
      if (Number(paidAmount) > 0) {
        try {
          await recordNewPaymentInSupabase({
            customerId: newCustomer.id,
            customerName: newCustomer.name,
            amount: Number(paidAmount),
            paymentMode: paymentMode === 'cash' ? 'cash' : 'upi',
            status: 'verified',
            notes: `Admission Initial Payment (${planType})`,
            recordedBy: 'Owner Admission Desk'
          });
        } catch {
          // Non-blocking fallback
        }
      }

      createAuditRecord('customer', 'ADD_CUSTOMER', `Registered member ${newCustomer.name} (${newCustomer.id})`, 'Owner', 'owner', newCustomer.name, newCustomer.id);
      setIsSubmitting(false);
      setRegistrationSuccess(newCustomer);
    } catch (err: any) {
      setSubmitError(err?.message || 'Unexpected error occurred while registering member.');
      setIsSubmitting(false);
    }
  };

  // WhatsApp Welcome Sender
  const sendWhatsAppWelcome = (c: Customer) => {
    const cleanPhone = c.phone.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(
      `🎉 Welcome to ${rules?.messName || 'Morya Mess'}, ${c.name}!\n\n` +
      `Your digital membership pass is now ACTIVE.\n` +
      `• Member ID: ${c.id}\n` +
      `• Plan: ${c.planType.replace('_', ' ').toUpperCase()}\n` +
      `• Valid Until: ${c.endDate}\n` +
      `• Initial Payment: ₹${c.paidAmount} (${c.balance > 0 ? `Pending: ₹${c.balance}` : 'Full Paid'})\n` +
      `• Meal Timings:\n  - Lunch: 11:00 AM - 2:30 PM\n  - Dinner: 7:30 PM - 10:15 PM\n\n` +
      `Show your QR pass at the entrance counter. Enjoy your meals! 🙏`
    );
    window.open(`https://wa.me/91${cleanPhone}?text=${msg}`, '_blank');
  };

  const balanceDue = Math.max(0, Number(totalAmount) - Number(paidAmount));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Header - Fixed at Top */}
        <div className="shrink-0 flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-orange-50 via-white to-amber-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-md">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                Add New Customer
              </h2>
              <p className="text-xs text-slate-500">
                Register student & generate instant digital mess pass
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Screen */}
        {registrationSuccess ? (
          <div className="p-6 sm:p-8 text-center space-y-5 overflow-y-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">Member Registered Successfully!</h3>
              <p className="text-sm text-slate-600 mt-1">
                <span className="font-bold text-slate-900">{registrationSuccess.name}</span> has been added.
              </p>
              <div className="mt-3 inline-block px-4 py-2 bg-slate-100 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-bold block">Member ID</span>
                <span className="text-base font-mono font-black text-orange-600">{registrationSuccess.id}</span>
              </div>
            </div>

            <div className="p-4 bg-orange-50/60 rounded-2xl border border-orange-200/70 text-left text-xs space-y-1.5 max-w-md mx-auto">
              <div className="flex justify-between">
                <span className="text-slate-500">Plan:</span>
                <span className="font-bold text-slate-900 capitalize">{registrationSuccess.planType.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Validity:</span>
                <span className="font-bold text-slate-900 font-mono">{registrationSuccess.startDate} → {registrationSuccess.endDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Paid Amount:</span>
                <span className="font-bold text-emerald-700">₹{registrationSuccess.paidAmount}</span>
              </div>
              {registrationSuccess.balance > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Balance Due:</span>
                  <span>₹{registrationSuccess.balance}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              {registrationSuccess.phone && (
                <button
                  type="button"
                  onClick={() => sendWhatsAppWelcome(registrationSuccess)}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Send Pass on WhatsApp</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
              >
                Done / Close
              </button>
            </div>
          </div>
        ) : (
          /* Main Simple Form */
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              
              {submitError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <div className="font-semibold">{submitError}</div>
                </div>
              )}

              {/* 1. Basic Details */}
              <div className="space-y-3">
                <label className="text-xs font-black uppercase text-slate-500 tracking-wider block">
                  1. Member Information
                </label>

                <div>
                  <label className="block text-slate-800 font-bold text-xs mb-1">
                    Student / Customer Full Name <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Sneha Kulkarni / Rahul Shinde"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-800 font-bold text-xs mb-1">
                    Mobile Number <span className="text-slate-400 font-normal">(for pass & WhatsApp)</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 9822100001"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Gender & Mess Category */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-black uppercase text-slate-500 tracking-wider block">
                  2. Hostel Category & Gender
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleGenderChange('female')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      gender === 'female'
                        ? 'border-orange-500 bg-orange-50 text-orange-950 ring-2 ring-orange-500/20 font-bold'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-sm font-black flex items-center gap-1.5">
                      <span>👩 Girls Hostel</span>
                    </div>
                    <div className="text-xs text-orange-700 font-extrabold mt-1">₹2,500 / month</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGenderChange('male')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      gender === 'male'
                        ? 'border-orange-500 bg-orange-50 text-orange-950 ring-2 ring-orange-500/20 font-bold'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-sm font-black flex items-center gap-1.5">
                      <span>👨 Boys Hostel</span>
                    </div>
                    <div className="text-xs text-orange-700 font-extrabold mt-1">₹3,000 / month</div>
                  </button>
                </div>
              </div>

              {/* 3. Meal Plan & Duration */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="text-xs font-black uppercase text-slate-500 tracking-wider block">
                  3. Plan & Duration
                </label>

                {/* Plan Choices */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handlePlanChange('monthly_2meals')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      planType === 'monthly_2meals'
                        ? 'border-orange-500 bg-orange-50/80 ring-2 ring-orange-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="font-black text-slate-900 text-xs sm:text-sm">2 Meals / Day</div>
                    <div className="text-[11px] text-slate-500">Lunch + Dinner</div>
                    <div className="text-xs font-black text-orange-700 mt-1">
                      ₹{gender === 'female' ? '2,500' : '3,000'}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePlanChange('monthly_1meal')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      planType === 'monthly_1meal'
                        ? 'border-orange-500 bg-orange-50/80 ring-2 ring-orange-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="font-black text-slate-900 text-xs sm:text-sm">1 Meal / Day</div>
                    <div className="text-[11px] text-slate-500">Single Shift</div>
                    <div className="text-xs font-black text-orange-700 mt-1">
                      ₹{gender === 'female' ? '1,300' : '1,600'}
                    </div>
                  </button>
                </div>

                {/* Duration Presets */}
                <div>
                  <span className="block text-slate-700 font-bold text-xs mb-1.5">Preset Duration:</span>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: '15_days', label: '15 Days' },
                      { id: '30_days', label: '1 Month' },
                      { id: '60_days', label: '2 Months' },
                      { id: '90_days', label: '3 Months' }
                    ].map(dp => (
                      <button
                        type="button"
                        key={dp.id}
                        onClick={() => handleDurationPresetChange(dp.id as any)}
                        className={`py-2 px-1 rounded-xl border text-xs font-bold transition cursor-pointer text-center ${
                          durationPreset === dp.id
                            ? 'border-orange-500 bg-orange-500 text-white shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        {dp.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Start & End Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold text-xs mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold text-xs mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Payment Collection */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase text-slate-500 tracking-wider">
                    4. Fee & Payment
                  </label>
                  {balanceDue > 0 ? (
                    <span className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                      Balance Due: ₹{balanceDue}
                    </span>
                  ) : (
                    <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                      Fully Paid
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold text-xs mb-1">Total Fee (₹)</label>
                    <input
                      type="number"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-black text-sm focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold text-xs mb-1">Paid Now (₹)</label>
                    <input
                      type="number"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-emerald-50/70 border border-emerald-300 text-emerald-900 font-black text-sm focus:bg-white"
                    />
                  </div>
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="block text-slate-700 font-bold text-xs mb-1.5">Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMode('cash')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        paymentMode === 'cash' ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500' : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      <Banknote className="w-4 h-4 text-emerald-600" />
                      <span>Cash</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMode('upi')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        paymentMode === 'upi' ? 'border-blue-500 bg-blue-50 text-blue-900 ring-1 ring-blue-500' : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      <Smartphone className="w-4 h-4 text-blue-600" />
                      <span>UPI Online</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMode('pay_later');
                        setPaidAmount(0);
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        paymentMode === 'pay_later' ? 'border-amber-500 bg-amber-50 text-amber-900 ring-1 ring-amber-500' : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      <span>Pay Later</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 5. Optional Details Accordion */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOptionalDetails(!showOptionalDetails)}
                  className="w-full flex items-center justify-between text-xs font-bold text-slate-600 hover:text-slate-900 py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span>Hostel / Room / College Details (Optional)</span>
                  </span>
                  {showOptionalDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showOptionalDetails && (
                  <div className="mt-3 space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 font-bold text-[11px] mb-1">Hostel / PG Name</label>
                        <input
                          type="text"
                          value={hostelOrAddress}
                          onChange={(e) => setHostelOrAddress(e.target.value)}
                          placeholder="e.g. Sahyadri Hostel"
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-bold text-[11px] mb-1">Room No</label>
                        <input
                          type="text"
                          value={roomNumber}
                          onChange={(e) => setRoomNumber(e.target.value)}
                          placeholder="e.g. 204"
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 font-bold text-[11px] mb-1">College / Institute</label>
                        <input
                          type="text"
                          value={collegeOrWork}
                          onChange={(e) => setCollegeOrWork(e.target.value)}
                          placeholder="e.g. Govt Engineering College"
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-bold text-[11px] mb-1">Parent Mobile</label>
                        <input
                          type="tel"
                          value={guardianPhone}
                          onChange={(e) => setGuardianPhone(e.target.value)}
                          placeholder="e.g. 9422000000"
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Sticky Action Footer - ALWAYS VISIBLE */}
            <div className="shrink-0 px-5 sm:px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black text-xs sm:text-sm shadow-md transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isSubmitting ? 'Adding Customer...' : 'Add Customer'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
