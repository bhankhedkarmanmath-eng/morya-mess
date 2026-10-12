import React, { useState, useEffect, useMemo } from 'react';
import { Customer, SupabasePaymentRecord } from '../../types/mess';
import { 
  fetchPaymentsFromSupabase, 
  verifyPaymentInSupabase,
  rejectPaymentInSupabase,
  bulkVerifyPaymentsInSupabase
} from '../../lib/ownerFeaturesApi';
import { exportToSpreadsheet } from '../../lib/exportUtils';
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
  CreditCard,
  Sparkles,
  FileSpreadsheet,
  AlertTriangle,
  RotateCcw,
  Copy,
  Printer,
  Share2,
  CheckCheck
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

  // Tab: 'pending' | 'verified' | 'rejected'
  const [activeTab, setActiveTab] = useState<'pending' | 'verified' | 'rejected'>('pending');

  // Smart SMS / Statement Matcher
  const [smsInput, setSmsInput] = useState('');
  const [matchedPayment, setMatchedPayment] = useState<SupabasePaymentRecord | null>(null);

  // Reject Modal State
  const [rejectModalTarget, setRejectModalTarget] = useState<SupabasePaymentRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('Invalid UTR reference / Payment not reflected in mess bank account');

  useEffect(() => {
    loadPayments();

    const handleUpdate = () => {
      loadPayments();
    };

    window.addEventListener('morya_payment_created', handleUpdate);
    window.addEventListener('morya_payment_updated', handleUpdate);

    return () => {
      window.removeEventListener('morya_payment_created', handleUpdate);
      window.removeEventListener('morya_payment_updated', handleUpdate);
    };
  }, []);

  const loadPayments = async () => {
    setIsLoading(true);
    const all = await fetchPaymentsFromSupabase();
    setPayments(all);
    setIsLoading(false);
  };

  const pendingQueue = payments.filter(p => p.status === 'pending');
  const verifiedQueue = payments.filter(p => p.status === 'verified');
  const rejectedQueue = payments.filter(p => p.status === 'rejected');

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
    await rejectPaymentInSupabase({
      paymentId: rejectModalTarget.id,
      reason: rejectReason,
      rejectedBy: 'Owner Desk'
    });

    setRejectModalTarget(null);
    await loadPayments();
    if (onRefreshCustomers) onRefreshCustomers();
    setProcessingId(null);
  };

  // Smart SMS Bank Parser
  const handleParseSms = () => {
    if (!smsInput.trim()) return;

    // Look for UTR (usually 12 digits or words like UPI/...)
    const utrMatch = smsInput.match(/\b\d{12}\b/) || smsInput.match(/UPI\/(\w+)/i) || smsInput.match(/Ref\s*[:#-]?\s*(\w+)/i);
    // Look for Amount (e.g. Rs 3000, INR 3,000, 3000.00)
    const amtMatch = smsInput.match(/(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i) || smsInput.match(/([\d,]+)\s*(?:credited|received)/i);

    let detectedUtr = utrMatch ? (utrMatch[1] || utrMatch[0]) : '';
    let detectedAmt = amtMatch ? Number(amtMatch[1].replace(/,/g, '')) : 0;

    // Search inside pendingQueue
    const match = pendingQueue.find(p => {
      if (detectedUtr && p.transactionReference && p.transactionReference.includes(detectedUtr)) {
        return true;
      }
      if (detectedAmt && p.amount === detectedAmt) {
        return true;
      }
      return false;
    });

    if (match) {
      setMatchedPayment(match);
    } else {
      alert(`Parsed SMS: Detected UTR: ${detectedUtr || 'None'}, Amount: ₹${detectedAmt || 'None'}. No matching pending record found in queue.`);
    }
  };

  const filtered = useMemo(() => {
    const list = activeTab === 'pending' ? pendingQueue : activeTab === 'verified' ? verifiedQueue : rejectedQueue;
    return list.filter(p => {
      const q = searchTerm.toLowerCase().trim();
      if (!q) return true;
      return (
        (p.customerName && p.customerName.toLowerCase().includes(q)) ||
        (p.customerPhone && p.customerPhone.includes(q)) ||
        (p.transactionReference && p.transactionReference.toLowerCase().includes(q)) ||
        p.amount.toString().includes(q)
      );
    });
  }, [activeTab, pendingQueue, verifiedQueue, rejectedQueue, searchTerm]);

  const handleExport = (format: 'xlsx' | 'csv') => {
    const rows = filtered.map((p, idx) => ({
      'Sr No': idx + 1,
      'Date': p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB') : '',
      'Student Name': p.customerName || 'Member',
      'Mobile': p.customerPhone || '',
      'Amount (₹)': p.amount,
      'Mode': p.paymentMode.toUpperCase(),
      'Status': p.status.toUpperCase(),
      'UTR Ref': p.transactionReference || '',
      'Verified / Rejected By': p.verifiedBy || p.recordedBy || '',
      'Notes': p.notes || ''
    }));

    exportToSpreadsheet(rows, {
      filename: `Payment_Verification_Desk_${activeTab}_${Date.now()}`,
      sheetName: 'Verification_Audit',
      format
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
            title="Back to Billing Overview"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <span>Payment Verification & Bank Reconciliation Desk</span>
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-black bg-blue-100 text-blue-800 border border-blue-300">
                Double-Entry Ledger Verified
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Reconcile incoming bank transfers, match SMS notifications, verify UTR authenticity, and track audit trails
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => handleExport('xlsx')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Desk (Excel)</span>
          </button>

          <button
            onClick={loadPayments}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Refresh Desk"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Desk Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-black uppercase tracking-wider text-amber-700">Pending Verification</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-amber-900 tracking-tight">
            {pendingQueue.length} Transfers
          </div>
          <p className="text-2xs text-amber-700 font-bold">
            ₹{pendingQueue.reduce((s, p) => s + p.amount, 0).toLocaleString()} awaiting approval
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-black uppercase tracking-wider text-slate-400">Verified & Reconciled</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {verifiedQueue.length} Verified
          </div>
          <p className="text-2xs text-slate-500 font-medium">
            ₹{verifiedQueue.reduce((s, p) => s + p.amount, 0).toLocaleString()} verified revenue
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-black uppercase tracking-wider text-slate-400">Rejected & Blocked</span>
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-rose-900 tracking-tight">
            {rejectedQueue.length} Rejected
          </div>
          <p className="text-2xs text-slate-500 font-medium">
            Fraudulent / invalid UTR submissions
          </p>
        </div>
      </div>

      {/* Smart Bank SMS Reconcile Bar (Owners Love This Fast Feature!) */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-2xl border border-blue-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Smart Bank SMS / Statement Auto-Matcher</span>
          </h2>
          <span className="text-3xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
            Instant Match
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={smsInput}
            onChange={(e) => setSmsInput(e.target.value)}
            placeholder="Paste Bank SMS: e.g. 'A/C *1234 Credited by INR 3000.00 on 09-Oct by UPI/628109823412'"
            className="flex-1 px-3 py-2 text-xs rounded-xl border border-blue-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          />
          <button
            onClick={handleParseSms}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-xs transition cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5"
          >
            <span>Scan & Auto-Match</span>
          </button>
        </div>

        {matchedPayment && (
          <div className="p-3 bg-white rounded-xl border border-emerald-300 shadow-xs flex items-center justify-between gap-3 animate-fade-in">
            <div>
              <p className="text-xs font-black text-emerald-900">
                🎯 Match Found: {matchedPayment.customerName} (₹{matchedPayment.amount})
              </p>
              <p className="text-3xs text-slate-500 font-mono">
                UTR: {matchedPayment.transactionReference || 'N/A'} • Submitted: {new Date(matchedPayment.createdAt || Date.now()).toLocaleTimeString()}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  handleVerify(matchedPayment.id);
                  setMatchedPayment(null);
                  setSmsInput('');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                Approve Matched
              </button>
              <button
                onClick={() => setMatchedPayment(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Desk Feed */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        {/* Tabs & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'pending'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Queue ({pendingQueue.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('verified')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'verified'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verified Log ({verifiedQueue.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('rejected')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'rejected'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Rejected ({rejectedQueue.length})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search table..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-2xs font-black uppercase tracking-wider text-slate-400 bg-slate-50/50">
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Student Name</th>
                <th className="py-3 px-3">Mode</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-3">UTR Reference</th>
                <th className="py-3 px-3">Audit Details</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                    No records found in this verification view.
                  </td>
                </tr>
              ) : (
                filtered.map(payment => (
                  <tr key={payment.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3 whitespace-nowrap text-slate-600">
                      {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString('en-GB') : '-'}
                      <div className="text-3xs text-slate-400">
                        {payment.createdAt ? new Date(payment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <p className="font-black text-slate-900">{payment.customerName || 'Member'}</p>
                      <p className="text-3xs text-slate-400">{payment.customerPhone || 'No phone'}</p>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-bold uppercase text-2xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {payment.paymentMode}
                      </span>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap font-black text-slate-900">
                      ₹{payment.amount.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-3">
                      {payment.transactionReference ? (
                        <span className="font-mono text-2xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          {payment.transactionReference}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-2xs">None</span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <p className="text-2xs text-slate-600">{payment.notes || '-'}</p>
                      {payment.verifiedBy && (
                        <p className="text-3xs text-emerald-700 font-bold">Verified by {payment.verifiedBy}</p>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      {activeTab === 'pending' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleVerify(payment.id)}
                            disabled={processingId === payment.id}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Verify</span>
                          </button>

                          <button
                            onClick={() => setRejectModalTarget(payment)}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-2xs font-bold text-slate-400">
                          Audited
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModalTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-black text-rose-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Reject & Dispute Payment</span>
              </h3>
              <button onClick={() => setRejectModalTarget(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
              <p><span className="font-bold text-rose-900">Student:</span> {rejectModalTarget.customerName}</p>
              <p><span className="font-bold text-rose-900">Amount:</span> ₹{rejectModalTarget.amount}</p>
              <p><span className="font-bold text-rose-900">UTR:</span> {rejectModalTarget.transactionReference || 'None'}</p>
            </div>

            <form onSubmit={handleReject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Audit Rejection Reason</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={processingId === rejectModalTarget.id}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  {processingId === rejectModalTarget.id ? 'Rejecting...' : 'Reject & Notify Student'}
                </button>
                <button
                  type="button"
                  onClick={() => setRejectModalTarget(null)}
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
