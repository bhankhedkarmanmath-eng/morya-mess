import React from 'react';
import { 
  X, 
  LayoutDashboard,
  UsersRound,
  UserPlus,
  Search,
  UserRoundCheck,
  CalendarCheck,
  CalendarOff,
  ClipboardCheck,
  ScanLine,
  ChartNoAxesCombined,
  ReceiptIndianRupee,
  Receipt,
  FileText,
  FileSpreadsheet,
  ReceiptText,
  Smartphone,
  Banknote,
  QrCode,
  History,
  Clock3,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  ShoppingCart,
  Package,
  Utensils,
  UtensilsCrossed,
  Vote,
  BellRing,
  Star,
  MessageSquareWarning,
  Settings,
  Users,
  ShieldCheck,
  Building2,
  Shield,
  CircleUserRound,
  CircleHelp,
  Headset,
  Sparkles, 
  Layers, 
  LogOut, 
  ChevronRight,
  Trophy,
  ChefHat,
  MessageSquare,
  Zap,
  TrendingUp,
  Moon
} from 'lucide-react';

interface OwnerDrawerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: string;
  onSelectTab: (tabId: string) => void;
  messName?: string;
  pendingLeavesCount?: number;
  onOpenScanner?: () => void;
  onOpenUniversalQr?: () => void;
  onOpenTrialQr?: () => void;
  onOpenKitchenEstimator?: () => void;
  onOpenPredictCampaignResults?: () => void;
  onOpenCampaignParticipants?: () => void;
  onOpenWhatsAppDuesBot?: () => void;
  onOpenAttendanceIntegrity?: () => void;
  onOpenMaharajCookSheet?: () => void;
  onOpenMessPnl?: () => void;
  onOpenDailyProfitDigest?: () => void;
  onSwitchPortal?: () => void;
  onOpenSettings?: () => void;
  onPlayIntro?: () => void;
  onLogout?: () => void;
  userEmail?: string;
}

export const OwnerDrawerMenu: React.FC<OwnerDrawerMenuProps> = ({
  isOpen,
  onClose,
  currentTab,
  onSelectTab,
  messName = 'MORYA MESS',
  pendingLeavesCount = 0,
  onOpenScanner,
  onOpenUniversalQr,
  onOpenTrialQr,
  onOpenKitchenEstimator,
  onOpenPredictCampaignResults,
  onOpenCampaignParticipants,
  onOpenWhatsAppDuesBot,
  onOpenAttendanceIntegrity,
  onOpenMaharajCookSheet,
  onOpenMessPnl,
  onOpenDailyProfitDigest,
  onSwitchPortal,
  onOpenSettings,
  onPlayIntro,
  onLogout,
  userEmail
}) => {
  if (!isOpen) return null;

  const navGroups = [
    {
      title: 'OVERVIEW / MAIN SCREEN',
      items: [
        { id: 'dashboard', label: 'Main Screen / Dashboard', icon: LayoutDashboard },
      ]
    },
    {
      title: 'ZERO-MAINTENANCE AUTOPILOT SUITE',
      items: [
        { id: 'whatsapp_dues_bot', label: 'WhatsApp Auto-Pilot Dues Recovery', icon: MessageSquare },
        { id: 'daily_profit_digest', label: '🌙 11:00 PM Daily Profit Digest & Closing', icon: Moon },
        { id: 'attendance_integrity', label: 'Gate Attendance Integrity & Anti-Theft', icon: ShieldCheck },
        { id: 'maharaj_cook_sheet', label: 'Cook Auto Quantity Sheet', icon: ChefHat },
        { id: 'mess_pnl', label: 'Mess P&L & Cost Per Plate', icon: TrendingUp },
      ]
    },
    {
      title: 'KITCHEN & MEAL PLANNING',
      items: [
        { id: 'kitchen_predictor', label: 'Kitchen Headcount & Meal Estimator', icon: ChefHat },
        { id: 'weekly_menu', label: 'Weekly Menu', icon: UtensilsCrossed },
        { id: 'inventory', label: 'Kitchen Inventory & Stock', icon: Package },
      ]
    },
    {
      title: '25-DAY ZERO WASTE CAMPAIGN',
      items: [
        { id: 'campaign_participants', label: 'Campaign Nominations & Register', icon: Users },
        { id: 'predict_campaign_winner', label: 'Predict & Declare 5 Winners', icon: Trophy },
      ]
    },
    {
      title: 'CUSTOMERS',
      items: [
        { id: 'customers', label: 'Customers', icon: UsersRound },
        { id: 'add_customer', label: 'Add Customer', icon: UserPlus },
        { id: 'search_customer', label: 'Search Customer', icon: Search },
        { id: 'subscriptions', label: 'Subscriptions', icon: CalendarCheck },
        { id: 'leaves', label: 'Skip Meal & Leaves', icon: CalendarOff },
        { id: 'attendance', label: 'Mark Attendance', icon: ClipboardCheck },
        { id: 'scanner', label: 'Attendance Scanner', icon: ScanLine },
      ]
    },
    {
      title: 'TRIAL STUDENTS (SPECIAL QR & LOGS)',
      items: [
        { id: 'trial_qr', label: 'Trial Student QR (Special Standee)', icon: QrCode },
        { id: 'trial_students', label: 'Trial Student Records & Logs', icon: UserRoundCheck },
      ]
    },
    {
      title: 'REPORTS & ANALYTICS',
      items: [
        { id: 'attendance_reports', label: 'Attendance Reports', icon: ChartNoAxesCombined },
        { id: 'customer_reports', label: 'Customer Reports', icon: UsersRound },
        { id: 'payment_reports', label: 'Payment Reports', icon: ReceiptIndianRupee },
        { id: 'expense_reports', label: 'Expense Reports', icon: Receipt },
        { id: 'monthly_statements', label: 'Monthly Settlements & Bills', icon: FileText },
        { id: 'business_summary', label: 'Business Summary', icon: ChartNoAxesCombined },
        { id: 'excel_export', label: 'Excel Export', icon: FileSpreadsheet },
      ]
    },
    {
      title: 'BILLING & PAYMENTS',
      items: [
        { id: 'billing', label: 'Billing & Payments', icon: ReceiptText },
        { id: 'upi_payments', label: 'UPI Payments', icon: Smartphone },
        { id: 'cash_payments', label: 'Cash Payments', icon: Banknote },
        { id: 'mess_qr', label: 'Mess Payment QR & UPI ID', icon: QrCode },
        { id: 'payment_history', label: 'Payment History', icon: History },
        { id: 'pending_payments', label: 'Pending Payments', icon: Clock3 },
        { id: 'payment_verification', label: 'Payment Verification', icon: BadgeCheck },
        { id: 'customer_ledger', label: 'Customer Ledger', icon: BookOpen },
        { id: 'monthly_statement', label: 'Monthly Settlements & Bills', icon: CalendarDays },
      ]
    },
    {
      title: 'FINANCE & WALK-IN POS',
      items: [
        { id: 'walkin_pos', label: 'Walk-in POS', icon: ShoppingCart },
        { id: 'walkin_meal_types', label: 'Walk-in Meal Types', icon: Utensils },
        { id: 'walkin_payments', label: 'Walk-in Payments', icon: Banknote },
      ]
    },
    {
      title: 'COMMUNICATION / STUDENT OPERATIONS',
      items: [
        { id: 'polls', label: 'Polls', icon: Vote },
        { id: 'reminders', label: 'Reminders', icon: BellRing },
        { id: 'meal_ratings', label: 'Meal Ratings & Reviews', icon: Star },
        { id: 'complaints', label: 'Complaints Tracker', icon: MessageSquareWarning },
      ]
    },
    {
      title: 'MESS ADMINISTRATION',
      items: [
        { id: 'settings', label: 'Mess Settings', icon: Settings },
        { id: 'staff_management', label: 'Staff Management', icon: Users },
        { id: 'roles_permissions', label: 'Roles & Permissions', icon: ShieldCheck },
        { id: 'my_mess', label: 'My Mess', icon: Building2 },
        { id: 'activity_log', label: 'Security / Activity Log', icon: Shield },
      ]
    },
    {
      title: 'MY ACCOUNT & SUPPORT',
      items: [
        { id: 'my_account', label: 'My Account', icon: CircleUserRound },
        { id: 'help_support', label: 'Help & Support', icon: CircleHelp },
        { id: 'support_requests', label: 'Support Requests', icon: Headset },
      ]
    }
  ];

  const handleItemClick = (tabId: string) => {
    if (tabId === 'whatsapp_dues_bot') {
      onClose();
      if (onOpenWhatsAppDuesBot) {
        onOpenWhatsAppDuesBot();
      } else {
        onSelectTab('whatsapp_dues_bot');
      }
      return;
    }
    if (tabId === 'daily_profit_digest') {
      onClose();
      if (onOpenDailyProfitDigest) {
        onOpenDailyProfitDigest();
      } else {
        onSelectTab('dashboard');
      }
      return;
    }
    if (tabId === 'attendance_integrity') {
      onClose();
      if (onOpenAttendanceIntegrity) {
        onOpenAttendanceIntegrity();
      } else {
        onSelectTab('attendance_integrity');
      }
      return;
    }
    if (tabId === 'maharaj_cook_sheet') {
      onClose();
      if (onOpenMaharajCookSheet) {
        onOpenMaharajCookSheet();
      } else {
        onSelectTab('maharaj_cook_sheet');
      }
      return;
    }
    if (tabId === 'mess_pnl') {
      onClose();
      if (onOpenMessPnl) {
        onOpenMessPnl();
      } else {
        onSelectTab('mess_pnl');
      }
      return;
    }
    if (tabId === 'kitchen_predictor') {
      onClose();
      if (onOpenKitchenEstimator) {
        onOpenKitchenEstimator();
      } else {
        onSelectTab('kitchen_predictor');
      }
      return;
    }
    if (tabId === 'trial_qr') {
      onClose();
      if (onOpenTrialQr) {
        onOpenTrialQr();
      } else {
        onSelectTab('trial_qr');
      }
      return;
    }
    if (tabId === 'campaign_participants') {
      onClose();
      if (onOpenCampaignParticipants) {
        onOpenCampaignParticipants();
      } else {
        onSelectTab('campaign_participants');
      }
      return;
    }
    if (tabId === 'predict_campaign_winner') {
      onClose();
      if (onOpenPredictCampaignResults) {
        onOpenPredictCampaignResults();
      } else {
        onSelectTab('predict_campaign_winner');
      }
      return;
    }
    onSelectTab(tabId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop - Soft, light and non-intrusive */}
      <div 
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* Slide-out Drawer */}
      <div className="relative w-80 max-w-[85vw] bg-white h-full shadow-xl flex flex-col z-10 animate-in slide-in-from-left duration-200 border-r border-slate-200/80">
        {/* Drawer Header - Pure Clean White & Crisp Aesthetic */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-white">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => handleItemClick('dashboard')}
              className="flex items-center gap-2.5 text-left hover:opacity-90 transition cursor-pointer group"
              title="Return to Main Screen (Dashboard)"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-500 text-white flex items-center justify-center font-black text-sm shadow-sm ring-1 ring-orange-400/30 shrink-0 group-hover:scale-105 transition-transform">
                M
              </div>
              <div className="min-w-0">
                <span className="font-extrabold text-sm tracking-tight block truncate text-slate-900 group-hover:text-orange-600 transition-colors">
                  {messName}
                </span>
                <span className="text-[11px] text-orange-600 font-semibold block">
                  Owner Management Suite
                </span>
              </div>
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              title="Close Menu"
              aria-label="Close Menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 text-xs font-semibold bg-emerald-50 border border-emerald-200/70 px-3 py-1.5 rounded-xl text-emerald-800">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verified Owner Access</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>

        {/* Scrollable Container for All Navigation & Quick Actions */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-4">
          {/* Quick Action Buttons */}
          <div className="space-y-2 pb-3 border-b border-slate-100">
            <div className="px-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-800 bg-orange-100/70 border border-orange-200/80 px-2 py-0.5 rounded-md">
                QUICK ACCESS & SCAN
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              {/* Direct Return to Main Screen (Dashboard) */}
              <button
                onClick={() => handleItemClick('dashboard')}
                className={`col-span-2 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                  currentTab === 'dashboard'
                    ? 'bg-orange-50 text-orange-800 border border-orange-200 shadow-2xs'
                    : 'bg-white hover:bg-orange-50/50 text-slate-700 hover:text-orange-700 border border-slate-200/90 shadow-2xs'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-orange-600" />
                <span>Main Screen / Operations Dashboard</span>
              </button>

              {onOpenScanner && (
                <button
                  onClick={() => { onClose(); onOpenScanner(); }}
                  className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 hover:from-orange-600 hover:to-orange-800 text-white text-xs font-semibold transition shadow-xs cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Gate Scan</span>
                </button>
              )}

              {onOpenUniversalQr && (
                <button
                  onClick={() => { onClose(); onOpenUniversalQr(); }}
                  className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition shadow-2xs cursor-pointer border border-indigo-200/70"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Standee QR</span>
                </button>
              )}

              {/* Predict Campaign Results Button */}
              <button
                onClick={() => {
                  onClose();
                  if (onOpenPredictCampaignResults) {
                    onOpenPredictCampaignResults();
                  } else {
                    onSelectTab('predict_campaign_winner');
                  }
                }}
                className="col-span-2 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-black text-xs transition cursor-pointer bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-xs"
              >
                <Sparkles className="w-4 h-4 text-amber-100 animate-spin" />
                <span>Predict Campaign Results (5 Winners)</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  if (onOpenTrialQr) {
                    onOpenTrialQr();
                  } else {
                    onSelectTab('trial_qr');
                  }
                }}
                className="col-span-2 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-extrabold transition shadow-2xs cursor-pointer border border-emerald-300/80"
                title="Open Trial Student QR Standee for Guest / Walk-in Dining"
              >
                <QrCode className="w-4 h-4 text-emerald-600" />
                <span>Trial Student QR (Special Pass Standee)</span>
              </button>

              {onSwitchPortal && (
                <button
                  onClick={() => { onClose(); onSwitchPortal(); }}
                  className="col-span-2 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl border border-blue-200/80 bg-blue-50/70 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>Switch to Student Portal</span>
                </button>
              )}
            </div>
          </div>
          {navGroups.map((group, gIdx) => {
            // Distinct category accent color
            const getCategoryAccent = (title: string) => {
              if (title.includes('OVERVIEW')) return 'text-orange-800 bg-orange-100/70 border border-orange-200/80';
              if (title.includes('CUSTOMERS')) return 'text-blue-700 bg-blue-100/70';
              if (title.includes('TRIAL')) return 'text-emerald-700 bg-emerald-100/70';
              if (title.includes('REPORTS')) return 'text-purple-700 bg-purple-100/70';
              if (title.includes('BILLING')) return 'text-teal-700 bg-teal-100/70';
              return 'text-slate-600 bg-slate-100';
            };

            return (
              <div key={gIdx} className="space-y-1">
                <div className="flex items-center gap-1.5 px-3 py-1">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${getCategoryAccent(group.title)}`}>
                    {group.title}
                  </span>
                </div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.id)}
                      className={`w-full min-h-[42px] px-3 py-2 rounded-xl text-left text-xs flex items-center justify-between transition cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 text-white font-bold shadow-xs'
                          : 'hover:bg-orange-50/60 text-slate-700 hover:text-orange-700 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} strokeWidth={2} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.id === 'leaves' && pendingLeavesCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse shrink-0 shadow-2xs">
                          {pendingLeavesCount}
                        </span>
                      ) : (
                        <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}


          {/* Settings in Drawer */}
          {onOpenSettings && (
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => { onClose(); onOpenSettings(); }}
                className="w-full min-h-[42px] px-3 py-2 rounded-xl text-left text-xs flex items-center justify-between hover:bg-orange-50 text-slate-700 hover:text-orange-600 font-semibold transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="w-4.5 h-4.5 shrink-0 text-slate-500" strokeWidth={2} />
                  <span>Mess Rules & Settings</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-800 truncate">
              {userEmail || 'Owner Account'}
            </div>
            <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Active</span>
            </div>
          </div>

          {onLogout && (
            <button
              onClick={() => { onClose(); onLogout(); }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold transition cursor-pointer border border-rose-200/70"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
