import React, { useState, useEffect } from 'react';
import { Customer, SupabasePaymentRecord } from '../../types/mess';
import { fetchPaymentsFromSupabase, verifyPaymentInSupabase } from '../../lib/ownerFeaturesApi';
import { 
  CreditCard, 
  ArrowLeft, 
  Check, 
  X, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Search,
  RefreshCw,
  Phone
} from 'lucide-react';

interface PendingPaymentsViewProps {
  customers: Customer[];
  onBack: () => void;
  onRefreshCustomers?: () => void;
}

export const PendingPaymentsView: React.FC<PendingPaymentsViewProps> = ({
  customers,
  onBack,
  onRefreshCustomers
}) => {
  const [pendingPayments, setPendingPayments] = useState<SupabasePaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    setIsLoading(true);
    const all = await fetchPaymentsFromSupabase();
    setPendingPayments(all.filter(p => p.status === 'pending'));
    setIsLoading(false);
  };

  const handleVerify = async (paymentId: string) => {
    setProcessingId(paymentId);
    await verifyPaymentInSupabase(paymentId, 'Owner Desk');
    await loadPending();
    if (onRefreshCustomers) onRefreshCustomers();
    setProcessingId(null);
  };

  const filtered = pendingPayments.filter(p => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      (p.customerName && p.customerName.toLowerCase().includes(q)) ||
      (p.customerPhone && p.customerPhone.includes(q)) ||
      (p.transactionReference && p.transactionReference.toLowerCase().includes(q)) ||
      p.amount.toString().includes(q)
    );
  });

  const totalPendingAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

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
              <Clock className="w-5 h-5 text-amber-500" />
              <span>Pending Payments Queue</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and verify unapproved student transfers (shows ONLY pending records)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto text-xs">
          <div className="bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-xl font-bold text-amber-900">
            Pending Count: <span className="font-black">{pendingPayments.length}</span> (₹{totalPendingAmount})
          </div>
          <button
            onClick={loadPending}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Refresh Pending List"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name, phone, or UTR..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
          />
        </div>
      </div>

      {/* Cards List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
            Loading pending queue...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
            <h4 className="font-black text-slate-900 text-base">All Caught Up!</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              There are currently 0 pending verification payments. All student submissions have been approved.
            </p>
          </div>
        ) : (
          filtered.map(p => (
            <div 
              key={p.id}
              className="bg-white p-5 rounded-2xl border border-amber-200 hover:border-amber-400 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-900 text-sm">{p.customerName || 'Diner'}</span>
                  <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {p.customerPhone || 'N/A'}
                  </span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-mono">
                    {p.paymentMode}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                  {p.transactionReference && (
                    <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      UTR: {p.transactionReference}
                    </span>
                  )}
                  <span>Submitted: {new Date(p.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                  {p.notes && <span className="text-slate-400">"{p.notes}"</span>}
                </div>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-auto">
                <div className="text-right">
                  <div className="text-lg font-black text-slate-900">₹{p.amount}</div>
                  <span className="text-[10px] font-bold text-amber-600 block">Pending Verification</span>
                </div>

                <button
                  onClick={() => handleVerify(p.id)}
                  disabled={processingId === p.id}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{processingId === p.id ? 'Approving...' : 'Approve & Credit'}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
