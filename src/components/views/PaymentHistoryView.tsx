import React, { useState, useEffect, useMemo } from 'react';
import { Customer, SupabasePaymentRecord } from '../../types/mess';
import { fetchPaymentsFromSupabase, reversePaymentInSupabase } from '../../lib/ownerFeaturesApi';
import { exportToSpreadsheet } from '../../lib/exportUtils';
import { 
  Clock, 
  ArrowLeft, 
  Search, 
  Filter, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  X,
  FileSpreadsheet
} from 'lucide-react';

interface PaymentHistoryViewProps {
  customers: Customer[];
  onBack: () => void;
  onRefreshCustomers?: () => void;
}

export const PaymentHistoryView: React.FC<PaymentHistoryViewProps> = ({
  customers,
  onBack,
  onRefreshCustomers
}) => {
  const [payments, setPayments] = useState<SupabasePaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modeFilter, setModeFilter] = useState<'all' | 'upi' | 'cash' | 'adjustment'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending' | 'reversed'>('all');

  // Reversal Modal
  const [isReversalOpen, setIsReversalOpen] = useState(false);
  const [reversalTarget, setReversalTarget] = useState<SupabasePaymentRecord | null>(null);
  const [reversalReason, setReversalReason] = useState('Accidental duplicate entry / Student requested refund');
  const [isReversing, setIsReversing] = useState(false);

  useEffect(() => {
    loadAllPayments();
  }, []);

  const loadAllPayments = async () => {
    setIsLoading(true);
    const data = await fetchPaymentsFromSupabase();
    setPayments(data);
    setIsLoading(false);
  };

  const handleExecuteReversal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalTarget) return;

    setIsReversing(true);
    const res = await reversePaymentInSupabase({
      originalPaymentId: reversalTarget.id,
      customerId: reversalTarget.customerId,
      amount: reversalTarget.amount,
      reason: reversalReason,
      reversedBy: 'Owner Desk'
    });

    if (res.success) {
      await loadAllPayments();
      if (onRefreshCustomers) onRefreshCustomers();
      setIsReversalOpen(false);
      setReversalTarget(null);
    } else {
      alert(res.error || 'Failed to reverse payment');
    }
    setIsReversing(false);
  };

  const filtered = useMemo(() => {
    return payments.filter(p => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q ||
        (p.customerName && p.customerName.toLowerCase().includes(q)) ||
        (p.customerPhone && p.customerPhone.includes(q)) ||
        (p.transactionReference && p.transactionReference.toLowerCase().includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q)) ||
        p.amount.toString().includes(q);

      const matchesMode = modeFilter === 'all' || p.paymentMode === modeFilter;
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

      return matchesSearch && matchesMode && matchesStatus;
    });
  }, [payments, searchTerm, modeFilter, statusFilter]);

  const totalFilteredAmount = filtered.filter(p => p.status === 'verified').reduce((sum, p) => sum + p.amount, 0);

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      alert('No data available for the selected filters.');
      return;
    }

    const data = filtered.map(p => ({
      'Payment ID': p.id,
      'Customer Name': p.customerName || 'Diner',
      'Phone Number': p.customerPhone || '',
      'Amount (INR)': Number(p.amount),
      'Payment Mode': p.paymentMode.toUpperCase(),
      'Reference / UTR': p.transactionReference || '',
      'Status': p.status.toUpperCase(),
      'Date': p.createdAt ? p.createdAt.split('T')[0] : '',
      'Recorded By': p.recordedBy || 'Owner Desk',
      'Notes': p.notes || ''
    }));

    exportToSpreadsheet(data, {
      filename: `Morya_Mess_Payments_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Payments_History',
      format: 'xlsx'
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Back to Billing"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <span>Complete Payment History & Audit Ledger</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive chronological log of all cash, UPI, adjustments, and reversals
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search member, phone, UTR, or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1">Mode:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
              {(['all', 'upi', 'cash', 'adjustment'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setModeFilter(m)}
                  className={`px-3 py-1 rounded-lg font-bold capitalize transition cursor-pointer ${
                    modeFilter === m ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <span className="text-xs font-bold text-slate-400 flex items-center gap-1 ml-2">Status:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
              {(['all', 'verified', 'pending', 'reversed'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg font-bold capitalize transition cursor-pointer ${
                    statusFilter === st ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Reversal Modal */}
      {isReversalOpen && reversalTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-rose-600" />
                <span>Execute Payment Reversal</span>
              </h3>
              <button 
                onClick={() => setIsReversalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
              <span className="font-black block">Warning: Financial Reversal</span>
              <p>Reversing #{reversalTarget.id} (₹{reversalTarget.amount}) for {reversalTarget.customerName} will restore their balance due and create an audited negative adjustment.</p>
            </div>

            <form onSubmit={handleExecuteReversal} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Reason for Reversal</label>
                <input
                  type="text"
                  required
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReversalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReversing}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  {isReversing ? 'Reversing...' : 'Confirm Reversal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading payment history...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="font-bold text-slate-800 text-sm">No Payment Records Match</h4>
            <p className="text-xs text-slate-500 mt-0.5">Try resetting the filter toggles.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Amount</th>
                  <th className="px-5 py-3.5">Mode & Reference</th>
                  <th className="px-5 py-3.5">Date & Time</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Notes</th>
                  <th className="px-5 py-3.5 text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3.5">
                      <div className="font-black text-slate-900">{p.customerName || 'Diner'}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{p.customerPhone || 'N/A'}</div>
                    </td>
                    <td className="px-5 py-3.5 font-black text-sm">
                      <span className={p.amount < 0 ? 'text-rose-600' : 'text-slate-900'}>
                        ₹{p.amount}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-bold uppercase font-mono px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700">
                        {p.paymentMode}
                      </span>
                      {p.transactionReference && (
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          UTR: {p.transactionReference}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">
                      <div>{new Date(p.createdAt).toLocaleDateString()}</div>
                      <div className="text-slate-400">{new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        p.status === 'verified' ? 'bg-emerald-100 text-emerald-800' :
                        p.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-[11px] max-w-xs truncate">
                      {p.notes || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {p.status === 'verified' && !p.isReversal && p.amount > 0 && (
                        <button
                          onClick={() => {
                            setReversalTarget(p);
                            setIsReversalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-bold text-[10px] transition cursor-pointer"
                        >
                          Reverse
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
