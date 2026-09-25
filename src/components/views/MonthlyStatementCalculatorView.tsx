import React, { useState, useEffect } from 'react';
import { Customer, SupabasePaymentRecord } from '../../types/mess';
import { fetchCustomer360Profile, Customer360Data, fetchPaymentsFromSupabase } from '../../lib/ownerFeaturesApi';
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
  RefreshCw
} from 'lucide-react';

interface MonthlyStatementCalculatorViewProps {
  customers: Customer[];
  onBack: () => void;
  initialCustomerId?: string;
}

export const MonthlyStatementCalculatorView: React.FC<MonthlyStatementCalculatorViewProps> = ({
  customers,
  onBack,
  initialCustomerId
}) => {
  const [selectedCustId, setSelectedCustId] = useState(initialCustomerId || customers[0]?.id || '');
  const [selectedMonth, setSelectedMonth] = useState('2026-09');
  const [isCalculating, setIsCalculating] = useState(false);
  const [statementResult, setStatementResult] = useState<{
    customer: Customer;
    month: string;
    monthlyPlanName: string;
    planCharges: number;
    openingBalance: number;
    adjustments: number;
    totalPayable: number;
    upiPaymentsTotal: number;
    cashPaymentsTotal: number;
    totalPaid: number;
    closingBalance: number;
    paymentsList: SupabasePaymentRecord[];
    attendanceCount: number;
    leavesApprovedDays: number;
  } | null>(null);

  // Auto-calculate on initial load if customer selected
  useEffect(() => {
    if (selectedCustId) {
      handleCalculate();
    }
  }, [selectedCustId, selectedMonth]);

  const handleCalculate = async () => {
    if (!selectedCustId) return;
    setIsCalculating(true);

    const activeCust = customers.find(c => c.id === selectedCustId);
    if (!activeCust) {
      setIsCalculating(false);
      return;
    }

    // 1. Fetch real payment logs from DB
    const allPayments = await fetchPaymentsFromSupabase();
    const custPayments = allPayments.filter(
      p => (p.customerId === activeCust.id || (activeCust.phone && p.customerPhone === activeCust.phone)) &&
           p.createdAt.startsWith(selectedMonth) &&
           p.status === 'verified'
    );

    const upiPaid = custPayments
      .filter(p => p.paymentMode === 'upi')
      .reduce((sum, p) => sum + p.amount, 0);

    const cashPaid = custPayments
      .filter(p => p.paymentMode === 'cash')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalPaid = upiPaid + cashPaid;

    // 2. Calculate deterministic formula
    // Plan Rate
    const planRate = activeCust.totalAmount || 3000;
    // Opening balance from previous dues
    const openingBalance = 0; // standard opening balance for month cycle
    const adjustments = 0;
    const totalPayable = openingBalance + planRate + adjustments;
    const closingBalance = Math.max(0, totalPayable - totalPaid);

    // Leaves in month
    const leavesDays = (activeCust.leaves || [])
      .filter(l => l.status === 'approved' && l.startDate.startsWith(selectedMonth))
      .reduce((sum, l) => sum + (l.days || 1), 0);

    setStatementResult({
      customer: activeCust,
      month: selectedMonth,
      monthlyPlanName: activeCust.planType?.replace('_', ' ').toUpperCase() || 'MONTHLY 2 MEALS',
      planCharges: planRate,
      openingBalance,
      adjustments,
      totalPayable,
      upiPaymentsTotal: upiPaid,
      cashPaymentsTotal: cashPaid,
      totalPaid,
      closingBalance,
      paymentsList: custPayments,
      attendanceCount: 48, // estimated active meals in month
      leavesApprovedDays: leavesDays
    });

    setIsCalculating(false);
  };

  const handleExportCSV = () => {
    if (!statementResult) return;
    const { customer, month, planCharges, openingBalance, totalPayable, totalPaid, closingBalance, paymentsList } = statementResult;

    let csv = `MORYA MESS MONTHLY BILLING STATEMENT\n`;
    csv += `Customer Name,${customer.name}\n`;
    csv += `Phone,${customer.phone}\n`;
    csv += `Billing Cycle,${month}\n`;
    csv += `Plan Type,${statementResult.monthlyPlanName}\n\n`;

    csv += `FINANCIAL BREAKDOWN\n`;
    csv += `Opening Balance,₹${openingBalance}\n`;
    csv += `Current Monthly Charges,₹${planCharges}\n`;
    csv += `Adjustments,₹0\n`;
    csv += `TOTAL PAYABLE,₹${totalPayable}\n`;
    csv += `UPI Payments Paid,₹${statementResult.upiPaymentsTotal}\n`;
    csv += `Cash Payments Paid,₹${statementResult.cashPaymentsTotal}\n`;
    csv += `TOTAL PAID,₹${totalPaid}\n`;
    csv += `TOTAL OUTSTANDING CLOSING BALANCE,₹${closingBalance}\n\n`;

    csv += `PAYMENT TRANSACTIONS IN ${month}\n`;
    csv += `Date,Amount,Mode,Reference,Notes\n`;
    paymentsList.forEach(p => {
      csv += `${p.createdAt.split('T')[0]},₹${p.amount},${p.paymentMode},"${p.transactionReference || ''}","${p.notes || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Statement_${customer.name.replace(/\s+/g, '_')}_${month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
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
              <Calculator className="w-5 h-5 text-indigo-600" />
              <span>Monthly Statement Calculator</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Deterministic billing reconciliation: Opening Balance + Charges + Adjustments - Payments = Closing Dues
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {statementResult && (
            <>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Excel</span>
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Statement PDF</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Input Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Select Customer</label>
            <select
              value={selectedCustId}
              onChange={(e) => setSelectedCustId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone}) - {c.planType?.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Billing Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <button
              onClick={handleCalculate}
              disabled={isCalculating}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              <span>{isCalculating ? 'Calculating...' : 'Calculate Statement'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Calculated Statement Sheet */}
      {statementResult && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 print:m-0 print:border-none print:shadow-none">
          {/* Statement Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest block">
                Official Billing Reconciliation
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-0.5">
                Monthly Dining Statement
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                Cycle: {statementResult.month} • Generated on {new Date().toLocaleDateString()}
              </p>
            </div>

            <div className="text-left sm:text-right bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
              <div className="font-black text-slate-900 text-sm">{statementResult.customer.name}</div>
              <div className="text-xs text-slate-500 font-mono">Mobile: {statementResult.customer.phone}</div>
              <div className="text-[11px] text-slate-400">ID: {statementResult.customer.id}</div>
            </div>
          </div>

          {/* Three Large KPI Summary Blocks */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Payable</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                ₹{statementResult.totalPayable}
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Opening balance + Plan charges</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-left">
              <span className="text-[10px] font-bold uppercase text-emerald-800 block">Total Paid</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                ₹{statementResult.totalPaid}
              </div>
              <span className="text-[11px] text-emerald-600 font-medium">
                UPI (₹{statementResult.upiPaymentsTotal}) + Cash (₹{statementResult.cashPaymentsTotal})
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-left">
              <span className="text-[10px] font-bold uppercase text-rose-800 block">Total Outstanding Closing</span>
              <div className={`text-2xl font-black mt-1 ${statementResult.closingBalance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                ₹{statementResult.closingBalance}
              </div>
              <span className="text-[11px] text-rose-600 font-medium">
                {statementResult.closingBalance > 0 ? 'Payment pending from member' : 'Full settlement complete'}
              </span>
            </div>
          </div>

          {/* Deterministic Step Formula */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              Deterministic Calculation Formula:
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center pt-1 font-mono">
              <div className="p-2 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Opening Balance</span>
                <span className="font-bold text-slate-900">₹{statementResult.openingBalance}</span>
              </div>
              <div className="p-2 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] text-slate-400 block">+ Current Charges</span>
                <span className="font-bold text-slate-900">₹{statementResult.planCharges}</span>
              </div>
              <div className="p-2 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] text-slate-400 block">+ Adjustments</span>
                <span className="font-bold text-slate-900">₹{statementResult.adjustments}</span>
              </div>
              <div className="p-2 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] text-slate-400 block">- Total Payments</span>
                <span className="font-bold text-emerald-600">₹{statementResult.totalPaid}</span>
              </div>
              <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-200 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-indigo-800 block">= Closing Balance</span>
                <span className="font-black text-indigo-950">₹{statementResult.closingBalance}</span>
              </div>
            </div>
          </div>

          {/* Payment Receipts in Selected Month */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
              Verified Payment Receipts ({statementResult.paymentsList.length})
            </h3>
            {statementResult.paymentsList.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                No payments recorded in {statementResult.month}.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                {statementResult.paymentsList.map(p => (
                  <div key={p.id} className="p-3.5 flex items-center justify-between bg-white">
                    <div>
                      <span className="font-black text-slate-900">₹{p.amount}</span>
                      <span className="text-[10px] uppercase font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 ml-2">
                        {p.paymentMode}
                      </span>
                      {p.transactionReference && (
                        <span className="text-[10px] font-mono text-slate-400 ml-2">
                          UTR: {p.transactionReference}
                        </span>
                      )}
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(p.createdAt).toLocaleDateString()} • {p.notes || 'Payment'}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Verified
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
