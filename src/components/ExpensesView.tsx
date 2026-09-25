import React, { useState } from 'react';
import { Expense, ExpenseCategory } from '../types/mess';
import { getTodayString } from '../lib/storage';
import { exportToSpreadsheet } from '../lib/exportUtils';
import { 
  Receipt, 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Flame, 
  Home, 
  Zap, 
  Droplet, 
  ShoppingBag, 
  Sparkles, 
  Users, 
  Wrench,
  X,
  Download
} from 'lucide-react';

interface ExpensesViewProps {
  expenses: Expense[];
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
}

const CATEGORY_CONFIG: Record<ExpenseCategory, { label: string; icon: React.ElementType }> = {
  ration_saman: { label: 'Ration & Groceries', icon: ShoppingBag },
  vegetables: { label: 'Vegetables & Mandi', icon: ShoppingBag },
  gas_cylinder: { label: 'Commercial Gas Cylinders', icon: Flame },
  rent: { label: 'Mess Premises Rent', icon: Home },
  electricity: { label: 'Electricity Bill', icon: Zap },
  water_tanker: { label: 'Water Tankers', icon: Droplet },
  cleaning_supplies: { label: 'Cleaning & Sanitization Supplies', icon: Sparkles },
  worker_salary: { label: 'Worker Salaries & Advances', icon: Users },
  repairs_maintenance: { label: 'Repairs & Utensil Maintenance', icon: Wrench },
  other: { label: 'Miscellaneous Expenses', icon: Receipt }
};

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  onAddExpense,
  onDeleteExpense
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Add Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('ration_saman');
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState(getTodayString());
  const [paidTo, setPaidTo] = useState('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'bank_transfer'>('upi');
  const [billNumber, setBillNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Computations
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const rationTotal = expenses
    .filter(e => e.category === 'ration_saman' || e.category === 'vegetables')
    .reduce((sum, e) => sum + e.amount, 0);
  const utilityTotal = expenses
    .filter(e => ['gas_cylinder', 'rent', 'electricity', 'water_tanker'].includes(e.category))
    .reduce((sum, e) => sum + e.amount, 0);

  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = 
      (e.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.paidTo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.billNumber && e.billNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = selectedCategory === 'ALL' || e.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount || Number(amount) <= 0) return;

    const newExp: Expense = {
      id: `exp-${Date.now()}`,
      title: title.trim(),
      category,
      amount: Number(amount),
      date,
      paidTo: paidTo.trim() || 'Vendor',
      paymentMode,
      billNumber: billNumber.trim(),
      notes: notes.trim()
    };

    onAddExpense(newExp);
    setIsAddOpen(false);
    // Reset form
    setTitle('');
    setAmount('');
    setPaidTo('');
    setBillNumber('');
    setNotes('');
  };

  const exportExpensesToCsv = () => {
    if (filteredExpenses.length === 0) {
      alert('No data available for the selected filters.');
      return;
    }

    const data = filteredExpenses.map(e => ({
      'Date': e.date,
      'Title / Description': e.title || e.paidTo || 'Expense',
      'Category': (CATEGORY_CONFIG[e.category]?.label || e.category).toUpperCase(),
      'Amount (INR)': Number(e.amount),
      'Paid To / Vendor': e.paidTo,
      'Payment Mode': e.paymentMode.toUpperCase(),
      'Bill / Voucher Number': e.billNumber || '',
      'Notes': e.notes || ''
    }));

    exportToSpreadsheet(data, {
      filename: `Morya_Mess_Expenses_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Expenses_Ledger',
      format: 'xlsx'
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Mess Expenses & Saman Audit</h2>
          <p className="text-xs text-slate-500">
            Track Ration, Gas, Rent, Water, Electricity & Supplies without missing a rupee
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={exportExpensesToCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
            title="Export Expense Ledger to CSV"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            id="btn-add-expense-open"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record New Expense</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Total Recorded Outflow</span>
          <div className="text-2xl font-bold text-rose-600 mt-1">₹{totalAmount.toLocaleString()}</div>
          <span className="text-[11px] text-slate-500">{expenses.length} invoices & vouchers</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Ration & Vegetables</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">₹{rationTotal.toLocaleString()}</div>
          <span className="text-[11px] text-emerald-700 font-semibold">Atta, Rice, Dal, Spices, Mandi</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Utilities (Gas, Rent, Water, Bijli)</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">₹{utilityTotal.toLocaleString()}</div>
          <span className="text-[11px] text-orange-700 font-semibold">Fixed operational overheads</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-expenses"
            type="text"
            placeholder="Search items, vendor, bill #..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-orange-600"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            id="select-expense-filter-cat"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:outline-none"
          >
            <option value="ALL">All Categories ({expenses.length})</option>
            {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses Table or Empty State */}
      {filteredExpenses.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <Receipt className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Expenses Recorded Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Keep clear records of ration purchases, cylinders, rent, water, and cleaning bills. Click below to add your first expense.
          </p>
          <button
            id="btn-empty-add-expense"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record First Expense</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Expense Item / Title</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Paid To (Vendor)</th>
                  <th className="px-4 py-3 font-semibold">Payment Mode</th>
                  <th className="px-4 py-3 font-semibold text-right">Amount (₹)</th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map(exp => {
                  const catCfg = CATEGORY_CONFIG[exp.category] || CATEGORY_CONFIG.other;
                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono text-slate-500">{exp.date}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{exp.title}</div>
                        {exp.notes && (
                          <div className="text-[11px] text-slate-500 italic truncate max-w-xs">{exp.notes}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 border border-slate-200 text-slate-700">
                          {catCfg.label.split('(')[0]}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {exp.paidTo}
                        {exp.billNumber && (
                          <span className="block text-[10px] font-mono text-slate-500">Bill: {exp.billNumber}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {exp.paymentMode}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-sm text-rose-600">
                        ₹{exp.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete expense "${exp.title}"?`)) {
                              onDeleteExpense(exp.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete Expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Expense Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden my-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Record Mess Expense</h3>
                  <p className="text-[11px] text-slate-500">Ration, Vegetables, Utilities & Overheads</p>
                </div>
              </div>
              <button
                id="btn-close-expense-modal"
                onClick={() => setIsAddOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="p-6 space-y-4 text-xs">
              <div>
                <label htmlFor="input-expense-title" className="block font-bold text-slate-800 mb-1">
                  Item Description *
                </label>
                <input
                  id="input-expense-title"
                  type="text"
                  required
                  placeholder="e.g. Atta 50kg, Cooking Oil 15L, Gas Cylinder, Rice"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="select-expense-cat" className="block font-bold text-slate-800 mb-1">
                    Expense Category *
                  </label>
                  <select
                    id="select-expense-cat"
                    value={category}
                    onChange={e => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-600"
                  >
                    {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="input-expense-amount" className="block font-bold text-slate-800 mb-1">
                    Amount Paid (₹) *
                  </label>
                  <input
                    id="input-expense-amount"
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 2400"
                    value={amount}
                    onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="input-expense-date" className="block font-bold text-slate-800 mb-1">
                    Date of Expense
                  </label>
                  <input
                    id="input-expense-date"
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-600"
                  />
                </div>

                <div>
                  <label htmlFor="input-expense-vendor" className="block font-bold text-slate-800 mb-1">
                    Paid To (Shop / Person)
                  </label>
                  <input
                    id="input-expense-vendor"
                    type="text"
                    placeholder="e.g. Laxmi Kirana, Mandi, Gas Agency"
                    value={paidTo}
                    onChange={e => setPaidTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={e => setPaymentMode(e.target.value as typeof paymentMode)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-600"
                  >
                    <option value="upi">UPI (GPay / PhonePe / QR)</option>
                    <option value="cash">Cash Counter</option>
                    <option value="bank_transfer">Bank Transfer / NEFT</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="input-expense-bill" className="block font-bold text-slate-800 mb-1">
                    Bill / Voucher # (Optional)
                  </label>
                  <input
                    id="input-expense-bill"
                    type="text"
                    placeholder="e.g. INV-892"
                    value={billNumber}
                    onChange={e => setBillNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-600"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="input-expense-notes" className="block font-bold text-slate-800 mb-1">
                  Remarks / Details
                </label>
                <input
                  id="input-expense-notes"
                  type="text"
                  placeholder="e.g. Monthly stock purchase, 50kg sacks"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-expense"
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save Expense</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
