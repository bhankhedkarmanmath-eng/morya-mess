import React, { useState } from 'react';
import { Customer } from '../types/mess';
import { Customer360Data, fetchCustomer360Profile } from '../lib/ownerFeaturesApi';
import { 
  FileText, 
  Download, 
  Calendar, 
  Search, 
  Printer, 
  CheckCircle, 
  Utensils, 
  CreditCard,
  RefreshCw,
  ArrowDown
} from 'lucide-react';

interface MonthlyStatementGeneratorProps {
  customers: Customer[];
  selectedCustomer?: Customer | null;
}

export const MonthlyStatementGenerator: React.FC<MonthlyStatementGeneratorProps> = ({
  customers,
  selectedCustomer: initialCustomer
}) => {
  const [selectedCustId, setSelectedCustId] = useState(initialCustomer?.id || customers[0]?.id || '');
  const [selectedMonth, setSelectedMonth] = useState('2026-09');
  const [statementData, setStatementData] = useState<Customer360Data | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!selectedCustId) return;
    setIsLoading(true);
    const data = await fetchCustomer360Profile(selectedCustId);
    setStatementData(data);
    setIsLoading(false);
  };

  const activeCust = statementData?.customer || customers.find(c => c.id === selectedCustId);

  // Filter payments & attendance for selected month
  const monthPayments = (statementData?.payments || []).filter(p => p.createdAt?.startsWith(selectedMonth));
  const monthAttendance = (statementData?.attendanceLogs || []).filter(a => a.mealDate?.startsWith(selectedMonth));

  const totalPaidInMonth = monthPayments
    .filter(p => p.status === 'verified')
    .reduce((sum, p) => sum + p.amount, 0);

  const lunchCount = monthAttendance.filter(a => a.mealShift === 'lunch' && a.isValid).length;
  const dinnerCount = monthAttendance.filter(a => a.mealShift === 'dinner' && a.isValid).length;

  const handleExportCSV = () => {
    if (!activeCust) return;

    let csv = `MORYA MESS MONTHLY STATEMENT\n`;
    csv += `Customer Name,${activeCust.name}\n`;
    csv += `Customer ID,${activeCust.id}\n`;
    csv += `Mobile,${activeCust.phone}\n`;
    csv += `Billing Month,${selectedMonth}\n`;
    csv += `Plan Type,${activeCust.planType}\n\n`;

    csv += `PAYMENT TRANSACTIONS\n`;
    csv += `Date,Amount,Mode,Reference,Status\n`;
    monthPayments.forEach(p => {
      csv += `${p.createdAt?.split('T')[0]},${p.amount},${p.paymentMode},"${p.transactionReference || p.notes || ''}",${p.status}\n`;
    });

    csv += `\nATTENDANCE SUMMARY\n`;
    csv += `Total Meals,${monthAttendance.length}\n`;
    csv += `Lunch Meals,${lunchCount}\n`;
    csv += `Dinner Meals,${dinnerCount}\n\n`;

    csv += `FINANCIAL SUMMARY\n`;
    csv += `Total Rate,${activeCust.totalAmount}\n`;
    csv += `Paid Amount,${totalPaidInMonth}\n`;
    csv += `Closing Balance,${activeCust.balance}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Statement_${activeCust.name.replace(/\s+/g, '_')}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Selection */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Monthly Statement Generator
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Calculate accurate, auditable statement directly from database attendance and ledger records.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Select Customer</label>
            <select
              value={selectedCustId}
              onChange={(e) => setSelectedCustId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Select Billing Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              <span>Calculate Monthly Statement</span>
            </button>
          </div>
        </div>
      </div>

      {/* Rendered Statement Preview */}
      {activeCust && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 sm:p-8 space-y-6 print:m-0 print:p-0 print:border-none">
          {/* Statement Header */}
          <div className="flex flex-wrap items-start justify-between border-b border-slate-200 pb-5 gap-4">
            <div>
              <span className="text-xs font-black text-orange-600 uppercase tracking-widest block mb-1">
                Official Account Statement
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">MORYA MESS</h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Hostel Dining Services & Student Mess Operations
              </p>
            </div>

            <div className="text-right flex flex-col items-end gap-2">
              <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-800 rounded-lg">
                Billing Cycle: {selectedMonth}
              </span>
              <div className="flex items-center gap-2 print:hidden">
                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Excel/CSV</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print PDF</span>
                </button>
              </div>
            </div>
          </div>

          {/* Customer & Plan Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="font-black text-slate-400 uppercase tracking-wider text-[10px]">Customer Details</span>
              <p className="font-extrabold text-sm text-slate-900">{activeCust.name}</p>
              <p className="text-slate-600 font-mono">ID: {activeCust.id} | Phone: {activeCust.phone}</p>
              <p className="text-slate-600">{activeCust.collegeOrWork || 'Student Member'}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="font-black text-slate-400 uppercase tracking-wider text-[10px]">Subscription Details</span>
              <p className="font-extrabold text-sm text-slate-900">{activeCust.planType}</p>
              <p className="text-slate-600">Validity: {activeCust.startDate} to {activeCust.endDate}</p>
              <p className="text-emerald-700 font-bold">Status: {activeCust.status.toUpperCase()}</p>
            </div>
          </div>

          {/* Monthly Attendance Breakdown */}
          <div className="space-y-3">
            <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider">
              Attendance Verification Summary
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Meals</span>
                <span className="text-xl font-black text-slate-900">{monthAttendance.length}</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Lunch Meals</span>
                <span className="text-xl font-black text-slate-900">{lunchCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Dinner Meals</span>
                <span className="text-xl font-black text-slate-900">{dinnerCount}</span>
              </div>
            </div>
          </div>

          {/* Payment Transactions List */}
          <div className="space-y-3">
            <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider">
              Payments Recorded in {selectedMonth}
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Amount</th>
                    <th className="p-2.5">Mode</th>
                    <th className="p-2.5">Transaction UTR / Notes</th>
                    <th className="p-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthPayments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400">
                        No payments recorded during {selectedMonth}.
                      </td>
                    </tr>
                  ) : (
                    monthPayments.map((p) => (
                      <tr key={p.id}>
                        <td className="p-2.5 font-bold text-slate-900">{p.createdAt?.split('T')[0]}</td>
                        <td className="p-2.5 font-black text-emerald-700">₹{p.amount}</td>
                        <td className="p-2.5 uppercase font-bold text-slate-700">{p.paymentMode}</td>
                        <td className="p-2.5 font-mono text-[11px] text-slate-600">{p.transactionReference || p.notes || '—'}</td>
                        <td className="p-2.5 text-right font-bold text-emerald-700">{p.status.toUpperCase()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Final Financial Summary Section */}
          <div className="p-5 rounded-2xl bg-orange-50/60 border border-orange-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-800">
                Monthly Net Position
              </span>
              <p className="text-xs text-slate-600 mt-0.5">Calculated using auditable database records</p>
            </div>

            <div className="flex items-center gap-6 text-right">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Payable</span>
                <span className="text-base font-black text-slate-900">₹{activeCust.totalAmount}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Paid</span>
                <span className="text-base font-black text-emerald-700">₹{totalPaidInMonth || activeCust.paidAmount}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Closing Balance</span>
                <span className={`text-xl font-black ${activeCust.balance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  ₹{activeCust.balance}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
