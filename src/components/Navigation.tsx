import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Utensils, 
  Receipt, 
  UserCheck, 
  BarChart3, 
  Settings, 
  Sparkles,
  QrCode, 
  ShieldCheck, 
  ChevronDown, 
  LogOut, 
  Calendar, 
  Layers,
  Menu,
  Bell
} from 'lucide-react';
import { UserRole } from '../types/mess';

interface NavigationProps {
  currentTab: string;
  onTabChange: (tabId: 'dashboard' | 'customers' | 'meals' | 'expenses' | 'workers' | 'reports') => void;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onOpenScanner: () => void;
  onOpenUniversalQr?: () => void;
  onOpenSettings: () => void;
  messName?: string;
  pendingLeavesCount?: number;
  onSwitchPortal?: () => void;
  onLogout?: () => void;
  userEmail?: string;
  // Feature 1 & 2 additions
  onOpenDrawer?: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  currentRole,
  onRoleChange,
  onOpenScanner,
  onOpenUniversalQr,
  onOpenSettings,
  messName = 'MORYA MESS',
  pendingLeavesCount = 0,
  onSwitchPortal,
  onLogout,
  userEmail,
  onOpenDrawer,
  onOpenNotifications,
  unreadNotificationsCount = 0
}) => {
  const navItems: { id: 'dashboard' | 'customers' | 'meals' | 'expenses' | 'workers' | 'reports'; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Members', icon: Users },
    { id: 'meals', label: 'Gate Attendance', icon: Utensils },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'workers', label: 'Staff & Kitchen', icon: UserCheck },
    { 
      id: 'reports', 
      label: 'Financial P&L & Audits', 
      icon: BarChart3,
      badge: pendingLeavesCount > 0 ? pendingLeavesCount : undefined 
    }
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-3">
          {/* Left: Three-Line / Hamburger Drawer Menu Button & Brand */}
          <div className="flex items-center gap-2 sm:gap-3">
            {onOpenDrawer && (
              <button
                id="btn-owner-drawer-menu"
                onClick={onOpenDrawer}
                className="p-2 rounded-xl text-slate-700 hover:text-orange-600 hover:bg-orange-50 border border-slate-200 hover:border-orange-200 transition-all cursor-pointer shadow-2xs"
                title="Open Owner Menu Drawer"
                aria-label="Open Navigation Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center font-black text-base sm:text-lg shadow-xs tracking-wider">
              M
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight">
                  {messName}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">
                  PRO
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>Hostel Dining Operations</span>
              </div>
            </div>
          </div>

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1 text-xs font-semibold text-slate-600">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? 'bg-orange-50 text-orange-700 font-bold'
                      : 'hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-orange-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Quick Gate Scanner Button */}
            <button
              id="btn-nav-scanner"
              onClick={onOpenScanner}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-orange-600 text-white font-bold text-xs hover:bg-orange-700 shadow-xs transition-all cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">Gate Scanner</span>
            </button>

            {/* Universal Standee QR Button */}
            {onOpenUniversalQr && (
              <button
                id="btn-nav-universal-qr"
                onClick={onOpenUniversalQr}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 shadow-xs transition-all cursor-pointer border border-slate-700"
                title="Universal Mess Wall / Counter Standee QR"
              >
                <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                <span>Standee QR</span>
              </button>
            )}

            {/* Notification Bell (FEATURE 1) */}
            {onOpenNotifications && (
              <button
                id="btn-nav-notifications"
                onClick={onOpenNotifications}
                className="relative p-2 rounded-xl text-slate-600 hover:text-orange-600 hover:bg-orange-50 border border-slate-200 transition-all cursor-pointer"
                title="Open Notification Center"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-orange-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-white animate-pulse">
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </span>
                )}
              </button>
            )}

            {/* Portal Switcher Button */}
            {onSwitchPortal && (
              <button
                onClick={onSwitchPortal}
                className="hidden xl:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-orange-200 bg-orange-50/70 hover:bg-orange-100 text-orange-800 text-xs font-bold transition-all cursor-pointer shadow-xs"
                title="Switch to Student Digital Pass Portal"
              >
                <Layers className="w-3.5 h-3.5 text-orange-600" />
                <span>Student Portal</span>
              </button>
            )}

            {/* Role Switcher Pill */}
            <div className="relative hidden sm:block">
              <select
                value={currentRole}
                onChange={(e) => onRoleChange(e.target.value as UserRole)}
                className="appearance-none bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs pl-3 pr-7 py-2 rounded-xl focus:outline-none cursor-pointer"
              >
                <option value="owner">Owner</option>
                <option value="manager">Manager</option>
                <option value="staff">Staff Gate</option>
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Settings */}
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Mess Settings & Rules"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Logout Button */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-xs font-bold transition-colors cursor-pointer border border-slate-200 hover:border-rose-200"
                title={userEmail ? `Sign out (${userEmail})` : 'Sign Out'}
              >
                <LogOut className="w-3.5 h-3.5 text-slate-500 hover:text-rose-600" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="lg:hidden flex items-center justify-between overflow-x-auto py-2 border-t border-slate-100 gap-1 text-[11px] font-semibold text-slate-600 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`relative flex items-center gap-1 px-2.5 py-1.5 rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-orange-50 text-orange-700 font-bold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-orange-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
