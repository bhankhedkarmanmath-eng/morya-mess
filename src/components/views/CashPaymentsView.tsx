import React, { useState, useEffect, useMemo } from 'react';
import { Customer, SupabasePaymentRecord } from '../../types/mess';
import { 
  fetchPaymentsFromSupabase, 
  recordNewPaymentInSupabase,
  reversePaymentInSupabase 
} from '../../lib/ownerFeaturesApi';
import { exportToSpreadsheet } from '../../lib/exportUtils';
import { 
  Banknote, 
  ArrowLeft, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  User, 
  Receipt, 
  AlertCircle, 
  Printer, 
  X,
  Share2,
  Calculator,
  RotateCcw,
  FileSpreadsheet,
  Coins,
  ShieldCheck,
  TrendingUp,
  DollarSign
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

  // POS Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNote, setPaymentNote] = useState('Monthly Mess Fee - Counter Cash Receipt');
  const [recordedBy, setRecordedBy] = useState('Owner Desk');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Cash Denominations Counter & Change Calculator
  const [showCalculator, setShowCalculator] = useState(false);
  const [denominations, setDenominations] = useState<{ [key: string]: number }>({
    '500': 0,
    '200': 0,
    '100': 0,
    '50': 0,
    '20': 0,
    '10': 0
  });

  // Receipt Modal
  const [receiptTarget, setReceiptTarget] = useState<SupabasePaymentRecord | null>(null);

  // Reversal Modal
  const [reversalTarget, setReversalTarget] = useState<SupabasePaymentRecord | null>(null);
  const [reversalReason, setReversalReason] = useState('Accidental duplicate cash entry / Customer refunded');
  const [isReversing, setIsReversing] = useState(false);

  useEffect(() => {
    loadCashPayments();

    const handleUpdate = () => {
      loadCashPayments();
    };

    window.addEventListener('morya_payment_created', handleUpdate);
    window.addEventListener('morya_payment_updated', handleUpdate);

    return () => {
      window.removeEventListener('morya_payment_created', handleUpdate);
      window.removeEventListener('morya_payment_updated', handleUpdate);
    };
  }, []);

  const loadCashPayments = async () => {
    setIsLoading(true);
    const data = await fetchPaymentsFromSupabase();
    // Exclusively Cash payments
    const cashOnly = data.filter(p => p.paymentMode === 'cash');
    setPayments(cashOnly);
    setIsLoading(false);
  };

  // Selected customer object
  const currentCustomer = customers.find(c => c.id === selectedCustomerId);

  // Calculate total cash tendered from denominations
  const totalTendered = useMemo(() => {
    let sum = 0;
    Object.entries(denominations).forEach(([note, count]) => {
      sum += Number(note) * (count || 0);
    });
    return sum;
  }, [denominations]);

  const changeDue = Math.max(0, totalTendered - (Number(amount) || 0));

  const handleRecordCash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !amount || Number(amount) <= 0) {
      setErrorBanner('Please select a customer and enter a valid cash amount.');
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
      setSuccessBanner(`Cash payment of ₹${amount} recorded for ${cust?.name || 'Customer'}. Subscription balance updated!`);
      // Open receipt automatically for instant printing if desired
      const newRecord: SupabasePaymentRecord = {
        id: res.paymentId || `pay-${Date.now()}`,
        customerId: selectedCustomerId,
        customerName: cust?.name || 'Customer',
        customerPhone: cust?.phone,
        messId: 'morya-mess-main',
        amount: Number(amount),
        paymentMode: 'cash',
        status: 'verified',
        notes: paymentNote,
        recordedBy: recordedBy || 'Owner Desk',
        createdAt: new Date().toISOString()
      };
      setReceiptTarget(newRecord);

      setAmount('');
      setDenominations({ '500': 0, '200': 0, '100': 0, '50': 0, '20': 0, '10': 0 });
      setPaymentNote('Monthly Mess Fee - Counter Cash Receipt');
      await loadCashPayments();
      if (onRefreshCustomers) onRefreshCustomers();
    } else {
      setErrorBanner(res.error || 'Failed to record cash payment');
    }
    setIsSubmitting(false);
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
      await loadCashPayments();
      if (onRefreshCustomers) onRefreshCustomers();
      setReversalTarget(null);
    } else {
      alert(res.error || 'Failed to reverse cash payment');
    }
    setIsReversing(false);
  };

  // WhatsApp receipt
  const handleSendWhatsAppReceipt = (p: SupabasePaymentRecord) => {
    const text = `💵 *MORYA MESS CASH RECEIPT* 💵\n\nNamaste *${p.customerName || 'Student'}* ji,\nWe have received your cash payment at the mess counter.\n\n💰 *Amount Received:* ₹${p.amount.toLocaleString('en-IN')}\n📅 *Date:* ${new Date(p.createdAt || Date.now()).toLocaleDateString('en-GB')}\n👤 *Received By:* ${p.recordedBy || 'Owner Desk'}\n📝 *Remarks:* ${p.notes || 'Counter Receipt'}\n\nYour mess pass and ledger balance have been updated.\nThank you! 🙏`;

    const phone = p.customerPhone ? p.customerPhone.replace(/\D/g, '') : '';
    const waUrl = phone ? `https://wa.me/91${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  const todayStr = new Date().toISOString().split('T')[0];

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

  // Totals
  const totalCashAmount = payments.filter(p => p.status === 'verified').reduce((sum, p) => sum + p.amount, 0);
  const todayCashAmount = payments.filter(p => p.status === 'verified' && p.createdAt?.startsWith(todayStr)).reduce((sum, p) => sum + p.amount, 0);

  const handleExport = (format: 'xlsx' | 'csv') => {
    const rows = filtered.map((p, idx) => ({
      'Sr No': idx + 1,
      'Date': p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB') : '',
      'Student Name': p.customerName || 'Member',
      'Phone': p.customerPhone || '',
      'Amount (₹)': p.amount,
      'Status': p.status.toUpperCase(),
      'Recorded By': p.recordedBy || '',
      'Notes': p.notes || ''
    }));

    exportToSpreadsheet(rows, {
      filename: `Cash_Day_Book_${todayStr}`,
      sheetName: 'Cash_Register',
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
                <Banknote className="w-5 h-5 text-emerald-600" />
                <span>Rapid Cash Counter POS & Physical Register</span>
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                Live POS Counter
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              High-speed cash entry for counter rush, change calculator, thermal receipt generation, and cash day-book
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => handleExport('xlsx')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Cash Book (Excel)</span>
          </button>

          <button
            onClick={loadCashPayments}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Refresh Cash Register"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cash KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-black uppercase tracking-wider text-slate-400">Total Cash Inflow</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Banknote className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            ₹{totalCashAmount.toLocaleString('en-IN')}
          </div>
          <p className="text-2xs text-slate-500 font-medium">
            Lifetime verified physical cash receipts
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-black uppercase tracking-wider text-slate-400">Today's Physical Drawer</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Coins className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-amber-900 tracking-tight">
            ₹{todayCashAmount.toLocaleString('en-IN')}
          </div>
          <p className="text-2xs text-slate-500 font-medium">
            Physical cash collected today at counter
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-black uppercase tracking-wider text-slate-400">Total Cash Slips</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Receipt className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {payments.length} Slips
          </div>
          <p className="text-2xs text-slate-500 font-medium">
            Recorded in local & Supabase register
          </p>
        </div>
      </div>

      {/* Main Grid: POS Entry (Left 5) + Cash Register Ledger (Right 7) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Rapid POS Counter Panel (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>Rapid Cash Counter POS</span>
            </h2>
            <button
              type="button"
              onClick={() => setShowCalculator(!showCalculator)}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>{showCalculator ? 'Hide Calculator' : 'Denomination Calc'}</span>
            </button>
          </div>

          {successBanner && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successBanner}</span>
            </div>
          )}

          {errorBanner && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorBanner}</span>
            </div>
          )}

          <form onSubmit={handleRecordCash} className="space-y-4">
            {/* Customer Search & Select */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Student / Customer
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value);
                  const cust = customers.find(c => c.id === e.target.value);
                  if (cust && (cust.balance || 0) > 0) {
                    setAmount((cust.balance || 0).toString());
                  }
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold bg-slate-50"
                required
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone || 'No phone'}) — Due: ₹{(c.balance || 0).toLocaleString()}
                  </option>
                ))}
              </select>

              {currentCustomer && (
                <div className="mt-1.5 flex items-center justify-between text-2xs bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
                  <span className="font-bold text-slate-700">Current Outstanding Balance:</span>
                  <span className="font-black text-rose-600 text-xs">₹{(currentCustomer.balance || 0).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Quick Amount Presets */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-2xs font-bold text-slate-500 uppercase tracking-wider">
                  Quick Amount Presets
                </label>
                {currentCustomer && (currentCustomer.balance || 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmount((currentCustomer.balance || 0).toString())}
                    className="text-3xs font-black text-emerald-700 hover:underline cursor-pointer"
                  >
                    Clear Full Due (₹{currentCustomer.balance})
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {['3000', '1500', '1000', '500', '100'].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      amount === val 
                        ? 'bg-emerald-600 text-white border-emerald-600' 
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    ₹{val}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Cash Amount Received (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-black text-slate-400">₹</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full pl-7 pr-3 py-2 text-sm font-black rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            {/* Denomination Counter Box (Collapsible) */}
            {showCalculator && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <p className="font-bold text-slate-700 text-2xs uppercase tracking-wider">
                  Cash Notes Handed by Student
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {['500', '200', '100', '50', '20', '10'].map(note => (
                    <div key={note} className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                      <span className="text-3xs font-bold text-slate-500 w-7">₹{note}:</span>
                      <input
                        type="number"
                        min="0"
                        value={denominations[note] || ''}
                        onChange={(e) => setDenominations({ ...denominations, [note]: Number(e.target.value) || 0 })}
                        placeholder="0"
                        className="w-full text-xs font-bold text-center focus:outline-none"
                      />
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-2xs">
                  <span>Total Tendered: ₹{totalTendered}</span>
                  <span className={changeDue > 0 ? 'text-amber-700' : 'text-slate-500'}>
                    Return Change: ₹{changeDue}
                  </span>
                </div>
              </div>
            )}

            {/* Notes & Recorded By */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-2xs font-bold text-slate-600 mb-1">Receipt Note</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-600 mb-1">Cash Collector</label>
                <input
                  type="text"
                  value={recordedBy}
                  onChange={(e) => setRecordedBy(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
            >
              <Banknote className="w-4 h-4" />
              <span>{isSubmitting ? 'Recording...' : 'Accept Cash & Print Slip (Instant)'}</span>
            </button>
          </form>
        </div>

        {/* Cash Register Ledger Feed (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>Physical Cash Counter Register</span>
              </h2>
              <p className="text-3xs text-slate-400">Audit trail of all cash collected</p>
            </div>

            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search student or note..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No cash transactions found.
              </div>
            ) : (
              filtered.map(payment => (
                <div
                  key={payment.id}
                  className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/50 flex items-center justify-between gap-3 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs">
                      CASH
                    </span>

                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-900 truncate">
                        {payment.customerName || 'Member'}
                      </p>
                      <p className="text-3xs text-slate-400">
                        {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString('en-GB') : '-'} • by {payment.recordedBy || 'Owner'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-black text-emerald-700">
                        ₹{payment.amount.toLocaleString('en-IN')}
                      </p>
                      <span className={`inline-flex items-center px-2 py-0.2 rounded-full text-3xs font-black ${
                        payment.status === 'verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {payment.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSendWhatsAppReceipt(payment)}
                        className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition cursor-pointer"
                        title="Share WhatsApp Receipt"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setReceiptTarget(payment)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                        title="Print Slip"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>

                      {payment.status === 'verified' && (
                        <button
                          onClick={() => setReversalTarget(payment)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition cursor-pointer"
                          title="Reverse / Refund"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Cash Reversal Modal */}
      {reversalTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-black text-rose-900 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-rose-600" />
                <span>Reverse Cash Entry</span>
              </h3>
              <button onClick={() => setReversalTarget(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
              <p><span className="font-bold text-rose-900">Student:</span> {reversalTarget.customerName}</p>
              <p><span className="font-bold text-rose-900">Amount:</span> ₹{reversalTarget.amount}</p>
              <p className="text-3xs text-rose-700">Reversing will deduct this from verified revenue and add the dues back to the student's balance.</p>
            </div>

            <form onSubmit={handleExecuteReversal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Audit Reason for Refund / Reversal</label>
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
                  {isReversing ? 'Reversing...' : 'Confirm Reversal & Adjust Balance'}
                </button>
                <button
                  type="button"
                  onClick={() => setReversalTarget(null)}
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
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Official Cash Counter Receipt</h3>
              <button onClick={() => setReceiptTarget(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="border border-dashed border-slate-300 p-4 rounded-xl text-left text-xs space-y-2 bg-slate-50 font-mono">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <p className="font-black text-sm text-slate-900">MORYA MESS PUNE</p>
                <p className="text-3xs text-slate-500">Physical Cash Counter Receipt</p>
              </div>

              <div className="flex justify-between text-2xs">
                <span>Receipt ID:</span>
                <span className="font-bold">#CASH-{receiptTarget.id.slice(-6)}</span>
              </div>
              <div className="flex justify-between text-2xs">
                <span>Student:</span>
                <span className="font-bold text-slate-900">{receiptTarget.customerName}</span>
              </div>
              <div className="flex justify-between text-2xs">
                <span>Mode:</span>
                <span className="font-bold text-emerald-700">CASH (IN HAND)</span>
              </div>
              <div className="flex justify-between text-2xs">
                <span>Received By:</span>
                <span>{receiptTarget.recordedBy || 'Owner Desk'}</span>
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
