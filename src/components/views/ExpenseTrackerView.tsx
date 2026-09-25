import React, { useState, useMemo } from 'react';
import { Expense } from '../../types/mess';
import { 
  Receipt, 
  ArrowLeft, 
  Plus, 
  Search, 
  Calendar, 
  DollarSign, 
  Download, 
  Filter, 
  Trash2, 
  X, 
  CheckCircle2,
  PieChart
} from 'lucide-react';

interface ExpenseTrackerViewProps {
  expenses: Expense[];
  onBack: () => void;
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onDeleteExpense?: (id: string) => void;
}

// 16 Standard Mess Operational Categories (Step 13 exact list)
export const EXPENSE_CATEGORIES = [
  'Cylinder / Gas',
  'Vegetables',
  'Rice',
  'Dal & Pulses',
  'Atta / Wheat Flour',
  'Cooking Oil',
  'Spices & Masala',
  'Grocery & Provisions',
  'Milk & Dairy',
  'Mess Rent',
  'Electricity Bill',
  'Water Supply',
  'Cleaning & Sanitation',
  'Kitchen Maintenance',
  'Staff Wages & Advance',
  'Transportation & Delivery',
  'Other Operational'
] as const;

export const ExpenseTrackerView: React.FC<ExpenseTrackerViewProps> = ({
  expenses,
  onBack,
  onAddExpense,
  onDeleteExpense
}) => {
  const [selectedMonth, setSelectedMonth] = useState('2026-09');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Add Expense Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidTo, setPaidTo] = useState('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'bank_transfer' | 'other'>('cash');
  const [billNumber, setBillNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [recordedBy, setRecordedBy] = useState('Owner Desk');

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const matchesMonth = !selectedMonth || (e.date && e.date.startsWith(selectedMonth));
      const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q ||
        (e.paidTo && e.paidTo.toLowerCase().includes(q)) ||
        (e.notes && e.notes.toLowerCase().includes(q)) ||
        (e.category && e.category.toLowerCase().includes(q)) ||
        e.amount.toString().includes(q);

      return matchesMonth && matchesCategory && matchesSearch;
    });
  }, [expenses, selectedMonth, categoryFilter, searchTerm]);

  // Aggregate stats
  const totalMonthlyExpense = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Category-wise Breakdown
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    filteredExpenses.forEach(e => {
      const current = map.get(e.category) || 0;
      map.set(e.category, current + e.amount);
    });
    return Array.from(map.entries())
      .map(([cat, amt]) => ({ category: cat, amount: amt, percent: totalMonthlyExpense > 0 ? Math.round((amt / totalMonthlyExpense) * 100) : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses, totalMonthlyExpense]);

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    onAddExpense({
      category: category as any,
      amount: Number(amount),
      date: expenseDate,
      paidTo: paidTo.trim() || 'Vendor',
      paymentMode,
      billNumber: billNumber.trim() || undefined,
      notes: notes.trim() || undefined,
      recordedBy: recordedBy.trim() || 'Owner Desk'
    });

    setAmount('');
    setPaidTo('');
    setBillNumber('');
    setNotes('');
    setIsAddOpen(false);
  };

  const handleExportCSV = () => {
    let csv = `Date,Category,Amount (₹),Vendor / Paid To,Payment Mode,Bill #,Recorded By,Notes\n`;
    filteredExpenses.forEach(e => {
      csv += `"${e.date}","${e.category}",${e.amount},"${e.paidTo || ''}","${e.paymentMode}","${e.billNumber || ''}","${e.recordedBy || ''}","${(e.notes || '').replace(/"/g, '""')}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Expenses_${selectedMonth}.csv`);
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
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-rose-600" />
              <span>Mess Expense Tracker & Procurement Desk</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive 16-category cost management, gas cylinder, vegetable, milk, and rent audits
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record New Expense</span>
          </button>
        </div>
      </div>

      {/* KPI Cards & Month Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Monthly Expenses</span>
          <div className="text-2xl font-black text-rose-600">₹{totalMonthlyExpense.toLocaleString()}</div>
          <span className="text-[11px] text-slate-400 font-medium">Recorded for {selectedMonth}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Expense Items</span>
          <div className="text-2xl font-black text-slate-900">{filteredExpenses.length}</div>
          <span className="text-[11px] text-slate-400 font-medium">Vendor transactions logged</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Filter Billing Month</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full mt-1 p-2 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-xs text-slate-900"
          />
        </div>
      </div>

      {/* Category Wise Breakdown Chart Strip */}
      {categoryBreakdown.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <PieChart className="w-4 h-4 text-orange-600" />
            <span>Category-wise Spending Breakdown</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {categoryBreakdown.slice(0, 8).map(cb => (
              <div key={cb.category} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 truncate">{cb.category}</span>
                  <span className="text-[10px] font-bold text-slate-400">{cb.percent}%</span>
                </div>
                <div className="font-black text-slate-900">₹{cb.amount.toLocaleString()}</div>
                <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: `${Math.min(100, cb.percent)}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Record Expense Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-rose-600" />
                <span>Record New Expense Entry</span>
              </h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">Expense Category (16 Standard Types)</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900"
                >
                  {EXPENSE_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 1450"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-black text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Expense Date</label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Vendor / Paid To</label>
                <input
                  type="text"
                  placeholder="e.g. Bharat Gas / Latur Mandi"
                  value={paidTo}
                  onChange={(e) => setPaidTo(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Payment Method</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-900"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI / Online</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="other">Other / Credit</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Bill / Invoice # (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. INV-8492"
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Recorded By</label>
                <input
                  type="text"
                  value={recordedBy}
                  onChange={(e) => setRecordedBy(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">Remarks / Items Purchased</label>
                <input
                  type="text"
                  placeholder="e.g. 2 Commercial gas cylinders 19kg refill"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-900"
                />
              </div>

              <div className="sm:col-span-2 pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  Save Expense Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="p-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800"
            >
              <option value="all">All Categories</option>
              {EXPENSE_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="font-bold text-slate-800 text-sm">No Expenses Recorded</h4>
            <p className="text-xs text-slate-500 mt-0.5">Click "Record New Expense" to log procurement receipts.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Amount</th>
                  <th className="px-5 py-3.5">Vendor / Paid To</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Payment</th>
                  <th className="px-5 py-3.5">Notes</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3.5">
                      <span className="font-black text-slate-900 block">{e.category}</span>
                      {e.billNumber && <span className="text-[10px] text-slate-400 font-mono">Bill #{e.billNumber}</span>}
                    </td>
                    <td className="px-5 py-3.5 font-black text-rose-600 text-sm">
                      ₹{e.amount}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-700">
                      {e.paidTo || 'Vendor'}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">
                      {e.date}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono uppercase font-bold text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {e.paymentMode}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-[11px] max-w-xs truncate">
                      {e.notes || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {onDeleteExpense && (
                        <button
                          onClick={() => onDeleteExpense(e.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
