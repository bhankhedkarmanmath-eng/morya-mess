import React, { useState, useEffect, useMemo } from 'react';
import { Customer, SupabasePaymentRecord } from '../../types/mess';
import { fetchPaymentsFromSupabase, recordLedgerAdjustment } from '../../lib/ownerFeaturesApi';
import { 
  FileText, 
  ArrowLeft, 
  Search, 
  User, 
  DollarSign, 
  Printer, 
  Download, 
  ArrowDownLeft, 
  ArrowUpRight,
  Calendar, 
  CreditCard,
  Plus,
  Share2,
  CheckCircle2,
  AlertCircle,
  X,
  Phone,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Clock,
  Filter
} from 'lucide-react';

interface CustomerLedgerViewProps {
  customers: Customer[];
  onBack: () => void;
  initialCustomerId?: string;
  onOpenCustomer360?: (c: Customer) => void;
}

interface LedgerEntry {
  id: string;
  date: string;
  particulars: string;
  type: 'charge' | 'payment' | 'reversal' | 'adjustment';
  debit: number;   // Amount charged (+)
  credit: number;  // Amount paid (-)
  balance: number; // Running balance
  ref?: string;
}

export const CustomerLedgerView: React.FC<CustomerLedgerViewProps> = ({
  customers,
  onBack,
  initialCustomerId,
  onOpenCustomer360
}) => {
  const [selectedCustId, setSelectedCustId] = useState(initialCustomerId || customers[0]?.id || '');
  const [payments, setPayments] = useState<SupabasePaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | 'this_month' | 'last_3_months'>('all');

  // Manual Adjustment Modal State
  const [isAdjModalOpen, setIsAdjModalOpen] = useState(false);
  const [adjType, setAdjType] = useState<'debit' | 'credit'>('debit');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjReason, setAdjReason] = useState('Extra Guest Meal Charges');
  const [isSavingAdj, setIsSavingAdj] = useState(false);
  const [adjSuccessBanner, setAdjSuccessBanner] = useState<string | null>(null);

  // Copied or shared feedback
  const [shareSuccess, setShareSuccess] = useState(false);

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
    const data = await fetchPaymentsFromSupabase();
    setPayments(data);
    setIsLoading(false);
  };

  const activeCustomer = customers.find(c => c.id === selectedCustId);

  // Filter customers for dropdown/search
  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    const q = searchTerm.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.hostelOrAddress && c.hostelOrAddress.toLowerCase().includes(q))
    );
  }, [customers, searchTerm]);

  // Build Chronological Ledger for selected customer
  const allLedgerEntries = useMemo(() => {
    if (!activeCustomer) return [];

    const entries: LedgerEntry[] = [];
    let runningBalance = 0;

    // 1. Initial Plan Charge Entry
    const planRate = activeCustomer.totalAmount || 3000;
    runningBalance += planRate;
    entries.push({
      id: `charge-init-${activeCustomer.id}`,
      date: activeCustomer.startDate || new Date().toISOString().split('T')[0],
      particulars: `Monthly Subscription Plan (${activeCustomer.planType?.replace(/_/g, ' ') || '2 Meals'})`,
      type: 'charge',
      debit: planRate,
      credit: 0,
      balance: runningBalance,
      ref: 'SUB-PLAN-01'
    });

    // 2. Payments, Adjustments & Reversals for this customer
    const custPayments = payments
      .filter(p => p.customerId === activeCustomer.id || (activeCustomer.phone && p.customerPhone === activeCustomer.phone))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    custPayments.forEach(p => {
      const isReversal = p.isReversal || p.status === 'reversed';
      const isVerified = p.status === 'verified';
      const isAdjustment = p.paymentMode === 'adjustment' || (p.notes && p.notes.startsWith('LEDGER_'));

      if (isReversal) {
        runningBalance += Math.abs(p.amount);
        entries.push({
          id: p.id,
          date: p.createdAt ? p.createdAt.split('T')[0] : '2026-10-01',
          particulars: `Payment Reversal: ${p.reversalReason || p.notes || 'Reversed'}`,
          type: 'reversal',
          debit: Math.abs(p.amount),
          credit: 0,
          balance: runningBalance,
          ref: p.id
        });
      } else if (isAdjustment) {
        if (p.amount < 0) {
          // Adjustment Credit (Discount/Waiver)
          runningBalance -= Math.abs(p.amount);
          entries.push({
            id: p.id,
            date: p.createdAt ? p.createdAt.split('T')[0] : '2026-10-01',
            particulars: `Credit Adjustment: ${p.notes?.replace('LEDGER_CREDIT:', '') || 'Discount Waiver'}`,
            type: 'adjustment',
            debit: 0,
            credit: Math.abs(p.amount),
            balance: runningBalance,
            ref: p.id
          });
        } else {
          // Adjustment Debit (Extra Charges/Penalty)
          runningBalance += Math.abs(p.amount);
          entries.push({
            id: p.id,
            date: p.createdAt ? p.createdAt.split('T')[0] : '2026-10-01',
            particulars: `Debit Adjustment: ${p.notes?.replace('LEDGER_DEBIT:', '') || 'Extra Charge'}`,
            type: 'adjustment',
            debit: Math.abs(p.amount),
            credit: 0,
            balance: runningBalance,
            ref: p.id
          });
        }
      } else if (isVerified) {
        runningBalance -= Math.abs(p.amount);
        entries.push({
          id: p.id,
          date: p.createdAt ? p.createdAt.split('T')[0] : '2026-10-01',
          particulars: `${p.paymentMode.toUpperCase()} Payment Received (${p.transactionReference ? `UTR: ${p.transactionReference}` : 'Counter Cash'})`,
          type: 'payment',
          debit: 0,
          credit: Math.abs(p.amount),
          balance: runningBalance,
          ref: p.transactionReference || p.id
        });
      }
    });

    return entries;
  }, [activeCustomer, payments]);

  // Apply time filter
  const ledgerEntries = useMemo(() => {
    if (timeFilter === 'all') return allLedgerEntries;
    const now = new Date();
    const currentMonthPrefix = now.toISOString().substring(0, 7);

    if (timeFilter === 'this_month') {
      return allLedgerEntries.filter(e => e.date.startsWith(currentMonthPrefix));
    }

    if (timeFilter === 'last_3_months') {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(now.getMonth() - 3);
      return allLedgerEntries.filter(e => new Date(e.date) >= threeMonthsAgo);
    }

    return allLedgerEntries;
  }, [allLedgerEntries, timeFilter]);

  const totalCharges = ledgerEntries.reduce((sum, e) => sum + e.debit, 0);
  const totalPaid = ledgerEntries.reduce((sum, e) => sum + e.credit, 0);
  const netDue = Math.max(0, totalCharges - totalPaid);

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer || !adjAmount || Number(adjAmount) <= 0) return;

    setIsSavingAdj(true);
    const res = await recordLedgerAdjustment({
      customerId: activeCustomer.id,
      customerName: activeCustomer.name,
      type: adjType,
      amount: Number(adjAmount),
      reason: adjReason,
      recordedBy: 'Owner Desk'
    });

    if (res.success) {
      setAdjSuccessBanner(`Successfully recorded ${adjType.toUpperCase()} of ₹${adjAmount} for ${activeCustomer.name}`);
      setAdjAmount('');
      setIsAdjModalOpen(false);
      await loadPayments();
      setTimeout(() => setAdjSuccessBanner(null), 4000);
    }
    setIsSavingAdj(false);
  };

  const handleSendWhatsAppLedger = () => {
    if (!activeCustomer || !activeCustomer.phone) {
      alert('Student phone number not available');
      return;
    }

    const cleanPhone = activeCustomer.phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const message = 
`📋 *MORYA MESS - FINANCIAL LEDGER STATEMENT*
👤 Student: *${activeCustomer.name}*
📱 Phone: ${activeCustomer.phone}
🏢 Room/Hostel: ${activeCustomer.hostelOrAddress || 'N/A'}
🍛 Plan: ${activeCustomer.planType?.replace(/_/g, ' ')}

📊 *ACCOUNT SUMMARY:*
• Total Debits (Charges): ₹${totalCharges.toLocaleString()}
• Total Credits (Paid): ₹${totalPaid.toLocaleString()}
• *CURRENT OUTSTANDING DUE: ₹${netDue.toLocaleString()}*

📜 *RECENT TRANSACTIONS:*
${ledgerEntries.slice(-5).map(e => `• ${e.date}: ${e.particulars} -> ${e.debit > 0 ? `+₹${e.debit}` : `-₹${e.credit}`} (Bal: ₹${e.balance})`).join('\n')}

💳 Please clear your pending dues at the mess counter or via UPI QR.
🚩 *॥ श्री गणेशाय नमः • मोरया मेस ॥*`;

    window.open(`https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`, '_blank');
    setShareSuccess(true);
    setTimeout(() => setShareSuccess(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!activeCustomer) return;
    let csv = `MORYA MESS - FINANCIAL LEDGER STATEMENT\n`;
    csv += `Customer,${activeCustomer.name},Phone,${activeCustomer.phone}\n`;
    csv += `Plan,${activeCustomer.planType},Date Range,${activeCustomer.startDate} to ${activeCustomer.endDate}\n\n`;
    csv += `Date,Particulars,Type,Debit (Rs),Credit (Rs),Running Balance (Rs),Reference\n`;
    ledgerEntries.forEach(e => {
      csv += `"${e.date}","${e.particulars}","${e.type}",${e.debit},${e.credit},${e.balance},"${e.ref || ''}"\n`;
    });
    csv += `\nTotal Charges,${totalCharges},Total Paid,${totalPaid},Closing Balance Due,${netDue}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Ledger_${activeCustomer.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header Command Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Back to Billing"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                <FileText className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Customer Financial Ledger
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                Double-Entry Audit
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Deterministic chronological statement of subscriptions, daily meal charges, payments, and running balance.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAdjModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Adjustment / Fee</span>
          </button>
          <button
            onClick={handleSendWhatsAppLedger}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer active:scale-95"
          >
            <Share2 className="w-4 h-4" />
            <span>WhatsApp Statement</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {adjSuccessBanner && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{adjSuccessBanner}</span>
          </div>
          <button onClick={() => setAdjSuccessBanner(null)} className="p-1 hover:bg-emerald-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Student Selector & Fast Filter Bar */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-xl">
            <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Select Student Account</span>
            </label>
            <div className="relative">
              <select
                value={selectedCustId}
                onChange={(e) => setSelectedCustId(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} • {c.phone} {c.hostelOrAddress ? `(${c.hostelOrAddress})` : ''} — Due: ₹{(c.balance || 0).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Time Filter Pills */}
          <div className="flex items-center gap-2 self-start md:self-end">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filter:
            </span>
            {(['all', 'this_month', 'last_3_months'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setTimeFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  timeFilter === tab
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab === 'all' ? 'All History' : tab === 'this_month' ? 'Current Month' : 'Last 3 Months'}
              </button>
            ))}
          </div>
        </div>

        {/* Customer Profile & Live Balances */}
        {activeCustomer && (
          <div className="pt-4 border-t border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>{activeCustomer.name}</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-slate-100 text-slate-700">
                    {activeCustomer.planType?.replace(/_/g, ' ')}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Phone: {activeCustomer.phone} • Room: {activeCustomer.hostelOrAddress || 'General Hostel'} • Cycle: {activeCustomer.startDate} to {activeCustomer.endDate}
                </p>
              </div>

              {onOpenCustomer360 && (
                <button
                  onClick={() => onOpenCustomer360(activeCustomer)}
                  className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 transition cursor-pointer"
                >
                  View 360° Profile
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Monthly Plan Rate</span>
                <span className="text-xl font-black text-slate-800 mt-0.5 block">₹{(activeCustomer.totalAmount || 3000).toLocaleString()}</span>
                <span className="text-[10px] text-slate-500">Base subscription tariff</span>
              </div>
              <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200">
                <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider block">Total Charges (Debits)</span>
                <span className="text-xl font-black text-rose-700 mt-0.5 block">₹{totalCharges.toLocaleString()}</span>
                <span className="text-[10px] text-rose-600">Plan fees + extra charges</span>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">Total Received (Credits)</span>
                <span className="text-xl font-black text-emerald-700 mt-0.5 block">₹{totalPaid.toLocaleString()}</span>
                <span className="text-[10px] text-emerald-600">UPI + Cash receipts</span>
              </div>
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
                <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider block">Current Balance Due</span>
                <span className="text-xl font-black text-amber-900 mt-0.5 block">₹{netDue.toLocaleString()}</span>
                <span className="text-[10px] text-amber-700 font-bold">
                  {netDue === 0 ? 'Fully Cleared ✨' : 'Outstanding Payment'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Double-Entry Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Chronological Transaction Entries
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
              {ledgerEntries.length} Records
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Sort: Oldest to Newest (Audit Trail)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Particulars / Event Details</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Reference ID</th>
                <th className="px-5 py-3.5 text-right text-rose-700">Debit (+)</th>
                <th className="px-5 py-3.5 text-right text-emerald-700">Credit (-)</th>
                <th className="px-5 py-3.5 text-right font-black text-slate-900">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ledgerEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    No transactions recorded for this student yet.
                  </td>
                </tr>
              ) : (
                ledgerEntries.map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {entry.date}
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-bold text-slate-900 block">{entry.particulars}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        entry.type === 'charge' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                        entry.type === 'payment' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        entry.type === 'reversal' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        {entry.type}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-[11px] text-slate-500">
                      {entry.ref || '—'}
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-rose-600">
                      {entry.debit > 0 ? `+₹${entry.debit.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-emerald-600">
                      {entry.credit > 0 ? `-₹${entry.credit.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-5 py-4 text-right font-black text-slate-900 text-sm">
                      ₹{entry.balance.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {ledgerEntries.length > 0 && (
              <tfoot className="bg-slate-50/90 font-black text-xs border-t-2 border-slate-200">
                <tr>
                  <td colSpan={4} className="px-5 py-3.5 text-slate-700 uppercase text-[11px]">
                    Total Statement Net
                  </td>
                  <td className="px-5 py-3.5 text-right text-rose-700">
                    +₹{totalCharges.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 text-right text-emerald-700">
                    -₹{totalPaid.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 text-right text-purple-700 text-sm">
                    ₹{netDue.toLocaleString()} Due
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Manual Adjustment Modal */}
      {isAdjModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
                  <Plus className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900">Record Ledger Adjustment</h3>
                  <p className="text-xs text-slate-500">For {activeCustomer?.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAdjModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-4">
              {/* Type Switcher */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Adjustment Type</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setAdjType('debit');
                      setAdjReason('Extra Guest Meal / Special Diet Charge');
                    }}
                    className={`py-2 text-xs font-black rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      adjType === 'debit' 
                        ? 'bg-rose-600 text-white shadow-2xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>Debit (+) Extra Fee</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdjType('credit');
                      setAdjReason('Special Discount / Absence Waiver');
                    }}
                    className={`py-2 text-xs font-black rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      adjType === 'credit' 
                        ? 'bg-emerald-600 text-white shadow-2xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Credit (-) Discount</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {adjType === 'debit' ? 'Increases outstanding dues (+)' : 'Reduces outstanding dues (-)'}
                </p>
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Adjustment Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    min="1"
                    required
                    value={adjAmount}
                    onChange={(e) => setAdjAmount(e.target.value)}
                    placeholder="e.g. 150"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-black text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Reason / Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Reason / Particulars</label>
                <input
                  type="text"
                  required
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="e.g. Guest Meal, Late Fine, Discount"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdjModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAdj}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isSavingAdj ? 'Saving to Database...' : 'Save Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
