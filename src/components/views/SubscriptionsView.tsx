import React, { useState, useMemo, useEffect } from 'react';
import QRCode from 'qrcode';
import { Customer } from '../../types/mess';
import { calculateDaysRemaining, getTodayString, loadCustomers, saveCustomers } from '../../lib/storage';
import { exportToSpreadsheet } from '../../lib/exportUtils';
import { 
  fetchActiveMessBranch, 
  DatabaseTariffPlan,
  updateCustomerInSupabase,
  supabase 
} from '../../lib/supabaseSync';
import { fetchMessUpiConfig, recordNewPaymentInSupabase } from '../../lib/ownerFeaturesApi';
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
  ShieldCheck,
  Ban,
  Sliders,
  X,
  Download,
  Share2,
  ExternalLink,
  Banknote,
  Smartphone
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

  // Quick In-Place Renewal Modal State
  const [quickRenewCustomer, setQuickRenewCustomer] = useState<Customer | null>(null);
  const [renewDays, setRenewDays] = useState<number>(30);
  const [renewFee, setRenewFee] = useState<number>(2500);
  const [renewPaid, setRenewPaid] = useState<number>(2500);
  const [renewMethod, setRenewMethod] = useState<'cash' | 'upi'>('cash');
  const [isRenewing, setIsRenewing] = useState(false);

  // Quick Freeze/Pause Modal State
  const [pauseCustomer, setPauseCustomer] = useState<Customer | null>(null);
  const [pauseDays, setPauseDays] = useState<number>(5);
  const [pauseReason, setPauseReason] = useState<string>('Home Visit / Semester Exams');
  const [isPausing, setIsPausing] = useState(false);

  // Mess UPI Config for WhatsApp notices
  const [messUpiId, setMessUpiId] = useState<string>('moryamess@oksbi');

  // Load database tariff plans & UPI config
  useEffect(() => {
    loadPlans();
    fetchMessUpiConfig().then(cfg => {
      if (cfg?.upiId) setMessUpiId(cfg.upiId);
    });
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
      const isCancelled = (c.status as string) === 'cancelled' || (c.status as string) === 'suspended';
      const isPaused = c.status === 'inactive' || (c.status as string) === 'paused';
      
      let status: 'active' | 'expiring' | 'expired' | 'upcoming' | 'paused' | 'cancelled' = 'active';
      if (isCancelled) {
        status = 'cancelled';
      } else if (isPaused) {
        status = 'paused';
      } else if (isUpcoming) {
        status = 'upcoming';
      } else if (remainingDays < 0 || c.status === 'expired') {
        status = 'expired';
      } else if (remainingDays <= 3) {
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
        (item.customer.planType && item.customer.planType.toLowerCase().includes(q)) ||
        (item.customer.hostelOrAddress && item.customer.hostelOrAddress.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (activeSubTab === 'active') return item.status === 'active' || item.status === 'expiring';
      if (activeSubTab === 'expiring') return item.status === 'expiring';
      if (activeSubTab === 'expired') return item.status === 'expired';
      if (activeSubTab === 'upcoming') return item.status === 'upcoming';
      if (activeSubTab === 'paused') return item.status === 'paused';
      if (activeSubTab === 'history') return true;

      return true;
    });
  }, [classifiedSubs, activeSubTab, searchTerm]);

  // Counts & Revenue Calculation
  const activeCount = classifiedSubs.filter(s => s.status === 'active' || s.status === 'expiring').length;
  const expiringCount = classifiedSubs.filter(s => s.status === 'expiring').length;
  const expiredCount = classifiedSubs.filter(s => s.status === 'expired').length;
  const upcomingCount = classifiedSubs.filter(s => s.status === 'upcoming').length;
  const pausedCount = classifiedSubs.filter(s => s.status === 'paused').length;

  const totalMonthlyRunRate = useMemo(() => {
    return classifiedSubs
      .filter(s => s.status === 'active' || s.status === 'expiring')
      .reduce((acc, s) => acc + (s.customer.totalAmount || 2500), 0);
  }, [classifiedSubs]);

  // Handle Quick In-Place Renewal
  const handleExecuteQuickRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickRenewCustomer) return;
    setIsRenewing(true);

    try {
      // Calculate new dates
      const baseStart = new Date(quickRenewCustomer.endDate > today ? quickRenewCustomer.endDate : today);
      const newStart = new Date(baseStart);
      newStart.setDate(newStart.getDate() + 1);
      const newEnd = new Date(newStart);
      newEnd.setDate(newEnd.getDate() + renewDays);

      const newStartStr = newStart.toISOString().split('T')[0];
      const newEndStr = newEnd.toISOString().split('T')[0];

      const additionalDue = Math.max(0, renewFee - renewPaid);
      const newTotalBalance = (quickRenewCustomer.balance || 0) + additionalDue;

      const renewalRecord = {
        id: `rn-${Date.now()}`,
        startDate: newStartStr,
        endDate: newEndStr,
        amount: renewFee,
        paidAmount: renewPaid,
        timestamp: new Date().toISOString(),
        paymentMethod: renewMethod
      };

      const updates: Partial<Customer> = {
        startDate: newStartStr,
        endDate: newEndStr,
        status: 'active',
        balance: newTotalBalance,
        renewals: [...(quickRenewCustomer.renewals || []), renewalRecord as any]
      };

      // Sync to Supabase
      await updateCustomerInSupabase('63b00e12-a702-492f-bd56-1e260338699f', quickRenewCustomer.id, updates, tariffPlans);

      // Record payment ledger if paid
      if (renewPaid > 0) {
        await recordNewPaymentInSupabase({
          customerId: quickRenewCustomer.id,
          customerName: quickRenewCustomer.name,
          amount: renewPaid,
          paymentMode: renewMethod,
          status: 'verified',
          notes: `Subscription Renewal (${renewDays} Days) via ${renewMethod.toUpperCase()}`,
          recordedBy: 'Owner Renewal Desk'
        });
      }

      // Local storage update
      const local = loadCustomers();
      const updatedList = local.map(c => c.id === quickRenewCustomer.id ? { ...c, ...updates } : c);
      saveCustomers(updatedList);
      if (onRefreshCustomers) onRefreshCustomers();

      setIsRenewing(false);
      setQuickRenewCustomer(null);
    } catch {
      setIsRenewing(false);
      alert('Could not complete renewal. Please check database connection.');
    }
  };

  // Handle Freezing / Pausing Subscription with End-Date Extension
  const handleExecutePause = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pauseCustomer) return;
    setIsPausing(true);

    try {
      // Calculate extended end date: Add pause days to existing end date!
      const currentEnd = new Date(pauseCustomer.endDate || today);
      currentEnd.setDate(currentEnd.getDate() + pauseDays);
      const extendedEndStr = currentEnd.toISOString().split('T')[0];

      const updates: Partial<Customer> = {
        status: 'inactive', // paused
        endDate: extendedEndStr,
        notes: [
          pauseCustomer.notes,
          `[PAUSED on ${today}: +${pauseDays} days extended for ${pauseReason}. Resumes with end-date: ${extendedEndStr}]`
        ].filter(Boolean).join(' | ')
      };

      await updateCustomerInSupabase('63b00e12-a702-492f-bd56-1e260338699f', pauseCustomer.id, updates, tariffPlans);

      const local = loadCustomers();
      const updatedList = local.map(c => c.id === pauseCustomer.id ? { ...c, ...updates } : c);
      saveCustomers(updatedList);
      if (onRefreshCustomers) onRefreshCustomers();

      setIsPausing(false);
      setPauseCustomer(null);
    } catch {
      setIsPausing(false);
      alert('Failed to pause subscription.');
    }
  };

  // 1-Click Unfreeze / Resume Subscription
  const handleResumeSubscription = async (c: Customer) => {
    if (!window.confirm(`Resume active dining subscription for ${c.name}? Entry gate will immediately allow scans.`)) return;

    const updates: Partial<Customer> = { status: 'active' };
    await updateCustomerInSupabase('63b00e12-a702-492f-bd56-1e260338699f', c.id, updates, tariffPlans);

    const local = loadCustomers();
    const updatedList = local.map(cust => cust.id === c.id ? { ...cust, ...updates } : cust);
    saveCustomers(updatedList);
    if (onRefreshCustomers) onRefreshCustomers();
  };

  // WhatsApp Renewal Notice
  const handleWhatsAppReminder = (c: Customer) => {
    const phoneClean = c.phone.replace(/[^0-9]/g, '');
    const days = calculateDaysRemaining(c.endDate);
    const text = encodeURIComponent(
      `Namaste ${c.name},\nGreetings from Morya Mess! 🙏\n\n` +
      `Your dining subscription pass is expiring on ${c.endDate} (${days < 0 ? `${Math.abs(days)} days overdue` : `${days} days left`}).\n` +
      `• Current Plan: ${c.planType.replace('_', ' ').toUpperCase()}\n` +
      `• Renewal Fee: ₹${c.totalAmount || 2500}/month\n` +
      `• UPI ID for online payment: ${messUpiId}\n\n` +
      `Please renew your pass to ensure uninterrupted lunch & dinner dining.\nThank you!`
    );
    window.open(`https://wa.me/91${phoneClean}?text=${text}`, '_blank');
  };

  // Bulk WhatsApp Blast to all expiring students
  const handleBatchExpiringBlast = () => {
    const expiringList = classifiedSubs.filter(s => s.status === 'expiring' && s.customer.phone);
    if (expiringList.length === 0) {
      alert('No students currently in the expiring (≤ 3 days) window.');
      return;
    }
    if (!window.confirm(`Open WhatsApp reminder for first of ${expiringList.length} expiring students?`)) return;
    handleWhatsAppReminder(expiringList[0].customer);
  };

  // Export Subscription List
  const handleExportRoster = (format: 'xlsx' | 'csv') => {
    const rows = currentTabItems.map(item => ({
      'Customer ID': item.customer.id,
      'Name': item.customer.name,
      'Phone': item.customer.phone,
      'Gender': item.customer.gender,
      'Plan': item.customer.planType,
      'Start Date': item.customer.startDate,
      'Valid Until': item.customer.endDate,
      'Days Remaining': item.remainingDays,
      'Subscription Status': item.status.toUpperCase(),
      'Plan Fee': item.customer.totalAmount,
      'Dues Balance': item.customer.balance
    }));

    exportToSpreadsheet(rows, {
      filename: `Morya_Mess_Subscriptions_${activeSubTab}_${today}`,
      sheetName: 'Subscriptions',
      format
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
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
              <span>Subscription & Tariff Operations Center</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Validity cycles, instant renewal desk, vacation pause extensions, and tariff rules
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            onClick={() => handleExportRoster('xlsx')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Roster</span>
          </button>
          <button
            onClick={onOpenAddCustomer}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 hover:from-orange-600 hover:to-orange-800 text-white font-black text-xs shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Subscription</span>
          </button>
        </div>
      </div>

      {/* High-Impact Subscription KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-black uppercase text-emerald-600 block tracking-wider">Active Passes</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{activeCount}</div>
          <span className="text-[11px] text-emerald-700 font-semibold">Dining authorized</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/40 shadow-2xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase text-amber-700 block tracking-wider">Expiring in ≤ 3D</span>
            {expiringCount > 0 && (
              <button
                onClick={handleBatchExpiringBlast}
                className="text-[10px] font-bold text-amber-800 bg-amber-200/80 hover:bg-amber-300 px-2 py-0.5 rounded cursor-pointer"
                title="Send WhatsApp notice"
              >
                Blast Notice
              </button>
            )}
          </div>
          <div className="text-2xl font-black text-amber-800 mt-1">{expiringCount}</div>
          <span className="text-[11px] text-amber-700 font-semibold">Needs renewal prompt</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/40 shadow-2xs">
          <span className="text-[10px] font-black uppercase text-rose-700 block tracking-wider">Expired Passes</span>
          <div className="text-2xl font-black text-rose-800 mt-1">{expiredCount}</div>
          <span className="text-[11px] text-rose-700 font-semibold">Blocked at gate</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-black uppercase text-slate-500 block tracking-wider">Paused / On Leave</span>
          <div className="text-2xl font-black text-slate-800 mt-1">{pausedCount}</div>
          <span className="text-[11px] text-slate-500 font-medium">Days frozen</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-black uppercase text-orange-600 block tracking-wider">Monthly Run-Rate</span>
          <div className="text-xl font-black text-orange-700 mt-1">₹{totalMonthlyRunRate.toLocaleString('en-IN')}</div>
          <span className="text-[11px] text-slate-500 font-medium">Expected revenue</span>
        </div>
      </div>

      {/* Main Views / Sub-tabs Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-2xs text-xs font-bold">
        {[
          { id: 'active', label: `Active (${activeCount})`, icon: CheckCircle2 },
          { id: 'expiring', label: `Expiring Soon (${expiringCount})`, icon: Clock },
          { id: 'expired', label: `Expired (${expiredCount})`, icon: AlertTriangle },
          { id: 'upcoming', label: `Upcoming (${upcomingCount})`, icon: Calendar },
          { id: 'paused', label: `Paused / Frozen (${pausedCount})`, icon: Pause },
          { id: 'plans', label: `Tariff Plans (${tariffPlans.length})`, icon: Layers },
          { id: 'history', label: 'Subscription History', icon: History }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap transition cursor-pointer ${
                activeSubTab === tab.id
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search Bar for Subscriptions */}
      {activeSubTab !== 'plans' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Filter subscribers by diner name, mobile number, plan type, or hostel..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-xs font-semibold text-slate-900 focus:outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* TAB: TARIFF PLANS */}
      {activeSubTab === 'plans' ? (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900">Standard Mess Tariff Plans</h3>
              <p className="text-xs text-slate-500">Official billing tiers configured for Morya Mess</p>
            </div>
            <button
              onClick={loadPlans}
              disabled={isLoadingPlans}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPlans ? 'animate-spin' : ''}`} />
              <span>Refresh Plans</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tariffPlans.length === 0 ? (
              // Default Fallback display
              [
                { name: 'Girls Hostel Special (2 Meals)', price: 2500, desc: 'Lunch + Dinner daily (30 Days). Female students special rate.', type: 'monthly' },
                { name: 'Girls Hostel Single Meal', price: 1300, desc: 'Single meal (Lunch or Dinner) for female students.', type: 'monthly' },
                { name: 'Boys Regular (2 Meals)', price: 3000, desc: 'Standard 2-meals daily pass for male students.', type: 'monthly' },
                { name: 'Boys Single Meal', price: 1600, desc: 'Single meal daily pass for male students.', type: 'monthly' },
                { name: '15-Day Trial Pass', price: 1400, desc: 'Half-month trial pass for newly joined students.', type: 'trial' }
              ].map((p, idx) => (
                <div key={idx} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-slate-900 text-sm">{p.name}</h4>
                      <span className="text-[10px] font-bold uppercase text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full inline-block mt-1">
                        {p.type}
                      </span>
                    </div>
                    <span className="text-lg font-black text-slate-900">₹{p.price}</span>
                  </div>
                  <p className="text-xs text-slate-500">{p.desc}</p>
                </div>
              ))
            ) : (
              tariffPlans.map(p => (
                <div key={p.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-slate-900 text-sm">{p.planName}</h4>
                      <span className="text-[10px] font-bold uppercase text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full inline-block mt-1">
                        {p.bothMeals ? '2 Meals / Day' : p.lunchOnly ? 'Lunch Shift' : p.dinnerOnly ? 'Dinner Shift' : 'Standard Plan'}
                      </span>
                    </div>
                    <span className="text-lg font-black text-slate-900">₹{p.basePrice}</span>
                  </div>
                  <p className="text-xs text-slate-500">{p.description || 'Standard dining plan'}</p>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* SUBSCRIBERS LISTING */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {currentTabItems.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-black text-slate-800 text-sm">No Subscriptions Found</h4>
              <p className="text-xs text-slate-500">No member passes found under "{activeSubTab}" filter.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {currentTabItems.map(({ customer, remainingDays, status }) => {
                const isExpiring = status === 'expiring';
                const isExpired = status === 'expired';
                const isPaused = status === 'paused';

                return (
                  <div
                    key={customer.id}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-slate-900 text-sm">{customer.name}</span>
                        <span className="text-xs text-slate-400 font-mono">({customer.phone})</span>
                        <span className="text-[11px] font-semibold text-slate-500 capitalize">
                          • {customer.planType?.replace('_', ' ') || '2 Meals'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isExpired ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                          isExpiring ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          isPaused ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                          'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {isExpired ? 'EXPIRED' : isExpiring ? `${remainingDays}D LEFT` : isPaused ? 'PAUSED' : 'ACTIVE'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 font-medium flex-wrap">
                        <span className="font-mono text-slate-700">Valid: {customer.startDate} → {customer.endDate}</span>
                        <span>•</span>
                        <span>Plan Fee: <strong className="text-slate-800">₹{customer.totalAmount}</strong></span>
                        <span>•</span>
                        <span>
                          Dues: <strong className={customer.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}>₹{customer.balance}</strong>
                        </span>
                        {customer.hostelOrAddress && (
                          <>
                            <span>•</span>
                            <span className="text-slate-400 truncate max-w-xs">{customer.hostelOrAddress}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action Matrix per Subscriber */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
                      {customer.phone && (
                        <button
                          onClick={() => handleWhatsAppReminder(customer)}
                          className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition cursor-pointer"
                          title="Send WhatsApp renewal alert"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      )}

                      {/* Pause / Resume Button */}
                      {isPaused ? (
                        <button
                          onClick={() => handleResumeSubscription(customer)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1 transition cursor-pointer border border-emerald-200"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Resume Pass</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setPauseCustomer(customer)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                          title="Freeze subscription while student is on leave"
                        >
                          <Pause className="w-3.5 h-3.5" />
                          <span>Pause / Freeze</span>
                        </button>
                      )}

                      {/* Quick Renew Button */}
                      <button
                        onClick={() => {
                          setQuickRenewCustomer(customer);
                          setRenewFee(customer.totalAmount || 2500);
                          setRenewPaid(customer.totalAmount || 2500);
                          setRenewDays(30);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black text-xs shadow-xs transition cursor-pointer"
                      >
                        ⚡ Quick Renew
                      </button>

                      {/* Profile 360 */}
                      <button
                        onClick={() => onOpenCustomer360(customer)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                      >
                        Profile
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* QUICK IN-PLACE RENEWAL MODAL */}
      {quickRenewCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900">Renew Subscription Pass</h3>
                <p className="text-xs text-slate-500 font-semibold">{quickRenewCustomer.name} ({quickRenewCustomer.id})</p>
              </div>
              <button
                onClick={() => setQuickRenewCustomer(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteQuickRenew} className="space-y-3.5 text-xs">
              {/* Presets for renewal days */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Extension Duration</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { days: 15, label: '15 Days' },
                    { days: 30, label: '30 Days (1 Mo)' },
                    { days: 60, label: '60 Days (2 Mo)' }
                  ].map(p => (
                    <button
                      type="button"
                      key={p.days}
                      onClick={() => setRenewDays(p.days)}
                      className={`p-2 rounded-xl border text-center font-bold transition cursor-pointer ${
                        renewDays === p.days
                          ? 'border-orange-500 bg-orange-50 text-orange-900'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Renewal Fee (₹)</label>
                  <input
                    type="number"
                    value={renewFee}
                    onChange={(e) => setRenewFee(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-black text-slate-900 text-sm"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Paid Now (₹)</label>
                  <input
                    type="number"
                    value={renewPaid}
                    onChange={(e) => setRenewPaid(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-emerald-300 bg-emerald-50 font-black text-emerald-900 text-sm"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRenewMethod('cash')}
                    className={`p-2 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      renewMethod === 'cash' ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Cash Payment</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRenewMethod('upi')}
                    className={`p-2 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      renewMethod === 'upi' ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>UPI Transfer</span>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-[11px] space-y-1">
                <div>• Current Expiry: <strong className="font-mono text-slate-800">{quickRenewCustomer.endDate}</strong></div>
                <div>• Extended Expiry: <strong className="font-mono text-orange-600">Calculated automatically (+{renewDays}d)</strong></div>
                {renewFee - renewPaid > 0 && (
                  <div className="text-rose-600 font-bold">• Additional Due Logged: ₹{renewFee - renewPaid}</div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setQuickRenewCustomer(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRenewing}
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {isRenewing ? 'Renewing...' : 'Confirm & Extend Pass'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK PAUSE / FREEZE MODAL */}
      {pauseCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900">Freeze / Pause Pass</h3>
                <p className="text-xs text-slate-500 font-semibold">{pauseCustomer.name}</p>
              </div>
              <button
                onClick={() => setPauseCustomer(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecutePause} className="space-y-3.5 text-xs">
              <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-purple-900 text-xs">
                💡 <strong>How Freezing Works:</strong> Pass will be paused so gate entry is suspended. The expiry date is automatically extended forward by the number of paused days, ensuring the student does not lose money!
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Days to Freeze (Pause Duration)</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={pauseDays}
                  onChange={(e) => setPauseDays(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Reason for Freezing</label>
                <input
                  type="text"
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  placeholder="e.g. Diwali Vacation, Semester Exams..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPauseCustomer(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPausing}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {isPausing ? 'Freezing...' : `Freeze Pass (+${pauseDays}d Extension)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
