import React, { useState, useEffect } from 'react';
import { Customer } from '../types/mess';
import { getTodayString, getStandardFee } from '../lib/storage';
import { X, RefreshCw, CheckCircle2 } from 'lucide-react';

interface RenewalModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onRenew: (customerId: string, newStart: string, newEnd: string, amount: number, paid: number, notes?: string) => void;
}

export const RenewalModal: React.FC<RenewalModalProps> = ({
  customer,
  isOpen,
  onClose,
  onRenew
}) => {
  const today = getTodayString();
  
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

  const calculatedStandardFee = customer ? getStandardFee(customer.gender, customer.planType) : 2500;

  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);
  const [amount, setAmount] = useState(calculatedStandardFee);
  const [paidAmount, setPaidAmount] = useState(calculatedStandardFee);
  const [notes, setNotes] = useState('Monthly Renewal (30 Days)');

  useEffect(() => {
    if (customer) {
      const fee = getStandardFee(customer.gender, customer.planType);
      setAmount(fee);
      setPaidAmount(fee);
    }
  }, [customer]);

  if (!isOpen || !customer) return null;

  const handleStartChange = (val: string) => {
    setStartDate(val);
    const d = new Date(val);
    d.setDate(d.getDate() + 30);
    setEndDate(d.toISOString().split('T')[0]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRenew(customer.id, startDate, endDate, Number(amount), Number(paidAmount), notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
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
          {/* Current Expiry & Fee Info */}
          <div className="p-3 bg-orange-50/60 rounded-xl border border-orange-200 text-slate-700">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-bold text-orange-950">
                {customer.gender === 'female' ? 'Girls Hostel Plan' : 'Boys Hostel Plan'}
              </span>
              <span className="text-xs font-black text-orange-700">
                Standard: ₹{getStandardFee(customer.gender, customer.planType)} / 30 Days
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
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 shadow-xs cursor-pointer"
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
