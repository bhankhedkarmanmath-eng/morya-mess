import React, { useState, useMemo, useEffect } from 'react';
import { Customer } from '../../types/mess';
import { calculateDaysRemaining, getTodayString } from '../../lib/storage';
import { 
  fetchActiveMessBranch, 
  DatabaseTariffPlan,
  saveCustomerToSupabase
} from '../../lib/supabaseSync';
import { 
  Calendar, 
  Search, 
  ArrowLeft, 
  Plus, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Filter,
  DollarSign,
  ChevronRight,
  MessageCircle,
  Pause,
  Play,
  Layers,
  Sparkles,
  Edit,
  History,
  ShieldCheck
} from 'lucide-react';

interface SubscriptionsViewProps {
  customers: Customer[];
  onBack: () => void;
  onOpenRenew: (customer: Customer) => void;
  onOpenCustomer360: (customer: Customer) => void;
  onOpenAddCustomer: () => void;
  onRefreshCustomers?: () => void;
}

type SubTab = 'active' | 'expiring' | 'expired' | 'upcoming' | 'paused' | 'plans' | 'history';

export const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({
  customers,
  onBack,
  onOpenRenew,
  onOpenCustomer360,
  onOpenAddCustomer,
  onRefreshCustomers
}) => {
  const today = getTodayString();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [tariffPlans, setTariffPlans] = useState<DatabaseTariffPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);

  // Load database tariff plans on mount
  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setIsLoadingPlans(true);
    const data = await fetchActiveMessBranch();
    setTariffPlans(data.plans || []);
    setIsLoadingPlans(false);
  };

  // Categorize subscriptions
  const classifiedSubs = useMemo(() => {
    return customers.map(c => {
      const remainingDays = calculateDaysRemaining(c.endDate);
      const isUpcoming = c.startDate > today;
      const isPaused = c.status === 'inactive' || (c.status as any) === 'paused';
      
      let status: 'active' | 'expiring' | 'expired' | 'upcoming' | 'paused' = 'active';
      if (isPaused) {
        status = 'paused';
      } else if (isUpcoming) {
        status = 'upcoming';
      } else if (remainingDays < 0 || c.status === 'expired') {
        status = 'expired';
      } else if (remainingDays <= 4) {
        status = 'expiring';
      }

      return {
        customer: c,
        remainingDays,
        status,
        renewals: c.renewals || []
      };
    });
  }, [customers, today]);

  // Tab filtered items
  const currentTabItems = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return classifiedSubs.filter(item => {
      const matchesSearch = !q || 
        item.customer.name.toLowerCase().includes(q) ||
        item.customer.phone.includes(q) ||
        item.customer.id.toLowerCase().includes(q) ||
        (item.customer.planType && item.customer.planType.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (activeSubTab === 'active') return item.status === 'active' || item.status === 'expiring';
      if (activeSubTab === 'expiring') return item.status === 'expiring';
      if (activeSubTab === 'expired') return item.status === 'expired';
      if (activeSubTab === 'upcoming') return item.status === 'upcoming';
      if (activeSubTab === 'paused') return item.status === 'paused';
      if (activeSubTab === 'history') return true; // show all for renewal history

      return true;
    });
  }, [classifiedSubs, activeSubTab, searchTerm]);

  // Counts
  const activeCount = classifiedSubs.filter(s => s.status === 'active' || s.status === 'expiring').length;
  const expiringCount = classifiedSubs.filter(s => s.status === 'expiring').length;
  const expiredCount = classifiedSubs.filter(s => s.status === 'expired').length;
  const upcomingCount = classifiedSubs.filter(s => s.status === 'upcoming').length;
  const pausedCount = classifiedSubs.filter(s => s.status === 'paused').length;

  // Toggle pause/resume
  const handleTogglePause = async (c: Customer) => {
    const nextStatus = c.status === 'inactive' ? 'active' : 'inactive';
    const confirmMsg = nextStatus === 'inactive' 
      ? `Pause subscription for ${c.name}? Gate entry will be paused while preserving balance.`
      : `Resume subscription for ${c.name}?`;
    if (!window.confirm(confirmMsg)) return;

    await saveCustomerToSupabase({ ...c, status: nextStatus });
    if (onRefreshCustomers) onRefreshCustomers();
  };

  // WhatsApp Reminder
  const handleWhatsAppReminder = (c: Customer) => {
    const phoneClean = c.phone.replace(/[^0-9]/g, '');
    const days = calculateDaysRemaining(c.endDate);
    const text = encodeURIComponent(
      `Namaste ${c.name},\nThis is a friendly reminder from Morya Mess regarding your meal subscription.\nYour pass validity expires on ${c.endDate} (${days < 0 ? `${Math.abs(days)} days overdue` : `${days} days left`}).\nPlan: ${c.planType} (₹${c.totalAmount}/month).\nKindly renew your pass or pay via UPI to continue uninterrupted dining.\nThank you!`
    );
    window.open(`https://wa.me/91${phoneClean}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-600" />
              <span>Subscription Management Center</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Validity cycles, tariff plans, expiry management, renewals, and member status
            </p>
          </div>
        </div>

        <button
          onClick={onOpenAddCustomer}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs shadow-sm transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Subscription</span>
        </button>
      </div>

      {/* Main Views / Sub-tabs Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs text-xs font-bold">
        {[
          { id: 'active', label: `Active (${activeCount})`, icon: CheckCircle2 },
          { id: 'expiring', label: `Expiring Soon (${expiringCount})`, icon: Clock },
          { id: 'expired', label: `Expired (${expiredCount})`, icon: AlertTriangle },
          { id: 'upcoming', label: `Upcoming (${upcomingCount})`, icon: Calendar },
          { id: 'paused', label: `Paused / Inactive (${pausedCount})`, icon: Pause },
          { id: 'plans', label: `Tariff Plans (${tariffPlans.length})`, icon: Layers },
          { id: 'history', label: 'Subscription History', icon: History }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as SubTab)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap transition cursor-pointer ${
                activeSubTab === tab.id
                  ? 'bg-orange-600 text-white font-black shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==================================================== */}
      {/* VIEW: TARIFF PLANS MANAGEMENT                        */}
      {/* ==================================================== */}
      {activeSubTab === 'plans' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-5 rounded-3xl border border-slate-200">
            <div>
              <h3 className="font-black text-slate-900 text-base">Tariff Plans & Pricing Architecture</h3>
              <p className="text-xs text-slate-500">Configured subscription plans stored in Supabase tariff_plans</p>
            </div>
            <button
              onClick={onOpenAddCustomer}
              className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs"
            >
              + Assign Plan
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tariffPlans.map((plan) => (
              <div key={plan.id} className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-black text-slate-900 text-base">{plan.planName}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                      {plan.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{plan.description || 'Standard Hostel Dining'}</p>
                </div>

                <div className="p-3 rounded-2xl bg-orange-50/70 border border-orange-200 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Base Price:</span>
                    <strong className="text-orange-950 font-black text-sm">₹{plan.basePrice}</strong>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-600">Duration:</span>
                    <span className="font-bold text-slate-900">{plan.durationDays} Days</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-600">Meal Eligibility:</span>
                    <span className="font-bold text-slate-900">
                      {plan.bothMeals ? 'Lunch + Dinner' : plan.lunchOnly ? 'Lunch Only' : 'Dinner Only'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[10px]">Verified Tariff Plan</span>
                  <span className="font-bold text-orange-600 text-xs">Applicable to all members</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ==================================================== */
        /* VIEWS: ACTIVE, EXPIRING, EXPIRED, UPCOMING, PAUSED, HISTORY */
        /* ==================================================== */
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3 text-xs">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search member name, ID, mobile, or plan..."
              className="flex-1 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 outline-none"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {currentTabItems.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-900 text-sm">No subscriptions in this view</h4>
              <p className="text-xs text-slate-500">There are no member passes matching the selected filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentTabItems.map(item => {
                const c = item.customer;
                const isOverdue = item.remainingDays < 0 || item.status === 'expired';
                const isExpiringSoon = item.status === 'expiring';

                return (
                  <div 
                    key={c.id}
                    className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs hover:border-orange-300 transition flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-black text-slate-900 text-sm">{c.name}</h3>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              c.gender === 'female' ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {c.gender === 'female' ? 'Girl' : 'Boy'}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400 font-bold block mt-0.5">
                            {c.id} • {c.phone}
                          </span>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isOverdue
                            ? 'bg-rose-100 text-rose-700'
                            : isExpiringSoon
                            ? 'bg-amber-100 text-amber-700'
                            : item.status === 'upcoming'
                            ? 'bg-blue-100 text-blue-700'
                            : item.status === 'paused'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {isOverdue
                            ? `${Math.abs(item.remainingDays)}d Overdue`
                            : isExpiringSoon
                            ? `${item.remainingDays}d Left`
                            : item.status}
                        </span>
                      </div>

                      {/* Plan & Dates Card */}
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
                        <div className="flex justify-between font-bold text-slate-800">
                          <span>Plan:</span>
                          <span className="text-orange-900">{c.planType}</span>
                        </div>
                        <div className="flex justify-between text-slate-600 text-[11px]">
                          <span>Period:</span>
                          <span className="font-mono">{c.startDate} to {c.endDate}</span>
                        </div>
                        <div className="flex justify-between text-slate-600 text-[11px]">
                          <span>Monthly Rate:</span>
                          <strong className="text-slate-900">₹{c.totalAmount}</strong>
                        </div>
                        <div className="flex justify-between text-slate-600 text-[11px] pt-1 border-t border-slate-200">
                          <span>Balance Due:</span>
                          <span className={`font-black ${c.balance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                            {c.balance > 0 ? `₹${c.balance}` : 'Nil'}
                          </span>
                        </div>
                      </div>

                      {/* Renewal history snippet if on history tab */}
                      {activeSubTab === 'history' && item.renewals.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-orange-50/50 border border-orange-100 text-[11px] space-y-1">
                          <span className="font-bold text-orange-900 block">Renewal History ({item.renewals.length})</span>
                          <span className="text-slate-600">
                            Last renewed: {item.renewals[0]?.date || 'Recent'} (₹{item.renewals[0]?.paidAmount})
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5 text-xs">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onOpenRenew(c)}
                          className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-[11px] cursor-pointer shadow-xs"
                        >
                          Renew / Extend
                        </button>

                        <button
                          onClick={() => handleTogglePause(c)}
                          className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                          title={c.status === 'inactive' ? 'Resume Subscription' : 'Pause Subscription'}
                        >
                          {c.status === 'inactive' ? <Play className="w-3.5 h-3.5 text-emerald-600" /> : <Pause className="w-3.5 h-3.5 text-amber-600" />}
                        </button>

                        {c.phone && (
                          <button
                            onClick={() => handleWhatsAppReminder(c)}
                            className="p-1.5 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 cursor-pointer"
                            title="Send WhatsApp Renewal Notice"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => onOpenCustomer360(c)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] cursor-pointer"
                      >
                        360 View
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
