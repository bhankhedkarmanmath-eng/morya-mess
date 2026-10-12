import React, { useState, useMemo } from 'react';
import { 
  X, 
  Moon, 
  Send, 
  Copy, 
  Check, 
  Printer, 
  TrendingUp, 
  TrendingDown, 
  Utensils, 
  Calendar,
  AlertTriangle, 
  Receipt, 
  Wallet, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Share2,
  Calculator,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CircleDollarSign,
  Banknote,
  Smartphone
} from 'lucide-react';
import { Customer, MealLog, Expense, Worker, BusinessRulesConfig } from '../types/mess';
import { computeDailyPnlDigest, generateDailyProfitWhatsAppText } from '../lib/messPnlEngine';

interface DailyProfitDigestModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  mealLogs: MealLog[];
  expenses: Expense[];
  workers: Worker[];
  rules: BusinessRulesConfig;
}

export const DailyProfitDigestModal: React.FC<DailyProfitDigestModalProps> = ({
  isOpen,
  onClose,
  customers,
  mealLogs,
  expenses,
  workers,
  rules
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [copied, setCopied] = useState(false);
  const [ownerPhone, setOwnerPhone] = useState(rules.contactPhone || '919876543210');
  const [isCashDrawerOpen, setIsCashDrawerOpen] = useState(false);

  // Cash Denomination State
  const [denominations, setDenominations] = useState<{ [key: number]: number }>({
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0
  });

  const physicalCashTotal = useMemo(() => {
    return Object.entries(denominations).reduce((sum, [denom, count]) => {
      return sum + (Number(denom) * (Number(count) || 0));
    }, 0);
  }, [denominations]);

  const digest = useMemo(() => {
    return computeDailyPnlDigest(selectedDate, customers, mealLogs, expenses, workers, rules);
  }, [selectedDate, customers, mealLogs, expenses, workers, rules]);

  // Expected Cash calculation from today's cash entries
  const expectedCashInDrawer = useMemo(() => {
    let cashIn = 0;
    // Cash from customers payments on selectedDate
    customers.forEach(c => {
      (c.payments || []).forEach(p => {
        if (p.date === selectedDate && p.mode === 'cash') {
          cashIn += p.amount;
        }
      });
    });
    // Cash expenses paid out on selectedDate
    const cashExpensesOut = expenses
      .filter(e => e.date === selectedDate && ((e as any).paymentMode === 'cash' || (e as any).paymentMethod === 'cash' || !(e as any).paymentMode))
      .reduce((sum, e) => sum + e.amount, 0);

    return Math.max(0, cashIn - cashExpensesOut);
  }, [customers, expenses, selectedDate]);

  if (!isOpen) return null;

  const handleCopyText = () => {
    const text = generateDailyProfitWhatsAppText(digest, rules.messName || 'Morya Mess');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendWhatsApp = () => {
    const text = generateDailyProfitWhatsAppText(digest, rules.messName || 'Morya Mess');
    const cleanPhone = ownerPhone.replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handlePrintSlip = () => {
    window.print();
  };

  const shiftDay = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const isProfit = digest.netEstimatedDailyProfit >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-amber-200/80 overflow-hidden flex flex-col my-auto max-h-[94vh]">
        
        {/* HEADER - Warm Amber & Sunset Gradient (Zero black backgrounds) */}
        <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 text-white flex items-center justify-center shadow-inner shrink-0">
              <Moon className="w-5 h-5 text-amber-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  11:00 PM Daily Profit Digest & Closing
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-900/30 border border-amber-300/40 text-[10px] font-black uppercase tracking-wider text-amber-100">
                  Day Closing
                </span>
              </div>
              <p className="text-xs text-amber-100/90 font-medium">
                End-of-day cash reconciliation, scan counts, plate cost audit & WhatsApp closing digest
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

        {/* DATE SELECTOR BAR */}
        <div className="px-5 py-3 bg-amber-50/70 border-b border-amber-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => shiftDay(-1)}
              className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition cursor-pointer shadow-2xs"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-amber-200/80 shadow-2xs">
              <Calendar className="w-4 h-4 text-amber-600" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs font-black text-slate-800 bg-transparent focus:outline-none cursor-pointer"
              />
            </div>
            <button
              onClick={() => shiftDay(1)}
              className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition cursor-pointer shadow-2xs"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCashDrawerOpen(!isCashDrawerOpen)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
                isCashDrawerOpen 
                  ? 'bg-amber-600 text-white' 
                  : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Cash Tally Calculator</span>
            </button>
          </div>
        </div>

        {/* SCROLLABLE MAIN BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* TOP 3 BIG SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Daily Net Profit Card */}
            <div className={`p-4.5 rounded-2xl border transition shadow-xs ${
              isProfit 
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' 
                : 'bg-rose-50/70 border-rose-200 text-rose-900'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Net Estimated Profit</span>
                {isProfit ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 text-[10px] font-black uppercase">
                    Profitable
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-rose-200/80 text-rose-900 text-[10px] font-black uppercase">
                    Loss / High Cost
                  </span>
                )}
              </div>
              <div className={`text-2xl sm:text-3xl font-black mt-2 ${isProfit ? 'text-emerald-700' : 'text-rose-600'}`}>
                {isProfit ? '+' : '-'}₹{Math.abs(digest.netEstimatedDailyProfit).toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-slate-500 font-semibold block mt-1">
                Estimated day profit after groceries & staff costs
              </span>
            </div>

            {/* Total Meals Served */}
            <div className="p-4.5 rounded-2xl bg-orange-50/70 border border-orange-200 text-orange-950 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Total Plates Served</span>
              <div className="text-2xl sm:text-3xl font-black text-orange-600 mt-2">
                {digest.totalMealScans} Plates
              </div>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-600 font-semibold">
                <span>Lunch: <strong>{digest.lunchScans}</strong></span>
                <span>•</span>
                <span>Dinner: <strong>{digest.dinnerScans}</strong></span>
              </div>
            </div>

            {/* Real Production Cost Per Plate */}
            <div className="p-4.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-indigo-950 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Real Cost Per Plate</span>
              <div className="text-2xl sm:text-3xl font-black text-indigo-700 mt-2">
                ₹{digest.costPerPlateToday.toFixed(1)} / plate
              </div>
              <span className="text-[11px] text-slate-500 font-semibold block mt-1">
                Total Expenses ÷ Total Plates Served
              </span>
            </div>
          </div>

          {/* PHYSICAL CASH DRAWER TALLY (If toggled) */}
          {isCashDrawerOpen && (
            <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-200 shadow-2xs space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                <div className="flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-amber-700" />
                  <h3 className="font-black text-slate-900 text-sm">Physical Cash Drawer Tally (Galla Verification)</h3>
                </div>
                <span className="text-xs font-bold text-slate-500">Count cash notes before closing</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                {[500, 200, 100, 50, 20, 10].map((denom) => (
                  <div key={denom} className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[11px] font-black text-slate-700 block">₹{denom} Notes</span>
                    <input
                      type="number"
                      min="0"
                      value={denominations[denom] || ''}
                      placeholder="0"
                      onChange={(e) => setDenominations({ ...denominations, [denom]: Number(e.target.value) || 0 })}
                      className="w-full mt-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-sm font-black text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1 font-semibold">
                      = ₹{((denominations[denom] || 0) * denom).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-xl border border-amber-200">
                <div>
                  <span className="text-xs text-slate-500 font-semibold">Total Counted Cash in Galla:</span>
                  <div className="text-lg font-black text-emerald-700">₹{physicalCashTotal.toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-semibold">Expected Cash Balance:</span>
                  <div className="text-lg font-black text-slate-800">₹{expectedCashInDrawer.toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-semibold">Cash Tally Status:</span>
                  {physicalCashTotal === expectedCashInDrawer ? (
                    <div className="text-xs font-black text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Perfectly Matched!
                    </div>
                  ) : physicalCashTotal < expectedCashInDrawer ? (
                    <div className="text-xs font-black text-rose-600 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-rose-500" /> Shortage: ₹{(expectedCashInDrawer - physicalCashTotal).toLocaleString('en-IN')}
                    </div>
                  ) : (
                    <div className="text-xs font-black text-blue-600 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-blue-500" /> Excess: ₹{(physicalCashTotal - expectedCashInDrawer).toLocaleString('en-IN')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* FINANCIAL INFLOWS & OUTFLOWS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* INFLOWS */}
            <div className="p-4.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-black text-slate-900 text-sm flex items-center gap-1.5 text-emerald-700">
                  <TrendingUp className="w-4 h-4" /> Day Revenue Breakdown
                </span>
                <span className="font-black text-slate-900 text-sm">₹{(digest.totalCollected || digest.estimatedDailyRevenueShare).toLocaleString('en-IN')}</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-600">Active Diners Base ({digest.activeEligibleMembers} members)</span>
                  <span className="font-bold text-slate-800">₹{digest.estimatedDailyRevenueShare.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-600">Direct Cash Collected Today</span>
                  <span className="font-bold text-slate-800">₹{digest.cashCollected.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-600">Online UPI Payments Today</span>
                  <span className="font-bold text-slate-800">₹{digest.onlineUpiCollected.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 pt-2 font-bold text-emerald-800">
                  <span>Total Day Inflow</span>
                  <span className="text-sm">₹{(digest.totalCollected || digest.estimatedDailyRevenueShare).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* OUTFLOWS */}
            <div className="p-4.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-black text-slate-900 text-sm flex items-center gap-1.5 text-rose-700">
                  <TrendingDown className="w-4 h-4" /> Day Expenses Breakdown
                </span>
                <span className="font-black text-slate-900 text-sm">₹{digest.totalDailyExpenses.toLocaleString('en-IN')}</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-600">Daily Groceries, Sabji & Ration</span>
                  <span className="font-bold text-slate-800">₹{(digest.vegetablesCost + digest.dairyMilkCost + digest.groceryGrainsCost).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-600">Kitchen Staff & Cook Day Wage</span>
                  <span className="font-bold text-slate-800">₹{digest.staffDailyWages.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-600">LPG Gas & Fuel</span>
                  <span className="font-bold text-slate-800">₹{digest.gasFuelCost.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1 pt-2 font-bold text-rose-800">
                  <span>Total Day Outflow</span>
                  <span className="text-sm">₹{digest.totalDailyExpenses.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* SHARE DIGEST ACTIONS BAR */}
          <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-900 block">1-Click Partner / Manager Daily Digest</span>
              <span className="text-[11px] text-slate-500">Send formatted Marathi/English emoji summary to WhatsApp or print day slip</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrintSlip}
                className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Slip</span>
              </button>

              <button
                onClick={handleCopyText}
                className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
              </button>

              <button
                onClick={handleSendWhatsApp}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>WhatsApp Closing</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
