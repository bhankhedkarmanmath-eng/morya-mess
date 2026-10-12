import React, { useState, useEffect } from 'react';
import { 
  Customer, 
  MealLog, 
  Expense, 
  Worker, 
  CleaningInspection, 
  BusinessRulesConfig, 
  UserRole 
} from '../types/mess';
import { calculateDaysRemaining, getTodayString, getCurrentMealType, evaluateStrictMessShift, getCurrentTimeString } from '../lib/storage';
import { fetchInventoryFromSupabase } from '../lib/ownerFeaturesApi';
import { getTodayActiveSkipsCount } from '../lib/autoPilotSuite';
import { 
  Users, 
  Utensils, 
  Receipt, 
  Calendar, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  UserPlus, 
  QrCode,
  Clock,
  Package,
  Settings,
  ArrowRight,
  TrendingUp,
  Activity,
  Check,
  Trophy,
  PartyPopper,
  MessageSquare,
  ChefHat,
  ShieldCheck,
  Moon
} from 'lucide-react';

interface DashboardViewProps {
  customers: Customer[];
  mealLogs: MealLog[];
  expenses: Expense[];
  workers: Worker[];
  cleanings: CleaningInspection[];
  rules: BusinessRulesConfig;
  currentRole: UserRole;
  onOpenScanner: () => void;
  onOpenUniversalQr?: () => void;
  onOpenTrialQr?: () => void;
  onOpenPredictCampaignResults?: () => void;
  onOpenCampaignParticipants?: () => void;
  onOpenWhatsAppDuesBot?: () => void;
  onOpenAttendanceIntegrity?: () => void;
  onOpenKitchenEstimator?: () => void;
  onOpenMaharajCookSheet?: () => void;
  onOpenMessPnl?: () => void;
  onOpenDailyProfitDigest?: () => void;
  onOpenAddCustomer: () => void;
  onOpenAddExpense: () => void;
  onOpenCardPrint: (customer: Customer) => void;
  onOpenCustomer360: (customer: Customer) => void;
  onOpenRenew: (customer: Customer) => void;
  onOpenSettings: () => void;
  onNavigateTab: (tabId: string) => void;
  onApproveLeave: (customerId: string, leaveId: string, days: number) => void;
  onRejectLeave: (customerId: string, leaveId: string) => void;
  onCreateTestLeave?: () => void;
  onOpenLeaveApprovalsTab?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  customers,
  mealLogs,
  expenses,
  workers,
  cleanings,
  rules,
  currentRole,
  onOpenScanner,
  onOpenUniversalQr,
  onOpenTrialQr,
  onOpenPredictCampaignResults,
  onOpenCampaignParticipants,
  onOpenWhatsAppDuesBot,
  onOpenAttendanceIntegrity,
  onOpenKitchenEstimator,
  onOpenMaharajCookSheet,
  onOpenMessPnl,
  onOpenDailyProfitDigest,
  onOpenAddCustomer,
  onOpenAddExpense,
  onOpenCardPrint,
  onOpenCustomer360,
  onOpenRenew,
  onOpenSettings,
  onNavigateTab,
  onApproveLeave,
  onRejectLeave,
  onCreateTestLeave,
  onOpenLeaveApprovalsTab
}) => {
  const today = getTodayString();
  const currentShift = getCurrentMealType();

  // Leaves Calculations
  const allLeaves = customers
    .flatMap(c => (c.leaves || []).map(l => ({
      ...l,
      customerId: c.id,
      customerName: c.name,
      customerPhone: c.phone,
      customerEndDate: c.endDate
    })))
    .sort((a, b) => new Date(b.createdAt || b.startDate).getTime() - new Date(a.createdAt || a.startDate).getTime());

  const pendingLeaves = allLeaves.filter(l => !l.approved && l.status !== 'rejected');

  // Active / Expired / Expiring Soon Members
  const activeMembers = customers.filter(c => calculateDaysRemaining(c.endDate) >= 0);
  const femaleMembersCount = customers.filter(c => c.gender === 'female').length;
  const expiredMembers = customers.filter(c => calculateDaysRemaining(c.endDate) < 0);
  const expiringSoonMembers = customers.filter(c => {
    const days = calculateDaysRemaining(c.endDate);
    return days >= 0 && days <= (rules.expiringSoonAlertDays || 3);
  });

  // Today Meals
  const todayLogs = mealLogs.filter(m => m.date === today);
  const allowedToday = todayLogs.filter(m => m.scanStatus === 'ALLOW').length;
  const blockedToday = todayLogs.filter(m => m.scanStatus === 'BLOCK').length;
  const reviewToday = todayLogs.filter(m => m.scanStatus === 'REVIEW_REQUIRED').length;

  // Expected meals calculation (2 meals per active customer per day)
  const expectedMealsToday = activeMembers.length * 2;
  const attendanceRate = expectedMealsToday > 0 
    ? Math.min(100, Math.round((allowedToday / expectedMealsToday) * 100)) 
    : 0;

  // Financials
  const totalInflow = customers.reduce((sum, c) => {
    const renewalSum = c.renewals?.reduce((rSum, r) => rSum + r.paidAmount, 0) || 0;
    return sum + c.paidAmount + renewalSum;
  }, 0);
  const totalDues = customers.reduce((sum, c) => sum + c.balance, 0);
  const todayExpensesAmount = expenses
    .filter(e => e.date === today)
    .reduce((sum, e) => sum + e.amount, 0);

  const [shiftAudit, setShiftAudit] = useState(() => evaluateStrictMessShift());
  const [currentTime, setCurrentTime] = useState(() => getCurrentTimeString());
  const [skipTick, setSkipTick] = useState(0);
  const [inventoryStats, setInventoryStats] = useState<{ totalItems: number; lowStockCount: number; outOfStockCount: number }>({
    totalItems: 0,
    lowStockCount: 0,
    outOfStockCount: 0
  });

  // Re-sync on skip updates
  useEffect(() => {
    const handleSkipSync = () => setSkipTick(t => t + 1);
    window.addEventListener('morya_skips_updated', handleSkipSync);
    window.addEventListener('storage', handleSkipSync);
    return () => {
      window.removeEventListener('morya_skips_updated', handleSkipSync);
      window.removeEventListener('storage', handleSkipSync);
    };
  }, []);

  // Categorized Roti Calculation (Boys eat 4, Girls eat 3)
  const activeBoysMembers = activeMembers.filter(c => c.gender === 'male' || (c.gender !== 'female' && c.gender !== 'other'));
  const activeGirlsMembers = activeMembers.filter(c => c.gender === 'female');
  const leavesTodayRecords = allLeaves.filter(l => (l.approved || (l as any).status === 'approved') && l.startDate <= today && l.endDate >= today);
  const boysOnLeave = leavesTodayRecords.filter(l => {
    const cust = customers.find(c => c.id === l.customerId);
    return cust?.gender !== 'female';
  }).length;
  const girlsOnLeave = leavesTodayRecords.length - boysOnLeave;

  const currentShiftType = shiftAudit.mealType === 'dinner' ? 'dinner' : 'lunch';
  const currentShiftSkips = getTodayActiveSkipsCount(currentShiftType);
  const boysSkips = Math.round(currentShiftSkips * (activeBoysMembers.length / Math.max(1, activeMembers.length)));
  const girlsSkips = Math.max(0, currentShiftSkips - boysSkips);

  const netBoysDiners = Math.max(0, activeBoysMembers.length - boysOnLeave - boysSkips);
  const netGirlsDiners = Math.max(0, activeGirlsMembers.length - girlsOnLeave - girlsSkips);
  const rotisBoys = netBoysDiners * 4;
  const rotisGirls = netGirlsDiners * 3;
  const totalRotisNeeded = rotisBoys + rotisGirls;
  const totalAttaKg = +((totalRotisNeeded * 0.035).toFixed(1));

  // Automatic real-time background shift evaluator
  useEffect(() => {
    const timer = setInterval(() => {
      setShiftAudit(evaluateStrictMessShift());
      setCurrentTime(getCurrentTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Live Supabase inventory snapshot
  useEffect(() => {
    fetchInventoryFromSupabase().then(items => {
      if (items) {
        const low = items.filter(i => i.currentStock > 0 && i.currentStock <= i.minStockLevel).length;
        const out = items.filter(i => i.currentStock <= 0).length;
        setInventoryStats({
          totalItems: items.length,
          lowStockCount: low,
          outOfStockCount: out
        });
      }
    });
  }, []);

  const isCurrentlyOpen = shiftAudit.isShiftActive && rules.messStatus === 'open';

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Formatted date string (e.g. Wednesday · 30 September 2026)
  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).replace(',', ' ·');

  return (
    <div className="space-y-6">
      {/* 1. TOP GREETING & COMPACT LIVE STATUS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-b from-[#FFFDF9] via-[#FFFBF5] to-[#FFF6ED] border border-orange-200/70 shadow-[0_4px_20px_-4px_rgba(249,115,22,0.06),0_1px_3px_rgba(0,0,0,0.02)] ring-1 ring-orange-500/5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="px-2.5 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700 font-extrabold">{getGreeting()}, Admin 👋</span>
            <span aria-hidden="true" className="text-orange-200">·</span>
            <span className="text-slate-600 font-semibold">{formattedDate}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1.5 font-display">
            {rules.messName} <span className="text-orange-600">Operations Dashboard</span>
          </h1>
        </div>

        {/* Compact Live Status Badge */}
        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold border ${
            isCurrentlyOpen 
              ? 'bg-emerald-50/90 text-emerald-800 border-emerald-300/80 shadow-2xs' 
              : 'bg-slate-100 text-slate-700 border-slate-300'
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full ${isCurrentlyOpen ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span>
              {isCurrentlyOpen 
                ? `Active · ${shiftAudit.shiftTitle} (${shiftAudit.mealType === 'lunch' ? '10:30 AM – 3:00 PM' : '8:00 PM – 11:00 PM'})` 
                : `Closed · ${shiftAudit.reason}`}
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-50/40 border border-orange-200/70 text-slate-800 font-mono text-xs font-bold shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-orange-600" />
            <span>{currentTime} IST</span>
          </div>
        </div>
      </div>

      {/* 2. COMPACT PROFESSIONAL ACTION BAR */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-b from-[#FFFDF9] via-[#FFFBF5] to-[#FFF6ED] border border-orange-200/70 shadow-[0_4px_16px_-4px_rgba(249,115,22,0.05)] ring-1 ring-orange-500/5 flex items-center justify-between gap-2.5 flex-wrap">
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            id="btn-dash-add-customer"
            onClick={onOpenAddCustomer}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 hover:from-orange-600 hover:to-orange-800 text-white text-xs font-black transition cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>

          <button
            id="btn-dash-open-scanner"
            onClick={onOpenScanner}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xs font-black transition cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <QrCode className="w-4 h-4 text-amber-300" />
            <span>Gate Scanner</span>
          </button>

          {onOpenUniversalQr && (
            <button
              id="btn-dash-open-universal-qr"
              onClick={onOpenUniversalQr}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer shadow-xs active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>Standee QR</span>
            </button>
          )}

          {onOpenTrialQr && (
            <button
              id="btn-dash-open-trial-qr"
              onClick={onOpenTrialQr}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer shadow-xs active:scale-[0.98]"
              title="Open Trial Student Dining QR Standee"
            >
              <QrCode className="w-4 h-4 text-amber-200" />
              <span>Trial QR Standee</span>
            </button>
          )}

          {onOpenWhatsAppDuesBot && (
            <button
              id="btn-dash-whatsapp-dues"
              onClick={onOpenWhatsAppDuesBot}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black transition cursor-pointer shadow-xs active:scale-[0.98]"
              title="Auto-Pilot WhatsApp Dues Recovery & Renewal (Zero Cost)"
            >
              <MessageSquare className="w-4 h-4 text-emerald-200" />
              <span>Auto Dues Bot</span>
            </button>
          )}

          {onOpenAttendanceIntegrity && (
            <button
              id="btn-dash-attendance-integrity"
              onClick={onOpenAttendanceIntegrity}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 hover:from-purple-800 hover:to-blue-800 text-white text-xs font-black transition cursor-pointer shadow-xs active:scale-[0.98]"
              title="Gate Attendance Integrity & Anti-Theft AI"
            >
              <ShieldCheck className="w-4 h-4 text-amber-200" />
              <span>Gate Integrity</span>
            </button>
          )}

          {onOpenKitchenEstimator && (
            <button
              id="btn-dash-kitchen-estimator"
              onClick={onOpenKitchenEstimator}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-black transition cursor-pointer shadow-xs active:scale-[0.98]"
              title="Roti & Kitchen Preparation Estimator (Boys: 4, Girls: 3)"
            >
              <ChefHat className="w-4 h-4 text-amber-100" />
              <span>Roti Planner (Boys 4 • Girls 3)</span>
            </button>
          )}

          {onOpenMaharajCookSheet && (
            <button
              id="btn-dash-maharaj-cook-sheet"
              onClick={onOpenMaharajCookSheet}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-orange-700 hover:from-amber-700 hover:to-orange-800 text-white text-xs font-black transition cursor-pointer shadow-xs active:scale-[0.98]"
              title="Maharaj Daily Cook Sheet & Ration AI"
            >
              <ChefHat className="w-4 h-4 text-amber-100" />
              <span>Cook Sheet</span>
            </button>
          )}

          {onOpenMessPnl && (
            <button
              id="btn-dash-mess-pnl"
              onClick={onOpenMessPnl}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white text-xs font-black transition cursor-pointer shadow-xs active:scale-[0.98]"
              title="Mess P&L & Cost Per Plate"
            >
              <TrendingUp className="w-4 h-4 text-emerald-200" />
              <span>Mess P&L & Cost Per Plate</span>
            </button>
          )}

          {onOpenDailyProfitDigest && (
            <button
              id="btn-dash-daily-profit-digest"
              onClick={onOpenDailyProfitDigest}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-500 hover:to-yellow-500 text-amber-950 text-xs font-black transition cursor-pointer shadow-xs active:scale-[0.98] border border-amber-300"
              title="11:00 PM Daily Closing & Real Profit Digest"
            >
              <div className="w-5 h-5 rounded-lg bg-amber-950/10 border border-amber-900/20 flex items-center justify-center">
                <Moon className="w-3.5 h-3.5 text-amber-950 fill-amber-900/30" />
              </div>
              <span>11 PM Profit Digest</span>
            </button>
          )}

          <button
            onClick={onOpenAddExpense}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-orange-50/50 text-slate-800 border border-orange-200/70 hover:border-orange-300 text-xs font-bold transition cursor-pointer shadow-2xs active:scale-[0.98]"
          >
            <Receipt className="w-4 h-4 text-rose-500" />
            <span>Log Expense</span>
          </button>
        </div>

        <button
          onClick={onOpenSettings}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-orange-50/60 text-slate-700 hover:text-orange-700 border border-orange-200/70 hover:border-orange-300 text-xs font-extrabold transition cursor-pointer ml-auto active:scale-[0.98] shadow-2xs"
        >
          <Settings className="w-4 h-4 text-orange-600" />
          <span>Rules & Settings</span>
        </button>
      </div>

      {/* 3. FOUR TOP KPI METRIC BLOCKS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Active Members */}
        <div
          onClick={() => onNavigateTab('customers')}
          className="p-5 rounded-2xl bg-gradient-to-b from-[#FFFDF9] via-[#FFFBF5] to-[#FFF6ED] border border-orange-200/80 shadow-[0_4px_20px_-4px_rgba(249,115,22,0.07)] ring-1 ring-orange-500/10 hover:border-orange-400 hover:shadow-[0_8px_24px_-4px_rgba(249,115,22,0.14)] transition-all cursor-pointer space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Active Members</span>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 via-orange-600 to-amber-500 text-white flex items-center justify-center shadow-xs">
              <Users className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight font-mono">
            {activeMembers.length}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-orange-100/70">
            <span className="text-slate-600 font-extrabold">{femaleMembersCount} Hostel Girls</span>
            <span className="text-orange-600 font-extrabold group-hover:underline">View ➔</span>
          </div>
        </div>

        {/* 2. Meals Today */}
        <div
          onClick={() => onNavigateTab('meals')}
          className="p-5 rounded-2xl bg-gradient-to-b from-[#FFFDF9] via-[#FFFBF5] to-[#FFF6ED] border border-orange-200/80 shadow-[0_4px_20px_-4px_rgba(249,115,22,0.07)] ring-1 ring-orange-500/10 hover:border-orange-400 hover:shadow-[0_8px_24px_-4px_rgba(249,115,22,0.14)] transition-all cursor-pointer space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Meals Today</span>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-700 to-teal-700 text-white flex items-center justify-center shadow-xs">
              <Utensils className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight font-mono">
            {allowedToday}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-orange-100/70">
            <span className="text-slate-600 font-extrabold">Exp: ~{expectedMealsToday} meals</span>
            <span className="text-emerald-700 font-extrabold group-hover:underline">Audit ➔</span>
          </div>
        </div>

        {/* 3. Revenue Collected */}
        <div
          onClick={() => onNavigateTab('billing')}
          className="p-5 rounded-2xl bg-gradient-to-b from-[#FFFDF9] via-[#FFFBF5] to-[#FFF6ED] border border-orange-200/80 shadow-[0_4px_20px_-4px_rgba(249,115,22,0.07)] ring-1 ring-orange-500/10 hover:border-orange-400 hover:shadow-[0_8px_24px_-4px_rgba(249,115,22,0.14)] transition-all cursor-pointer space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Collected</span>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-indigo-700 text-white flex items-center justify-center shadow-xs">
              <Receipt className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight font-mono">
            ₹{totalInflow.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-orange-100/70">
            <span className="text-slate-600 font-extrabold">Fees & Renewals</span>
            <span className="text-indigo-600 font-extrabold group-hover:underline">Billing ➔</span>
          </div>
        </div>

        {/* 4. Pending Dues */}
        <div
          onClick={() => onNavigateTab('pending_payments')}
          className="p-5 rounded-2xl bg-gradient-to-b from-[#FFFDF9] via-[#FFFBF5] to-[#FFF6ED] border border-orange-200/80 shadow-[0_4px_20px_-4px_rgba(249,115,22,0.07)] ring-1 ring-orange-500/10 hover:border-orange-400 hover:shadow-[0_8px_24px_-4px_rgba(249,115,22,0.14)] transition-all cursor-pointer space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Pending Dues</span>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-700 to-red-700 text-white flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className={`text-2xl sm:text-3xl font-black tracking-tight font-mono ${totalDues > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
            ₹{totalDues.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-orange-100/70">
            <span className="text-slate-600 font-extrabold">{customers.filter(c => c.balance > 0).length} members</span>
            <span className="text-rose-600 font-extrabold group-hover:underline">Collect ➔</span>
          </div>
        </div>
      </div>

      {/* 4. TODAY'S OPERATIONS: ATTENDANCE PROGRESS, SERVICE STATUS & ROTI ESTIMATION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1: Attendance Rate */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-[#FFFDF9] via-[#FFFBF5] to-[#FFF6ED] border border-orange-200/80 shadow-[0_4px_20px_-4px_rgba(249,115,22,0.08)] ring-1 ring-orange-500/10 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-500 via-orange-600 to-amber-500 text-white flex items-center justify-center shadow-xs">
                <Activity className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-slate-900 font-display tracking-tight">Today's Dining Attendance</h3>
            </div>
            <span className="text-xs font-black text-orange-700 bg-orange-100/80 border border-orange-300/80 px-2.5 py-0.5 rounded-full shadow-2xs">
              {attendanceRate}% Rate
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600 font-medium">
                Present Today: <strong className="text-slate-950 font-black font-mono text-sm ml-0.5">{allowedToday}</strong> <span className="text-slate-500 font-semibold">meals</span>
              </span>
              <span className="text-slate-600 font-medium">
                Expected: <strong className="text-slate-800 font-bold font-mono ml-0.5">{expectedMealsToday}</strong> <span className="text-slate-500 font-semibold">meals</span>
              </span>
            </div>
            {/* Progress Bar with vibrant orange gradient */}
            <div className="w-full h-2.5 bg-orange-100/70 rounded-full overflow-hidden p-0.5 border border-orange-200/80 shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500 rounded-full transition-all duration-500 shadow-2xs" 
                style={{ width: `${Math.min(100, Math.max(0, attendanceRate))}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-orange-200/60">
            <span className="flex items-center gap-1.5 text-emerald-800 font-bold">
              <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
              <span>{blockedToday === 0 ? 'No gate access blocks today' : `${blockedToday} gate scans blocked`}</span>
            </span>
            <button
              onClick={() => onNavigateTab('attendance')}
              className="text-orange-600 hover:text-orange-700 font-black hover:underline cursor-pointer transition-colors"
            >
              Detailed Attendance ➔
            </button>
          </div>
        </div>

        {/* Card 2: Service Status */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-[#FFFDF9] via-[#FFFBF5] to-[#FFF6ED] border border-orange-200/80 shadow-[0_4px_20px_-4px_rgba(249,115,22,0.08)] ring-1 ring-orange-500/10 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-xs">
                <Utensils className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-slate-900 font-display tracking-tight">Mess Service Status</h3>
            </div>
            <span className="text-[11px] font-bold text-slate-600 bg-white/80 border border-orange-200/80 px-2 py-0.5 rounded-full shadow-2xs">
              Daily Schedule
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-0.5">
            {/* Lunch Card */}
            <div className="p-3 rounded-xl bg-gradient-to-b from-white to-orange-50/50 border border-orange-200/80 space-y-1.5 shadow-2xs hover:border-orange-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900">Lunch Service</span>
                <span className={`w-2.5 h-2.5 rounded-full ${shiftAudit.mealType === 'lunch' && shiftAudit.isShiftActive ? 'bg-emerald-500 ring-4 ring-emerald-100 animate-pulse' : 'bg-slate-300'}`} />
              </div>
              <div className="text-[11px] font-semibold text-slate-600 font-mono">10:30 AM – 3:00 PM</div>
              <div className="pt-0.5">
                {shiftAudit.mealType === 'lunch' && shiftAudit.isShiftActive ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-md">
                    ● Active Now
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                    Closed
                  </span>
                )}
              </div>
            </div>

            {/* Dinner Card */}
            <div className="p-3 rounded-xl bg-gradient-to-b from-white to-orange-50/50 border border-orange-200/80 space-y-1.5 shadow-2xs hover:border-orange-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900">Dinner Service</span>
                <span className={`w-2.5 h-2.5 rounded-full ${shiftAudit.mealType === 'dinner' && shiftAudit.isShiftActive ? 'bg-emerald-500 ring-4 ring-emerald-100 animate-pulse' : 'bg-slate-300'}`} />
              </div>
              <div className="text-[11px] font-semibold text-slate-600 font-mono">8:00 PM – 11:00 PM</div>
              <div className="pt-0.5">
                {shiftAudit.isSundayNightClosed ? (
                  <span className="inline-flex items-center text-[11px] font-bold text-amber-800 bg-amber-100/80 border border-amber-200 px-2 py-0.5 rounded-md">
                    Sunday Off
                  </span>
                ) : shiftAudit.mealType === 'dinner' && shiftAudit.isShiftActive ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-md">
                    ● Active Now
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[11px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                    Upcoming
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Live Roti & Kitchen Category Card (Boys: 4, Girls: 3) */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-[#FFFDF9] via-[#FFFBF5] to-[#FFF6ED] border border-orange-200/80 shadow-[0_4px_20px_-4px_rgba(249,115,22,0.08)] ring-1 ring-orange-500/10 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-orange-600 text-white flex items-center justify-center shadow-xs">
                <ChefHat className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-slate-900 font-display tracking-tight">Roti Production Planner</h3>
            </div>
            <span className="text-[10px] font-black text-orange-800 bg-orange-100/90 border border-orange-300 px-2.5 py-0.5 rounded-full uppercase tracking-wide shadow-2xs">
              Boys 4 • Girls 3
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-0.5 text-xs">
            <div className="p-3 rounded-xl bg-gradient-to-b from-white to-orange-50/50 border border-orange-200/80 shadow-2xs hover:border-orange-300 transition-colors">
              <div className="flex items-center justify-between text-slate-900 font-black text-xs">
                <span>👦 Boys (4/ea)</span>
                <span className="font-mono text-blue-700 font-black text-sm">{rotisBoys}</span>
              </div>
              <div className="text-[11px] text-slate-500 font-semibold mt-0.5">{netBoysDiners} Diners</div>
            </div>

            <div className="p-3 rounded-xl bg-gradient-to-b from-white to-orange-50/50 border border-orange-200/80 shadow-2xs hover:border-orange-300 transition-colors">
              <div className="flex items-center justify-between text-slate-900 font-black text-xs">
                <span>👧 Girls (3/ea)</span>
                <span className="font-mono text-pink-600 font-black text-sm">{rotisGirls}</span>
              </div>
              <div className="text-[11px] text-slate-500 font-semibold mt-0.5">{netGirlsDiners} Diners</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-700 pt-1.5 border-t border-orange-200/60">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-slate-950 font-mono text-sm sm:text-base">{totalRotisNeeded} Rotis</span>
              <span className="text-[11px] font-extrabold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-200">
                {totalAttaKg} kg Atta
              </span>
            </div>
            {onOpenKitchenEstimator && (
              <button
                onClick={onOpenKitchenEstimator}
                className="text-orange-600 hover:text-orange-700 font-black hover:underline cursor-pointer flex items-center gap-0.5 transition-colors"
              >
                <span>Full Estimator</span>
                <span>➔</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. ATTENTION REQUIRED CENTER (Only when data exists) */}
      {(pendingLeaves.length > 0 || expiringSoonMembers.length > 0 || inventoryStats.lowStockCount > 0 || totalDues > 0) && (
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-[#FFFDF9] via-[#FFFBF5] to-[#FFF6ED] border border-orange-300/80 shadow-[0_4px_20px_-4px_rgba(249,115,22,0.08)] ring-1 ring-orange-500/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold shadow-xs">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-900 font-display">
                Attention Required ({pendingLeaves.length + expiringSoonMembers.length + (inventoryStats.lowStockCount > 0 ? 1 : 0) + (totalDues > 0 ? 1 : 0)} alerts)
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {pendingLeaves.length > 0 && (
              <div 
                onClick={() => onNavigateTab('leaves')}
                className="p-4 rounded-xl bg-gradient-to-b from-white to-orange-50/40 border border-orange-200/70 shadow-2xs hover:border-orange-300 hover:shadow-xs cursor-pointer space-y-1.5 transition group"
              >
                <div className="text-xs font-bold text-slate-900 group-hover:text-amber-700 transition-colors flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>{pendingLeaves.length} Leaves Awaiting Approval</span>
                </div>
                <p className="text-[11px] text-slate-500">Review & auto-extend dates</p>
                <div className="text-[11px] text-amber-700 font-bold group-hover:translate-x-0.5 transition-transform">Review leaves ➔</div>
              </div>
            )}

            {expiringSoonMembers.length > 0 && (
              <div 
                onClick={() => onNavigateTab('subscriptions')}
                className="p-4 rounded-xl bg-gradient-to-b from-white to-orange-50/40 border border-orange-200/70 shadow-2xs hover:border-orange-300 hover:shadow-xs cursor-pointer space-y-1.5 transition group"
              >
                <div className="text-xs font-bold text-slate-900 group-hover:text-amber-700 transition-colors flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>{expiringSoonMembers.length} Subscriptions Expiring</span>
                </div>
                <p className="text-[11px] text-slate-500">Follow up for renewals</p>
                <div className="text-[11px] text-amber-700 font-bold group-hover:translate-x-0.5 transition-transform">Review subscriptions ➔</div>
              </div>
            )}

            {inventoryStats.lowStockCount > 0 && (
              <div 
                onClick={() => onNavigateTab('inventory')}
                className="p-4 rounded-xl bg-gradient-to-b from-white to-orange-50/40 border border-orange-200/70 shadow-2xs hover:border-orange-300 hover:shadow-xs cursor-pointer space-y-1.5 transition group"
              >
                <div className="text-xs font-bold text-slate-900 group-hover:text-amber-700 transition-colors flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>{inventoryStats.lowStockCount} Items Low in Stock</span>
                </div>
                <p className="text-[11px] text-slate-500">Replenish kitchen essentials</p>
                <div className="text-[11px] text-amber-700 font-bold group-hover:translate-x-0.5 transition-transform">Manage stock ➔</div>
              </div>
            )}

            {totalDues > 0 && (
              <div 
                onClick={() => onNavigateTab('pending_payments')}
                className="p-4 rounded-xl bg-gradient-to-b from-rose-50/30 to-slate-50/60 border border-rose-200/70 shadow-2xs hover:border-rose-300 hover:shadow-xs cursor-pointer space-y-1.5 transition group"
              >
                <div className="text-xs font-bold text-slate-900 group-hover:text-rose-800 transition-colors flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span>₹{totalDues.toLocaleString()} Pending Dues</span>
                </div>
                <p className="text-[11px] text-slate-500">Uncollected student balances</p>
                <div className="text-[11px] text-rose-600 font-bold group-hover:translate-x-0.5 transition-transform">View pending dues ➔</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. STUDENT LEAVE APPROVAL DESK */}
      <div className="bg-gradient-to-b from-[#FFFDF9] via-[#FFFBF5] to-[#FFF6ED] rounded-2xl border border-orange-200/80 shadow-[0_4px_20px_-4px_rgba(249,115,22,0.06)] ring-1 ring-orange-500/5 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 via-orange-600 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Calendar className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-slate-900 font-display">Student Leave Approval Desk</h3>
                {pendingLeaves.length > 0 ? (
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-amber-600 text-white shadow-xs animate-pulse">
                    {pendingLeaves.length} Pending
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300/80 shadow-2xs">
                    ✓ All Caught Up
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-semibold">
                Review student leaves, auto-extend subscription expiry dates, and manage dining permissions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto shrink-0">
            {onCreateTestLeave && (
              <button
                onClick={onCreateTestLeave}
                className="px-3 py-1.5 rounded-xl border border-dashed border-orange-300/80 bg-white hover:bg-orange-50/50 text-slate-700 text-xs font-bold transition cursor-pointer shadow-2xs active:scale-[0.98]"
                title="Create a test student leave to test 1-click approval"
              >
                + Test Sample Leave
              </button>
            )}
            {onOpenLeaveApprovalsTab && (
              <button
                onClick={onOpenLeaveApprovalsTab}
                className="px-3 py-1.5 rounded-xl border border-orange-200/80 bg-white hover:bg-orange-50/60 text-slate-700 text-xs font-bold transition cursor-pointer shadow-2xs active:scale-[0.98]"
              >
                All Records ({allLeaves.length}) ➔
              </button>
            )}
          </div>
        </div>

        {pendingLeaves.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {pendingLeaves.map(leave => {
              const currentEnd = new Date(leave.customerEndDate);
              const extendedEnd = new Date(currentEnd);
              extendedEnd.setDate(extendedEnd.getDate() + leave.days);

              return (
                <div
                  key={leave.id}
                  className="p-4 rounded-xl bg-gradient-to-b from-white to-orange-50/40 border border-orange-200/70 space-y-3 shadow-2xs hover:border-orange-300 hover:shadow-xs transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-900 text-xs">{leave.customerName}</h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{leave.customerId} • {leave.customerPhone}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white text-slate-700 border border-orange-200 shadow-2xs">
                      {leave.days} Days
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs bg-white p-3 rounded-lg border border-orange-200/70">
                    <div className="flex justify-between text-slate-500">
                      <span>Leave Dates:</span>
                      <span className="font-semibold text-slate-800">
                        {leave.startDate} to {leave.endDate}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Reason:</span>
                      <span className="text-slate-700 italic">
                        {leave.reason || 'Personal Leave'}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500 pt-1.5 border-t border-orange-100/70 text-[10px]">
                      <span>Subscription Extension:</span>
                      <span className="text-emerald-700 font-bold">
                        {leave.customerEndDate} ➔ {extendedEnd.toISOString().split('T')[0]} (+{leave.days}d)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    {onRejectLeave && (
                      <button
                        onClick={() => onRejectLeave(leave.customerId, leave.id)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold cursor-pointer transition"
                      >
                        Reject
                      </button>
                    )}
                    {onApproveLeave && (
                      <button
                        onClick={() => onApproveLeave(leave.customerId, leave.id, leave.days)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 hover:from-orange-600 hover:to-orange-800 text-white text-xs font-semibold cursor-pointer transition shadow-2xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve Leave (+{leave.days}d)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80 flex flex-col sm:flex-row items-center justify-between text-xs text-emerald-800 gap-3 shadow-2xs">
            <span className="font-extrabold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>✓ All caught up! No pending student leave requests at the moment.</span>
            </span>
            {onCreateTestLeave && (
              <button
                onClick={onCreateTestLeave}
                className="text-orange-600 font-black hover:underline cursor-pointer self-center sm:self-auto shrink-0"
              >
                Create sample leave request ➔
              </button>
            )}
          </div>
        )}
      </div>

      {/* 7. TWO-COLUMN: UPCOMING EXPIRY WATCHLIST & TODAY LIVE GATE ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Upcoming Expiry Watchlist */}
        <div className="bg-gradient-to-b from-[#FFFDF9] via-[#FFFBF5] to-[#FFF6ED] rounded-2xl border border-orange-200/80 shadow-[0_4px_20px_-4px_rgba(249,115,22,0.06)] ring-1 ring-orange-500/5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
                <AlertTriangle className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900">Upcoming Expiry Watchlist</h3>
                <p className="text-[10px] text-slate-500 font-semibold leading-none mt-0.5">Renew subscriptions in 1-click</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('reports')}
              className="text-xs text-orange-600 font-extrabold hover:underline cursor-pointer"
            >
              View Full Audit ➔
            </button>
          </div>

          {expiringSoonMembers.length === 0 && expiredMembers.length === 0 ? (
            <div className="p-6 text-center text-xs text-emerald-800 bg-emerald-50/50 border border-emerald-200/60 rounded-xl font-semibold flex flex-col items-center justify-center gap-1.5 shadow-2xs">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              <span>✓ Outstanding! No expired or expiring subscriptions found.</span>
            </div>
          ) : (
            <div className="divide-y divide-orange-100/60 text-xs">
              {[...expiringSoonMembers, ...expiredMembers].slice(0, 5).map(customer => {
                const days = calculateDaysRemaining(customer.endDate);
                const isOverdue = days < 0;

                return (
                  <div
                    key={customer.id}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-orange-50/40 px-2 rounded-xl transition-all border border-transparent hover:border-orange-200/60"
                  >
                    <div>
                      <div className="font-extrabold text-slate-900 text-xs">{customer.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {customer.id} · Valid until <span className="font-bold text-slate-700">{customer.endDate}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${
                        isOverdue 
                          ? 'bg-rose-50 text-rose-700 border-rose-200 shadow-2xs' 
                          : 'bg-amber-50 text-amber-800 border-amber-200 shadow-2xs'
                      }`}>
                        {isOverdue ? `${Math.abs(days)}d Overdue` : `${days}d Left`}
                      </span>
                      <button
                        onClick={() => onOpenRenew(customer)}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 hover:from-orange-600 hover:to-orange-800 text-white font-black text-[11px] cursor-pointer transition shadow-xs active:scale-[0.98]"
                      >
                        Renew
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Today's Live Gate Activity */}
        <div className="bg-gradient-to-b from-[#FFFDF9] via-[#FFFBF5] to-[#FFF6ED] rounded-2xl border border-orange-200/80 shadow-[0_4px_20px_-4px_rgba(249,115,22,0.06)] ring-1 ring-orange-500/5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
                <Utensils className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900">Today's Live Gate Activity</h3>
                <p className="text-[10px] text-slate-500 font-semibold leading-none mt-0.5">Real-time scan logs check</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('meals')}
              className="text-xs text-orange-600 font-extrabold hover:underline cursor-pointer"
            >
              All Logs ➔
            </button>
          </div>

          {todayLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-650 bg-gradient-to-b from-white to-orange-50/40 border border-orange-200/70 rounded-2xl space-y-3.5 flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                <Utensils className="w-5 h-5 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="font-extrabold text-slate-800 text-sm">Waiting for Today's First QR Scan</p>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Students' scan actions will appear here live</p>
              </div>
              <button
                onClick={onOpenScanner}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 hover:from-orange-600 hover:to-orange-800 text-white font-black text-xs shadow-xs cursor-pointer transition active:scale-[0.98]"
              >
                <QrCode className="w-4 h-4 text-amber-200" />
                <span>Launch Gate Scanner</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-orange-100/60 text-xs">
              {todayLogs.slice(0, 5).map(log => {
                const timeStr = new Date(log.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div
                    key={log.id}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-orange-50/40 px-2 rounded-xl transition-all border border-transparent hover:border-orange-200/60"
                  >
                    <div className="flex items-center gap-2.5">
                      {log.scanStatus === 'ALLOW' ? (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shrink-0 border border-emerald-200 shadow-2xs">
                          <CheckCircle2 className="w-4.5 h-4.5" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-rose-600 to-red-600 text-white flex items-center justify-center shrink-0 border border-rose-200 shadow-2xs">
                          <ShieldAlert className="w-4.5 h-4.5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-slate-900 text-xs truncate">{log.customerName}</span>
                          <span className="text-[10px] text-orange-700 font-black capitalize bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                            {log.mealType}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate max-w-[180px] sm:max-w-xs mt-0.5">{log.reason}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold font-mono text-slate-700 bg-orange-50/40 border border-orange-200/70 px-2.5 py-1 rounded-lg shrink-0">{timeStr}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
