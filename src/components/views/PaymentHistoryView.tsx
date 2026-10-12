import React, { useState, useEffect, useMemo } from 'react';
import { Customer, SupabasePaymentRecord } from '../../types/mess';
import { 
  fetchPaymentsFromSupabase, 
  reversePaymentInSupabase 
} from '../../lib/ownerFeaturesApi';
import { exportToSpreadsheet } from '../../lib/exportUtils';
import { 
  History, 
  ArrowLeft, 
  Search, 
  Filter, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  X,
  FileSpreadsheet,
  Printer,
  Receipt,
  Share2,
  TrendingUp,
  RefreshCw,
  Clock,
  Banknote,
  Smartphone,
  ShieldAlert
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending' | 'reversed' | 'rejected'>('all');

  // Date Filtering
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'yesterday' | 'week' | 'this_month' | 'last_month' | 'custom'>('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Reversal Modal
  const [isReversalOpen, setIsReversalOpen] = useState(false);
  const [reversalTarget, setReversalTarget] = useState<SupabasePaymentRecord | null>(null);
  const [reversalReason, setReversalReason] = useState('Accidental duplicate entry / Student requested refund');
  const [isReversing, setIsReversing] = useState(false);

  // Receipt Modal
  const [receiptTarget, setReceiptTarget] = useState<SupabasePaymentRecord | null>(null);

  useEffect(() => {
    loadAllPayments();

    const handleUpdate = () => {
      loadAllPayments();
    };

    window.addEventListener('morya_payment_created', handleUpdate);
    window.addEventListener('morya_payment_updated', handleUpdate);

    return () => {
      window.removeEventListener('morya_payment_created', handleUpdate);
      window.removeEventListener('morya_payment_updated', handleUpdate);
    };
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

  // Date filtering logic
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

  const weekAgoDate = new Date(now);
  weekAgoDate.setDate(weekAgoDate.getDate() - 7);

  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const lastMonthNum = now.getMonth() === 0 ? 12 : now.getMonth();
  const lastYearMonth = `${lastMonthYear}-${String(lastMonthNum).padStart(2, '0')}`;

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

      if (!matchesSearch || !matchesMode || !matchesStatus) return false;

      if (!p.createdAt) return datePreset === 'all';

      const pDate = p.createdAt.split('T')[0];

      if (datePreset === 'today') {
        return pDate === todayStr;
      }
      if (datePreset === 'yesterday') {
        return pDate === yesterdayStr;
      }
      if (datePreset === 'week') {
        return new Date(p.createdAt) >= weekAgoDate;
      }
      if (datePreset === 'this_month') {
        return pDate.startsWith(currentYearMonth);
      }
      if (datePreset === 'last_month') {
        return pDate.startsWith(lastYearMonth);
      }
      if (datePreset === 'custom') {
        if (customStartDate && pDate < customStartDate) return false;
        if (customEndDate && pDate > customEndDate) return false;
        return true;
      }

      return true;
    });
  }, [payments, searchTerm, modeFilter, statusFilter, datePreset, customStartDate, customEndDate, todayStr, yesterdayStr, currentYearMonth, lastYearMonth]);

  // Aggregates for active filter selection
  const totalVerifiedInPeriod = filtered.filter(p => p.status === 'verified').reduce((sum, p) => sum + p.amount, 0);
  const upiInPeriod = filtered.filter(p => p.status === 'verified' && p.paymentMode === 'upi').reduce((sum, p) => sum + p.amount, 0);
  const cashInPeriod = filtered.filter(p => p.status === 'verified' && p.paymentMode === 'cash').reduce((sum, p) => sum + p.amount, 0);
  const reversedInPeriod = filtered.filter(p => p.status === 'reversed').length;

  const handleExport = (format: 'xlsx' | 'csv') => {
    const rows = filtered.map((p, idx) => ({
      'Sr No': idx + 1,
      'Date': p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB') : '',
      'Customer Name': p.customerName || 'Member',
      'Mobile': p.customerPhone || '',
      'Amount (₹)': p.amount,
      'Mode': p.paymentMode.toUpperCase(),
      'Status': p.status.toUpperCase(),
      'UTR / Ref': p.transactionReference || '',
      'Recorded / Verified By': p.verifiedBy || p.recordedBy || '',
      'Notes': p.notes || ''
    }));

    exportToSpreadsheet(rows, {
      filename: `Master_Audit_Payment_History_${todayStr}`,
      sheetName: 'Payment_Audit',
      format
    });
  };

  const handleShareWhatsAppReceipt = (p: SupabasePaymentRecord) => {
    const text = `📜 *MORYA MESS OFFICIAL PAYMENT LEDGER RECEIPT* 📜\n\nStudent: *${p.customerName || 'Member'}*\nAmount: *₹${p.amount.toLocaleString('en-IN')}*\nMode: *${p.paymentMode.toUpperCase()}*\nDate: *${new Date(p.createdAt || Date.now()).toLocaleDateString('en-GB')}*\nReference: *${p.transactionReference || 'VERIFIED'}*\nStatus: *${p.status.toUpperCase()}*\n\nThank you for choosing Morya Mess! 🙏`;

    const phone = p.customerPhone ? p.customerPhone.replace(/\D/g, '') : '';
    const waUrl = phone ? `https://wa.me/91${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
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
                <History className="w-5 h-5 text-indigo-600" />
                <span>Master Payment History & Audit Ledger</span>
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-black bg-indigo-100 text-indigo-800 border border-indigo-300">
                Immutable Audit Trail
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Complete historical transaction records, date range ledger, reversal management, and multi-format spreadsheets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => handleExport('xlsx')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-300" />
            <span>Print Audit Sheet</span>
          </button>

          <button
            onClick={loadAllPayments}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Refresh History"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Selected Timeframe Financial KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-black uppercase tracking-wider text-slate-400">Selected Range Total</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            ₹{totalVerifiedInPeriod.toLocaleString('en-IN')}
          </div>
          <p className="text-2xs text-slate-500 font-medium">
            Across {filtered.length} matching transactions
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-black uppercase tracking-wider text-slate-400">UPI Collections</span>
            <span className="p-2 rounded-xl bg-orange-50 text-orange-600">
              <Smartphone className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-orange-900 tracking-tight">
            ₹{upiInPeriod.toLocaleString('en-IN')}
          </div>
          <p className="text-2xs text-slate-500 font-medium">
            Digital online QR & VPA transfers
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-black uppercase tracking-wider text-slate-400">Physical Cash</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Banknote className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-900 tracking-tight">
            ₹{cashInPeriod.toLocaleString('en-IN')}
          </div>
          <p className="text-2xs text-slate-500 font-medium">
            Counter cash receipts
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-black uppercase tracking-wider text-slate-400">Reversals & Refunds</span>
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <RotateCcw className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-rose-900 tracking-tight">
            {reversedInPeriod}
          </div>
          <p className="text-2xs text-slate-500 font-medium">
            Audit-logged reversals
          </p>
        </div>
      </div>

      {/* Filter Control Box */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        {/* Date Presets Row */}
        <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-100">
          <span className="text-2xs font-black uppercase tracking-wider text-slate-400 mr-2 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Date Range:
          </span>
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'week', label: 'Last 7 Days' },
            { id: 'this_month', label: 'This Month' },
            { id: 'last_month', label: 'Last Month' },
            { id: 'all', label: 'All Time' },
            { id: 'custom', label: 'Custom Range' }
          ].map(preset => (
            <button
              key={preset.id}
              onClick={() => setDatePreset(preset.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                datePreset === preset.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Custom Date Pickers */}
        {datePreset === 'custom' && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-600">From Date:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-600">To Date:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white"
              />
            </div>
          </div>
        )}

        {/* Second Row: Mode & Status Filters + Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Mode Select */}
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value as any)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 font-bold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Modes (UPI & Cash)</option>
              <option value="upi">UPI Only</option>
              <option value="cash">Cash Only</option>
              <option value="adjustment">Adjustments & Refunds</option>
            </select>

            {/* Status Select */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 font-bold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="verified">Verified Only</option>
              <option value="pending">Pending Only</option>
              <option value="reversed">Reversed Only</option>
              <option value="rejected">Rejected Only</option>
            </select>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search student, UTR, note, amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>
        </div>

        {/* Master Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-2xs font-black uppercase tracking-wider text-slate-400 bg-slate-50/50">
                <th className="py-3 px-3">Date & Time</th>
                <th className="py-3 px-3">Student Name</th>
                <th className="py-3 px-3">Payment Mode</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-3">Reference / UTR</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 text-xs">
                    No transactions match the selected criteria.
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
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-2xs font-black ${
                        payment.paymentMode === 'upi'
                          ? 'bg-orange-50 text-orange-700'
                          : payment.paymentMode === 'cash'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-purple-50 text-purple-700'
                      }`}>
                        {payment.paymentMode.toUpperCase()}
                      </span>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`font-black text-sm ${
                        payment.amount < 0 ? 'text-rose-600' : 'text-slate-900'
                      }`}>
                        ₹{payment.amount.toLocaleString('en-IN')}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      {payment.transactionReference ? (
                        <span className="font-mono text-2xs bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">
                          {payment.transactionReference}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-2xs">-</span>
                      )}
                      {payment.notes && (
                        <p className="text-3xs text-slate-400 truncate max-w-xs">{payment.notes}</p>
                      )}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-black ${
                        payment.status === 'verified'
                          ? 'bg-emerald-100 text-emerald-800'
                          : payment.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : payment.status === 'reversed'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {payment.status === 'verified' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {payment.status === 'pending' && <Clock className="w-3 h-3 text-amber-600" />}
                        {payment.status === 'reversed' && <RotateCcw className="w-3 h-3 text-rose-600" />}
                        <span className="capitalize">{payment.status}</span>
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleShareWhatsAppReceipt(payment)}
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition cursor-pointer"
                          title="Share WhatsApp Receipt"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setReceiptTarget(payment)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                          title="Print Thermal Slip"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {payment.status === 'verified' && (
                          <button
                            onClick={() => {
                              setReversalTarget(payment);
                              setIsReversalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition cursor-pointer"
                            title="Reverse Payment"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reversal Modal */}
      {isReversalOpen && reversalTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-black text-rose-900 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-rose-600" />
                <span>Reverse Transaction & Re-issue Dues</span>
              </h3>
              <button onClick={() => setIsReversalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
              <p><span className="font-bold text-rose-900">Student:</span> {reversalTarget.customerName}</p>
              <p><span className="font-bold text-rose-900">Original Amount:</span> ₹{reversalTarget.amount}</p>
              <p><span className="font-bold text-rose-900">Mode:</span> {reversalTarget.paymentMode.toUpperCase()}</p>
            </div>

            <form onSubmit={handleExecuteReversal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Reversal</label>
                <textarea
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isReversing}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  {isReversing ? 'Processing Reversal...' : 'Confirm Reversal'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsReversalOpen(false)}
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
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Audit Ledger Receipt</h3>
              <button onClick={() => setReceiptTarget(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="border border-dashed border-slate-300 p-4 rounded-xl text-left text-xs space-y-2 bg-slate-50 font-mono">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <p className="font-black text-sm text-slate-900">MORYA MESS PUNE</p>
                <p className="text-3xs text-slate-500">Official Ledger Audit Slip</p>
              </div>

              <div className="flex justify-between text-2xs">
                <span>Transaction ID:</span>
                <span className="font-bold">#{receiptTarget.id.slice(-8)}</span>
              </div>
              <div className="flex justify-between text-2xs">
                <span>Date:</span>
                <span>{new Date(receiptTarget.createdAt || Date.now()).toLocaleDateString('en-GB')}</span>
              </div>
              <div className="flex justify-between text-2xs">
                <span>Student:</span>
                <span className="font-bold text-slate-900">{receiptTarget.customerName}</span>
              </div>
              <div className="flex justify-between text-2xs">
                <span>Mode:</span>
                <span>{receiptTarget.paymentMode.toUpperCase()}</span>
              </div>
              {receiptTarget.transactionReference && (
                <div className="flex justify-between text-2xs">
                  <span>Reference:</span>
                  <span>{receiptTarget.transactionReference}</span>
                </div>
              )}
              <div className="flex justify-between text-2xs">
                <span>Status:</span>
                <span className="font-bold text-emerald-700 uppercase">{receiptTarget.status}</span>
              </div>

              <div className="pt-2 border-t border-dashed border-slate-300 flex justify-between font-black text-sm text-slate-900">
                <span>PAID AMOUNT:</span>
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
