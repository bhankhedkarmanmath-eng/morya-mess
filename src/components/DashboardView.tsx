import React, { useState, useEffect, useCallback } from 'react';
import { 
  Customer, 
  MealLog, 
  Expense, 
  Worker, 
  CleaningInspection, 
  BusinessRulesConfig, 
  UserRole,
  OwnerNavPage,
  InventoryItem,
  SupabasePaymentRecord
} from '../types/mess';
import { calculateDaysRemaining, getTodayString, getCurrentMealType } from '../lib/storage';
import { 
  fetchPaymentsFromSupabase, 
  fetchInventoryFromSupabase 
} from '../lib/ownerFeaturesApi';
import { loadInventoryMovements } from '../lib/ownerModulesStorage';
import { 
  QrCode, 
  UserPlus, 
  Utensils, 
  Receipt, 
  AlertTriangle, 
  CheckCircle2, 
  Users, 
  Sparkles, 
  ArrowUpRight, 
  Clock, 
  RefreshCw,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  Building,
  CreditCard,
  Flame,
  Calendar,
  Package,
  TrendingUp,
  TrendingDown,
  DollarSign,
  MessageCircle,
  FileText,
  BarChart3,
  CheckCircle
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
  onOpenAddCustomer: () => void;
  onOpenAddExpense: () => void;
  onOpenCardPrint: (c: Customer) => void;
  onOpenCustomer360: (c: Customer) => void;
  onOpenRenew: (c: Customer) => void;
  onOpenSettings: () => void;
  onNavigateTab: (tabId: 'dashboard' | 'customers' | 'meals' | 'payments' | 'expenses' | 'workers' | 'reports') => void;
  onNavigatePage?: (page: OwnerNavPage) => void;
  onApproveLeave?: (customerId: string, leaveId: string, days: number) => void;
  onRejectLeave?: (customerId: string, leaveId: string) => void;
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
  onOpenAddCustomer,
  onOpenAddExpense,
  onOpenCardPrint,
  onOpenCustomer360,
  onOpenRenew,
  onOpenSettings,
  onNavigateTab,
  onNavigatePage,
  onApproveLeave,
  onRejectLeave,
  onCreateTestLeave,
  onOpenLeaveApprovalsTab
}) => {
  const today = getTodayString();
  const currentShift = getCurrentMealType();

  // Live Supabase Payments & Inventory State
  const [payments, setPayments] = useState<SupabasePaymentRecord[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [recentMovements, setRecentMovements] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // WhatsApp Reminder Modal state
  const [selectedReminderCustomer, setSelectedReminderCustomer] = useState<Customer | null>(null);

  // Helper to safely navigate
  const handleNav = (page: OwnerNavPage) => {
    if (onNavigatePage) {
      onNavigatePage(page);
    } else {
      if (page === 'customers') onNavigateTab('customers');
      else if (page === 'billing_payments') onNavigateTab('payments');
      else if (page === 'expense_tracker') onNavigateTab('expenses');
      else if (page === 'staff_management') onNavigateTab('workers');
      else if (page === 'business_summary') onNavigateTab('reports');
    }
  };

  // 1. Fetch live data
  const loadDashboardLiveData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [payData, invData] = await Promise.all([
        fetchPaymentsFromSupabase(),
        fetchInventoryFromSupabase()
      ]);
      setPayments(payData || []);
      setInventoryItems(invData || []);
      setRecentMovements(loadInventoryMovements().slice(0, 5));
    } catch (err) {
      console.warn('Dashboard data fetch err:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardLiveData();
  }, [loadDashboardLiveData]);

  // Real-time Event Listeners for Automatic Dashboard Refresh (Section 1.H)
  useEffect(() => {
    const handleUpdate = () => {
      loadDashboardLiveData();
    };

    window.addEventListener('morya_payment_updated', handleUpdate);
    window.addEventListener('morya_payment_created', handleUpdate);
    window.addEventListener('morya_meal_logged', handleUpdate);
    window.addEventListener('morya_inventory_updated', handleUpdate);
    window.addEventListener('morya_leave_updated', handleUpdate);
    window.addEventListener('morya_customer_updated', handleUpdate);

    return () => {
      window.removeEventListener('morya_payment_updated', handleUpdate);
      window.removeEventListener('morya_payment_created', handleUpdate);
      window.removeEventListener('morya_meal_logged', handleUpdate);
      window.removeEventListener('morya_inventory_updated', handleUpdate);
      window.removeEventListener('morya_leave_updated', handleUpdate);
      window.removeEventListener('morya_customer_updated', handleUpdate);
    };
  }, [loadDashboardLiveData]);

  // Aggregate student leaves
  const allLeaves = customers.flatMap(c => 
    (c.leaves || []).map(l => ({
      ...l,
      customerId: c.id,
      customerName: c.name,
      customerPhone: c.phone,
      customerEndDate: c.endDate
    }))
  ).sort((a, b) => new Date(b.createdAt || b.startDate).getTime() - new Date(a.createdAt || a.startDate).getTime());
  
  const pendingLeaves = allLeaves.filter(l => !l.approved);

  // ----------------------------------------------------
  // SECTION 1.A & 1.C: CUSTOMERS & SUBSCRIPTIONS
  // ----------------------------------------------------
  const activeCustomers = customers.filter(c => c.status === 'active' && calculateDaysRemaining(c.endDate) >= 0);
  const femaleCount = customers.filter(c => c.gender === 'female').length;
  const expiredCustomers = customers.filter(c => calculateDaysRemaining(c.endDate) < 0 || c.status === 'expired');
  const expiringSoon = customers.filter(c => {
    const days = calculateDaysRemaining(c.endDate);
    return days >= 0 && days <= (rules.expiringSoonAlertDays || 3);
  });
  const upcomingSubscriptions = customers.filter(c => c.startDate > today);
  const pausedOrInactive = customers.filter(c => c.status === 'inactive' || (c.status as any) === 'paused');

  // ----------------------------------------------------
  // SECTION 1.B: TODAY'S ATTENDANCE METRICS
  // ----------------------------------------------------
  const todayMeals = mealLogs.filter(m => m.date === today);
  const lunchMealsToday = todayMeals.filter(m => m.mealType === 'lunch' && m.scanStatus === 'ALLOW');
  const dinnerMealsToday = todayMeals.filter(m => m.mealType === 'dinner' && m.scanStatus === 'ALLOW');
  const totalMealsServedToday = todayMeals.filter(m => m.scanStatus === 'ALLOW').length;
  const blockedMealsToday = todayMeals.filter(m => m.scanStatus === 'BLOCK').length;
  const reviewMealsToday = todayMeals.filter(m => m.scanStatus === 'REVIEW_REQUIRED').length;

  // Expected meals today calculation (based on active customers not on approved leave today)
  const customersOnLeaveToday = new Set(
    allLeaves
      .filter(l => l.approved && l.startDate <= today && l.endDate >= today)
      .map(l => l.customerId)
  );

  const activeNonLeaveCount = activeCustomers.filter(c => !customersOnLeaveToday.has(c.id)).length;
  // Each active member expected 2 meals (lunch + dinner) if lunch_dinner, or 1 meal if single
  const expectedMealsToday = activeNonLeaveCount * 2;

  // Unique students scanned today
  const uniqueStudentsPresentToday = new Set(
    todayMeals.filter(m => m.scanStatus === 'ALLOW').map(m => m.customerId)
  ).size;
  const absentExpectedCount = Math.max(0, activeNonLeaveCount - uniqueStudentsPresentToday);

  // ----------------------------------------------------
  // SECTION 1.D: PAYMENTS & FINANCIAL METRICS
  // ----------------------------------------------------
  const todayPayments = payments.filter(p => (p.date || p.createdAt || '').startsWith(today));
  const todayCollected = todayPayments
    .filter(p => p.status === 'verified')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingPaymentsList = payments.filter(p => p.status === 'pending');
  const pendingAmount = pendingPaymentsList.reduce((sum, p) => sum + p.amount, 0);
  const totalOutstandingDues = customers.reduce((sum, c) => sum + (c.balance || 0), 0);

  const todayExpenses = expenses.filter(e => e.date === today).reduce((sum, e) => sum + e.amount, 0);
  const totalMonthExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalInflow = payments.filter(p => p.status === 'verified').reduce((sum, p) => sum + p.amount, 0);
  const netOperatingMargin = totalInflow - totalMonthExpenses;

  // ----------------------------------------------------
  // SECTION 1.E: INVENTORY METRICS
  // ----------------------------------------------------
  const lowStockItems = inventoryItems.filter(i => i.currentStock > 0 && i.currentStock <= i.minStockLevel);
  const outOfStockItems = inventoryItems.filter(i => i.currentStock <= 0);

  return (
    <div className="space-y-6">
      {/* ==================================================== */}
      {/* TOP WELCOME / STATUS COCKPIT                         */}
      {/* ==================================================== */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                rules.messStatus === 'open'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${rules.messStatus === 'open' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              MESS {rules.messStatus.toUpperCase()}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Today: <strong>{today}</strong> • Shift: <strong className="text-orange-700 capitalize">{currentShift}</strong>
            </span>
            {isRefreshing && (
              <span className="text-[10px] text-orange-600 font-bold flex items-center gap-1 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Live Syncing
              </span>
            )}
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            {rules.messName} Operations Command Center
          </h2>
          <p className="text-xs text-slate-500">
            Authoritative Supabase database • Gate Pass Attendance • Live Ledgers • Kitchen Stock
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            id="btn-dash-open-scanner"
            onClick={onOpenScanner}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 shadow-xs transition-all cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>Gate Scanner</span>
          </button>

          {onOpenUniversalQr && (
            <button
              id="btn-dash-open-universal-qr"
              onClick={onOpenUniversalQr}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-xs transition-all cursor-pointer border border-slate-700"
              title="Counter Standee & Universal Wall QR"
            >
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span>Standee QR</span>
            </button>
          )}

          <button
            id="btn-dash-add-customer"
            onClick={onOpenAddCustomer}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-orange-600" />
            <span>+ Add Member</span>
          </button>
        </div>
      </div>

      {/* ==================================================== */}
      {/* SECTION 1.G: BUSINESS HEALTH OPERATIONAL BANNER      */}
      {/* ==================================================== */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-md">
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Mess Business Health</span>
          </div>
          <span className="text-[11px] text-slate-400">Live Consolidated Ledger</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 text-center sm:text-left">
          <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block font-bold">Active Members</span>
            <span className="text-base font-black text-white">{activeCustomers.length}</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block font-bold">Meals Served</span>
            <span className="text-base font-black text-emerald-400">{totalMealsServedToday}</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block font-bold">Total Collections</span>
            <span className="text-base font-black text-emerald-400">₹{totalInflow.toLocaleString()}</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block font-bold">Total Expenses</span>
            <span className="text-base font-black text-rose-400">₹{totalMonthExpenses.toLocaleString()}</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block font-bold">Net Margin</span>
            <span className={`text-base font-black ${netOperatingMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ₹{netOperatingMargin.toLocaleString()}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block font-bold">Pending Dues</span>
            <span className="text-base font-black text-amber-400">₹{totalOutstandingDues.toLocaleString()}</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block font-bold">Low Stock Items</span>
            <span className={`text-base font-black ${lowStockItems.length + outOfStockItems.length > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
              {lowStockItems.length + outOfStockItems.length}
            </span>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* SECTION 1.F: QUICK ACTIONS GRID                     */}
      {/* ==================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Quick Operations</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2.5">
          <button
            onClick={onOpenAddCustomer}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 hover:border-orange-400 hover:bg-orange-50/50 transition cursor-pointer text-center group"
          >
            <UserPlus className="w-5 h-5 text-orange-600 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-bold text-slate-800">Add Member</span>
          </button>

          <button
            onClick={() => handleNav('cash_payments')}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition cursor-pointer text-center group"
          >
            <DollarSign className="w-5 h-5 text-emerald-600 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-bold text-slate-800">Record Pay</span>
          </button>

          <button
            onClick={onOpenScanner}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 hover:border-orange-400 hover:bg-orange-50/50 transition cursor-pointer text-center group"
          >
            <QrCode className="w-5 h-5 text-orange-600 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-bold text-slate-800">Gate Scan</span>
          </button>

          <button
            onClick={() => handleNav('mark_attendance')}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition cursor-pointer text-center group"
          >
            <CheckCircle className="w-5 h-5 text-blue-600 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-bold text-slate-800">Manual Mark</span>
          </button>

          <button
            onClick={onOpenAddExpense}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 hover:border-rose-400 hover:bg-rose-50/50 transition cursor-pointer text-center group"
          >
            <Receipt className="w-5 h-5 text-rose-600 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-bold text-slate-800">Add Expense</span>
          </button>

          <button
            onClick={() => handleNav('subscriptions')}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 transition cursor-pointer text-center group"
          >
            <Calendar className="w-5 h-5 text-amber-600 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-bold text-slate-800">Subscriptions</span>
          </button>

          <button
            onClick={() => handleNav('inventory')}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition cursor-pointer text-center group"
          >
            <Package className="w-5 h-5 text-indigo-600 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-bold text-slate-800">Inventory</span>
          </button>

          <button
            onClick={() => handleNav('business_summary')}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition cursor-pointer text-center group"
          >
            <FileText className="w-5 h-5 text-slate-700 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-bold text-slate-800">Reports</span>
          </button>

          <button
            onClick={() => {
              const customerWithDue = customers.find(c => c.balance > 0);
              if (customerWithDue) {
                setSelectedReminderCustomer(customerWithDue);
              } else {
                alert('All members have 0 outstanding due! Excellent.');
              }
            }}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition cursor-pointer text-center group"
          >
            <MessageCircle className="w-5 h-5 text-emerald-600 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-bold text-slate-800">Due Reminder</span>
          </button>
        </div>
      </div>

      {/* ==================================================== */}
      {/* SECTION 1.A: TODAY OVERVIEW 4-CARD KPI GRID          */}
      {/* ==================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Members & Breakdown */}
        <div 
          onClick={() => handleNav('customers')}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-orange-300 transition-all cursor-pointer space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Members</span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {activeCustomers.length}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>{femaleCount} Girls • {customers.length - femaleCount} Boys</span>
            <span className="text-orange-600 font-bold">List ➔</span>
          </div>
        </div>

        {/* Meals Served Today & Shift Breakdown */}
        <div 
          onClick={() => onNavigateTab('meals')}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-emerald-300 transition-all cursor-pointer space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Today's Meals Served</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Utensils className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {totalMealsServedToday}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>{lunchMealsToday.length} Lunch • {dinnerMealsToday.length} Dinner</span>
            <span className="text-emerald-700 font-bold">Audit ➔</span>
          </div>
        </div>

        {/* Today's Collections & Pending Payments */}
        <div 
          onClick={() => handleNav('billing_payments')}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-blue-300 transition-all cursor-pointer space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Today's Collections</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-700">
            ₹{todayCollected.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>{pendingPaymentsList.length} Pending (₹{pendingAmount})</span>
            <span className="text-blue-700 font-bold">Verify ➔</span>
          </div>
        </div>

        {/* Outstanding Dues */}
        <div 
          onClick={() => handleNav('customer_ledger')}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-rose-300 transition-all cursor-pointer space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Outstanding Dues</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black ${totalOutstandingDues > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            ₹{totalOutstandingDues.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>Across all active members</span>
            <span className="text-rose-600 font-bold">Ledger ➔</span>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* SECTION 1.B: ATTENDANCE SNAPSHOT                     */}
      {/* ==================================================== */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Utensils className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Attendance Snapshot (Today: {today})</h3>
              <p className="text-xs text-slate-500">Live attendance vs expected meal count</p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('meals')}
            className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Full Attendance Center</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
            <span className="text-[10px] font-bold text-emerald-800 uppercase">Present Today</span>
            <div className="text-xl font-black text-emerald-900 mt-0.5">{uniqueStudentsPresentToday}</div>
            <span className="text-[10px] text-emerald-700">Dined in at least 1 shift</span>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
            <span className="text-[10px] font-bold text-amber-800 uppercase">Expected / Not Scanned</span>
            <div className="text-xl font-black text-amber-900 mt-0.5">{absentExpectedCount}</div>
            <span className="text-[10px] text-amber-700">Active non-leave members</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-700 uppercase">Lunch / Dinner Count</span>
            <div className="text-xl font-black text-slate-900 mt-0.5">
              {lunchMealsToday.length} <span className="text-xs text-slate-400">/</span> {dinnerMealsToday.length}
            </div>
            <span className="text-[10px] text-slate-500">Shift breakdown</span>
          </div>

          <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200">
            <span className="text-[10px] font-bold text-rose-800 uppercase">Blocked / Double Scans</span>
            <div className="text-xl font-black text-rose-900 mt-0.5">{blockedMealsToday}</div>
            <span className="text-[10px] text-rose-700">{reviewMealsToday} required review</span>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* SECTION 1.C: SUBSCRIPTION SNAPSHOT                   */}
      {/* ==================================================== */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Subscription Status Snapshot</h3>
              <p className="text-xs text-slate-500">Validity tracking across all registered customer passes</p>
            </div>
          </div>
          <button
            onClick={() => handleNav('subscriptions')}
            className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Manage Subscriptions</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <span className="text-[10px] font-bold text-emerald-800 uppercase">Active</span>
            <div className="text-xl font-black text-emerald-900 mt-0.5">{activeCustomers.length}</div>
            <span className="text-[10px] text-emerald-700">Currently valid passes</span>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-300">
            <span className="text-[10px] font-bold text-amber-900 uppercase">Expiring Soon</span>
            <div className="text-xl font-black text-amber-900 mt-0.5">{expiringSoon.length}</div>
            <span className="text-[10px] text-amber-800">Within ≤3 days</span>
          </div>

          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
            <span className="text-[10px] font-bold text-rose-800 uppercase">Expired</span>
            <div className="text-xl font-black text-rose-900 mt-0.5">{expiredCustomers.length}</div>
            <span className="text-[10px] text-rose-700">Overdue for renewal</span>
          </div>

          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
            <span className="text-[10px] font-bold text-blue-800 uppercase">Upcoming</span>
            <div className="text-xl font-black text-blue-900 mt-0.5">{upcomingSubscriptions.length}</div>
            <span className="text-[10px] text-blue-700">Starts in future</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-700 uppercase">Paused / Inactive</span>
            <div className="text-xl font-black text-slate-800 mt-0.5">{pausedOrInactive.length}</div>
            <span className="text-[10px] text-slate-500">Temporarily inactive</span>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* SECTION 1.D & 1.E: PAYMENTS & INVENTORY SNAPSHOTS   */}
      {/* ==================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Snapshot */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Payment Snapshot</h3>
                <p className="text-xs text-slate-500">Recent collections & pending verifications</p>
              </div>
            </div>
            <button
              onClick={() => handleNav('billing_payments')}
              className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
            >
              Finance Center ➔
            </button>
          </div>

          {/* Pending verification alert if any */}
          {pendingPaymentsList.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-amber-900">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span><strong>{pendingPaymentsList.length} payments (₹{pendingAmount})</strong> pending your verification</span>
              </div>
              <button
                onClick={() => handleNav('payment_verification')}
                className="px-2.5 py-1 bg-amber-600 text-white rounded-lg font-bold text-[11px] hover:bg-amber-700 cursor-pointer shrink-0"
              >
                Verify Now
              </button>
            </div>
          )}

          {/* Recent payments list */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Recent Transactions</span>
            {payments.slice(0, 4).length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No payment logs recorded yet.</div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {payments.slice(0, 4).map(p => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-900">{p.customerName}</span>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                        <span className="uppercase font-mono font-bold text-slate-600">{p.paymentMode}</span>
                        <span>•</span>
                        <span>{p.date || p.createdAt?.split('T')[0]}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-slate-900">₹{p.amount}</span>
                      <span className={`block text-[10px] font-bold uppercase ${
                        p.status === 'verified' ? 'text-emerald-600' : p.status === 'pending' ? 'text-amber-600' : 'text-rose-600'
                      }`}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Inventory Snapshot */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Kitchen Stock & Inventory</h3>
                <p className="text-xs text-slate-500">Low-stock alerts & ingredients tracker</p>
              </div>
            </div>
            <button
              onClick={() => handleNav('inventory')}
              className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
            >
              Inventory Hub ➔
            </button>
          </div>

          {/* Low/Out of Stock Banner */}
          {lowStockItems.length + outOfStockItems.length > 0 ? (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  <strong>{outOfStockItems.length} out of stock</strong>, <strong>{lowStockItems.length} low stock</strong> items require purchase!
                </span>
              </div>
              <button
                onClick={() => handleNav('inventory')}
                className="px-2.5 py-1 bg-rose-600 text-white rounded-lg font-bold text-[11px] hover:bg-rose-700 cursor-pointer shrink-0"
              >
                Restock
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>All grocery items are comfortably stocked above minimum thresholds.</span>
            </div>
          )}

          {/* Quick list of critical stock */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Critical Stock Items</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {inventoryItems.slice(0, 4).map(item => {
                const isOut = item.currentStock <= 0;
                const isLow = item.currentStock <= item.minStockLevel && !isOut;
                return (
                  <div key={item.id} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                    <span className="font-bold text-slate-800 text-[11px] truncate">{item.name}</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-black text-slate-900 text-xs">{item.currentStock} {item.unit}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isOut ? 'bg-rose-100 text-rose-700' : isLow ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isOut ? 'Out' : isLow ? 'Low' : 'OK'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* STUDENT LEAVE APPROVAL DESK                          */}
      {/* ==================================================== */}
      <div className={`p-5 rounded-2xl bg-white border transition-all shadow-xs space-y-4 ${
        pendingLeaves.length > 0 ? 'border-amber-300 ring-2 ring-amber-400/20' : 'border-slate-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              pendingLeaves.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-orange-50 text-orange-600'
            }`}>
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900">Student Leave Approval Desk</h3>
                {pendingLeaves.length > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse">
                    {pendingLeaves.length} Action Required
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    All Caught Up
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Review hostel students' vacation leaves and auto-extend plan expiry dates.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            {onCreateTestLeave && (
              <button
                onClick={onCreateTestLeave}
                className="px-3 py-1.5 rounded-xl border border-dashed border-orange-300 bg-orange-50/60 hover:bg-orange-100 text-orange-800 text-xs font-bold transition-colors cursor-pointer"
                title="Create a test student leave to test 1-click approval"
              >
                + Test Sample Leave
              </button>
            )}
            {onOpenLeaveApprovalsTab && (
              <button
                onClick={onOpenLeaveApprovalsTab}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                All Records ({allLeaves.length}) ➔
              </button>
            )}
          </div>
        </div>

        {pendingLeaves.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {pendingLeaves.map(leave => {
              const currentEnd = new Date(leave.customerEndDate);
              const projectedEnd = new Date(currentEnd);
              projectedEnd.setDate(projectedEnd.getDate() + leave.days);

              return (
                <div 
                  key={leave.id}
                  className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50/30 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{leave.customerName}</span>
                        <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">
                          {leave.customerId}
                        </span>
                      </div>
                      {leave.customerPhone && (
                        <span className="text-[11px] text-slate-500 font-mono">{leave.customerPhone}</span>
                      )}
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900 border border-amber-300 shrink-0">
                      {leave.days} Days Leave
                    </span>
                  </div>

                  <div className="text-xs bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                    <div className="flex justify-between text-slate-600">
                      <span>Leave Dates:</span>
                      <strong className="text-slate-900">{leave.startDate} to {leave.endDate}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Reason:</span>
                      <span className="text-slate-800 italic">{leave.reason || 'Personal Leave'}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 pt-1.5 border-t border-slate-100 text-[11px]">
                      <span>Auto-Extension:</span>
                      <span className="text-emerald-700 font-bold">
                        {leave.customerEndDate} ➔ {projectedEnd.toISOString().split('T')[0]} (+{leave.days}d)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    {onRejectLeave && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Reject leave request for ${leave.customerName}?`)) {
                            onRejectLeave(leave.customerId, leave.id);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50 text-xs font-bold cursor-pointer transition-colors"
                      >
                        Reject
                      </button>
                    )}
                    {onApproveLeave && (
                      <button
                        onClick={() => onApproveLeave(leave.customerId, leave.id, leave.days)}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shadow-xs transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve & Extend (+{leave.days}d)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 text-center flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="text-slate-600">
              ✓ No pending leaves at the moment. When students request leave via their portal, it appears here for instant approval.
            </span>
            {onCreateTestLeave && (
              <button
                onClick={onCreateTestLeave}
                className="text-orange-700 font-bold hover:underline cursor-pointer self-center sm:self-auto"
              >
                Create sample leave request ➔
              </button>
            )}
          </div>
        )}
      </div>

      {/* ==================================================== */}
      {/* TWO-COLUMN: EXPIRING WATCHLIST & LIVE SCAN FEED      */}
      {/* ==================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiring Cards Watchlist */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Upcoming Expiry Watchlist</h3>
            </div>
            <button
              onClick={() => handleNav('subscriptions')}
              className="text-xs text-orange-600 font-bold hover:underline cursor-pointer"
            >
              All Subscriptions ➔
            </button>
          </div>

          {expiringSoon.length === 0 && expiredCustomers.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No members are currently expiring or expired.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {[...expiringSoon, ...expiredCustomers].slice(0, 5).map((c) => {
                const days = calculateDaysRemaining(c.endDate);
                const isExp = days < 0;
                return (
                  <div key={c.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-800">{c.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {c.id} • Valid until {c.endDate}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          isExp ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {isExp ? `${Math.abs(days)}d Overdue` : `${days}d Remaining`}
                      </span>
                      <button
                        onClick={() => onOpenRenew(c)}
                        className="px-3 py-1 rounded-lg bg-orange-50 text-orange-700 font-bold text-[11px] hover:bg-orange-100 cursor-pointer"
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

        {/* Live Gate Entry Feed */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-xs">
                <Utensils className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Today's Live Gate Activity</h3>
            </div>
            <button
              onClick={() => onNavigateTab('meals')}
              className="text-xs text-orange-600 font-bold hover:underline cursor-pointer"
            >
              All Logs ➔
            </button>
          </div>

          {todayMeals.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 space-y-2">
              <p>No QR scans recorded yet today.</p>
              <button
                onClick={onOpenScanner}
                className="px-3 py-1.5 rounded-lg bg-orange-600 text-white font-bold text-xs hover:bg-orange-700 cursor-pointer"
              >
                Launch Gate Scanner
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {todayMeals.slice(0, 5).map((log) => {
                const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={log.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      {log.scanStatus === 'ALLOW' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <div>
                        <span className="font-bold text-slate-800">{log.customerName}</span>
                        <span className="text-[10px] text-slate-400 ml-1.5 capitalize">({log.mealType})</span>
                        <p className="text-[10px] text-slate-500 truncate max-w-xs">{log.reason}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{timeStr}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* WhatsApp Reminder Dialog for Due Balance */}
      {selectedReminderCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-base">Send WhatsApp Payment Reminder</h3>
              <button 
                onClick={() => setSelectedReminderCustomer(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold text-sm"
              >
                ✕
              </button>
            </div>
            <div className="p-3.5 bg-orange-50 rounded-2xl border border-orange-200 text-xs space-y-1">
              <p><strong>Member:</strong> {selectedReminderCustomer.name}</p>
              <p><strong>Phone:</strong> {selectedReminderCustomer.phone}</p>
              <p><strong>Outstanding Balance:</strong> <span className="text-rose-600 font-black">₹{selectedReminderCustomer.balance}</span></p>
            </div>
            <p className="text-xs text-slate-600">
              Opens WhatsApp with a pre-filled professional payment reminder message including your mess details and payment balance.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSelectedReminderCustomer(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const phoneClean = selectedReminderCustomer.phone.replace(/[^0-9]/g, '');
                  const text = encodeURIComponent(
                    `Namaste ${selectedReminderCustomer.name},\nThis is a polite reminder from ${rules.messName}.\nYour mess fee balance is ₹${selectedReminderCustomer.balance}.\nPlease clear the balance or pay via UPI to ensure uninterrupted meal access.\nThank you!`
                  );
                  window.open(`https://wa.me/91${phoneClean}?text=${text}`, '_blank');
                  setSelectedReminderCustomer(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Open WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
