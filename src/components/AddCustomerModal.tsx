import React, { useState, useEffect } from 'react';
import { Customer, Gender, MealPreference } from '../types/mess';
import { getTodayString, generateQrToken, createAuditRecord, getStandardFee } from '../lib/storage';
import { DatabaseTariffPlan, checkStudentAlreadyExists } from '../lib/supabaseSync';
import { X, UserPlus, Calendar, CreditCard, Building, Phone, User, Clock, AlertCircle } from 'lucide-react';

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
  availablePlans = []
}) => {
  const today = getTodayString();
  const defaultEnd = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  })();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<Gender>('female'); // Majority girls hostel mess
  const [hostelOrAddress, setHostelOrAddress] = useState('');
  const [collegeOrWork, setCollegeOrWork] = useState('');
  const [planType, setPlanType] = useState('monthly_2meals');
  const [mealPreference, setMealPreference] = useState<MealPreference>('lunch_dinner');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [totalAmount, setTotalAmount] = useState(2500); // Default female 2 meals
  const [paidAmount, setPaidAmount] = useState(2500);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Re-calculate price whenever gender or plan changes
  const updatePriceForGenderAndPlan = (selectedGender: Gender, selectedPlan: string) => {
    const calculatedFee = getStandardFee(selectedGender, selectedPlan);
    setTotalAmount(calculatedFee);
    setPaidAmount(calculatedFee);
  };

  const handleGenderChange = (newGender: Gender) => {
    setGender(newGender);
    updatePriceForGenderAndPlan(newGender, planType);
  };

  const handlePlanChange = (newPlan: string) => {
    setPlanType(newPlan);
    const start = new Date(startDate || today);
    const d = new Date(start);
    d.setDate(d.getDate() + 30);
    setEndDate(d.toISOString().split('T')[0]);

    if (newPlan === 'monthly_1meal') {
      setMealPreference('lunch_only');
    } else {
      setMealPreference('lunch_dinner');
    }
    updatePriceForGenderAndPlan(gender, newPlan);
  };

  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart);
    const d = new Date(newStart);
    d.setDate(d.getDate() + 30);
    setEndDate(d.toISOString().split('T')[0]);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitError('');
    setIsSubmitting(true);

    try {
      // Check duplicate mobile in Supabase
      if (messId && phone.trim()) {
        const dup = await checkStudentAlreadyExists(messId, phone.trim());
        if (dup.exists) {
          setSubmitError(`Student with mobile ${phone.trim()} is already registered (${dup.studentName}). Duplicate entries are blocked.`);
          setIsSubmitting(false);
          return;
        }
      }

      // Generate guaranteed collision-proof customer ID
      const yearStr = new Date().getFullYear().toString();
      const seqNum = Math.max(existingCount + 1, 1);
      const uniqueSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const newId = `MM-${yearStr}-${String(seqNum).padStart(3, '0')}-${uniqueSuffix}`;
      const token = generateQrToken();

      const newCustomer: Customer = {
        id: newId,
        name: name.trim(),
        phone: phone.trim() || '',
        gender,
        hostelOrAddress: hostelOrAddress.trim(),
        collegeOrWork: collegeOrWork.trim(),
        planType,
        mealPreference,
        startDate,
        endDate,
        totalAmount: Number(totalAmount),
        paidAmount: Number(paidAmount),
        balance: Math.max(0, Number(totalAmount) - Number(paidAmount)),
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
        notes: notes.trim(),
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

      createAuditRecord('customer', 'ADD_CUSTOMER', `Registered member ${newCustomer.name} (${newCustomer.id})`, 'Owner', 'owner', newCustomer.name, newCustomer.id);
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setSubmitError(err?.message || 'Unexpected error occurred while registering member.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden my-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Register New Mess Member</h2>
              <p className="text-[11px] text-slate-500">Generates unique digital QR pass and subscription</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {submitError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 mt-0.5" />
              <div className="font-semibold">{submitError}</div>
            </div>
          )}

          {/* Personal Info */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
              <User className="w-4 h-4 text-orange-600" />
              <span>Student / Member Identity</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Full Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sneha Kulkarni"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-orange-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9822100001"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-orange-600"
                />
              </div>
            </div>

            {/* Gender / Demographic */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-700 font-semibold text-xs">Category / Gender</label>
                <span className="text-[11px] font-bold text-orange-700">
                  {gender === 'female' ? 'Girls: 2x ₹2500 / 1x ₹1300' : 'Boys: 2x ₹3000 / 1x ₹1600'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleGenderChange('female')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-left ${
                    gender === 'female'
                      ? 'border-orange-600 bg-orange-50 text-orange-700 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>Girls Hostel Member</span>
                    <span className="text-[10px] bg-orange-200/60 px-1.5 py-0.5 rounded font-bold">₹2,500 / ₹1,300</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleGenderChange('male')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-left ${
                    gender === 'male'
                      ? 'border-orange-600 bg-orange-50 text-orange-700 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>Boys Hostel Member</span>
                    <span className="text-[10px] bg-orange-200/60 px-1.5 py-0.5 rounded font-bold">₹3,000 / ₹1,600</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Hostel / PG / Room Address
                </label>
                <input
                  type="text"
                  value={hostelOrAddress}
                  onChange={(e) => setHostelOrAddress(e.target.value)}
                  placeholder="e.g. Sahyadri Girls Hostel, Room 204"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-orange-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  College / Workplace
                </label>
                <input
                  type="text"
                  value={collegeOrWork}
                  onChange={(e) => setCollegeOrWork(e.target.value)}
                  placeholder="e.g. Polytechnic College / Engineering"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-orange-600"
                />
              </div>
            </div>
          </div>

          {/* Subscription & Pricing */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <CreditCard className="w-4 h-4 text-orange-600" />
                <span>30 Days Monthly Plan</span>
              </h3>
              <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3 text-orange-600" />
                Lunch: 11:00-2:30 | Dinner: 7:30-10:15
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handlePlanChange('monthly_2meals')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  planType === 'monthly_2meals'
                    ? 'border-orange-600 bg-orange-50/80 shadow-xs ring-1 ring-orange-500'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-extrabold text-slate-900 block text-xs">2 Meals / Day (Lunch + Dinner)</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">Lunch + Dinner Daily (30 Days)</span>
                  </div>
                  <span className="text-sm font-black text-orange-700">
                    ₹{gender === 'female' ? '2,500' : '3,000'}
                  </span>
                </div>
                <div className="mt-2 pt-2 border-t border-orange-100 text-[10px] text-orange-700 font-semibold">
                  {gender === 'female' ? '🔥 Girls Special: ₹2500/mo' : '🔥 Boys Regular: ₹3000/mo'}
                </div>
              </button>

              <button
                type="button"
                onClick={() => handlePlanChange('monthly_1meal')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  planType === 'monthly_1meal'
                    ? 'border-orange-600 bg-orange-50/80 shadow-xs ring-1 ring-orange-500'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-extrabold text-slate-900 block text-xs">1 Meal / Day (Lunch Only)</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">Single Meal (Lunch or Dinner)</span>
                  </div>
                  <span className="text-sm font-black text-orange-700">
                    ₹{gender === 'female' ? '1,300' : '1,600'}
                  </span>
                </div>
                <div className="mt-2 pt-2 border-t border-orange-100 text-[10px] text-orange-700 font-semibold">
                  {gender === 'female' ? '✨ Girls: ₹1300/mo' : '✨ Boys: ₹1600/mo'}
                </div>
              </button>
            </div>

            {/* If 1 meal selected, let them choose preference */}
            {planType === 'monthly_1meal' && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs">
                <span className="font-bold text-amber-900 block mb-1.5">
                  Choose 1-Time Preferred Shift:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-amber-200 cursor-pointer">
                    <input
                      type="radio"
                      name="mealPreference"
                      value="lunch_only"
                      checked={mealPreference === 'lunch_only'}
                      onChange={() => setMealPreference('lunch_only')}
                      className="text-orange-600 focus:ring-orange-500"
                    />
                    <span className="font-semibold text-slate-800">Lunch Only (10:30 AM - 2:30 PM)</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-amber-200 cursor-pointer">
                    <input
                      type="radio"
                      name="mealPreference"
                      value="dinner_only"
                      checked={mealPreference === 'dinner_only'}
                      onChange={() => setMealPreference('dinner_only')}
                      className="text-orange-600 focus:ring-orange-500"
                    />
                    <span className="font-semibold text-slate-800">Dinner Only (8:30 PM - 10:30 PM)</span>
                  </label>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-orange-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Valid End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-orange-600 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Plan Fee (₹)</label>
                <input
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Amount Paid Now (₹)</label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs font-bold"
                />
              </div>
            </div>

            {Number(totalAmount) - Number(paidAmount) > 0 && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">
                ⚠️ Pending Balance: ₹{Number(totalAmount) - Number(paidAmount)}. This will be flagged on the customer pass.
              </div>
            )}
          </div>

          <div className="pt-2">
            <label className="block text-slate-700 font-semibold mb-1">Internal Notes (Optional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Referred by Pooja; pays via PhonePe on 5th of every month"
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-orange-600"
            />
          </div>

          {/* Submit */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-orange-600 text-white font-bold text-xs hover:bg-orange-700 shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? 'Saving to Supabase...' : 'Register & Issue QR Pass'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
