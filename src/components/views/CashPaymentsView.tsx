import React, { useState, useEffect, useMemo } from 'react';
import { Customer, SupabasePaymentRecord } from '../../types/mess';
import { fetchPaymentsFromSupabase, recordNewPaymentInSupabase } from '../../lib/ownerFeaturesApi';
import { 
  DollarSign, 
  ArrowLeft, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  RefreshCw,
  User,
  Receipt,
  AlertCircle
} from 'lucide-react';

interface CashPaymentsViewProps {
  customers: Customer[];
  onBack: () => void;
  onRefreshCustomers?: () => void;
  onOpenCustomer360?: (c: Customer) => void;
}

export const CashPaymentsView: React.FC<CashPaymentsViewProps> = ({
  customers,
  onBack,
  onRefreshCustomers,
  onOpenCustomer360
}) => {
  const [payments, setPayments] = useState<SupabasePaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNote, setPaymentNote] = useState('Monthly Mess Fee - Counter Cash Receipt');
  const [recordedBy, setRecordedBy] = useState('Owner Desk');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  useEffect(() => {
    loadCashPayments();
  }, []);

  const loadCashPayments = async () => {
    setIsLoading(true);
    const data = await fetchPaymentsFromSupabase();
    // Exclusively Cash payments
    const cashOnly = data.filter(p => p.paymentMode === 'cash');
    setPayments(cashOnly);
    setIsLoading(false);
  };

  const handleRecordCash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !amount || Number(amount) <= 0) {
      setErrorBanner('Please select customer and enter valid cash amount.');
      return;
    }

    setIsSubmitting(true);
    setSuccessBanner(null);
    setErrorBanner(null);

    const cust = customers.find(c => c.id === selectedCustomerId);

    const res = await recordNewPaymentInSupabase({
      customerId: selectedCustomerId,
      customerName: cust?.name,
      customerPhone: cust?.phone,
      amount: Number(amount),
      paymentMode: 'cash',
      status: 'verified',
      notes: paymentNote,
      recordedBy: recordedBy || 'Owner Desk'
    });

    if (res.success) {
      setSuccessBanner(`Cash payment of ₹${amount} recorded successfully for ${cust?.name || 'Customer'}. Subscription balance updated.`);
      setAmount('');
      setPaymentNote('Monthly Mess Fee - Counter Cash Receipt');
      await loadCashPayments();
      if (onRefreshCustomers) onRefreshCustomers();
    } else {
      setErrorBanner(res.error || 'Failed to record cash payment');
    }
    setIsSubmitting(false);
  };

  const filtered = useMemo(() => {
    return payments.filter(p => {
      const q = searchTerm.toLowerCase().trim();
      if (!q) return true;
      return (
        (p.customerName && p.customerName.toLowerCase().includes(q)) ||
        (p.customerPhone && p.customerPhone.includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q)) ||
        p.amount.toString().includes(q)
      );
    });
  }, [payments, searchTerm]);

  const totalCashCollected = payments.filter(p => p.status === 'verified').reduce((sum, p) => sum + p.amount, 0);

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
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <span>Cash Payments Management Desk</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Record counter cash collections and audit cash receipt history
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto text-xs">
          <div className="bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-xl font-bold text-emerald-800">
            Total Cash Collected: <span className="font-black">₹{totalCashCollected.toLocaleString()}</span>
          </div>
          <button
            onClick={loadCashPayments}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Refresh Cash List"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top Section: "+ Record Cash Payment" Working Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="font-black text-sm text-slate-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>Record New Cash Payment</span>
          </h2>
          <span className="text-xs font-bold text-slate-400">Direct Desk Receipt</span>
        </div>

        {successBanner && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
        )}

        {errorBanner && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorBanner}</span>
          </div>
        )}

        <form onSubmit={handleRecordCash} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
          <div className="lg:col-span-2">
            <label className="font-bold text-slate-700 block mb-1">Customer / Student</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone}) {c.balance > 0 ? `— Due: ₹${c.balance}` : '— No Dues'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Amount (₹)</label>
            <input
              type="number"
              min="1"
              step="1"
              required
              placeholder="e.g. 3000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-black text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Payment Date</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Recorded By</label>
            <input
              type="text"
              value={recordedBy}
              onChange={(e) => setRecordedBy(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="lg:col-span-4">
            <label className="font-bold text-slate-700 block mb-1">Payment Note / Receipt Remarks</label>
            <input
              type="text"
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              placeholder="e.g. Received cash at counter for month of September"
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Save Cash Entry'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Bottom Section: Cash Payment History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>Cash Payment History Register</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Audited historical record of physical cash received across counter sessions
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search cash entries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading cash payments...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="font-bold text-slate-800 text-sm">No Cash Payments Recorded</h4>
            <p className="text-xs text-slate-500 mt-0.5">Use the form above to record your first counter cash entry.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Amount</th>
                  <th className="px-5 py-3.5">Payment Note</th>
                  <th className="px-5 py-3.5">Date & Time</th>
                  <th className="px-5 py-3.5">Recorded By</th>
                  <th className="px-5 py-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3.5">
                      <div className="font-black text-slate-900">{p.customerName || 'Diner'}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{p.customerPhone || 'N/A'}</div>
                    </td>
                    <td className="px-5 py-3.5 font-black text-emerald-700 text-sm">
                      ₹{p.amount}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 font-medium">
                      {p.notes || 'Counter cash receipt'}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">
                      <div>{new Date(p.createdAt).toLocaleDateString()}</div>
                      <div className="text-slate-400">{new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 font-medium">
                      {p.recordedBy || 'Owner Desk'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Verified Cash</span>
                      </span>
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
