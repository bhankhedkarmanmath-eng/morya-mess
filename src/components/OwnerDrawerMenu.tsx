import React, { useState } from 'react';
import { OwnerNavPage } from '../types/mess';
import { 
  X, 
  ChevronDown, 
  ChevronRight, 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  Search, 
  UserCheck, 
  Sparkles, 
  Calendar, 
  QrCode, 
  BarChart3, 
  CreditCard, 
  Receipt, 
  Utensils, 
  ShieldCheck, 
  HelpCircle, 
  Settings, 
  DollarSign, 
  CheckCircle, 
  FileSpreadsheet, 
  FileText,
  Clock,
  LogOut,
  Smartphone
} from 'lucide-react';

interface OwnerDrawerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activePage: OwnerNavPage;
  onSelectPage: (page: OwnerNavPage) => void;
  messName?: string;
  onLogout?: () => void;
}

interface MenuSection {
  title: string;
  items: {
    id: OwnerNavPage;
    label: string;
    icon: React.ElementType;
    badge?: string;
  }[];
}

export const OwnerDrawerMenu: React.FC<OwnerDrawerMenuProps> = ({
  isOpen,
  onClose,
  activePage,
  onSelectPage,
  messName = 'MORYA MESS',
  onLogout
}) => {
  // Collapsible category state (all open by default for quick discovery)
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const toggleCategory = (title: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const menuSections: MenuSection[] = [
    {
      title: 'DASHBOARD',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }
      ]
    },
    {
      title: 'CUSTOMERS / DINERS',
      items: [
        { id: 'customers', label: 'Customers', icon: Users },
        { id: 'add_customer', label: 'Add Customer', icon: UserPlus },
        { id: 'search_customer', label: 'Search Customer', icon: Search },
        { id: 'trial_students', label: 'Trial Students', icon: Sparkles, badge: 'New' },
        { id: 'subscriptions', label: 'Subscriptions', icon: Calendar },
        { id: 'skip_meal', label: 'Skip Meal & Leaves', icon: Clock },
        { id: 'mark_attendance', label: 'Mark Attendance', icon: CheckCircle },
        { id: 'attendance_scanner', label: 'Attendance Scanner', icon: QrCode }
      ]
    },
    {
      title: 'REPORTS & ANALYTICS',
      items: [
        { id: 'attendance_reports', label: 'Attendance Reports', icon: BarChart3 },
        { id: 'customer_reports', label: 'Customer Reports', icon: Users },
        { id: 'payment_reports', label: 'Payment Reports', icon: DollarSign },
        { id: 'expense_reports', label: 'Expense Reports', icon: Receipt },
        { id: 'monthly_statements', label: 'Monthly Statements', icon: FileText },
        { id: 'business_summary', label: 'Business Summary', icon: BarChart3 },
        { id: 'excel_export', label: 'Excel Export', icon: FileSpreadsheet }
      ]
    },
    {
      title: 'BILLING & PAYMENTS',
      items: [
        { id: 'billing_payments', label: 'Billing & Payments', icon: CreditCard },
        { id: 'upi_payments', label: 'UPI Payments', icon: QrCode },
        { id: 'cash_payments', label: 'Cash Payments', icon: DollarSign },
        { id: 'qr_settings', label: 'Mess Payment QR & UPI ID', icon: Smartphone, badge: 'Setup' },
        { id: 'payment_history', label: 'Payment History', icon: Clock },
        { id: 'pending_payments', label: 'Pending Payments', icon: CreditCard, badge: 'Review' },
        { id: 'payment_verification', label: 'Payment Verification', icon: CheckCircle },
        { id: 'customer_ledger', label: 'Customer Ledger', icon: FileText },
        { id: 'statement_calc', label: 'Monthly Statement', icon: FileText }
      ]
    },
    {
      title: 'FINANCE & WALK-IN POS',
      items: [
        { id: 'walkin_pos', label: 'Walk-in POS', icon: DollarSign },
        { id: 'walkin_meal_types', label: 'Walk-in Meal Types', icon: Utensils },
        { id: 'walkin_payments', label: 'Walk-in Payments', icon: CreditCard },
        { id: 'expense_tracker', label: 'Expense Tracker', icon: Receipt }
      ]
    },
    {
      title: 'MENU & ENGAGEMENT',
      items: [
        { id: 'meal_plans_pricing', label: 'Meal Plans & Pricing', icon: DollarSign },
        { id: 'meal_rate_timing', label: 'Meal Rate & Timing', icon: Clock },
        { id: 'weekly_menu', label: 'Weekly Menu', icon: Utensils },
        { id: 'polls', label: 'Polls', icon: HelpCircle },
        { id: 'reminders', label: 'Reminders', icon: Clock },
        { id: 'meal_ratings', label: 'Meal Ratings & Reviews', icon: Sparkles },
        { id: 'complaints_tracker', label: 'Complaints Tracker', icon: FileText }
      ]
    },
    {
      title: 'MESS ADMINISTRATION',
      items: [
        { id: 'mess_settings', label: 'Mess Settings', icon: Settings },
        { id: 'staff_management', label: 'Staff Management', icon: UserCheck },
        { id: 'roles_permissions', label: 'Roles & Permissions', icon: ShieldCheck },
        { id: 'my_mess', label: 'My Mess', icon: LayoutDashboard },
        { id: 'security_log', label: 'Security / Activity Log', icon: ShieldCheck }
      ]
    },
    {
      title: 'MY ACCOUNT & SUPPORT',
      items: [
        { id: 'my_account', label: 'My Account', icon: Users },
        { id: 'help_support', label: 'Help & Support', icon: HelpCircle },
        { id: 'support_requests', label: 'Support Requests', icon: FileText }
      ]
    }
  ];

  const handleSelect = (pageId: OwnerNavPage) => {
    onSelectPage(pageId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Click outside backdrop */}
      <div className="flex-1" onClick={onClose} />

      {/* Side Drawer Panel */}
      <aside 
        className="w-80 max-w-[85vw] h-full bg-white border-r border-slate-200 shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center font-black text-base shadow-xs">
              M
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 text-sm tracking-tight">{messName}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-orange-50 text-orange-700 rounded border border-orange-200">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Owner Management Suite</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {menuSections.map((section) => {
            const isCollapsed = collapsedCategories[section.title];
            return (
              <div key={section.title} className="space-y-1">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(section.title)}
                  className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <span>{section.title}</span>
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {/* Category Children Items */}
                {!isCollapsed && (
                  <div className="space-y-0.5 pl-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isSelected = activePage === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelect(item.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-orange-50 text-orange-700 font-bold border border-orange-200/80 shadow-xs'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className={`w-4 h-4 ${isSelected ? 'text-orange-600' : 'text-slate-400'}`} />
                            <span>{item.label}</span>
                          </div>
                          {item.badge && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-orange-100 text-orange-700">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Drawer Bottom Actions */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-slate-600 font-medium">Supabase Verified</span>
          </div>
          {onLogout && (
            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log out</span>
            </button>
          )}
        </div>
      </aside>
    </div>
  );
};
