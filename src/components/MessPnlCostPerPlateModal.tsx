import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Utensils, 
  Receipt, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Share2, 
  Printer, 
  Calendar, 
  Users, 
  ChevronRight, 
  Flame, 
  Sliders, 
  Info, 
  ArrowRight,
  ShieldCheck, 
  PlusCircle, 
  Clock, 
  Send, 
  Wallet, 
  PiggyBank,
  Percent,
  Check,
  Copy
} from 'lucide-react';
import { Customer, MealLog, Expense, Worker, BusinessRulesConfig } from '../types/mess';
import { 
  computeMessMonthlyPnl, 
  generatePnlWhatsAppSummary, 
  MonthPnlReport 
} from '../lib/messPnlEngine';

interface MessPnlCostPerPlateModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  mealLogs: MealLog[];
  expenses: Expense[];
  workers: Worker[];
  rules?: BusinessRulesConfig;
  onOpenAddExpense?: () => void;
  onOpenWhatsAppDues?: () => void;
}

export const MessPnlCostPerPlateModal: React.FC<MessPnlCostPerPlateModalProps> = ({
  isOpen,
  onClose,
  customers,
  mealLogs,
  expenses,
  workers,
  rules,
  onOpenAddExpense,
  onOpenWhatsAppDues
}) => {
  const currentMonthYear = new Date().toISOString().substring(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthYear);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // What-If Simulator States
  const [simFeeHike, setSimFeeHike] = useState<number>(100);
  const [simWasteReductionPct, setSimWasteReductionPct] = useState<number>(5);

  // Past 6 months selector
  const monthOptions = useMemo(() => {
    const list: Array<{ value: string; label: string }> = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = d.toISOString().substring(0, 7);
      const lbl = d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
      list.push({ value: val, label: lbl });
    }
    return list;
  }, []);

  const report: MonthPnlReport = useMemo(() => {
    return computeMessMonthlyPnl(
      selectedMonth,
      customers,
      mealLogs,
      expenses,
      workers,
      rules
    );
  }, [selectedMonth, customers, mealLogs, expenses, workers, rules]);

  // What-If Simulator
  const simExtraMonthlyRevenue = report.activeSubscribers * simFeeHike;
  const simMonthlyFoodSavings = Math.round(report.foodCostTotal * (simWasteReductionPct / 100));
  const simTotalExtraProfit = simExtraMonthlyRevenue + simMonthlyFoodSavings;
  const simNewNetProfit = report.netProfit + simTotalExtraProfit;

  if (!isOpen) return null;

  const handleShareWhatsApp = () => {
    const text = generatePnlWhatsAppSummary(report, rules?.messName || 'Morya Mess Pune');
    const ownerPhone = (rules?.contactPhone || '').replace(/[^0-9]/g, '');
    const cleanDigits = ownerPhone.length === 10 ? `91${ownerPhone}` : ownerPhone;
    const url = `https://wa.me/${cleanDigits}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopy = () => {
    const text = generatePnlWhatsAppSummary(report, rules?.messName || 'Morya Mess Pune');
    navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const isProfitable = report.netProfit >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[94vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-indigo-100 overflow-hidden my-auto">
        
        {/* HEADER - Royal Indigo & Emerald Accent (Zero black backgrounds) */}
        <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 text-white flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-inner shrink-0">
              <TrendingUp className="w-5 h-5 text-indigo-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Mess P&L & Cost Per Plate Economics
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-400/30 border border-emerald-300/40 text-[10px] font-black uppercase text-emerald-100">
                  Live Unit Economics
                </span>
              </div>
              <p className="text-xs text-indigo-100/90 font-medium">
                Detailed profit margins, exact plate cost breakdown & interactive growth simulator
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/25 text-white transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MONTH PICKER BAR */}
        <div className="px-5 py-3.5 bg-indigo-50/60 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-700">Audit Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white border border-indigo-200 px-3 py-1.5 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
            >
              {monthOptions.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {onOpenAddExpense && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAddExpense();
                }}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
                <span>Log Expense</span>
              </button>
            )}
            {onOpenWhatsAppDues && (
              <button
                onClick={() => {
                  onClose();
                  onOpenWhatsAppDues();
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Recover Dues</span>
              </button>
            )}
          </div>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* BIG FINANCIAL CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Net Profit */}
            <div className={`p-4.5 rounded-2xl border shadow-xs ${
              isProfitable 
                ? 'bg-emerald-50/70 border-emerald-200' 
                : 'bg-rose-50/70 border-rose-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Monthly Net Profit</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  isProfitable ? 'bg-emerald-200/80 text-emerald-900' : 'bg-rose-200/80 text-rose-900'
                }`}>
                  {report.netMarginPercentage.toFixed(1)}% Margin
                </span>
              </div>
              <div className={`text-2xl sm:text-3xl font-black mt-2 ${
                isProfitable ? 'text-emerald-700' : 'text-rose-600'
              }`}>
                {isProfitable ? '+' : '-'}₹{Math.abs(report.netProfit).toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-slate-500 font-semibold block mt-1">
                Total Revenue minus All Expenses
              </span>
            </div>

            {/* Total Revenue */}
            <div className="p-4.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Total Month Revenue</span>
              <div className="text-2xl sm:text-3xl font-black text-indigo-700 mt-2">
                ₹{report.totalRevenue.toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-slate-500 font-semibold block mt-1">
                {report.activeSubscribers} active subscribers
              </span>
            </div>

            {/* Total Cost Per Plate */}
            <div className="p-4.5 rounded-2xl bg-amber-50/70 border border-amber-200 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Real Cost Per Plate</span>
              <div className="text-2xl sm:text-3xl font-black text-amber-700 mt-2">
                ₹{report.costPerPlateTotal.toFixed(1)}
              </div>
              <span className="text-[11px] text-slate-600 font-semibold block mt-1">
                Avg Selling Price: <strong>₹{report.revenueRealizedPerPlate.toFixed(1)}</strong>
              </span>
            </div>
          </div>

          {/* EXACT PLATE COST ECONOMICS (Breakdown per thali) */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <Utensils className="w-4 h-4 text-indigo-600" />
                <span>Unit Economics: What 1 Thali Costs You to Make</span>
              </h3>
              <span className="text-xs font-bold text-slate-500">{report.totalMealsServed} plates served this month</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 font-semibold">Grocery / Sabji Cost</span>
                <div className="text-base font-black text-slate-800 mt-0.5">₹{report.costPerPlateFood.toFixed(1)}</div>
                <span className="text-[10px] text-slate-400">Grains, oil & vegetables</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 font-semibold">Cook & Staff Labor</span>
                <div className="text-base font-black text-slate-800 mt-0.5">₹{report.totalMealsServed > 0 ? (report.staffSalaryExpense / report.totalMealsServed).toFixed(1) : '0.0'}</div>
                <span className="text-[10px] text-slate-400">Salaries & helper wages</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 font-semibold">LPG Gas & Cylinder</span>
                <div className="text-base font-black text-slate-800 mt-0.5">₹{report.totalMealsServed > 0 ? (report.gasCylinderExpense / report.totalMealsServed).toFixed(1) : '0.0'}</div>
                <span className="text-[10px] text-slate-400">Commercial gas fuel</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-[11px] text-emerald-800 font-semibold">Profit Margin Per Plate</span>
                <div className="text-base font-black text-emerald-700 mt-0.5">
                  +₹{(report.revenueRealizedPerPlate - report.costPerPlateTotal).toFixed(1)}
                </div>
                <span className="text-[10px] text-emerald-600">Net gain on every scan</span>
              </div>
            </div>
          </div>

          {/* INTERACTIVE WHAT-IF PROFIT SIMULATOR */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-blue-50/50 to-indigo-50/70 border border-indigo-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-indigo-200/60">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-slate-900 text-sm">Interactive What-If Profit Growth Simulator</h3>
              </div>
              <span className="text-xs font-bold text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-indigo-200">
                Live Projections
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Lever 1: Fee Hike Slider */}
              <div className="bg-white p-3.5 rounded-xl border border-indigo-100">
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Monthly Fee Hike</span>
                  <span className="text-indigo-600 font-black">+₹{simFeeHike} / student</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="500"
                  step="50"
                  value={simFeeHike}
                  onChange={(e) => setSimFeeHike(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <span className="text-[11px] text-slate-400 block mt-1">
                  Adds <strong>+₹{simExtraMonthlyRevenue.toLocaleString('en-IN')}</strong> extra revenue every month
                </span>
              </div>

              {/* Lever 2: Waste Reduction Slider */}
              <div className="bg-white p-3.5 rounded-xl border border-indigo-100">
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Food Waste Reduction Target</span>
                  <span className="text-emerald-600 font-black">{simWasteReductionPct}% Saved</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={simWasteReductionPct}
                  onChange={(e) => setSimWasteReductionPct(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <span className="text-[11px] text-slate-400 block mt-1">
                  Saves <strong>+₹{simMonthlyFoodSavings.toLocaleString('en-IN')}</strong> in grocery costs
                </span>
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-indigo-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs text-slate-500 font-semibold">Projected Net Monthly Profit:</span>
                <div className="text-xl font-black text-emerald-700">₹{simNewNetProfit.toLocaleString('en-IN')}</div>
              </div>
              <div className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200">
                🚀 +₹{simTotalExtraProfit.toLocaleString('en-IN')} Extra Profit / Month
              </div>
            </div>
          </div>

          {/* SHARE SUMMARY ACTIONS */}
          <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-200/80 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-900 block">WhatsApp P&L Statement</span>
              <span className="text-[11px] text-slate-500">Send formatted audit statement with revenue, expenses and plate economics</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Report</span>
              </button>

              <button
                onClick={handleCopy}
                className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                {copiedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSuccess ? 'Copied!' : 'Copy Summary'}</span>
              </button>

              <button
                onClick={handleShareWhatsApp}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>WhatsApp Statement</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
