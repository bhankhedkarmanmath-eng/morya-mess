import React, { useState } from 'react';
import { Customer } from '../types/mess';
import { getTodayString } from '../lib/storage';
import { X, CreditCard, CheckCircle2 } from 'lucide-react';

interface PaymentModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onRecordPayment: (customerId: string, amount: number, mode: 'cash' | 'upi' | 'bank_transfer', notes?: string) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  customer,
  isOpen,
  onClose,
  onRecordPayment
}) => {
  const [amount, setAmount] = useState<number | ''>(customer?.balance || '');
  const [mode, setMode] = useState<'cash' | 'upi' | 'bank_transfer'>('upi');
  const [notes, setNotes] = useState('');

  if (!isOpen || !customer) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    onRecordPayment(customer.id, Number(amount), mode, notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Collect Dues / Fee</h3>
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
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
            <span className="text-slate-600 font-medium">Outstanding Balance:</span>
            <span className={`font-bold text-sm ${customer.balance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
              ₹{customer.balance}
            </span>
          </div>

          <div>
            <label htmlFor="input-payment-amount" className="block font-bold text-slate-800 mb-1">
              Payment Amount Received (₹) *
            </label>
            <input
              id="input-payment-amount"
              type="number"
              min="1"
              required
              placeholder="e.g. 1000"
              value={amount}
              onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Payment Mode *
            </label>
            <select
              value={mode}
              onChange={e => setMode(e.target.value as typeof mode)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-500"
            >
              <option value="upi">UPI (GPay / PhonePe / QR)</option>
              <option value="cash">Cash Handover</option>
              <option value="bank_transfer">Direct Bank Transfer</option>
            </select>
          </div>

          <div>
            <label htmlFor="input-payment-notes" className="block font-bold text-slate-800 mb-1">
              Remarks / Transaction Reference
            </label>
            <input
              id="input-payment-notes"
              type="text"
              placeholder="e.g. UPI Ref #892837 or Partial payment"
              value={notes}
              onChange={e => setNotes(e.target.value)}
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
              id="btn-confirm-payment"
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Record Payment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
