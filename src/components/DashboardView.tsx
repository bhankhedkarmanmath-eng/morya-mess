import React from 'react';
import { Customer, MealLog, Expense, Worker, CleaningInspection, BusinessRulesConfig, UserRole } from '../types/mess';
import { calculateDaysRemaining, getTodayString, getCurrentMealType } from '../lib/storage';
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
  Calendar
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
  onNavigateTab: (tabId: 'dashboard' | 'customers' | 'meals' | 'expenses' | 'workers' | 'reports') => void;
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
  onApproveLeave,
  onRejectLeave,
  onCreateTestLeave,
  onOpenLeaveApprovalsTab
}) => {
  const today = getTodayString();
  const currentShift = getCurrentMealType();

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

  // Metrics
  const activeCustomers = customers.filter(c => calculateDaysRemaining(c.endDate) >= 0);
  const femaleCount = customers.filter(c => c.gender === 'female').length;
  const expiredCustomers = customers.filter(c => calculateDaysRemaining(c.endDate) < 0);
  const expiringSoon = customers.filter(c => {
    const days = calculateDaysRemaining(c.endDate);
    return days >= 0 && days <= (rules.expiringSoonAlertDays || 3);
  });

  const todayMeals = mealLogs.filter(m => m.date === today);
  const allowedMealsToday = todayMeals.filter(m => m.scanStatus === 'ALLOW').length;
  const blockedMealsToday = todayMeals.filter(m => m.scanStatus === 'BLOCK').length;
  const reviewMealsToday = todayMeals.filter(m => m.scanStatus === 'REVIEW_REQUIRED').length;

  const totalCollected = customers.reduce((sum, c) => {
    const renewals = c.renewals?.reduce((rSum, r) => rSum + r.paidAmount, 0) || 0;
    return sum + c.paidAmount + renewals;
  }, 0);

  const pendingBalance = customers.reduce((sum, c) => sum + c.balance, 0);
  const todayExpenses = expenses.filter(e => e.date === today).reduce((sum, e) => sum + e.amount, 0);
  const presentWorkers = workers.filter(w => w.attendance[today] === 'present').length;

  return (
    <div className="space-y-6">
      {/* Top Welcome / Status Cockpit */}
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
              Today: {today} • Current Shift: <strong className="text-orange-700 capitalize">{currentShift}</strong>
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {rules.messName} Operations Cockpit
          </h2>
          <p className="text-xs text-slate-500">
            {rules.messSubtitle} • QR Pass Gate Verification & Anti-Fraud Audit
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            id="btn-dash-open-scanner"
            onClick={onOpenScanner}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 shadow-xs transition-all cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>Scan Pass / Upload QR</span>
          </button>

          {onOpenUniversalQr && (
            <button
              id="btn-dash-open-universal-qr"
              onClick={onOpenUniversalQr}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-xs transition-all cursor-pointer border border-slate-700"
              title="Counter Standee & Universal Wall QR"
            >
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span>Counter Standee QR</span>
            </button>
          )}

          <button
            id="btn-dash-add-customer"
            onClick={onOpenAddCustomer}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-orange-600" />
            <span>Register Member</span>
          </button>
        </div>
      </div>

      {/* Empty Database Slate Notification (Rule 1) */}
      {customers.length === 0 && (
        <div className="p-8 rounded-2xl bg-orange-50/50 border border-orange-100 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white border border-orange-200 text-orange-600 flex items-center justify-center mx-auto shadow-xs">
            <Users className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-sm font-bold text-slate-900">Database Ready & Clean</h3>
            <p className="text-xs text-slate-500 mt-1">
              Your Morya Mess production database is initialized without fake data. Click below to register your first hostel student or customer.
            </p>
          </div>
          <div className="pt-1 flex items-center justify-center gap-3">
            <button
              onClick={onOpenAddCustomer}
              className="px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Register First Member</span>
            </button>
            <button
              onClick={onOpenSettings}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all cursor-pointer"
            >
              Configure Business Rules
            </button>
          </div>
        </div>
      )}

      {/* Student Leave Approval Desk Section */}
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

      {/* KPI Counters Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Members */}
        <div 
          onClick={() => onNavigateTab('customers')}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-orange-300 transition-all cursor-pointer space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Members</span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {activeCustomers.length}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>{femaleCount} Hostel Girls</span>
            <span className="text-orange-600 font-bold">View all ➔</span>
          </div>
        </div>

        {/* Meals Served Today */}
        <div 
          onClick={() => onNavigateTab('meals')}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-emerald-300 transition-all cursor-pointer space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Meals Served Today</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Utensils className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-700">
            {allowedMealsToday}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>Expected: ~{activeCustomers.length * 2}</span>
            <span className="text-emerald-700 font-bold">Audit log ➔</span>
          </div>
        </div>

        {/* Blocked / Double Meals */}
        <div 
          onClick={() => onNavigateTab('meals')}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-rose-300 transition-all cursor-pointer space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Blocked Gate Scans</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-600">
            {blockedMealsToday}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>{reviewMealsToday} under review</span>
            <span className="text-rose-600 font-bold">Inspect ➔</span>
          </div>
        </div>

        {/* Expiring Soon / Expired Alerts */}
        <div 
          onClick={() => onNavigateTab('reports')}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-amber-300 transition-all cursor-pointer space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Expiring Soon Watch</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-600">
            {expiringSoon.length}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>{expiredCustomers.length} already expired</span>
            <span className="text-amber-600 font-bold">Renew ➔</span>
          </div>
        </div>
      </div>

      {/* Financial Overview (Hidden for staff role) */}
      {currentRole !== 'staff' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Total Subscription Inflow</span>
              <CreditCard className="w-4 h-4 text-orange-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              ₹{totalCollected.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400">Total membership payments & renewals recorded</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Pending Fees / Dues</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div className={`text-2xl font-black ${pendingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              ₹{pendingBalance.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400">Uncollected fees across registered members</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Today's Mess Expense</span>
              <Receipt className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              ₹{todayExpenses.toLocaleString()}
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-500">
              <span>Groceries & utilities</span>
              <button 
                onClick={onOpenAddExpense}
                className="text-orange-600 font-bold hover:underline cursor-pointer"
              >
                + Add expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Two-Column Activity & Alerts Section */}
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
              onClick={() => onNavigateTab('reports')}
              className="text-xs text-orange-600 font-bold hover:underline cursor-pointer"
            >
              View Full Audit ➔
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
    </div>
  );
};
