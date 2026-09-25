import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  FileSpreadsheet, 
  Download, 
  Users, 
  CheckCircle2, 
  Calendar, 
  Receipt, 
  DollarSign, 
  TrendingUp, 
  Check, 
  AlertCircle,
  Clock,
  Filter
} from 'lucide-react';
import { Customer, MealLog, Expense, Worker, TrialVisitor, SupabasePaymentRecord } from '../../types/mess';
import { exportToSpreadsheet } from '../../lib/exportUtils';
import { fetchPaymentsFromSupabase } from '../../lib/ownerFeaturesApi';

interface ExcelExportHubViewProps {
  customers: Customer[];
  mealLogs: MealLog[];
  expenses: Expense[];
  workers: Worker[];
  trials: TrialVisitor[];
  onBack: () => void;
}

export const ExcelExportHubView: React.FC<ExcelExportHubViewProps> = ({
  customers,
  mealLogs,
  expenses,
  workers,
  trials,
  onBack
}) => {
  const [payments, setPayments] = useState<SupabasePaymentRecord[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'xlsx' | 'csv'>('xlsx');
  
  // Status & Date Filters
  const [customerStatusFilter, setCustomerStatusFilter] = useState<'all' | 'active' | 'expiring_soon' | 'expired'>('all');
  const [attendanceDate, setAttendanceDate] = useState<string>(''); // empty = all
  const [paymentModeFilter, setPaymentModeFilter] = useState<'all' | 'upi' | 'cash' | 'bank_transfer'>('all');
  const [expenseMonth, setExpenseMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [exportFeedback, setExportFeedback] = useState<{ id: string; message: string; type: 'success' | 'error' } | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    setIsLoadingPayments(true);
    fetchPaymentsFromSupabase()
      .then(res => setPayments(res))
      .catch(() => {})
      .finally(() => setIsLoadingPayments(false));
  }, []);

  const triggerFeedback = (id: string, message: string, type: 'success' | 'error') => {
    setExportFeedback({ id, message, type });
    setTimeout(() => setExportFeedback(null), 4000);
  };

  // 1. Export Customers
  const handleExportCustomers = () => {
    const filtered = customers.filter(c => {
      if (customerStatusFilter === 'all') return true;
      return c.status === customerStatusFilter;
    });

    if (filtered.length === 0) {
      triggerFeedback('customers', 'No data available for the selected filters.', 'error');
      return;
    }

    const data = filtered.map(c => ({
      'Customer ID': c.id,
      'Full Name': c.name,
      'Phone Number': c.phone,
      'Gender': c.gender ? c.gender.toUpperCase() : 'N/A',
      'College / Hostel': c.college || c.collegeOrWork || c.hostel || c.hostelOrAddress || 'Hostel',
      'Plan Type': (c.planType || 'monthly').replace(/_/g, ' ').toUpperCase(),
      'Start Date': c.startDate || 'N/A',
      'End Date': c.endDate || 'N/A',
      'Total Plan Fee (INR)': Number(c.totalAmount || 0),
      'Amount Paid (INR)': Number(c.paidAmount || 0),
      'Balance Due (INR)': Number(c.balance || 0),
      'Status': (c.status || 'active').replace(/_/g, ' ').toUpperCase(),
      'QR Token ID': c.qrToken || 'N/A',
      'Registration Date': c.createdAt ? c.createdAt.split('T')[0] : 'N/A'
    }));

    const result = exportToSpreadsheet(data, {
      filename: `Morya_Mess_Customers_${todayStr}`,
      sheetName: 'Customers_Directory',
      format: selectedFormat
    });

    if (result.success) {
      triggerFeedback('customers', `Exported ${filtered.length} customer records to ${selectedFormat.toUpperCase()}!`, 'success');
    } else {
      triggerFeedback('customers', result.message || 'Export failed. Please try again.', 'error');
    }
  };

  // 2. Export Attendance Report
  const handleExportAttendance = () => {
    const filtered = mealLogs.filter(l => {
      if (!attendanceDate) return true;
      return l.date === attendanceDate;
    });

    if (filtered.length === 0) {
      triggerFeedback('attendance', 'No data available for the selected filters.', 'error');
      return;
    }

    const data = filtered.map(l => ({
      'Log ID': l.id,
      'Date': l.date,
      'Time': new Date(l.timestamp).toLocaleTimeString(),
      'Customer ID': l.customerId,
      'Customer Name': l.customerName,
      'Meal Type': l.mealType.toUpperCase(),
      'Verification Status': l.scanStatus,
      'Audit Reason': l.reason,
      'Override Used': l.overridden ? 'YES' : 'NO',
      'Override Notes': l.overrideNotes || ''
    }));

    const result = exportToSpreadsheet(data, {
      filename: `Morya_Mess_Attendance_${attendanceDate || todayStr}`,
      sheetName: 'Attendance_Logs',
      format: selectedFormat
    });

    if (result.success) {
      triggerFeedback('attendance', `Exported ${filtered.length} meal attendance entries!`, 'success');
    } else {
      triggerFeedback('attendance', result.message || 'Export failed. Please try again.', 'error');
    }
  };

  // 3. Export Payment Report
  const handleExportPayments = () => {
    const filtered = payments.filter(p => {
      if (paymentModeFilter === 'all') return true;
      return p.paymentMode === paymentModeFilter;
    });

    if (filtered.length === 0) {
      triggerFeedback('payments', 'No data available for the selected filters.', 'error');
      return;
    }

    const data = filtered.map(p => ({
      'Payment ID': p.id,
      'Customer ID': p.customerId,
      'Customer Name': p.customerName || 'Diner',
      'Customer Phone': p.customerPhone || '',
      'Amount (INR)': Number(p.amount || 0),
      'Payment Mode': (p.paymentMode || 'cash').toUpperCase(),
      'UTR / Transaction Reference': p.transactionReference || '',
      'Payment Status': (p.status || 'verified').toUpperCase(),
      'Recorded By': p.recordedBy || 'Owner Desk',
      'Date': p.createdAt ? p.createdAt.split('T')[0] : 'N/A',
      'Time': p.createdAt ? new Date(p.createdAt).toLocaleTimeString() : 'N/A',
      'Notes': p.notes || ''
    }));

    const result = exportToSpreadsheet(data, {
      filename: `Morya_Mess_Payments_${todayStr}`,
      sheetName: 'Payment_Transactions',
      format: selectedFormat
    });

    if (result.success) {
      triggerFeedback('payments', `Exported ${filtered.length} payment records!`, 'success');
    } else {
      triggerFeedback('payments', result.message || 'Export failed. Please try again.', 'error');
    }
  };

  // 4. Export Expenses Report
  const handleExportExpenses = () => {
    const filtered = expenses.filter(e => {
      if (!expenseMonth) return true;
      return e.date.startsWith(expenseMonth);
    });

    if (filtered.length === 0) {
      triggerFeedback('expenses', 'No data available for the selected filters.', 'error');
      return;
    }

    const data = filtered.map(e => ({
      'Expense ID': e.id,
      'Date': e.date,
      'Category': (e.category || 'other').replace(/_/g, ' ').toUpperCase(),
      'Description / Item': e.title || e.paidTo || 'Mess Item',
      'Amount (INR)': Number(e.amount || 0),
      'Vendor / Paid To': e.paidTo || 'Vendor',
      'Payment Mode': (e.paymentMode || 'cash').toUpperCase(),
      'Bill / Invoice #': e.billNumber || '',
      'Recorded By': e.recordedBy || 'Owner Desk',
      'Notes': e.notes || ''
    }));

    const result = exportToSpreadsheet(data, {
      filename: `Morya_Mess_Expenses_${expenseMonth || todayStr}`,
      sheetName: 'Expense_Ledger',
      format: selectedFormat
    });

    if (result.success) {
      triggerFeedback('expenses', `Exported ${filtered.length} expense rows!`, 'success');
    } else {
      triggerFeedback('expenses', result.message || 'Export failed. Please try again.', 'error');
    }
  };

  // 5. Export Monthly Statements
  const handleExportMonthlyStatements = () => {
    if (customers.length === 0) {
      triggerFeedback('statements', 'No data available for the selected filters.', 'error');
      return;
    }

    const data = customers.map(c => {
      const custPayments = payments.filter(p => p.customerId === c.id || (p.customerPhone && p.customerPhone === c.phone));
      const totalPaid = custPayments.filter(p => p.status === 'verified').reduce((sum, p) => sum + p.amount, 0) || c.paidAmount;
      const upiTotal = custPayments.filter(p => p.paymentMode === 'upi' && p.status === 'verified').reduce((sum, p) => sum + p.amount, 0);
      const cashTotal = custPayments.filter(p => p.paymentMode === 'cash' && p.status === 'verified').reduce((sum, p) => sum + p.amount, 0);

      return {
        'Customer ID': c.id,
        'Name': c.name,
        'Phone': c.phone,
        'Plan': (c.planType || 'Monthly').replace(/_/g, ' ').toUpperCase(),
        'Billing Cycle Start': c.startDate || 'N/A',
        'Billing Cycle End': c.endDate || 'N/A',
        'Total Rate (INR)': Number(c.totalAmount || 0),
        'Total Paid (INR)': Number(totalPaid),
        'UPI Paid (INR)': Number(upiTotal),
        'Cash Paid (INR)': Number(cashTotal),
        'Balance Outstanding (INR)': Number(Math.max(0, (c.totalAmount || 0) - totalPaid)),
        'Payment Status': (c.balance || 0) <= 0 ? 'PAID' : 'PENDING'
      };
    });

    const currentMonth = todayStr.slice(0, 7);
    const result = exportToSpreadsheet(data, {
      filename: `Morya_Mess_Monthly_Statement_${currentMonth}`,
      sheetName: 'Monthly_Statements',
      format: selectedFormat
    });

    if (result.success) {
      triggerFeedback('statements', `Exported ${data.length} student monthly statements!`, 'success');
    } else {
      triggerFeedback('statements', result.message || 'Export failed. Please try again.', 'error');
    }
  };

  // 6. Export Business P&L Summary
  const handleExportBusinessSummary = () => {
    const totalRev = customers.reduce((sum, c) => sum + c.paidAmount, 0);
    const totalExp = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalPending = customers.reduce((sum, c) => sum + c.balance, 0);

    const summaryData = [
      { 'Metric Category': 'REVENUE', 'Metric Name': 'Subscription Inflow', 'Value (INR)': totalRev, 'Notes': 'Verified collections from active students' },
      { 'Metric Category': 'REVENUE', 'Metric Name': 'Trial Diner Inflow', 'Value (INR)': trials.reduce((s, t) => s + t.amountPaid, 0), 'Notes': '1 or 2 day trial guest visits' },
      { 'Metric Category': 'REVENUE', 'Metric Name': 'Gross Inflow', 'Value (INR)': totalRev + trials.reduce((s, t) => s + t.amountPaid, 0), 'Notes': 'Total money collected' },
      { 'Metric Category': 'EXPENSE', 'Metric Name': 'Ration & Kitchen Expenses', 'Value (INR)': totalExp, 'Notes': 'Provisions, vegetables, gas, maintenance' },
      { 'Metric Category': 'PROFIT', 'Metric Name': 'Net Operational Profit', 'Value (INR)': (totalRev + trials.reduce((s, t) => s + t.amountPaid, 0)) - totalExp, 'Notes': 'Gross Inflow minus Expenses' },
      { 'Metric Category': 'RECEIVABLE', 'Metric Name': 'Outstanding Dues / Pending Fees', 'Value (INR)': totalPending, 'Notes': 'Pending balance to collect from members' }
    ];

    const result = exportToSpreadsheet(summaryData, {
      filename: `Morya_Mess_Business_Summary_${todayStr}`,
      sheetName: 'Business_Summary',
      format: selectedFormat
    });

    if (result.success) {
      triggerFeedback('summary', 'Exported comprehensive Business P&L Summary spreadsheet!', 'success');
    } else {
      triggerFeedback('summary', result.message || 'Export failed. Please try again.', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span>Excel & Spreadsheet Export Hub</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Generate and download genuine, spreadsheet-compatible Excel (.xlsx) and CSV reports with active filters
            </p>
          </div>
        </div>

        {/* Format Selector */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl text-xs font-bold self-start sm:self-auto">
          <span className="text-[11px] text-slate-500 px-2">Download as:</span>
          <button
            onClick={() => setSelectedFormat('xlsx')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition ${
              selectedFormat === 'xlsx' 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            Excel (.xlsx)
          </button>
          <button
            onClick={() => setSelectedFormat('csv')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition ${
              selectedFormat === 'csv' 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            CSV (.csv)
          </button>
        </div>
      </div>

      {/* Global Notice */}
      <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 text-xs flex items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <span className="font-bold">Android Chrome & Desktop Compatible:</span>
            <span className="text-emerald-800 ml-1">
              All exports generate clean binary files with formatted headers, numeric amounts, and automatic column widths.
            </span>
          </div>
        </div>
      </div>

      {/* Module Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Customer Report */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">1. Customer Report</h3>
                  <span className="text-[11px] text-slate-400 font-mono">{customers.length} total diners registered</span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200">
                Directory
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Export customer names, mobile numbers, college/hostel addresses, active dates, plan rates, and dues.
            </p>

            <div className="pt-2">
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Status Filter</label>
              <select
                value={customerStatusFilter}
                onChange={(e) => setCustomerStatusFilter(e.target.value as any)}
                className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800"
              >
                <option value="all">All Statuses ({customers.length})</option>
                <option value="active">Active Only ({customers.filter(c => c.status === 'active').length})</option>
                <option value="expiring_soon">Expiring Soon ({customers.filter(c => c.status === 'expiring_soon').length})</option>
                <option value="expired">Expired Members ({customers.filter(c => c.status === 'expired').length})</option>
              </select>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            {exportFeedback?.id === 'customers' && (
              <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                exportFeedback.type === 'success' ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
              }`}>
                {exportFeedback.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                <span>{exportFeedback.message}</span>
              </div>
            )}
            <button
              onClick={handleExportCustomers}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Export Customers (.{selectedFormat})</span>
            </button>
          </div>
        </div>

        {/* Card 2: Attendance Report */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">2. Attendance Report</h3>
                  <span className="text-[11px] text-slate-400 font-mono">{mealLogs.length} total meal scans logged</span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                Gate Scans
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Download gate scanner timestamps, customer IDs, meal shifts (Lunch/Dinner), scan results, and override logs.
            </p>

            <div className="pt-2">
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Date Filter (Optional)</label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Leave empty to export all recorded dates</span>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            {exportFeedback?.id === 'attendance' && (
              <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                exportFeedback.type === 'success' ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
              }`}>
                {exportFeedback.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                <span>{exportFeedback.message}</span>
              </div>
            )}
            <button
              onClick={handleExportAttendance}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Export Attendance (.{selectedFormat})</span>
            </button>
          </div>
        </div>

        {/* Card 3: Payment Report */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">3. Payment Report</h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {isLoadingPayments ? 'Loading...' : `${payments.length} verified transactions`}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                Financials
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Download complete payment transactions with UTR references, cash entries, timestamps, and customer accounts.
            </p>

            <div className="pt-2">
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Payment Method</label>
              <select
                value={paymentModeFilter}
                onChange={(e) => setPaymentModeFilter(e.target.value as any)}
                className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800"
              >
                <option value="all">All Modes (UPI & Cash)</option>
                <option value="upi">UPI Payments Only</option>
                <option value="cash">Counter Cash Payments Only</option>
              </select>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            {exportFeedback?.id === 'payments' && (
              <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                exportFeedback.type === 'success' ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
              }`}>
                {exportFeedback.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                <span>{exportFeedback.message}</span>
              </div>
            )}
            <button
              onClick={handleExportPayments}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Export Payments (.{selectedFormat})</span>
            </button>
          </div>
        </div>

        {/* Card 4: Expense Report */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">4. Expense Report</h3>
                  <span className="text-[11px] text-slate-400 font-mono">{expenses.length} expense vouchers</span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                Purchases
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Download grocery, vegetable, gas cylinder, worker salary, and maintenance expense vouchers with bill numbers.
            </p>

            <div className="pt-2">
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Expense Month</label>
              <input
                type="month"
                value={expenseMonth}
                onChange={(e) => setExpenseMonth(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800"
              />
            </div>
          </div>

          <div className="pt-2 space-y-2">
            {exportFeedback?.id === 'expenses' && (
              <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                exportFeedback.type === 'success' ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
              }`}>
                {exportFeedback.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                <span>{exportFeedback.message}</span>
              </div>
            )}
            <button
              onClick={handleExportExpenses}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Export Expenses (.{selectedFormat})</span>
            </button>
          </div>
        </div>

        {/* Card 5: Monthly Statement */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">5. Monthly Statements</h3>
                  <span className="text-[11px] text-slate-400 font-mono">Customer balance ledger</span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                Audited Statements
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Export end-of-month statements for all active diner accounts including subscription charges, amounts paid, and net balance dues.
            </p>
          </div>

          <div className="pt-2 space-y-2">
            {exportFeedback?.id === 'statements' && (
              <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                exportFeedback.type === 'success' ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
              }`}>
                {exportFeedback.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                <span>{exportFeedback.message}</span>
              </div>
            )}
            <button
              onClick={handleExportMonthlyStatements}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Export Monthly Statements (.{selectedFormat})</span>
            </button>
          </div>
        </div>

        {/* Card 6: Business P&L Summary */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">6. Business P&L Summary</h3>
                  <span className="text-[11px] text-slate-400 font-mono">Net operational performance</span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200">
                P&L
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Executive business balance sheet comparing total customer fees, trial inflows, grocery purchases, and net profit.
            </p>
          </div>

          <div className="pt-2 space-y-2">
            {exportFeedback?.id === 'summary' && (
              <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                exportFeedback.type === 'success' ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
              }`}>
                {exportFeedback.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                <span>{exportFeedback.message}</span>
              </div>
            )}
            <button
              onClick={handleExportBusinessSummary}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Export P&L Summary (.{selectedFormat})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
