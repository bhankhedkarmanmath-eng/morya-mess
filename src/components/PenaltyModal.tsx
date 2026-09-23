import React, { useState } from 'react';
import { Customer } from '../types/mess';
import { X, AlertTriangle, ShieldAlert } from 'lucide-react';

interface PenaltyModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onApplyPenalty: (customerId: string, amount: number, reason: string) => void;
}

export const PenaltyModal: React.FC<PenaltyModalProps> = ({
  customer,
  isOpen,
  onClose,
  onApplyPenalty
}) => {
  const [amount, setAmount] = useState<number>(60); // Default ₹60 lost card penalty rule
  const [reason, setReason] = useState('Lost QR Pass Re-issue Fee');

  if (!isOpen || !customer) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyPenalty(customer.id, Number(amount), reason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Add Penalty / Card Fine</h3>
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
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 text-[11px] flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>
              <strong>Hostel Mess Rule:</strong> When a student loses their physical/digital ID card or shares credentials, a mandatory fine (default ₹60) is recorded and added to their outstanding ledger until cleared.
            </span>
          </div>

          <div>
            <label htmlFor="input-penalty-amount" className="block font-bold text-slate-800 mb-1">
              Fine Amount (₹)
            </label>
            <input
              id="input-penalty-amount"
              type="number"
              min="10"
              required
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label htmlFor="input-penalty-reason" className="block font-bold text-slate-800 mb-1">
              Infraction Reason
            </label>
            <select
              id="input-penalty-reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-500"
            >
              <option value="Lost QR Pass Re-issue Fee">Lost QR Pass Re-issue Fee (Standard ₹60)</option>
              <option value="Pass Sharing / Unauthorized Person Dining">Pass Sharing / Unauthorized Person Dining</option>
              <option value="Severe Food Wastage Fine">Severe Food Wastage Fine</option>
              <option value="Late Mess Entry After Lockout">Late Mess Entry After Lockout</option>
              <option value="Other Disciplinary Charge">Other Disciplinary Charge</option>
            </select>
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
              id="btn-confirm-penalty"
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 shadow-xs cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Charge Fine to Member</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
