import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import { Customer, SupabasePaymentRecord } from '../../types/mess';
import { 
  fetchPaymentsFromSupabase, 
  recordNewPaymentInSupabase, 
  fetchMessUpiConfig 
} from '../../lib/ownerFeaturesApi';
import { exportToSpreadsheet } from '../../lib/exportUtils';
import { 
  FileText, 
  ArrowLeft, 
  Search, 
  Printer, 
  Download, 
  Calendar, 
  Utensils, 
  CreditCard,
  CheckCircle2,
  Clock,
  Calculator,
  RefreshCw,
  MessageSquare,
  Share2,
  Users,
  AlertTriangle,
  QrCode,
  DollarSign,
  TrendingUp,
  Banknote,
  Smartphone,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Check,
  X
} from 'lucide-react';

interface MonthlyStatementCalculatorViewProps {
  customers: Customer[];
  onBack: () => void;
  initialCustomerId?: string;
  onRecordPayment?: (customerId: string, amount: number, mode: 'cash' | 'upi' | 'bank_transfer', notes?: string) => void;
  onOpenCustomer360?: (c: Customer) => void;
}

export const MonthlyStatementCalculatorView: React.FC<MonthlyStatementCalculatorViewProps> = ({
  customers,
  onBack,
  initialCustomerId,
  onRecordPayment,
  onOpenCustomer360
}) => {
  const [activeMode, setActiveMode] = useState<'individual' | 'batch_roster'>('individual');
  const [selectedCustId, setSelectedCustId] = useState(initialCustomerId || customers[0]?.id || '');
  const [selectedMonth, setSelectedMonth] = useState('2026-10');
  const [payments, setPayments] = useState<SupabasePaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Settlement Form inside modal
  const [isSettling, setIsSettling] = useState(false);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleMode, setSettleMode] = useState<'cash' | 'upi'>('cash');
  const [settleSuccessBanner, setSettleSuccessBanner] = useState<string | null>(null);

  // UPI QR for remaining due
  const [billQrDataUrl, setBillQrDataUrl] = useState<string>('');
  const [upiId, setUpiId] = useState('moryamess@upi');

  // Search filter for batch roster
  const [rosterSearch, setRosterSearch] = useState('');

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
    const [pData, upiCfg] = await Promise.all([
      fetchPaymentsFromSupabase(),
      fetchMessUpiConfig()
    ]);
    setPayments(pData);
    if (upiCfg?.upiId) setUpiId(upiCfg.upiId);
    setIsLoading(false);
  };

  const activeCustomer = customers.find(c => c.id === selectedCustId);

  // Calculate bill for active customer
  const activeBill = useMemo(() => {
    if (!activeCustomer) return null;

    const custPayments = payments.filter(
      p => (p.customerId === activeCustomer.id || (activeCustomer.phone && p.customerPhone === activeCustomer.phone)) &&
           (p.createdAt ? p.createdAt.startsWith(selectedMonth) : true) &&
           p.status === 'verified'
    );

    const upiPaid = custPayments
      .filter(p => p.paymentMode === 'upi')
      .reduce((sum, p) => sum + Math.abs(p.amount), 0);

    const cashPaid = custPayments
      .filter(p => p.paymentMode === 'cash')
      .reduce((sum, p) => sum + Math.abs(p.amount), 0);

    const totalPaid = upiPaid + cashPaid;
    const planRate = activeCustomer.totalAmount || 3000;
    const adjustments = 0;
    const totalPayable = planRate + adjustments;
    const closingBalance = Math.max(0, totalPayable - totalPaid);

    return {
      customer: activeCustomer,
      month: selectedMonth,
      planRate,
      adjustments,
      totalPayable,
      upiPaid,
      cashPaid,
      totalPaid,
      closingBalance,
      paymentsList: custPayments
    };
  }, [activeCustomer, selectedMonth, payments]);

  // Generate dynamic payment QR for exact closing balance
  useEffect(() => {
    if (activeBill && activeBill.closingBalance > 0 && upiId) {
      const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=Morya%20Mess&am=${activeBill.closingBalance}&cu=INR&tn=Bill%20${encodeURIComponent(activeCustomer?.name || 'Student')}%20${selectedMonth}`;
      QRCode.toDataURL(upiUrl, { width: 220, margin: 1 })
        .then(url => setBillQrDataUrl(url))
        .catch(() => {});
    } else {
      setBillQrDataUrl('');
    }
  }, [activeBill, upiId, selectedMonth, activeCustomer]);

  // Batch Roster Calculation for all customers
  const batchSummaries = useMemo(() => {
    return customers.map(cust => {
      const custPayments = payments.filter(
        p => (p.customerId === cust.id || (cust.phone && p.customerPhone === cust.phone)) &&
             (p.createdAt ? p.createdAt.startsWith(selectedMonth) : true) &&
             p.status === 'verified'
      );

      const totalPaid = custPayments.reduce((sum, p) => sum + Math.abs(p.amount), 0);
      const planRate = cust.totalAmount || 3000;
      const closingBalance = Math.max(0, planRate - totalPaid);

      return {
        customer: cust,
        planRate,
        totalPaid,
        closingBalance,
        status: closingBalance === 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid'
      };
    });
  }, [customers, payments, selectedMonth]);

  const filteredBatchSummaries = useMemo(() => {
    if (!rosterSearch.trim()) return batchSummaries;
    const q = rosterSearch.toLowerCase();
    return batchSummaries.filter(b => 
      b.customer.name.toLowerCase().includes(q) ||
      (b.customer.phone && b.customer.phone.includes(q)) ||
      (b.customer.hostelOrAddress && b.customer.hostelOrAddress.toLowerCase().includes(q))
    );
  }, [batchSummaries, rosterSearch]);

  const totalExpectedRevenue = batchSummaries.reduce((sum, b) => sum + b.planRate, 0);
  const totalCollectedRevenue = batchSummaries.reduce((sum, b) => sum + b.totalPaid, 0);
  const totalPendingRevenue = batchSummaries.reduce((sum, b) => sum + b.closingBalance, 0);
  const collectionPercentage = totalExpectedRevenue > 0 ? Math.round((totalCollectedRevenue / totalExpectedRevenue) * 100) : 0;

  const handleInstantSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer || !settleAmount || Number(settleAmount) <= 0) return;

    setIsSettling(true);
    const res = await recordNewPaymentInSupabase({
      customerId: activeCustomer.id,
      customerName: activeCustomer.name,
      customerPhone: activeCustomer.phone,
      amount: Number(settleAmount),
      paymentMode: settleMode,
      status: 'verified',
      notes: `Monthly Bill Settlement for ${selectedMonth} via ${settleMode.toUpperCase()}`,
      recordedBy: 'Owner Desk'
    });

    if (res.success) {
      setSettleSuccessBanner(`Recorded ₹${settleAmount} settlement for ${activeCustomer.name}!`);
      setSettleAmount('');
      await loadData();
      setTimeout(() => setSettleSuccessBanner(null), 4000);
    }
    setIsSettling(false);
  };

  const handleSendWhatsAppBill = (targetCust: Customer, billDetails: any) => {
    if (!targetCust.phone) {
      alert('Student phone number not available');
      return;
    }
    const cleanPhone = targetCust.phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const message = 
`🧾 *MORYA MESS - MONTHLY BILL STATEMENT*
📅 Month: *${billDetails.month || selectedMonth}*
👤 Student: *${targetCust.name}*
📱 Phone: ${targetCust.phone}
🏢 Room/Hostel: ${targetCust.hostelOrAddress || 'General'}
🍛 Plan: ${targetCust.planType?.replace(/_/g, ' ') || 'Monthly'}

💰 *BILL BREAKDOWN:*
• Monthly Subscription Plan: ₹${(billDetails.planRate || 3000).toLocaleString()}
• Total Paid This Month: ₹${(billDetails.totalPaid || 0).toLocaleString()}
• *OUTSTANDING DUE TO PAY: ₹${(billDetails.closingBalance || 0).toLocaleString()}*

${billDetails.closingBalance > 0 ? `📲 Pay easily via UPI ID: *${upiId}* or scan the standee QR at the mess counter.` : `✅ All dues for ${billDetails.month || selectedMonth} are fully cleared! Thank you.`}

🚩 *॥ श्री गणेशाय नमः • मोरया मेस ॥*`;

    window.open(`https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`, '_blank');
  };

  const handlePrintBill = () => {
    window.print();
  };

  const handleExportRoster = () => {
    const exportData = batchSummaries.map(b => ({
      'Student Name': b.customer.name,
      'Phone': b.customer.phone,
      'Hostel / Room': b.customer.hostelOrAddress || 'N/A',
      'Plan': b.customer.planType?.replace(/_/g, ' '),
      'Month': selectedMonth,
      'Plan Fee (₹)': b.planRate,
      'Paid (₹)': b.totalPaid,
      'Pending Due (₹)': b.closingBalance,
      'Status': b.status.toUpperCase()
    }));
    exportToSpreadsheet(exportData, {
      filename: `Morya_Mess_Monthly_Bills_${selectedMonth}`,
      sheetName: 'Monthly_Bills',
      format: 'xlsx'
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Command Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
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
              <span className="p-1.5 rounded-lg bg-orange-100 text-orange-700">
                <Calculator className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Monthly Settlements & Bills
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200">
                Automated Invoicing
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Deterministic month-end bill calculation, individual digital slips, batch dues roster, and instant clearing.
            </p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveMode('individual')}
            className={`px-3.5 py-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              activeMode === 'individual'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Single Student Bill</span>
          </button>
          <button
            onClick={() => setActiveMode('batch_roster')}
            className={`px-3.5 py-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              activeMode === 'batch_roster'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Batch Mess Roster ({customers.length})</span>
          </button>
        </div>
      </div>

      {settleSuccessBanner && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{settleSuccessBanner}</span>
          </div>
          <button onClick={() => setSettleSuccessBanner(null)} className="p-1 hover:bg-emerald-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Month Selector Bar & High-Level KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Billing Cycle Month</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-black text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
          >
            <option value="2026-10">October 2026 (Current)</option>
            <option value="2026-09">September 2026</option>
            <option value="2026-08">August 2026</option>
            <option value="2026-07">July 2026</option>
          </select>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total Expected Billings</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">₹{totalExpectedRevenue.toLocaleString()}</span>
          <span className="text-[11px] text-slate-500 font-medium">{customers.length} registered members</span>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block">Total Collected ({collectionPercentage}%)</span>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">₹{totalCollectedRevenue.toLocaleString()}</span>
          <span className="text-[11px] text-emerald-600 font-medium">Cleared via UPI & Cash</span>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 block">Outstanding Balance</span>
          <span className="text-2xl font-black text-rose-600 mt-1 block">₹{totalPendingRevenue.toLocaleString()}</span>
          <span className="text-[11px] text-rose-600 font-medium">Pending from {batchSummaries.filter(b => b.closingBalance > 0).length} students</span>
        </div>
      </div>

      {/* MODE 1: Individual Student Digital Bill Slip */}
      {activeMode === 'individual' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Student Selector & Quick Settle Desk */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Select Student</label>
                <select
                  value={selectedCustId}
                  onChange={(e) => {
                    setSelectedCustId(e.target.value);
                    const target = customers.find(c => c.id === e.target.value);
                    if (target) setSettleAmount(String(target.balance || 0));
                  }}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} • {c.phone} (Due: ₹{(c.balance || 0).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              {activeCustomer && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Room / Hostel:</span>
                    <span className="font-bold text-slate-800">{activeCustomer.hostelOrAddress || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Plan Type:</span>
                    <span className="font-bold text-slate-800">{activeCustomer.planType?.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subscription Dates:</span>
                    <span className="font-bold text-slate-800">{activeCustomer.startDate} to {activeCustomer.endDate}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Settlement Form */}
            {activeBill && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                    <CreditCard className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-black text-slate-900">Record Instant Settlement</h3>
                </div>

                <form onSubmit={handleInstantSettle} className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Amount to Settle (₹)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                      <input
                        type="number"
                        min="1"
                        required
                        value={settleAmount}
                        onChange={(e) => setSettleAmount(e.target.value)}
                        placeholder={String(activeBill.closingBalance)}
                        className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-black text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Mode Selector */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setSettleMode('cash')}
                      className={`py-2 text-xs font-black rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        settleMode === 'cash' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      <span>Counter Cash</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettleMode('upi')}
                      className={`py-2 text-xs font-black rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        settleMode === 'upi' ? 'bg-purple-600 text-white shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>UPI Direct</span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isSettling || !settleAmount || Number(settleAmount) <= 0}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {isSettling ? 'Recording Settlement...' : `Confirm ₹${settleAmount || 0} Payment`}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Right Column: Printable Official Bill Statement Card */}
          <div className="lg:col-span-2 space-y-4">
            {activeBill && (
              <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 sm:p-8 shadow-sm relative overflow-hidden space-y-6">
                {/* Header with Mess Branding */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b-2 border-dashed border-slate-200">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 block mb-1">
                      ॥ श्री गणेशाय नमः ॥
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">MORYA MESS & DINING</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      FSSAI Reg: 21524021000982 • Near D.Y. Patil College, Pune
                    </p>
                    <p className="text-xs text-slate-500 font-mono">
                      Official Monthly Student Mess Invoice
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-orange-100 text-orange-800">
                      BILL #{selectedMonth}-{activeCustomer?.id?.substring(0, 6) || 'INV'}
                    </span>
                    <p className="text-xs text-slate-500 mt-2">
                      Billing Period: <span className="font-bold text-slate-800">{selectedMonth}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Date Issued: <span className="font-bold text-slate-800">{new Date().toISOString().split('T')[0]}</span>
                    </p>
                  </div>
                </div>

                {/* Student Info Box */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Billed To (Student)</span>
                    <span className="text-base font-black text-slate-900 block mt-0.5">{activeCustomer?.name}</span>
                    <span className="text-slate-600 block">Phone: {activeCustomer?.phone}</span>
                    <span className="text-slate-600 block">Hostel / Room: {activeCustomer?.hostelOrAddress || 'General Room'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Subscription Tariff</span>
                    <span className="text-sm font-bold text-slate-900 block mt-0.5">{activeCustomer?.planType?.replace(/_/g, ' ')}</span>
                    <span className="text-slate-600 block">Meals: 2 Times Daily (Lunch & Dinner)</span>
                    <span className="text-slate-600 block">Validity: {activeCustomer?.startDate} to {activeCustomer?.endDate}</span>
                  </div>
                </div>

                {/* Itemized Charges Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Description / Item Particulars</th>
                        <th className="px-4 py-3 text-right">Qty / Period</th>
                        <th className="px-4 py-3 text-right">Rate</th>
                        <th className="px-4 py-3 text-right">Net Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-slate-900 block">Monthly Dining Subscription Fee</span>
                          <span className="text-[10px] text-slate-400">Regular homemade hygienic meal service</span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-slate-600">1 Month</td>
                        <td className="px-4 py-3.5 text-right font-bold text-slate-600">₹{activeBill.planRate}</td>
                        <td className="px-4 py-3.5 text-right font-black text-slate-900">₹{activeBill.planRate.toLocaleString()}</td>
                      </tr>
                      {activeBill.adjustments > 0 && (
                        <tr>
                          <td className="px-4 py-3.5">
                            <span className="font-bold text-slate-900 block">Extra Meals / Ledger Adjustments</span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-bold text-slate-600">—</td>
                          <td className="px-4 py-3.5 text-right font-bold text-slate-600">₹{activeBill.adjustments}</td>
                          <td className="px-4 py-3.5 text-right font-black text-slate-900">₹{activeBill.adjustments}</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-bold text-xs">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-right text-slate-600">Gross Total Payable:</td>
                        <td className="px-4 py-3 text-right font-black text-slate-900">₹{activeBill.totalPayable.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-right text-emerald-700">Less: Payments Received (UPI: ₹{activeBill.upiPaid}, Cash: ₹{activeBill.cashPaid}):</td>
                        <td className="px-4 py-2 text-right font-black text-emerald-700">-₹{activeBill.totalPaid.toLocaleString()}</td>
                      </tr>
                      <tr className="border-t-2 border-slate-900 bg-orange-50/60 text-sm">
                        <td colSpan={3} className="px-4 py-3.5 text-right font-black text-slate-900">
                          NET CLOSING BALANCE DUE:
                        </td>
                        <td className="px-4 py-3.5 text-right font-black text-rose-600 text-base">
                          ₹{activeBill.closingBalance.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* QR Code & Payment Section */}
                {activeBill.closingBalance > 0 && billQrDataUrl && (
                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 flex flex-col sm:flex-row items-center gap-4">
                    <img src={billQrDataUrl} alt="Bill QR" className="w-28 h-28 rounded-xl border border-amber-200 bg-white p-1" />
                    <div className="space-y-1 text-xs">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-200 text-amber-900">
                        Scan & Settle Instant Due
                      </span>
                      <p className="font-bold text-slate-900 text-sm">
                        Scan with GPay, PhonePe or Paytm to pay ₹{activeBill.closingBalance.toLocaleString()}
                      </p>
                      <p className="text-slate-500 font-mono">UPI ID: {upiId}</p>
                      <p className="text-[11px] text-slate-500">
                        Payment automatically reconciles against student account upon verification.
                      </p>
                    </div>
                  </div>
                )}

                {/* Actions Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSendWhatsAppBill(activeCustomer!, activeBill)}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition cursor-pointer active:scale-95"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Send Bill on WhatsApp</span>
                    </button>
                    <button
                      onClick={handlePrintBill}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-xs transition cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Official Invoice</span>
                    </button>
                  </div>

                  <span className="text-[11px] font-mono text-slate-400">
                    Morya Mess Automated System • Authorized Desk Copy
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 2: Batch Mess Roster & Defaulters Table */}
      {activeMode === 'batch_roster' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-4">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Monthly Billing & Settlement Roster ({selectedMonth})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete audit of all students, payments collected, and outstanding balances.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student or room..."
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 w-56"
                />
              </div>

              <button
                onClick={handleExportRoster}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export Excel</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Student / Member</th>
                  <th className="px-5 py-3.5">Room & Phone</th>
                  <th className="px-5 py-3.5">Plan Type</th>
                  <th className="px-5 py-3.5 text-right">Plan Fee</th>
                  <th className="px-5 py-3.5 text-right text-emerald-700">Paid Amount</th>
                  <th className="px-5 py-3.5 text-right text-rose-600">Pending Due</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBatchSummaries.map(item => (
                  <tr key={item.customer.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      {item.customer.name}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <div>{item.customer.phone}</div>
                      <div className="text-[10px] text-slate-400">{item.customer.hostelOrAddress || 'Hostel'}</div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {item.customer.planType?.replace(/_/g, ' ')}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-800">
                      ₹{item.planRate.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-emerald-600">
                      ₹{item.totalPaid.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right font-black text-rose-600 text-sm">
                      ₹{item.closingBalance.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        item.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        item.status === 'partial' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedCustId(item.customer.id);
                            setActiveMode('individual');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition cursor-pointer"
                        >
                          View Bill
                        </button>
                        {item.closingBalance > 0 && (
                          <button
                            onClick={() => handleSendWhatsAppBill(item.customer, item)}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition cursor-pointer"
                            title="Send WhatsApp Bill"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
