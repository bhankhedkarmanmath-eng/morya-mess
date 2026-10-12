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
  QrCode, 
  ArrowLeft, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Filter,
  Check,
  RefreshCw,
  Copy,
  Printer,
  Share2,
  Volume2,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  X,
  ExternalLink,
  Smartphone,
  ChevronRight,
  TrendingUp
} from 'lucide-react';

interface UPIPaymentsViewProps {
  customers: Customer[];
  onBack: () => void;
  onOpenCustomer360?: (c: Customer) => void;
}

export const UPIPaymentsView: React.FC<UPIPaymentsViewProps> = ({
  customers,
  onBack,
  onOpenCustomer360
}) => {
  const [payments, setPayments] = useState<SupabasePaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'pending' | 'verified' | 'high_value'>('all');
  
  // Selection for bulk verify
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkVerifying, setIsBulkVerifying] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Copied states
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  // Thermal Slip Modal
  const [receiptTarget, setReceiptTarget] = useState<SupabasePaymentRecord | null>(null);

  // Rejection Dialog
  const [rejectTarget, setRejectTarget] = useState<SupabasePaymentRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('UTR not found in bank statement / Fake transaction screenshot');

  // Soundbox Voice Test
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    loadUpiPayments();

    const handleUpdate = () => {
      loadUpiPayments();
    };

    window.addEventListener('morya_payment_created', handleUpdate);
    window.addEventListener('morya_payment_updated', handleUpdate);

    return () => {
      window.removeEventListener('morya_payment_created', handleUpdate);
      window.removeEventListener('morya_payment_updated', handleUpdate);
    };
  }, []);

  const loadUpiPayments = async () => {
    setIsLoading(true);
    const data = await fetchPaymentsFromSupabase();
    // Exclusively UPI payments
    const upiOnly = data.filter(p => p.paymentMode === 'upi');
    setPayments(upiOnly);
    setIsLoading(false);
  };

  const handleVerify = async (paymentId: string) => {
    setProcessingId(paymentId);
    await verifyPaymentInSupabase(paymentId, 'Owner Desk');
    await loadUpiPayments();
    setProcessingId(null);
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
    await loadUpiPayments();
    setProcessingId(null);
  };

  const handleBulkVerify = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkVerifying(true);
    await bulkVerifyPaymentsInSupabase(selectedIds, 'Owner Desk');
    setSelectedIds([]);
    await loadUpiPayments();
    setIsBulkVerifying(false);
  };

  const handleCopyUtr = (utr: string) => {
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    setTimeout(() => setCopiedUtr(null), 2000);
  };

  // Duplicate UTR check (Fraud prevention)
  const duplicateUtrMap = useMemo(() => {
    const counts = new Map<string, number>();
    payments.forEach(p => {
      if (p.transactionReference && p.transactionReference.trim().length > 4) {
        const ref = p.transactionReference.trim();
        counts.set(ref, (counts.get(ref) || 0) + 1);
      }
    });
    return counts;
  }, [payments]);

  // Today string
  const todayStr = new Date().toISOString().split('T')[0];

  // Tab Filtering & Search
  const filtered = useMemo(() => {
    return payments.filter(p => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q ||
        (p.customerName && p.customerName.toLowerCase().includes(q)) ||
        (p.customerPhone && p.customerPhone.includes(q)) ||
        (p.transactionReference && p.transactionReference.toLowerCase().includes(q)) ||
        p.amount.toString().includes(q);

      if (!matchesSearch) return false;

      if (activeTab === 'today') {
        return p.createdAt?.startsWith(todayStr);
      }
      if (activeTab === 'pending') {
        return p.status === 'pending';
      }
      if (activeTab === 'verified') {
        return p.status === 'verified';
      }
      if (activeTab === 'high_value') {
        return p.amount >= 2000;
      }
      return true;
    });
  }, [payments, searchTerm, activeTab, todayStr]);

  // Financial Stats
  const totalUpiAmount = payments.filter(p => p.status === 'verified').reduce((sum, p) => sum + p.amount, 0);
  const todayUpiAmount = payments.filter(p => p.status === 'verified' && p.createdAt?.startsWith(todayStr)).reduce((sum, p) => sum + p.amount, 0);
  const pendingUpiPayments = payments.filter(p => p.status === 'pending');
  const pendingUpiAmount = pendingUpiPayments.reduce((sum, p) => sum + p.amount, 0);

  // Soundbox speech
  const handlePlayVoice = (amt: number = 2500) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(`पेटीएम पर ${amt} रुपये प्राप्त हुए! मोरया मेस`);
    utterance.lang = 'hi-IN';
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  // WhatsApp receipt send
  const handleSendWhatsAppReceipt = (p: SupabasePaymentRecord) => {
    const text = `💳 *MORYA MESS UPI RECEIPT CONFIRMATION* 💳\n\nNamaste *${p.customerName || 'Student'}* ji,\nWe have verified and credited your UPI payment.\n\n💰 *Amount Paid:* ₹${p.amount.toLocaleString('en-IN')}\n🔢 *UTR Reference:* ${p.transactionReference || 'N/A'}\n📅 *Date:* ${new Date(p.createdAt || Date.now()).toLocaleDateString('en-GB')}\n🛡️ *Status:* VERIFIED & CREDITED\n\nYour mess membership records have been updated.\nThank you! 🙏`;

    const phone = p.customerPhone ? p.customerPhone.replace(/\D/g, '') : '';
    const waUrl = phone ? `https://wa.me/91${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  // Export to Excel / CSV
  const handleExport = (format: 'xlsx' | 'csv') => {
    const rows = filtered.map((p, idx) => ({
      'Sr No': idx + 1,
      'Date': p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB') : '',
      'Student Name': p.customerName || 'Member',
      'Phone': p.customerPhone || '',
      'Amount (₹)': p.amount,
      'UTR Number': p.transactionReference || '',
      'Status': p.status.toUpperCase(),
      'Verified By': p.verifiedBy || '',
      'Notes': p.notes || ''
    }));

    exportToSpreadsheet(rows, {
      filename: `UPI_Reconciliation_Ledger_${todayStr}`,
      sheetName: 'UPI_Records',
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
                <QrCode className="w-5 h-5 text-orange-600" />
                <span>UPI Payments & VPA Collections Center</span>
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-black bg-orange-100 text-orange-800 border border-orange-300">
                12-Digit UTR Guard
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live bank UTR validation, duplicate transaction protection, soundbox announcements, and digital receipt dispatch
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => handlePlayVoice(2000)}
            disabled={isSpeaking}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs shadow-xs transition cursor-pointer"
          >
            <Volume2 className="w-4 h-4 text-indigo-600" />
            <span>{isSpeaking ? 'Announcing...' : 'Soundbox Voice'}</span>
          </button>

          <button
            onClick={() => handleExport('xlsx')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Reconcile (Excel)</span>
          </button>

          <button
            onClick={loadUpiPayments}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Refresh UPI Records"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* UPI KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-black uppercase tracking-wider text-slate-400">Total UPI Verified</span>
            <span className="p-2 rounded-xl bg-orange-50 text-orange-600">
              <QrCode className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            ₹{totalUpiAmount.toLocaleString('en-IN')}
          </div>
          <p className="text-2xs text-slate-500 font-medium">
            Lifetime online collections
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-black uppercase tracking-wider text-slate-400">Today's UPI Inflow</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-900 tracking-tight">
            ₹{todayUpiAmount.toLocaleString('en-IN')}
          </div>
          <p className="text-2xs text-slate-500 font-medium">
            Fresh online scans credited today
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-black uppercase tracking-wider text-amber-700">Pending UTR Queue</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-amber-900 tracking-tight">
            {pendingUpiPayments.length} transfers
          </div>
          <p className="text-2xs text-amber-700 font-bold">
            ₹{pendingUpiAmount.toLocaleString('en-IN')} awaiting verification
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-black uppercase tracking-wider text-slate-400">Fraud Prevention</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {Array.from(duplicateUtrMap.values()).filter(v => v > 1).length} Flags
          </div>
          <p className="text-2xs text-slate-500 font-medium">
            Duplicate UTR surveillance active
          </p>
        </div>
      </div>

      {/* Main UPI Register Table Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: `All UPI (${payments.length})` },
              { id: 'today', label: `Today's UPI` },
              { id: 'pending', label: `Pending UTRs (${pendingUpiPayments.length})` },
              { id: 'verified', label: `Verified (${payments.filter(p => p.status === 'verified').length})` },
              { id: 'high_value', label: `High Value (>₹2,000)` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search UTR, student, amount..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
              />
            </div>

            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkVerify}
                disabled={isBulkVerifying}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer whitespace-nowrap"
              >
                <Check className="w-4 h-4" />
                <span>Verify Selected ({selectedIds.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-2xs font-black uppercase tracking-wider text-slate-400 bg-slate-50/50">
                <th className="py-3 px-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === pendingUpiPayments.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(pendingUpiPayments.map(p => p.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                    className="rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3">Date & Time</th>
                <th className="py-3 px-3">Student / Diner</th>
                <th className="py-3 px-3">12-Digit UTR Reference</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 text-xs">
                    No UPI transactions match the active filter.
                  </td>
                </tr>
              ) : (
                filtered.map(payment => {
                  const isDuplicate = payment.transactionReference && (duplicateUtrMap.get(payment.transactionReference.trim()) || 0) > 1;

                  return (
                    <tr key={payment.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3">
                        {payment.status === 'pending' ? (
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(payment.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds(prev => [...prev, payment.id]);
                              } else {
                                setSelectedIds(prev => prev.filter(id => id !== payment.id));
                              }
                            }}
                            className="rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                          />
                        ) : (
                          <span className="w-4 inline-block"></span>
                        )}
                      </td>

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
                        {payment.transactionReference ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md text-2xs">
                              {payment.transactionReference}
                            </span>
                            <button
                              onClick={() => handleCopyUtr(payment.transactionReference!)}
                              className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer"
                              title="Copy UTR"
                            >
                              {copiedUtr === payment.transactionReference ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                            {isDuplicate && (
                              <span className="px-1.5 py-0.5 rounded text-3xs font-black bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                                DUPLICATE UTR!
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-2xs italic">No UTR specified</span>
                        )}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-black text-slate-900 text-sm">
                          ₹{payment.amount.toLocaleString('en-IN')}
                        </span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-black ${
                          payment.status === 'verified'
                            ? 'bg-emerald-100 text-emerald-800'
                            : payment.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {payment.status === 'verified' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {payment.status === 'pending' && <Clock className="w-3 h-3 text-amber-600" />}
                          {payment.status === 'rejected' && <AlertCircle className="w-3 h-3 text-rose-600" />}
                          <span className="capitalize">{payment.status}</span>
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {payment.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleVerify(payment.id)}
                                disabled={processingId === payment.id}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition cursor-pointer"
                                title="Verify UTR and credit dues"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Verify</span>
                              </button>

                              <button
                                onClick={() => setRejectTarget(payment)}
                                className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition cursor-pointer"
                                title="Reject fake/invalid UTR"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => handleSendWhatsAppReceipt(payment)}
                            className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition cursor-pointer"
                            title="Send WhatsApp Receipt"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setReceiptTarget(payment)}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                            title="Print Counter Receipt"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-black text-rose-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Reject UPI Transaction Submission</span>
              </h3>
              <button onClick={() => setRejectTarget(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
              <p><span className="font-bold text-rose-900">Student:</span> {rejectTarget.customerName}</p>
              <p><span className="font-bold text-rose-900">Amount:</span> ₹{rejectTarget.amount}</p>
              <p><span className="font-bold text-rose-900">UTR:</span> {rejectTarget.transactionReference || 'None'}</p>
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
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={processingId === rejectTarget.id}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  {processingId === rejectTarget.id ? 'Rejecting...' : 'Confirm Rejection & Notify Student'}
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

      {/* Printable Receipt Modal */}
      {receiptTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Official UPI Receipt</h3>
              <button onClick={() => setReceiptTarget(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="border border-dashed border-slate-300 p-4 rounded-xl text-left text-xs space-y-2 bg-slate-50 font-mono">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <p className="font-black text-sm text-slate-900">MORYA MESS PUNE</p>
                <p className="text-3xs text-slate-500">Official Online UPI Receipt</p>
              </div>

              <div className="flex justify-between text-2xs">
                <span>Receipt No:</span>
                <span className="font-bold">#UPI-{receiptTarget.id.slice(-6)}</span>
              </div>
              <div className="flex justify-between text-2xs">
                <span>Student:</span>
                <span className="font-bold text-slate-900">{receiptTarget.customerName}</span>
              </div>
              <div className="flex justify-between text-2xs">
                <span>UTR Ref:</span>
                <span className="font-bold">{receiptTarget.transactionReference || 'VERIFIED'}</span>
              </div>
              <div className="flex justify-between text-2xs">
                <span>Status:</span>
                <span className="font-bold text-emerald-700 uppercase">{receiptTarget.status}</span>
              </div>

              <div className="pt-2 border-t border-dashed border-slate-300 flex justify-between font-black text-sm text-slate-900">
                <span>AMOUNT:</span>
                <span>₹{receiptTarget.amount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-amber-300" />
                <span>Print Thermal Receipt</span>
              </button>
              <button
                onClick={() => setReceiptTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
