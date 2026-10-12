import React, { useState, useEffect, useMemo } from 'react';
import { Customer, SupabasePaymentRecord } from '../../types/mess';
import { 
  fetchPaymentsFromSupabase, 
  verifyPaymentInSupabase,
  rejectPaymentInSupabase,
  bulkVerifyPaymentsInSupabase
} from '../../lib/ownerFeaturesApi';
import { 
  Clock, 
  ArrowLeft, 
  Check, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  RefreshCw, 
  Phone, 
  Share2, 
  Copy, 
  ShieldCheck, 
  AlertTriangle,
  ExternalLink,
  MessageSquare,
  Smartphone,
  ChevronRight
} from 'lucide-react';

interface PendingPaymentsViewProps {
  customers: Customer[];
  onBack: () => void;
  onRefreshCustomers?: () => void;
  onOpenCustomer360?: (c: Customer) => void;
}

export const PendingPaymentsView: React.FC<PendingPaymentsViewProps> = ({
  customers,
  onBack,
  onRefreshCustomers,
  onOpenCustomer360
}) => {
  const [payments, setPayments] = useState<SupabasePaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkApproving, setIsBulkApproving] = useState(false);

  // Rejection modal
  const [rejectTarget, setRejectTarget] = useState<SupabasePaymentRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('Payment not reflected in bank account / Invalid UTR proof');

  // Copied UTR feedback
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  useEffect(() => {
    loadPending();

    const handleUpdate = () => {
      loadPending();
    };

    window.addEventListener('morya_payment_created', handleUpdate);
    window.addEventListener('morya_payment_updated', handleUpdate);

    return () => {
      window.removeEventListener('morya_payment_created', handleUpdate);
      window.removeEventListener('morya_payment_updated', handleUpdate);
    };
  }, []);

  const loadPending = async () => {
    setIsLoading(true);
    const all = await fetchPaymentsFromSupabase();
    setPayments(all.filter(p => p.status === 'pending'));
    setIsLoading(false);
  };

  const handleVerify = async (paymentId: string) => {
    setProcessingId(paymentId);
    await verifyPaymentInSupabase(paymentId, 'Owner Desk');
    await loadPending();
    if (onRefreshCustomers) onRefreshCustomers();
    setProcessingId(null);
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkApproving(true);
    await bulkVerifyPaymentsInSupabase(selectedIds, 'Owner Desk');
    setSelectedIds([]);
    await loadPending();
    if (onRefreshCustomers) onRefreshCustomers();
    setIsBulkApproving(false);
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget) return;

    setProcessingId(rejectTarget.id);
    await rejectPaymentInSupabase({
      paymentId: rejectTarget.id,
      reason: rejectReason,
      rejectedBy: 'Owner Desk'
    });

    setRejectTarget(null);
    await loadPending();
    if (onRefreshCustomers) onRefreshCustomers();
    setProcessingId(null);
  };

  const handleCopyUtr = (utr: string) => {
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    setTimeout(() => setCopiedUtr(null), 2000);
  };

  // WhatsApp ask for screenshot proof
  const handleAskScreenshotProof = (p: SupabasePaymentRecord) => {
    const text = `🍽️ *MORYA MESS PAYMENT VERIFICATION QUERY* 🍽️\n\nNamaste *${p.customerName || 'Student'}* ji,\nWe received your payment submission of *₹${p.amount.toLocaleString('en-IN')}* (UTR: ${p.transactionReference || 'N/A'}).\n\nKindly share the transaction screenshot from your payment app (Google Pay / PhonePe / Paytm) so we can verify and update your pass balance immediately.\n\nThank you! 🙏`;

    const phone = p.customerPhone ? p.customerPhone.replace(/\D/g, '') : '';
    const waUrl = phone ? `https://wa.me/91${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  const filtered = useMemo(() => {
    return payments.filter(p => {
      const q = searchTerm.toLowerCase().trim();
      if (!q) return true;
      return (
        (p.customerName && p.customerName.toLowerCase().includes(q)) ||
        (p.customerPhone && p.customerPhone.includes(q)) ||
        (p.transactionReference && p.transactionReference.toLowerCase().includes(q)) ||
        p.amount.toString().includes(q)
      );
    });
  }, [payments, searchTerm]);

  const totalPendingAmount = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-amber-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Back to Billing Overview"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                <span>Pending Payments Approval Queue</span>
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                Action Required
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and approve unverified student online transfers submitted through student app or UPI
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <div className="bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-xl font-bold text-amber-900 text-xs">
            Queue: <span className="font-black text-amber-950">{payments.length}</span> (₹{totalPendingAmount.toLocaleString('en-IN')})
          </div>

          {payments.length > 0 && (
            <button
              onClick={() => {
                if (selectedIds.length === payments.length) {
                  setSelectedIds([]);
                } else {
                  setSelectedIds(payments.map(p => p.id));
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              {selectedIds.length === payments.length ? 'Deselect All' : 'Select All'}
            </button>
          )}

          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkApprove}
              disabled={isBulkApproving}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Approve Selected ({selectedIds.length})</span>
            </button>
          )}

          <button
            onClick={loadPending}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Refresh Pending List"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search & Counter Info */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search pending by student, phone, UTR..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
          />
        </div>

        <div className="text-xs text-slate-500 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Verifying transfers will instantly credit dues on the student pass</span>
        </div>
      </div>

      {/* Pending Grid of Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-black text-slate-900 text-base">All Caught Up!</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Zero pending transfers in queue. All student payments are currently verified and reconciled.
            </p>
          </div>
        ) : (
          filtered.map(payment => {
            const customerObj = customers.find(c => c.id === payment.customerId || (payment.customerPhone && c.phone === payment.customerPhone));
            const isSelected = selectedIds.includes(payment.id);

            return (
              <div
                key={payment.id}
                className={`bg-white p-5 rounded-2xl border transition-all space-y-4 shadow-2xs ${
                  isSelected ? 'border-amber-500 ring-2 ring-amber-400/20 bg-amber-50/20' : 'border-slate-200 hover:border-amber-300'
                }`}
              >
                {/* Header of Card */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(prev => [...prev, payment.id]);
                        } else {
                          setSelectedIds(prev => prev.filter(id => id !== payment.id));
                        }
                      }}
                      className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer w-4 h-4"
                    />
                    <div>
                      <h4 className="font-black text-sm text-slate-900">{payment.customerName || 'Member'}</h4>
                      <p className="text-3xs text-slate-400">{payment.customerPhone || 'No phone registered'}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-black text-slate-900">
                      ₹{payment.amount.toLocaleString('en-IN')}
                    </div>
                    <span className="text-3xs font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      {payment.paymentMode.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Details Box */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2 text-xs">
                  {/* UTR */}
                  <div className="flex items-center justify-between">
                    <span className="text-3xs font-bold text-slate-400 uppercase">UTR / Reference:</span>
                    {payment.transactionReference ? (
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-slate-800 text-2xs bg-white px-2 py-0.5 rounded border border-slate-200">
                          {payment.transactionReference}
                        </span>
                        <button
                          onClick={() => handleCopyUtr(payment.transactionReference!)}
                          className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer"
                          title="Copy UTR"
                        >
                          {copiedUtr === payment.transactionReference ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-2xs">Not provided</span>
                    )}
                  </div>

                  {/* Submission Time */}
                  <div className="flex items-center justify-between text-2xs text-slate-500">
                    <span>Submitted:</span>
                    <span>{payment.createdAt ? new Date(payment.createdAt).toLocaleString('en-GB') : '-'}</span>
                  </div>

                  {/* Student Balance snapshot */}
                  {customerObj && (
                    <div className="flex items-center justify-between text-2xs pt-1 border-t border-slate-200/60">
                      <span>Total Current Due:</span>
                      <span className="font-black text-rose-600">₹{(customerObj.balance || 0).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleVerify(payment.id)}
                      disabled={processingId === payment.id}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>{processingId === payment.id ? 'Approving...' : 'Approve & Credit'}</span>
                    </button>

                    <button
                      onClick={() => setRejectTarget(payment)}
                      className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                      title="Reject Payment"
                    >
                      <X className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </div>

                  {/* Secondary actions: WhatsApp proof inquiry & 360 profile */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => handleAskScreenshotProof(payment)}
                      className="text-2xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>Ask For Screenshot (WhatsApp)</span>
                    </button>

                    {customerObj && onOpenCustomer360 && (
                      <button
                        onClick={() => onOpenCustomer360(customerObj)}
                        className="text-2xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>Profile</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reject Reason Dialog */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-black text-rose-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Reject Payment Submission</span>
              </h3>
              <button onClick={() => setRejectTarget(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
              <p><span className="font-bold text-rose-900">Student:</span> {rejectTarget.customerName}</p>
              <p><span className="font-bold text-rose-900">Amount:</span> ₹{rejectTarget.amount}</p>
              <p><span className="font-bold text-rose-900">Submitted UTR:</span> {rejectTarget.transactionReference || 'None'}</p>
            </div>

            <form onSubmit={handleReject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Rejection</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
                <p className="text-3xs text-slate-400 mt-1">This explanation is delivered straight to the student's notification box.</p>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={processingId === rejectTarget.id}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  {processingId === rejectTarget.id ? 'Rejecting...' : 'Reject & Notify Student'}
                </button>
                <button
                  type="button"
                  onClick={() => setRejectTarget(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
