import React, { useState, useEffect, useMemo } from 'react';
import { Customer, SupabasePaymentRecord } from '../../types/mess';
import { fetchPaymentsFromSupabase, recordNewPaymentInSupabase } from '../../lib/ownerFeaturesApi';
import { pullSyncFromServer } from '../../lib/syncEngine';
import { exportToSpreadsheet } from '../../lib/exportUtils';
import { 
  CreditCard, 
  ArrowLeft, 
  TrendingUp, 
  Clock, 
  DollarSign, 
  QrCode, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  FileText,
  RotateCcw,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Printer,
  Smartphone,
  Banknote,
  UsersRound,
  ShieldCheck,
  FileSpreadsheet,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Phone,
  X,
  BookOpen,
  CalendarDays,
  Sparkles,
  Calculator
} from 'lucide-react';

interface BillingOverviewViewProps {
  customers: Customer[];
  onBack: () => void;
  onNavigateSubModule: (module: 'upi_payments' | 'cash_payments' | 'pending_payments' | 'payment_verification' | 'payment_history' | 'customer_ledger' | 'statement_calc' | 'qr_settings') => void;
  onOpenCustomer360?: (c: Customer) => void;
}

export const BillingOverviewView: React.FC<BillingOverviewViewProps> = ({
  customers,
  onBack,
  onNavigateSubModule,
  onOpenCustomer360
}) => {
  const [payments, setPayments] = useState<SupabasePaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'this_month'>('all');
  const [receiptTarget, setReceiptTarget] = useState<SupabasePaymentRecord | null>(null);

  // Quick Counter Cash Entry Modal
  const [isQuickCashOpen, setIsQuickCashOpen] = useState(false);
  const [quickCustId, setQuickCustId] = useState(customers[0]?.id || '');
  const [quickAmount, setQuickAmount] = useState('');
  const [quickNotes, setQuickNotes] = useState('Counter Cash - Quick Receipt');
  const [isSubmittingQuick, setIsSubmittingQuick] = useState(false);
  const [quickSuccessBanner, setQuickSuccessBanner] = useState<string | null>(null);

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('morya_payment_created', handleUpdate);
    window.addEventListener('morya_payment_updated', handleUpdate);

    return () => {
      window.removeEventListener('morya_payment_created', handleUpdate);
      window.removeEventListener('morya_payment_updated', handleUpdate);
    };
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const data = await fetchPaymentsFromSupabase();
    setPayments(data);
    setIsLoading(false);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    await pullSyncFromServer();
    await loadData();
    setIsSyncing(false);
  };

  // Financial aggregates
  const verifiedPayments = payments.filter(p => p.status === 'verified');
  const pendingPayments = payments.filter(p => p.status === 'pending');

  const totalInflow = verifiedPayments.reduce((sum, p) => sum + p.amount, 0);
  const upiInflow = verifiedPayments.filter(p => p.paymentMode === 'upi').reduce((sum, p) => sum + p.amount, 0);
  const cashInflow = verifiedPayments.filter(p => p.paymentMode === 'cash').reduce((sum, p) => sum + p.amount, 0);

  const pendingAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalOutstandingDues = customers.reduce((sum, c) => sum + (c.balance || 0), 0);

  // Today's collections
  const todayStr = new Date().toISOString().split('T')[0];
  const todayPayments = verifiedPayments.filter(p => p.createdAt?.startsWith(todayStr));
  const todayInflow = todayPayments.reduce((sum, p) => sum + p.amount, 0);
  const todayUpi = todayPayments.filter(p => p.paymentMode === 'upi').reduce((sum, p) => sum + p.amount, 0);
  const todayCash = todayPayments.filter(p => p.paymentMode === 'cash').reduce((sum, p) => sum + p.amount, 0);

  // Top Defaulters (highest balance)
  const topDebtors = useMemo(() => {
    return [...customers]
      .filter(c => (c.balance || 0) > 0)
      .sort((a, b) => (b.balance || 0) - (a.balance || 0))
      .slice(0, 6);
  }, [customers]);

  // Filtered recent transactions
  const currentMonthPrefix = todayStr.substring(0, 7);
  const recentTransactions = useMemo(() => {
    return payments
      .filter(p => {
        // Time filter
        if (timeFilter === 'today' && !p.createdAt?.startsWith(todayStr)) return false;
        if (timeFilter === 'this_month' && !p.createdAt?.startsWith(currentMonthPrefix)) return false;

        const q = searchTerm.toLowerCase().trim();
        if (!q) return true;
        return (
          (p.customerName && p.customerName.toLowerCase().includes(q)) ||
          (p.customerPhone && p.customerPhone.includes(q)) ||
          (p.transactionReference && p.transactionReference.toLowerCase().includes(q)) ||
          p.amount.toString().includes(q)
        );
      })
      .slice(0, 10);
  }, [payments, searchTerm, timeFilter, todayStr, currentMonthPrefix]);

  const handleQuickCashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustId || !quickAmount || Number(quickAmount) <= 0) return;

    setIsSubmittingQuick(true);
    const targetCust = customers.find(c => c.id === quickCustId);
    const res = await recordNewPaymentInSupabase({
      customerId: quickCustId,
      customerName: targetCust?.name,
      customerPhone: targetCust?.phone,
      amount: Number(quickAmount),
      paymentMode: 'cash',
      status: 'verified',
      notes: quickNotes,
      recordedBy: 'Owner Desk'
    });

    if (res.success) {
      setQuickSuccessBanner(`Recorded ₹${quickAmount} Cash for ${targetCust?.name || 'Student'}!`);
      setQuickAmount('');
      setIsQuickCashOpen(false);
      await loadData();
      setTimeout(() => setQuickSuccessBanner(null), 4000);
    }
    setIsSubmittingQuick(false);
  };

  // WhatsApp Daily Closing Share
  const handleShareWhatsAppClosing = () => {
    const text = `💰 *MORYA MESS DAILY FINANCIAL CLOSING* 💰\nDate: *${new Date().toLocaleDateString('en-GB')}*\n\n📊 *TODAY'S COLLECTIONS:* \n• Total Today: *₹${todayInflow.toLocaleString('en-IN')}*\n• UPI / Online: *₹${todayUpi.toLocaleString('en-IN')}*\n• Physical Cash: *₹${todayCash.toLocaleString('en-IN')}*\n• Today Receipts: *${todayPayments.length}*\n\n📈 *LIFETIME TOTALS:* \n• Total Verified Inflow: *₹${totalInflow.toLocaleString('en-IN')}*\n• Total Outstanding Market Dues: *₹${totalOutstandingDues.toLocaleString('en-IN')}*\n• Pending Verifications: *${pendingPayments.length} (₹${pendingAmount.toLocaleString('en-IN')})*\n\n_॥ श्री गणेशाय नमः • मोरया मेस पुणे ॥_`;

    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  // WhatsApp reminder to a specific debtor
  const handleSendReminderToDebtor = (debtor: Customer) => {
    const due = debtor.balance || 0;
    const text = `🍽️ *MORYA MESS PAYMENT REMINDER* 🍽️\n\nNamaste *${debtor.name}* ji,\nThis is a gentle reminder regarding your mess subscription fee.\n\n📌 *Pending Balance Due:* ₹${due.toLocaleString('en-IN')}\n\nPlease clear the pending amount at the mess counter or via UPI at your earliest convenience to continue uninterrupted meals.\n\nThank you! 🙏\n_॥ श्री गणेशाय नमः • मोरया मेस ॥_`;

    const phone = debtor.phone ? debtor.phone.replace(/\D/g, '') : '';
    const waUrl = phone ? `https://wa.me/91${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  // Export full payment data
  const handleExportAll = (format: 'xlsx' | 'csv') => {
    const rows = payments.map((p, idx) => ({
      'Sr No': idx + 1,
      'Date': p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB') : '',
      'Customer Name': p.customerName || 'Member',
      'Mobile': p.customerPhone || '',
      'Amount (INR)': p.amount,
      'Mode': p.paymentMode.toUpperCase(),
      'Status': p.status.toUpperCase(),
      'Reference / UTR': p.transactionReference || '',
      'Recorded By': p.recordedBy || '',
      'Notes': p.notes || ''
    }));

    exportToSpreadsheet(rows, {
      filename: `Morya_Mess_Master_Payment_Ledger_${todayStr}`,
      sheetName: 'Payments_Master',
      format
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header Command Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-orange-100 text-orange-700">
                <CreditCard className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Billing & Payments Master Hub
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Supabase Live
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Complete command center: UPI reconciliation, counter cash, QR standees, double-entry ledgers, and month-end bills.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Sync latest records from cloud"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-orange-600' : ''}`} />
          </button>

          <button
            onClick={() => setIsQuickCashOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Quick Cash Collect</span>
          </button>

          <button
            onClick={handleShareWhatsAppClosing}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-emerald-400" />
            <span>Daily Closing Digest</span>
          </button>
        </div>
      </div>

      {quickSuccessBanner && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{quickSuccessBanner}</span>
          </div>
          <button onClick={() => setQuickSuccessBanner(null)} className="p-1 hover:bg-emerald-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Financial KPIs Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Inflow */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Verified Inflow</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            ₹{totalInflow.toLocaleString('en-IN')}
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex">
            <div 
              style={{ width: `${totalInflow > 0 ? (upiInflow / totalInflow) * 100 : 50}%` }} 
              className="bg-orange-500 h-full" 
              title={`UPI: ₹${upiInflow}`}
            />
            <div 
              style={{ width: `${totalInflow > 0 ? (cashInflow / totalInflow) * 100 : 50}%` }} 
              className="bg-emerald-500 h-full" 
              title={`Cash: ₹${cashInflow}`}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-500 font-bold">
            <span className="text-orange-700">UPI: ₹{upiInflow.toLocaleString()}</span>
            <span className="text-emerald-700">Cash: ₹{cashInflow.toLocaleString()}</span>
          </div>
        </div>

        {/* Today's Inflow */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Today's Collections</span>
            <span className="p-2 rounded-xl bg-orange-50 text-orange-600">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-orange-950 tracking-tight">
            ₹{todayInflow.toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {todayPayments.length} receipts verified today
          </p>
          <div className="flex justify-between text-[11px] text-slate-500 font-bold">
            <span className="text-orange-700">UPI: ₹{todayUpi.toLocaleString()}</span>
            <span className="text-emerald-700">Cash: ₹{todayCash.toLocaleString()}</span>
          </div>
        </div>

        {/* Pending Approval */}
        <div 
          onClick={() => onNavigateSubModule('pending_payments')}
          className="bg-white p-5 rounded-2xl border border-amber-200 shadow-2xs space-y-2 cursor-pointer hover:border-amber-400 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">Pending Approvals</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600 relative">
              <AlertTriangle className="w-4 h-4" />
              {pendingPayments.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></span>
              )}
            </span>
          </div>
          <div className="text-2xl font-black text-amber-900 tracking-tight">
            ₹{pendingAmount.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-amber-700">{pendingPayments.length} transfers waiting</span>
            <span className="text-amber-800 font-bold underline flex items-center gap-0.5">
              Review <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Total Outstanding Dues */}
        <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-600">Total Market Dues</span>
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-rose-950 tracking-tight">
            ₹{totalOutstandingDues.toLocaleString('en-IN')}
          </div>
          <div className="flex justify-between text-xs text-rose-700 font-medium">
            <span>Across all diners</span>
            <span className="font-bold">{topDebtors.length} with dues</span>
          </div>
        </div>

        {/* Active Paying Diners */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Enrolled Diners</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <UsersRound className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {customers.length}
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Active mess members on register
          </p>
        </div>
      </div>

      {/* ALL 8 Workflows & Action Desks Grid */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-600" />
              <span>Section 1: Billing & Payments Feature Suite</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Click any module below to launch its dedicated deep-workflow desk</p>
          </div>
          <span className="text-[11px] text-slate-400 font-bold">8 Dedicated Workspaces</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3.5">
          {/* 1. UPI Payments */}
          <button
            onClick={() => onNavigateSubModule('upi_payments')}
            className="p-4 rounded-2xl border border-orange-200 bg-orange-50/40 hover:bg-orange-100/60 text-left transition cursor-pointer group hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="p-2.5 rounded-xl bg-orange-100 text-orange-700 group-hover:scale-110 transition">
                <Smartphone className="w-5 h-5" />
              </span>
              <ChevronRight className="w-4 h-4 text-orange-400" />
            </div>
            <p className="text-sm font-black text-slate-900">UPI Payments</p>
            <p className="text-xs text-orange-700 mt-0.5 font-bold">₹{upiInflow.toLocaleString()}</p>
            <p className="text-[11px] text-slate-500 mt-1">Soundbox voice, UTR check, WhatsApp receipts</p>
          </button>

          {/* 2. Cash Payments */}
          <button
            onClick={() => onNavigateSubModule('cash_payments')}
            className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-100/60 text-left transition cursor-pointer group hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 group-hover:scale-110 transition">
                <Banknote className="w-5 h-5" />
              </span>
              <ChevronRight className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-sm font-black text-slate-900">Cash Payments</p>
            <p className="text-xs text-emerald-700 mt-0.5 font-bold">₹{cashInflow.toLocaleString()}</p>
            <p className="text-[11px] text-slate-500 mt-1">Currency note counter, change calc, drawer audit</p>
          </button>

          {/* 3. Mess Payment QR */}
          <button
            onClick={() => onNavigateSubModule('qr_settings')}
            className="p-4 rounded-2xl border border-purple-200 bg-purple-50/40 hover:bg-purple-100/60 text-left transition cursor-pointer group hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="p-2.5 rounded-xl bg-purple-100 text-purple-700 group-hover:scale-110 transition">
                <QrCode className="w-5 h-5" />
              </span>
              <ChevronRight className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-sm font-black text-slate-900">Mess QR & UPI ID</p>
            <p className="text-xs text-purple-700 mt-0.5 font-bold">Standee Studio</p>
            <p className="text-[11px] text-slate-500 mt-1">Print table tents, A4 wall posters, dynamic QR</p>
          </button>

          {/* 4. Payment History */}
          <button
            onClick={() => onNavigateSubModule('payment_history')}
            className="p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition cursor-pointer group hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="p-2.5 rounded-xl bg-slate-200 text-slate-700 group-hover:scale-110 transition">
                <FileText className="w-5 h-5" />
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-sm font-black text-slate-900">Payment History</p>
            <p className="text-xs text-slate-600 mt-0.5 font-bold">{payments.length} Transactions</p>
            <p className="text-[11px] text-slate-500 mt-1">Full chronological audit, reversals & excel export</p>
          </button>

          {/* 5. Pending Payments */}
          <button
            onClick={() => onNavigateSubModule('pending_payments')}
            className="p-4 rounded-2xl border border-amber-200 bg-amber-50/40 hover:bg-amber-100/60 text-left transition cursor-pointer group hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="p-2.5 rounded-xl bg-amber-100 text-amber-700 group-hover:scale-110 transition">
                <Clock className="w-5 h-5" />
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black">
                {pendingPayments.length} Waiting
              </span>
            </div>
            <p className="text-sm font-black text-slate-900">Pending Payments</p>
            <p className="text-xs text-amber-700 mt-0.5 font-bold">₹{pendingAmount.toLocaleString()}</p>
            <p className="text-[11px] text-slate-500 mt-1">1-click approve, ageing alerts, batch verification</p>
          </button>

          {/* 6. Payment Verification */}
          <button
            onClick={() => onNavigateSubModule('payment_verification')}
            className="p-4 rounded-2xl border border-blue-200 bg-blue-50/40 hover:bg-blue-100/60 text-left transition cursor-pointer group hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="p-2.5 rounded-xl bg-blue-100 text-blue-700 group-hover:scale-110 transition">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <ChevronRight className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-sm font-black text-slate-900">Payment Verification</p>
            <p className="text-xs text-blue-700 mt-0.5 font-bold">SMS Auto-Match</p>
            <p className="text-[11px] text-slate-500 mt-1">Paste bank SMS, regex UTR parsing, fraud defense</p>
          </button>

          {/* 7. Customer Ledger */}
          <button
            onClick={() => onNavigateSubModule('customer_ledger')}
            className="p-4 rounded-2xl border border-violet-200 bg-violet-50/40 hover:bg-violet-100/60 text-left transition cursor-pointer group hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="p-2.5 rounded-xl bg-violet-100 text-violet-700 group-hover:scale-110 transition">
                <BookOpen className="w-5 h-5" />
              </span>
              <ChevronRight className="w-4 h-4 text-violet-400" />
            </div>
            <p className="text-sm font-black text-slate-900">Customer Ledger</p>
            <p className="text-xs text-violet-700 mt-0.5 font-bold">Double-Entry Audit</p>
            <p className="text-[11px] text-slate-500 mt-1">Debits, credits, running balance, WhatsApp statements</p>
          </button>

          {/* 8. Monthly Settlements & Bills */}
          <button
            onClick={() => onNavigateSubModule('statement_calc')}
            className="p-4 rounded-2xl border border-rose-200 bg-rose-50/40 hover:bg-rose-100/60 text-left transition cursor-pointer group hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="p-2.5 rounded-xl bg-rose-100 text-rose-700 group-hover:scale-110 transition">
                <CalendarDays className="w-5 h-5" />
              </span>
              <ChevronRight className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-sm font-black text-slate-900">Monthly Bills & Settlements</p>
            <p className="text-xs text-rose-700 mt-0.5 font-bold">Digital Invoicing</p>
            <p className="text-[11px] text-slate-500 mt-1">Itemized bills, dynamic QR, batch defaulter roster</p>
          </button>
        </div>
      </div>

      {/* Split Section: Top Defaulters Alert (Left) + Recent Transactions (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Outstanding Defaulters (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Top Dues Defaulters Watchlist</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">1-click WhatsApp dues reminders</p>
            </div>
            <span className="text-xs font-black px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800">
              ₹{topDebtors.reduce((s, c) => s + (c.balance || 0), 0).toLocaleString()} Due
            </span>
          </div>

          <div className="space-y-2.5">
            {topDebtors.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                🎉 Excellent! All customer balances are clear.
              </div>
            ) : (
              topDebtors.map(debtor => (
                <div 
                  key={debtor.id} 
                  className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/30 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 truncate">{debtor.name}</p>
                    <p className="text-xs text-slate-500">{debtor.phone || 'No phone'} • {debtor.hostelOrAddress || 'Hostel'}</p>
                    <p className="text-xs font-black text-rose-600 mt-0.5">
                      Pending Due: ₹{(debtor.balance || 0).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleSendReminderToDebtor(debtor)}
                      className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer active:scale-95"
                      title="Send WhatsApp Dues Reminder"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    {onOpenCustomer360 && (
                      <button
                        onClick={() => onOpenCustomer360(debtor)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                        title="View 360 Profile"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Recent Transactions Feed (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-600" />
                <span>Recent Transactions Audit Feed</span>
              </h2>
              <p className="text-xs text-slate-400">Live cloud synced ledger records</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search student / UTR..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-7 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 w-40 sm:w-48"
                />
              </div>

              <button
                onClick={() => handleExportAll('xlsx')}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                title="Export Excel"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {recentTransactions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No recent payment transactions found.
              </div>
            ) : (
              recentTransactions.map(payment => (
                <div
                  key={payment.id}
                  className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/50 flex items-center justify-between gap-3 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`p-2 rounded-xl text-xs font-black ${
                      payment.paymentMode === 'upi' ? 'bg-orange-50 text-orange-700' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {payment.paymentMode.toUpperCase()}
                    </span>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {payment.customerName || 'Member'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString('en-GB') : ''} • {payment.transactionReference ? `UTR: ${payment.transactionReference}` : payment.paymentMode}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-900">
                        ₹{payment.amount.toLocaleString('en-IN')}
                      </p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${
                        payment.status === 'verified'
                          ? 'bg-emerald-100 text-emerald-800'
                          : payment.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {payment.status}
                      </span>
                    </div>

                    <button
                      onClick={() => setReceiptTarget(payment)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                      title="Print / View Receipt"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Counter Cash Entry Modal */}
      {isQuickCashOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <Banknote className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900">Quick Counter Cash Collection</h3>
                  <p className="text-xs text-slate-500">Record cash & clear dues instantly</p>
                </div>
              </div>
              <button 
                onClick={() => setIsQuickCashOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickCashSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Select Student</label>
                <select
                  value={quickCustId}
                  onChange={(e) => {
                    setQuickCustId(e.target.value);
                    const target = customers.find(c => c.id === e.target.value);
                    if (target && target.balance && target.balance > 0) {
                      setQuickAmount(String(target.balance));
                    }
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} • {c.phone} (Due: ₹{(c.balance || 0).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Cash Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quickAmount}
                    onChange={(e) => setQuickAmount(e.target.value)}
                    placeholder="e.g. 3000"
                    className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-black text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Receipt Note / Particulars</label>
                <input
                  type="text"
                  value={quickNotes}
                  onChange={(e) => setQuickNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuickCashOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingQuick || !quickAmount || Number(quickAmount) <= 0}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingQuick ? 'Saving...' : `Collect ₹${quickAmount || 0}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Thermal / Standard Receipt Modal */}
      {receiptTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Official Payment Receipt</h3>
              <button 
                onClick={() => setReceiptTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="border border-dashed border-slate-300 p-4 rounded-xl text-left text-xs space-y-2 bg-slate-50 font-mono">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <p className="font-black text-sm text-slate-900">MORYA MESS PUNE</p>
                <p className="text-[10px] text-slate-500">Student Mess Fee Counter Slip</p>
              </div>

              <div className="flex justify-between text-[11px]">
                <span>Receipt No:</span>
                <span className="font-bold">#{receiptTarget.id.slice(-6)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Date:</span>
                <span>{new Date(receiptTarget.createdAt || Date.now()).toLocaleDateString('en-GB')}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Student:</span>
                <span className="font-bold text-slate-900">{receiptTarget.customerName}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Mode:</span>
                <span>{receiptTarget.paymentMode.toUpperCase()}</span>
              </div>
              {receiptTarget.transactionReference && (
                <div className="flex justify-between text-[11px]">
                  <span>UTR Ref:</span>
                  <span>{receiptTarget.transactionReference}</span>
                </div>
              )}

              <div className="pt-2 border-t border-dashed border-slate-300 flex justify-between font-black text-sm text-slate-900">
                <span>PAID AMOUNT:</span>
                <span>₹{receiptTarget.amount.toLocaleString('en-IN')}</span>
              </div>

              <div className="text-center pt-2 text-[10px] text-slate-400">
                *** ॥ श्री गणेशाय नमः • THANK YOU ॥ ***
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-amber-300" />
                <span>Print Receipt</span>
              </button>
              <button
                onClick={() => setReceiptTarget(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
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
