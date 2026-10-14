import React from 'react';
import { 
  Menu,
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Utensils, 
  Receipt, 
  Package, 
  BarChart3, 
  QrCode, 
  Settings, 
  Bell, 
  ShieldCheck, 
  Trophy,
  Sparkles
} from 'lucide-react';
import { UserRole } from '../types/mess';

interface NavigationProps {
  currentTab: string;
  onTabChange: (tabId: string) => void;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onOpenScanner: () => void;
  onOpenUniversalQr?: () => void;
  onOpenTrialQr?: () => void;
  onOpenPredictCampaignResults?: () => void;
  onOpenSettings: () => void;
  messName?: string;
  pendingLeavesCount?: number;
  onSwitchPortal?: () => void;
  onLogout?: () => void;
  userEmail?: string;
  onOpenDrawer?: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  onPlayIntroAnimation?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  currentRole,
  onRoleChange,
  onOpenScanner,
  onOpenUniversalQr,
  onOpenTrialQr,
  onOpenPredictCampaignResults,
  onOpenSettings,
  messName = 'MORYA MESS',
  pendingLeavesCount = 0,
  onSwitchPortal,
  onLogout,
  userEmail,
  onOpenDrawer,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  onPlayIntroAnimation
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Members', icon: Users },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { id: 'attendance', label: 'Attendance', icon: Utensils },
    { id: 'finance', label: 'Finance', icon: Receipt },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'reports', label: 'Reports', icon: BarChart3, badge: pendingLeavesCount > 0 ? pendingLeavesCount : undefined }
  ];

  const getPageContextTitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return 'Operations Cockpit';
      case 'customers':
      case 'add_customer':
      case 'search_customer':
        return 'Member Management';
      case 'attendance':
      case 'scanner':
        return 'Gate & Attendance Center';
      case 'subscriptions':
        return 'Subscription Plans';
      case 'billing':
      case 'upi_payments':
      case 'cash_payments':
      case 'finance':
        return 'Billing & Financials';
      case 'inventory':
        return 'Kitchen Inventory';
      case 'reports':
      case 'attendance_reports':
      case 'customer_reports':
      case 'payment_reports':
      case 'business_summary':
        return 'Reports & Analytics';
      default:
        return 'Management Suite';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/98 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Left: Hamburger Menu */}
          <div className="flex items-center">
            <button
              onClick={onOpenDrawer}
              className="p-2.5 rounded-xl border border-slate-200/90 bg-white hover:bg-orange-50/60 text-slate-700 hover:text-orange-600 transition shadow-2xs cursor-pointer flex items-center justify-center hover:border-orange-200"
              aria-label="Open Navigation Menu"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5 text-orange-600" />
            </button>
          </div>

          {/* Center: Clear Premium Orange Badge with Creamy White Typography */}
          <div className="flex-1 flex items-center justify-center">
            <button
              onClick={() => onTabChange('dashboard')}
              className="inline-flex items-center justify-center px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-orange-600 text-[#FFFDF6] shadow-[0_4px_14px_-2px_rgba(249,115,22,0.42)] border border-orange-300/40 ring-1 ring-white/30 hover:shadow-[0_6px_20px_-2px_rgba(249,115,22,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer"
              title="Return to Main Screen (Dashboard)"
            >
              <span className="font-extrabold text-sm sm:text-base md:text-lg text-[#FFFDF6] tracking-wider uppercase font-display select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.18)]">
                {messName}
              </span>
            </button>
          </div>

          {/* Right: Quick Gate Scan, Bell, Settings, Profile */}
          <div className="flex items-center gap-2">
            {/* Quick Action: Gate Scanner */}
            <button
              id="btn-nav-scanner"
              onClick={onOpenScanner}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 hover:from-orange-600 hover:to-orange-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer transform hover:-translate-y-0.5"
            >
              <QrCode className="w-4 h-4" />
              <span>Gate Scan</span>
            </button>

            {/* Quick Action: Trial Student QR */}
            {onOpenTrialQr && (
              <button
                id="btn-nav-trial-qr"
                onClick={onOpenTrialQr}
                className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs transition-all cursor-pointer shadow-xs transform hover:-translate-y-0.5"
                title="Trial Student QR Standee"
              >
                <QrCode className="w-4 h-4" />
                <span>Trial QR</span>
              </button>
            )}

            {/* Notification Bell */}
            {onOpenNotifications && (
              <button
                onClick={onOpenNotifications}
                className="relative p-2.5 rounded-xl border border-slate-200/90 bg-white hover:bg-orange-50/60 text-slate-600 hover:text-orange-600 transition shadow-2xs cursor-pointer flex items-center justify-center hover:border-orange-200"
                title="View Notifications"
              >
                <Bell className="w-4 h-4 text-slate-600" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-orange-600 text-white shadow-xs">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>
            )}


            {/* Settings */}
            <button
              onClick={onOpenSettings}
              className="p-2.5 rounded-xl border border-slate-200/90 bg-white hover:bg-orange-50/60 text-slate-600 hover:text-orange-600 transition shadow-2xs cursor-pointer hover:border-orange-200"
              title="Mess Settings & Rules"
            >
              <Settings className="w-4 h-4 text-slate-600" />
            </button>

            {/* Profile Avatar Chip */}
            <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                O
              </div>
              <div className="text-left hidden xl:block">
                <div className="text-xs font-semibold text-slate-800 truncate max-w-[130px] leading-tight">
                  {userEmail || 'Owner'}
                </div>
                <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 leading-tight">
                  <ShieldCheck className="w-3 h-3 text-emerald-700" />
                  <span>Verified Admin</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Tab Navigation */}
        <div className="hidden xl:flex items-center justify-between py-2 border-t border-slate-100 gap-1.5 text-xs font-semibold">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id || (item.id === 'attendance' && currentTab === 'meals') || (item.id === 'finance' && currentTab === 'expenses');
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl whitespace-nowrap cursor-pointer transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-orange-600 hover:bg-orange-50/70'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-orange-600'}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

