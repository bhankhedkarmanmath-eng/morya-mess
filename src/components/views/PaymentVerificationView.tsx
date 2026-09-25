import React, { useState, useEffect } from 'react';
import { Customer, SupabasePaymentRecord } from '../../types/mess';
import { fetchPaymentsFromSupabase, verifyPaymentInSupabase } from '../../lib/ownerFeaturesApi';
import { 
  CheckCircle2, 
  ArrowLeft, 
  Check, 
  X, 
  Clock, 
  AlertCircle, 
  Search,
  RefreshCw,
  Phone,
  ShieldCheck,
  CreditCard
} from 'lucide-react';

interface PaymentVerificationViewProps {
  customers: Customer[];
  onBack: () => void;
  onRefreshCustomers?: () => void;
}

export const PaymentVerificationView: React.FC<PaymentVerificationViewProps> = ({
  customers,
  onBack,
  onRefreshCustomers
}) => {
  const [payments, setPayments] = useState<SupabasePaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Reject Modal State
  const [rejectModalTarget, setRejectModalTarget] = useState<SupabasePaymentRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('Invalid UTR reference / Payment not reflected in mess bank account');

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    setIsLoading(true);
    const all = await fetchPaymentsFromSupabase();
    setPayments(all);
    setIsLoading(false);
  };

  const pendingQueue = payments.filter(p => p.status === 'pending');
  const verifiedQueue = payments.filter(p => p.status === 'verified').slice(0, 15);

  const handleVerify = async (paymentId: string) => {
    setProcessingId(paymentId);
    await verifyPaymentInSupabase(paymentId, 'Owner Desk');
    await loadPayments();
    if (onRefreshCustomers) onRefreshCustomers();
    setProcessingId(null);
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalTarget) return;

    setProcessingId(rejectModalTarget.id);
    // Mark as rejected by setting status locally
    rejectModalTarget.status = 'rejected';
    rejectModalTarget.notes = `REJECTED: ${rejectReason}`;
    
    // Save to local storage
    try {
      const raw = localStorage.getItem('morya_v3_payments_records');
      if (raw) {
        const list: SupabasePaymentRecord[] = JSON.parse(raw);
        const updated = list.map(p => p.id === rejectModalTarget.id ? { ...p, status: 'rejected' as const, notes: `REJECTED: ${rejectReason}` } : p);
        localStorage.setItem('morya_v3_payments_records', JSON.stringify(updated));
      }
    } catch {}

    setRejectModalTarget(null);
    await loadPayments();
    setProcessingId(null);
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
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Payment Verification Desk</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify UTR transactions submitted by students, grant dues credits, or reject invalid claims
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={loadPayments}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Refresh List"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModalTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Reject Payment Verification</span>
              </h3>
              <button onClick={() => setRejectModalTarget(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Rejecting claim of ₹{rejectModalTarget.amount} for {rejectModalTarget.customerName} (UTR: {rejectModalTarget.transactionReference || 'N/A'}).
            </p>

            <form onSubmit={handleReject} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Reason for Rejection</label>
                <input
                  type="text"
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalTarget(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  Confirm Reject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pending Verifications Action Queue */}
      <div className="bg-white rounded-2xl border border-amber-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-amber-50/50 border-b border-amber-200 flex items-center justify-between">
          <h2 className="font-black text-xs text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Awaiting Verification Action ({pendingQueue.length})</span>
          </h2>
          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
            Realtime Queue
          </span>
        </div>

        {pendingQueue.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No pending submissions waiting for verification right now.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingQueue.map(p => (
              <div key={p.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-amber-50/20 transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 text-sm">{p.customerName || 'Diner'}</span>
                    <span className="text-xs text-slate-400 font-mono">({p.customerPhone || 'N/A'})</span>
                    <span className="text-[10px] font-mono uppercase bg-slate-100 px-2 py-0.5 rounded font-bold">
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
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-auto">
                  <div className="text-right">
                    <div className="text-lg font-black text-slate-900">₹{p.amount}</div>
                    <span className="text-[10px] text-amber-600 font-bold">Action Required</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleVerify(p.id)}
                      disabled={processingId === p.id}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Verify</span>
                    </button>
                    <button
                      onClick={() => setRejectModalTarget(p)}
                      disabled={processingId === p.id}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-bold text-xs transition cursor-pointer flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recently Verified Log */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
            Verified Payments Audit Log
          </h3>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {verifiedQueue.map(p => (
            <div key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition">
              <div>
                <div className="font-black text-slate-900 flex items-center gap-2">
                  <span>{p.customerName || 'Diner'}</span>
                  <span className="text-[10px] font-mono text-slate-400">({p.paymentMode.toUpperCase()})</span>
                  {p.transactionReference && (
                    <span className="text-[10px] font-mono text-slate-400">UTR: {p.transactionReference}</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {new Date(p.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              </div>

              <div className="text-right">
                <div className="font-black text-slate-900">₹{p.amount}</div>
                <span className="text-[10px] font-bold text-emerald-600">Verified by Owner Desk</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
