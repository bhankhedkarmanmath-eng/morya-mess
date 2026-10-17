import React, { useState, useEffect } from 'react';
import { Customer, MealPreference } from '../types/mess';
import { getTodayString, getStandardFee } from '../lib/storage';
import { X, RefreshCw, CheckCircle2, Sun, Moon, Utensils } from 'lucide-react';

interface RenewalModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onRenew: (
    customerId: string, 
    newStart: string, 
    newEnd: string, 
    amount: number, 
    paid: number, 
    notes?: string,
    planType?: string,
    mealPreference?: MealPreference
  ) => void;
}

export const RenewalModal: React.FC<RenewalModalProps> = ({
  customer,
  isOpen,
  onClose,
  onRenew
}) => {
  const today = getTodayString();
  
  // Compute initial selected plan from existing customer data
  const detectCustomerPlan = (): 'both_meals' | 'lunch_only' | 'dinner_only' => {
    if (!customer) return 'both_meals';
    const pref = (customer.mealPreference || '').toLowerCase();
    const plan = (customer.planType || '').toLowerCase();
    if (pref === 'lunch_only' || plan === 'monthly_lunch_only' || (plan.includes('lunch') && !plan.includes('dinner'))) {
      return 'lunch_only';
    }
    if (pref === 'dinner_only' || plan === 'monthly_dinner_only' || (plan.includes('dinner') && !plan.includes('lunch'))) {
      return 'dinner_only';
    }
    return 'both_meals';
  };

  const [selectedPlan, setSelectedPlan] = useState<'both_meals' | 'lunch_only' | 'dinner_only'>('both_meals');

  // Compute new start date: if customer's end date is in the future, start the day after. Otherwise, start today.
  const initialStart = (() => {
    if (!customer) return today;
    const end = new Date(customer.endDate);
    const curr = new Date(today);
    if (end > curr) {
      const nextDay = new Date(end);
      nextDay.setDate(nextDay.getDate() + 1);
      return nextDay.toISOString().split('T')[0];
    }
    return today;
  })();

  const initialEnd = (() => {
    const d = new Date(initialStart);
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  })();

  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);
  const [amount, setAmount] = useState(2500);
  const [paidAmount, setPaidAmount] = useState(2500);
  const [notes, setNotes] = useState('Monthly Renewal (30 Days)');

  useEffect(() => {
    if (customer) {
      const initialPlan = detectCustomerPlan();
      setSelectedPlan(initialPlan);
      const planCode = initialPlan === 'lunch_only' ? 'monthly_lunch_only' : (initialPlan === 'dinner_only' ? 'monthly_dinner_only' : 'monthly_2meals');
      const fee = getStandardFee(customer.gender, planCode);
      setAmount(fee);
      setPaidAmount(fee);
      setNotes(`Monthly Renewal (${initialPlan === 'lunch_only' ? 'Lunch Only' : (initialPlan === 'dinner_only' ? 'Dinner Only' : '2 Meals')})`);
    }
  }, [customer]);

  const handlePlanSelect = (plan: 'both_meals' | 'lunch_only' | 'dinner_only') => {
    setSelectedPlan(plan);
    if (!customer) return;
    const planCode = plan === 'lunch_only' ? 'monthly_lunch_only' : (plan === 'dinner_only' ? 'monthly_dinner_only' : 'monthly_2meals');
    const fee = getStandardFee(customer.gender, planCode);
    setAmount(fee);
    setPaidAmount(fee);
    setNotes(`Monthly Renewal (${plan === 'lunch_only' ? 'Lunch Only' : (plan === 'dinner_only' ? 'Dinner Only' : '2 Meals')})`);
  };

  if (!isOpen || !customer) return null;

  const handleStartChange = (val: string) => {
    setStartDate(val);
    const d = new Date(val);
    d.setDate(d.getDate() + 30);
    setEndDate(d.toISOString().split('T')[0]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const planType = selectedPlan === 'lunch_only' ? 'monthly_lunch_only' : (selectedPlan === 'dinner_only' ? 'monthly_dinner_only' : 'monthly_2meals');
    const mealPreference: MealPreference = selectedPlan === 'lunch_only' ? 'lunch_only' : (selectedPlan === 'dinner_only' ? 'dinner_only' : 'lunch_dinner');
    onRenew(customer.id, startDate, endDate, Number(amount), Number(paidAmount), notes, planType, mealPreference);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-50/80 border border-orange-200/70 text-orange-900 flex items-center justify-center">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Renew Member Subscription</h3>
              <p className="text-[11px] text-slate-500">{customer.name} ({customer.id})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Plan & Shift Selection */}
          <div className="space-y-2">
            <label className="block font-black text-slate-700 uppercase tracking-wider text-[11px]">
              Select Renewal Pass Plan & Shift
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handlePlanSelect('both_meals')}
                className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                  selectedPlan === 'both_meals'
                    ? 'border-orange-500 bg-orange-50/90 text-orange-950 ring-2 ring-orange-500/30 font-black'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold'
                }`}
              >
                <div className="text-base mb-0.5">🍽️</div>
                <div className="text-[11px]">2 Meals</div>
                <div className="text-[10px] text-orange-700 font-bold mt-0.5">
                  ₹{customer.gender === 'female' ? '2,500' : '3,000'}
                </div>
              </button>

              <button
                type="button"
                onClick={() => handlePlanSelect('lunch_only')}
                className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                  selectedPlan === 'lunch_only'
                    ? 'border-orange-500 bg-orange-50/90 text-orange-950 ring-2 ring-orange-500/30 font-black'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold'
                }`}
              >
                <div className="text-base mb-0.5">☀️</div>
                <div className="text-[11px]">Lunch Only</div>
                <div className="text-[10px] text-orange-700 font-bold mt-0.5">
                  ₹{customer.gender === 'female' ? '1,300' : '1,600'}
                </div>
              </button>

              <button
                type="button"
                onClick={() => handlePlanSelect('dinner_only')}
                className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                  selectedPlan === 'dinner_only'
                    ? 'border-orange-500 bg-orange-50/90 text-orange-950 ring-2 ring-orange-500/30 font-black'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold'
                }`}
              >
                <div className="text-base mb-0.5">🌙</div>
                <div className="text-[11px]">Dinner Only</div>
                <div className="text-[10px] text-orange-700 font-bold mt-0.5">
                  ₹{customer.gender === 'female' ? '1,300' : '1,600'}
                </div>
              </button>
            </div>
            {selectedPlan !== 'both_meals' && (
              <p className="text-[10px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 font-medium">
                🔒 Gate Restriction: Student will ONLY be authorized for {selectedPlan === 'lunch_only' ? 'Lunch shift (दुपार)' : 'Dinner shift (रात्र)'}. Opposite shift scans will be strictly blocked.
              </p>
            )}
          </div>

          {/* Current Expiry & Fee Info */}
          <div className="p-3 bg-orange-50/60 rounded-xl border border-orange-200 text-slate-700">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-bold text-orange-950">
                {customer.gender === 'female' ? 'Girls Hostel Plan' : 'Boys Hostel Plan'}
              </span>
              <span className="text-xs font-black text-orange-700">
                Rate: ₹{amount} / 30 Days
              </span>
            </div>
            <div className="text-[11px] text-slate-600 flex justify-between">
              <span>Current Validity:</span>
              <span className="font-semibold text-slate-800">{customer.startDate} to {customer.endDate}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="input-renew-start" className="block font-bold text-slate-800 mb-1">
                New Start Date
              </label>
              <input
                id="input-renew-start"
                type="date"
                required
                value={startDate}
                onChange={e => handleStartChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label htmlFor="input-renew-end" className="block font-bold text-slate-800 mb-1">
                New End Date (+30 Days)
              </label>
              <input
                id="input-renew-end"
                type="date"
                required
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="input-renew-amount" className="block font-bold text-slate-800 mb-1">
                Renewal Fees (₹)
              </label>
              <input
                id="input-renew-amount"
                type="number"
                min="0"
                required
                value={amount}
                onChange={e => setAmount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label htmlFor="input-renew-paid" className="block font-bold text-emerald-700 mb-1">
                Amount Received (₹)
              </label>
              <input
                id="input-renew-paid"
                type="number"
                min="0"
                required
                value={paidAmount}
                onChange={e => setPaidAmount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="input-renew-notes" className="block font-bold text-slate-800 mb-1">
              Payment Remarks
            </label>
            <input
              id="input-renew-notes"
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Paid via UPI / GPay / Cash at counter"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="btn-confirm-renewal"
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 hover:from-orange-600 hover:to-orange-800 text-white font-bold shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm Renewal</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
