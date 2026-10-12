import React, { useState, useEffect, useMemo } from 'react';
import { Customer, SupabasePaymentRecord } from '../../types/mess';
import { fetchPaymentsFromSupabase } from '../../lib/ownerFeaturesApi';
import { 
  CreditCard, 
  ArrowLeft, 
  Search, 
  TrendingUp, 
  Clock, 
  DollarSign, 
  QrCode, 
  CheckCircle2, 
  AlertTriangle,
  RotateCcw,
  Download,
  Printer,
  Smartphone,
  Banknote,
  Building2,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import { exportToSpreadsheet } from '../../lib/exportUtils';

interface PaymentReportsViewProps {
  customers: Customer[];
  onBack: () => void;
  onOpenCustomer360?: (c: Customer) => void;
}

export const PaymentReportsView: React.FC<PaymentReportsViewProps> = ({
  customers,
  onBack,
  onOpenCustomer360
}) => {
  const [payments, setPayments] = useState<SupabasePaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modeFilter, setModeFilter] = useState<'all' | 'upi' | 'cash' | 'bank_transfer'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending'>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');

  const todayStr = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  })();

  const thirtyDaysAgo = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  })();

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    setIsLoading(true);
    try {
      const data = await fetchPaymentsFromSupabase();
      // If Supabase returned data, use it; also merge customer payments
      const customerPayments: SupabasePaymentRecord[] = [];
      customers.forEach(c => {
        (c.payments || []).forEach(p => {
          customerPayments.push({
            id: p.id,
            customerId: c.id,
            customerName: c.name,
            messId: 'default_mess',
            recordedBy: 'Owner Desk',
            amount: p.amount,
            paymentMode: p.mode as any,
            status: 'verified',
            createdAt: p.date ? `${p.date}T12:00:00Z` : new Date().toISOString(),
            notes: p.notes || 'Subscription Payment',
            transactionReference: p.transactionId
          });
        });
      });

      const map = new Map<string, SupabasePaymentRecord>();
      customerPayments.forEach(p => map.set(p.id, p));
      (data || []).forEach(p => map.set(p.id, p));

      setPayments(Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
      ));
    } catch {
      // Fallback to customer embedded payments
      const fallback: SupabasePaymentRecord[] = [];
      customers.forEach(c => {
        (c.payments || []).forEach(p => {
          fallback.push({
            id: p.id,
            customerId: c.id,
            customerName: c.name,
            messId: 'default_mess',
            recordedBy: 'Owner Desk',
            amount: p.amount,
            paymentMode: p.mode as any,
            status: 'verified',
            createdAt: p.date ? `${p.date}T12:00:00Z` : new Date().toISOString(),
            notes: p.notes || 'Subscription Payment',
            transactionReference: p.transactionId
          });
        });
      });
      setPayments(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  // Aggregates
  const totalVerifiedInflow = useMemo(() => {
    return payments
      .filter(p => p.status === 'verified')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  const upiVerifiedInflow = useMemo(() => {
    return payments
      .filter(p => p.status === 'verified' && (p.paymentMode === 'upi' || (p.paymentMode as string) === 'online'))
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  const cashVerifiedInflow = useMemo(() => {
    return payments
      .filter(p => p.status === 'verified' && p.paymentMode === 'cash')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  const totalOutstanding = useMemo(() => {
    return customers.reduce((sum, c) => sum + Math.max(0, c.balance || 0), 0);
  }, [customers]);

  const pendingVerificationAmount = useMemo(() => {
    return payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  // Filtered payments list
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const q = searchTerm.toLowerCase().trim();
      const pDate = p.createdAt ? p.createdAt.split('T')[0] : '';

      const matchesSearch = !q || 
        (p.customerName && p.customerName.toLowerCase().includes(q)) ||
        (p.customerId && p.customerId.toLowerCase().includes(q)) ||
        (p.transactionReference && p.transactionReference.toLowerCase().includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q));

      const matchesMode = modeFilter === 'all' || 
        (modeFilter === 'upi' ? (p.paymentMode === 'upi' || (p.paymentMode as string) === 'online') : p.paymentMode === modeFilter);

      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

      const matchesDate = 
        dateRange === 'all' ||
        (dateRange === 'today' && pDate === todayStr) ||
        (dateRange === 'week' && pDate >= sevenDaysAgo) ||
        (dateRange === 'month' && pDate >= thirtyDaysAgo);

      return matchesSearch && matchesMode && matchesStatus && matchesDate;
    });
  }, [payments, searchTerm, modeFilter, statusFilter, dateRange, todayStr, sevenDaysAgo, thirtyDaysAgo]);

  const handleExport = (format: 'xlsx' | 'csv') => {
    const rows = filteredPayments.map(p => ({
      'Payment ID': p.id,
      'Date': p.createdAt ? p.createdAt.split('T')[0] : 'N/A',
      'Time': p.createdAt ? new Date(p.createdAt).toLocaleTimeString() : 'N/A',
      'Student Name': p.customerName || 'N/A',
      'Student ID': p.customerId || 'N/A',
      'Amount (INR)': p.amount,
      'Payment Mode': (p.paymentMode || 'cash').toUpperCase(),
      'Status': p.status.toUpperCase(),
      'UTR / Transaction Ref': p.transactionReference || 'N/A',
      'Notes': p.notes || ''
    }));

    exportToSpreadsheet(rows, {
      filename: `Payments_Ledger_Report_${todayStr}`,
      sheetName: 'Payments_Directory',
      format
    });
  };

  const handleShareWhatsAppPayments = () => {
    const text = `💳 *MORYA MESS PAYMENT COLLECTION REPORT* 💳\n\n💰 *COLLECTIONS BREAKDOWN:*\n• Total Collections: *₹${totalVerifiedInflow.toLocaleString('en-IN')}*\n• UPI / Online: *₹${upiVerifiedInflow.toLocaleString('en-IN')}*\n• Cash Collections: *₹${cashVerifiedInflow.toLocaleString('en-IN')}*\n• Pending / Unverified: *₹${pendingVerificationAmount.toLocaleString('en-IN')}*\n• Total Unpaid Outstanding Dues: *₹${totalOutstanding.toLocaleString('en-IN')}*\n\n_Auto-generated by Morya Mess Payment Gateway Ledger_`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <span>Payment Reports, UPI & Cash Flow Ledger</span>
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                🟢 Live Server Data
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time payment settlements, UPI verification tracking, and outstanding recovery audits
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleShareWhatsAppPayments}
            className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            title="Share payment summary on WhatsApp"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            <span>WA Digest</span>
          </button>
          <button
            onClick={loadPayments}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Refresh from Supabase"
          >
            <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => handleExport('xlsx')}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Ledger</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Total Inflow Collected</span>
          <span className="text-2xl font-black text-emerald-600 block">₹{totalVerifiedInflow.toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-slate-400 font-semibold">{payments.length} verified transactions</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block flex items-center gap-1">
            <Smartphone className="w-3.5 h-3.5" /> Online UPI Collections
          </span>
          <span className="text-2xl font-black text-indigo-600 block">₹{upiVerifiedInflow.toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-indigo-600 font-semibold">{totalVerifiedInflow > 0 ? Math.round((upiVerifiedInflow / totalVerifiedInflow) * 100) : 0}% of total collections</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block flex items-center gap-1">
            <Banknote className="w-3.5 h-3.5" /> Cash Galla Collections
          </span>
          <span className="text-2xl font-black text-amber-600 block">₹{cashVerifiedInflow.toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-amber-600 font-semibold">Physical counter cash notes</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">Outstanding Student Dues</span>
          <span className="text-2xl font-black text-rose-600 block">₹{totalOutstanding.toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-rose-600 font-semibold">Pending recovery across diners</span>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date range filter */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
            {(['all', 'today', 'week', 'month'] as const).map(d => (
              <button
                key={d}
                onClick={() => setDateRange(d)}
                className={`px-3 py-1 rounded-lg font-bold capitalize transition cursor-pointer ${
                  dateRange === d 
                    ? 'bg-emerald-600 text-white shadow-2xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {d === 'week' ? 'Last 7d' : d === 'month' ? 'Last 30d' : d}
              </button>
            ))}
          </div>

          {/* Mode filter */}
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 text-xs"
          >
            <option value="all">All Payment Modes</option>
            <option value="upi">UPI / Online Only</option>
            <option value="cash">Cash Counter Only</option>
            <option value="bank_transfer">Bank Transfer Only</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 text-xs"
          >
            <option value="all">All Statuses</option>
            <option value="verified">Verified Only</option>
            <option value="pending">Pending Verification Only</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search student, UTR, ref..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Payment Records Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Student / Diner</th>
                <th className="p-3.5">Payment Date & Time</th>
                <th className="p-3.5">Amount (INR)</th>
                <th className="p-3.5">Payment Mode</th>
                <th className="p-3.5">Reference / Notes</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                    Loading verified ledger transactions from Supabase...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                    No payment records found matching the active filters.
                  </td>
                </tr>
              ) : (
                filteredPayments.map(p => {
                  const cust = customers.find(c => c.id === p.customerId);
                  const cleanPhone = cust?.phone?.replace(/[^0-9]/g, '');

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5">
                        <span className="font-black text-slate-900 block text-sm">{p.customerName || cust?.name || 'Walk-in Diner'}</span>
                        <span className="font-mono text-slate-500 text-[11px]">{p.customerId || 'Counter Entry'}</span>
                      </td>

                      <td className="p-3.5 text-slate-700">
                        <div className="font-bold">{p.createdAt ? p.createdAt.split('T')[0] : 'N/A'}</div>
                        <div className="text-[11px] text-slate-400">
                          {p.createdAt ? new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="text-base font-black text-emerald-700">
                          ₹{p.amount.toLocaleString('en-IN')}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase inline-flex items-center gap-1 ${
                          p.paymentMode === 'cash'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                        }`}>
                          {p.paymentMode === 'cash' ? <Banknote className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
                          <span>{p.paymentMode}</span>
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-600 font-medium">
                        <div className="font-mono text-[11px] text-slate-800 font-bold">{p.transactionReference || 'Counter Cash'}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[160px]">{p.notes || 'Mess subscription'}</div>
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase inline-flex items-center gap-1 ${
                          p.status === 'verified'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{p.status}</span>
                        </span>
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {cleanPhone && (
                            <a
                              href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Hello ${p.customerName || cust?.name}! Morya Mess Payment Receipt: ₹${p.amount} received successfully via ${(p.paymentMode || 'UPI').toUpperCase()} on ${p.createdAt?.split('T')[0]}. Ref: ${p.transactionReference || 'Confirmed'}. Thank you!`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
                              title="Send WhatsApp Payment Receipt"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                            </a>
                          )}
                          {cust && onOpenCustomer360 && (
                            <button
                              onClick={() => onOpenCustomer360(cust)}
                              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                              title="View Customer Profile"
                            >
                              Profile
                            </button>
                          )}
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
    </div>
  );
};
