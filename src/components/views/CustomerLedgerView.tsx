import React, { useState, useEffect, useMemo } from 'react';
import { Customer, SupabasePaymentRecord } from '../../types/mess';
import { fetchPaymentsFromSupabase } from '../../lib/ownerFeaturesApi';
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
  CreditCard
} from 'lucide-react';

interface CustomerLedgerViewProps {
  customers: Customer[];
  onBack: () => void;
  initialCustomerId?: string;
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
  initialCustomerId
}) => {
  const [selectedCustId, setSelectedCustId] = useState(initialCustomerId || customers[0]?.id || '');
  const [payments, setPayments] = useState<SupabasePaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    setIsLoading(true);
    const data = await fetchPaymentsFromSupabase();
    setPayments(data);
    setIsLoading(false);
  };

  const activeCustomer = customers.find(c => c.id === selectedCustId);

  // Build Chronological Ledger for selected customer
  const ledgerEntries = useMemo(() => {
    if (!activeCustomer) return [];

    const entries: LedgerEntry[] = [];
    let runningBalance = 0;

    // 1. Initial Plan Charge Entry
    const planRate = activeCustomer.totalAmount || 3000;
    runningBalance += planRate;
    entries.push({
      id: `charge-init-${activeCustomer.id}`,
      date: activeCustomer.startDate || new Date().toISOString().split('T')[0],
      particulars: `Monthly Subscription Plan (${activeCustomer.planType?.replace('_', ' ') || '2 Meals'})`,
      type: 'charge',
      debit: planRate,
      credit: 0,
      balance: runningBalance,
      ref: 'PLAN-FEE'
    });

    // 2. Payments & Adjustments for this customer
    const custPayments = payments
      .filter(p => p.customerId === activeCustomer.id || (activeCustomer.phone && p.customerPhone === activeCustomer.phone))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    custPayments.forEach(p => {
      const isReversal = p.isReversal || p.status === 'reversed';
      const isVerified = p.status === 'verified';

      if (isReversal) {
        runningBalance += Math.abs(p.amount);
        entries.push({
          id: p.id,
          date: p.createdAt.split('T')[0],
          particulars: `Payment Reversal: ${p.reversalReason || p.notes || 'Reversed'}`,
          type: 'reversal',
          debit: Math.abs(p.amount),
          credit: 0,
          balance: runningBalance,
          ref: p.id
        });
      } else if (isVerified) {
        runningBalance -= Math.abs(p.amount);
        entries.push({
          id: p.id,
          date: p.createdAt.split('T')[0],
          particulars: `${p.paymentMode.toUpperCase()} Payment Received (${p.transactionReference ? `UTR: ${p.transactionReference}` : 'Counter'})`,
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

  const totalCharges = ledgerEntries.reduce((sum, e) => sum + e.debit, 0);
  const totalPaid = ledgerEntries.reduce((sum, e) => sum + e.credit, 0);
  const netDue = Math.max(0, totalCharges - totalPaid);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!activeCustomer) return;
    let csv = `MORYA MESS - FINANCIAL LEDGER STATEMENT\n`;
    csv += `Customer,${activeCustomer.name},Phone,${activeCustomer.phone}\n`;
    csv += `Plan,${activeCustomer.planType},Date Range,${activeCustomer.startDate} to ${activeCustomer.endDate}\n\n`;
    csv += `Date,Particulars,Type,Debit (₹),Credit (₹),Running Balance (₹),Reference\n`;
    ledgerEntries.forEach(e => {
      csv += `"${e.date}","${e.particulars}","${e.type}",${e.debit},${e.credit},${e.balance},"${e.ref || ''}"\n`;
    });
    csv += `\nTotal Charges,${totalCharges},Total Paid,${totalPaid},Closing Balance Due,${netDue}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Ledger_${activeCustomer.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
              <FileText className="w-5 h-5 text-purple-600" />
              <span>Customer Financial Ledger</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Chronological statement of subscriptions, payments, adjustments, and running balances
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Ledger</span>
          </button>
        </div>
      </div>

      {/* Customer Selector & Summary Cards */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-600 block mb-1">Select Customer to Inspect</label>
          <select
            value={selectedCustId}
            onChange={(e) => setSelectedCustId(e.target.value)}
            className="w-full sm:max-w-md p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.phone}) - {c.planType?.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        {activeCustomer && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Charges (Debits)</span>
              <span className="text-xl font-black text-slate-900">₹{totalCharges}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100">
              <span className="text-[10px] font-bold text-emerald-800 uppercase block">Total Payments (Credits)</span>
              <span className="text-xl font-black text-emerald-700">₹{totalPaid}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100">
              <span className="text-[10px] font-bold text-rose-800 uppercase block">Closing Balance Due</span>
              <span className="text-xl font-black text-rose-600">₹{netDue}</span>
            </div>
          </div>
        )}
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Particulars / Event</th>
                <th className="px-5 py-3.5">Reference</th>
                <th className="px-5 py-3.5 text-right text-slate-700">Debit (+)</th>
                <th className="px-5 py-3.5 text-right text-emerald-700">Credit (-)</th>
                <th className="px-5 py-3.5 text-right font-black">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ledgerEntries.map(entry => (
                <tr key={entry.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-5 py-3.5 font-mono text-[11px] text-slate-600">
                    {entry.date}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-bold text-slate-900 block">{entry.particulars}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">{entry.type}</span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">
                    {entry.ref || '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right font-bold text-slate-800">
                    {entry.debit > 0 ? `₹${entry.debit}` : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right font-bold text-emerald-600">
                    {entry.credit > 0 ? `₹${entry.credit}` : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right font-black text-slate-900 text-sm">
                    ₹{entry.balance}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
