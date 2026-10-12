import React, { useState, useMemo } from 'react';
import { Customer, MealLog, MealType } from '../../types/mess';
import { calculateDaysRemaining, getTodayString, getCurrentMealType } from '../../lib/storage';
import { exportToSpreadsheet } from '../../lib/exportUtils';
import { 
  Search, 
  User, 
  Phone, 
  Calendar, 
  CreditCard, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ExternalLink,
  Filter,
  Download,
  Plus,
  RefreshCw,
  MessageCircle,
  Clock,
  Utensils,
  QrCode,
  Printer,
  Sparkles,
  ArrowUpDown,
  Home,
  GraduationCap
} from 'lucide-react';

interface SearchCustomerViewProps {
  customers: Customer[];
  mealLogs?: MealLog[];
  onBack: () => void;
  onOpenCustomer360: (customer: Customer) => void;
  onOpenRenew: (customer: Customer) => void;
  onOpenCardPrint?: (customer: Customer) => void;
  onOpenAddCustomer?: () => void;
  onRecordMeal?: (customerId: string, shift: MealType, reason: string) => { success: boolean; message: string };
}

export const SearchCustomerView: React.FC<SearchCustomerViewProps> = ({
  customers,
  mealLogs = [],
  onBack,
  onOpenCustomer360,
  onOpenRenew,
  onOpenCardPrint,
  onOpenAddCustomer,
  onRecordMeal
}) => {
  const today = getTodayString();
  const currentShift = getCurrentMealType();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expiring' | 'expired' | 'dues'>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'female' | 'male'>('all');
  const [sortBy, setSortBy] = useState<'expiry' | 'name' | 'balance' | 'recent'>('expiry');
  const [actionFeedback, setActionFeedback] = useState<{ id: string; type: 'success' | 'error'; message: string } | null>(null);

  // Quick Today Meal Check
  const todayLunchSet = useMemo(() => {
    return new Set(mealLogs.filter(m => m.date === today && m.mealType === 'lunch' && m.scanStatus === 'ALLOW').map(m => m.customerId));
  }, [mealLogs, today]);

  const todayDinnerSet = useMemo(() => {
    return new Set(mealLogs.filter(m => m.date === today && m.mealType === 'dinner' && m.scanStatus === 'ALLOW').map(m => m.customerId));
  }, [mealLogs, today]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || 
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.id.toLowerCase().includes(q) ||
        (c.college && c.college.toLowerCase().includes(q)) ||
        (c.collegeOrWork && c.collegeOrWork.toLowerCase().includes(q)) ||
        (c.hostelOrAddress && c.hostelOrAddress.toLowerCase().includes(q)) ||
        (c.roomNumber && c.roomNumber.toLowerCase().includes(q));

      const days = calculateDaysRemaining(c.endDate);

      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'active' && c.status === 'active' && days >= 0) ||
        (statusFilter === 'expiring' && days >= 0 && days <= 3) ||
        (statusFilter === 'expired' && (days < 0 || c.status === 'expired')) ||
        (statusFilter === 'dues' && c.balance > 0);

      const matchesGender = genderFilter === 'all' || c.gender === genderFilter;

      return matchesSearch && matchesStatus && matchesGender;
    }).sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'expiry') return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      if (sortBy === 'balance') return (b.balance || 0) - (a.balance || 0);
      if (sortBy === 'recent') return new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime();
      return 0;
    });
  }, [customers, searchTerm, statusFilter, genderFilter, sortBy]);

  // Financial summary of filtered set
  const totalFilteredDues = useMemo(() => {
    return filteredCustomers.reduce((acc, c) => acc + (c.balance || 0), 0);
  }, [filteredCustomers]);

  const expiringCount = useMemo(() => {
    return filteredCustomers.filter(c => {
      const d = calculateDaysRemaining(c.endDate);
      return d >= 0 && d <= 3;
    }).length;
  }, [filteredCustomers]);

  // Export search results
  const handleExport = (format: 'xlsx' | 'csv') => {
    const rows = filteredCustomers.map(c => ({
      'Customer ID': c.id,
      'Name': c.name,
      'Mobile': c.phone,
      'Gender': c.gender,
      'Plan Type': c.planType,
      'Valid Until': c.endDate,
      'Total Plan Fee': c.totalAmount,
      'Paid Amount': c.paidAmount,
      'Dues Balance': c.balance,
      'Hostel / Room': c.hostelOrAddress || c.roomNumber || '',
      'Status': c.status
    }));

    exportToSpreadsheet(rows, {
      filename: `Morya_Mess_Customers_Search_${today}`,
      sheetName: 'Customers',
      format
    });
  };

  // WhatsApp Direct Message
  const handleSendWhatsApp = (c: Customer) => {
    const cleanPhone = c.phone.replace(/[^0-9]/g, '');
    const days = calculateDaysRemaining(c.endDate);
    let msg = `Namaste ${c.name}, greetings from Morya Mess! 🙏\n`;
    if (c.balance > 0) {
      msg += `Your mess dues balance is ₹${c.balance}.\n`;
    }
    msg += `Your subscription pass is valid until ${c.endDate} (${days < 0 ? `${Math.abs(days)} days overdue` : `${days} days remaining`}).\n`;
    msg += `For renewals or queries, please feel free to reach out to us. Thank you!`;

    window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Quick Inline Attendance Mark
  const handleQuickMarkAttendance = (c: Customer, shift: MealType) => {
    if (!onRecordMeal) return;
    const res = onRecordMeal(c.id, shift, 'Quick attendance marked from Customer Search station');
    if (res.success) {
      setActionFeedback({
        id: c.id,
        type: 'success',
        message: `Marked ${shift.toUpperCase()} attendance for ${c.name}!`
      });
      setTimeout(() => setActionFeedback(null), 3000);
    } else {
      setActionFeedback({
        id: c.id,
        type: 'error',
        message: res.message || 'Could not record attendance.'
      });
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with back button & quick stats */}
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
              <Search className="w-5 h-5 text-orange-600" />
              <span>Customer Discovery & Quick Actions Station</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              High-speed lookup across {customers.length} registered members with 1-click attendance, renewals & WhatsApp
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            onClick={() => handleExport('xlsx')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
            title="Download search results"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Excel</span>
          </button>
          {onOpenAddCustomer && (
            <button
              onClick={onOpenAddCustomer}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 hover:from-orange-600 hover:to-orange-800 text-white text-xs font-black shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Matching Diners</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{filteredCustomers.length}</div>
          <span className="text-[11px] text-slate-500 font-medium">Out of {customers.length} total</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-black uppercase text-amber-500 block tracking-wider">Expiring in 3 Days</span>
          <div className="text-2xl font-black text-amber-600 mt-1">{expiringCount}</div>
          <span className="text-[11px] text-amber-700 font-semibold">Immediate renewal queue</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-black uppercase text-rose-500 block tracking-wider">Pending Dues In Set</span>
          <div className="text-2xl font-black text-rose-600 mt-1">₹{totalFilteredDues.toLocaleString('en-IN')}</div>
          <span className="text-[11px] text-rose-700 font-semibold">Total uncollected</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-black uppercase text-emerald-500 block tracking-wider">Active Passes</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {filteredCustomers.filter(c => c.status === 'active' && calculateDaysRemaining(c.endDate) >= 0).length}
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold">Cleared for meal entry</span>
        </div>
      </div>

      {/* Omnibox Search and Filter Matrix */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-orange-600" />
          <input
            type="text"
            placeholder="Search by Name, Mobile Number (10 digits), Customer ID (MM-...), Room Number, Hostel, or College..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
            className="w-full pl-12 pr-10 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Chips & Sort Options */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filters:
            </span>
            {[
              { id: 'all', label: 'All Diners' },
              { id: 'active', label: 'Active Passes' },
              { id: 'expiring', label: 'Expiring in 3 Days' },
              { id: 'expired', label: 'Expired Passes' },
              { id: 'dues', label: 'Balance Due' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  statusFilter === f.id
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Gender Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
              {[
                { id: 'all', label: 'All' },
                { id: 'female', label: 'Girls' },
                { id: 'male', label: 'Boys' }
              ].map(g => (
                <button
                  key={g.id}
                  onClick={() => setGenderFilter(g.id as any)}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    genderFilter === g.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold border-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
            >
              <option value="expiry">Sort: Urgent Expiry First</option>
              <option value="name">Sort: Name (A-Z)</option>
              <option value="balance">Sort: Highest Dues First</option>
              <option value="recent">Sort: Recently Registered</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer Results Grid */}
      {filteredCustomers.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <Search className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-black text-slate-800 text-base">No Customers Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No member matched "{searchTerm}". Try clearing search keywords or active filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map(cust => {
            const daysLeft = calculateDaysRemaining(cust.endDate);
            const isActive = cust.status === 'active' && daysLeft >= 0;
            const isExpiring = daysLeft >= 0 && daysLeft <= 3;
            const isExpired = daysLeft < 0 || cust.status === 'expired';

            const hasHadLunchToday = todayLunchSet.has(cust.id);
            const hasHadDinnerToday = todayDinnerSet.has(cust.id);

            const isFeedback = actionFeedback?.id === cust.id;

            return (
              <div
                key={cust.id}
                className="bg-white p-5 rounded-3xl border border-slate-200/90 hover:border-orange-300 hover:shadow-lg transition-all space-y-4 relative flex flex-col justify-between group"
              >
                {/* Inline Action Feedback Alert */}
                {isFeedback && (
                  <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    actionFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}>
                    {actionFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                    <span>{actionFeedback.message}</span>
                  </div>
                )}

                <div className="space-y-3">
                  {/* Top Header Card */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 text-orange-900 flex items-center justify-center font-black text-sm shrink-0 shadow-xs border border-orange-200/50">
                        {cust.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-sm group-hover:text-orange-600 transition flex items-center gap-1.5">
                          <span>{cust.name}</span>
                          <span className="text-[10px] font-normal text-slate-400 capitalize">({cust.gender})</span>
                        </h3>
                        <p className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{cust.phone}</span>
                        </p>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                      isExpired ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                      isExpiring ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse' :
                      'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {isExpired ? 'EXPIRED' : isExpiring ? `${daysLeft}D LEFT` : 'ACTIVE'}
                    </span>
                  </div>

                  {/* Info Chips */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/80 p-3 rounded-2xl border border-slate-100 font-medium">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Plan & Shifts</span>
                      <span className="text-slate-800 font-bold capitalize">
                        {cust.planType === 'monthly_2meals' ? '2 Meals / Day' : '1 Meal Shift'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Dues Balance</span>
                      <span className={`font-black text-sm ${cust.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {cust.balance > 0 ? `₹${cust.balance}` : '₹0 (Clear)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Valid Until</span>
                      <span className={`font-mono font-bold text-[11px] ${isExpiring ? 'text-amber-700' : 'text-slate-700'}`}>
                        {cust.endDate || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Today's Meals</span>
                      <div className="flex items-center gap-1 pt-0.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                          hasHadLunchToday ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200/70 text-slate-400'
                        }`}>
                          L: {hasHadLunchToday ? '✓' : '—'}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                          hasHadDinnerToday ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200/70 text-slate-400'
                        }`}>
                          D: {hasHadDinnerToday ? '✓' : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Room / College Details if available */}
                  {(cust.hostelOrAddress || cust.roomNumber || cust.college) && (
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 truncate">
                      <Home className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{cust.hostelOrAddress || cust.roomNumber || cust.college}</span>
                    </div>
                  )}
                </div>

                {/* Quick Action Matrix */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  {/* Express 1-Click Attendance Buttons */}
                  {onRecordMeal && (
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => handleQuickMarkAttendance(cust, 'lunch')}
                        disabled={hasHadLunchToday}
                        className={`py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                          hasHadLunchToday
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/70'
                        }`}
                        title={hasHadLunchToday ? 'Lunch already marked today' : 'Mark lunch for today'}
                      >
                        <Utensils className="w-3 h-3 text-amber-600" />
                        <span>{hasHadLunchToday ? 'Lunch Done' : '+ Mark Lunch'}</span>
                      </button>

                      <button
                        onClick={() => handleQuickMarkAttendance(cust, 'dinner')}
                        disabled={hasHadDinnerToday}
                        className={`py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                          hasHadDinnerToday
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200/70'
                        }`}
                        title={hasHadDinnerToday ? 'Dinner already marked today' : 'Mark dinner for today'}
                      >
                        <Utensils className="w-3 h-3 text-indigo-600" />
                        <span>{hasHadDinnerToday ? 'Dinner Done' : '+ Mark Dinner'}</span>
                      </button>
                    </div>
                  )}

                  {/* Secondary Tools: WhatsApp, Profile, Renew, Card */}
                  <div className="flex items-center justify-between gap-1 pt-1">
                    <div className="flex items-center gap-1">
                      {cust.phone && (
                        <button
                          onClick={() => handleSendWhatsApp(cust)}
                          className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition cursor-pointer"
                          title="Send WhatsApp message with pass details / dues notice"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {cust.phone && (
                        <a
                          href={`tel:${cust.phone}`}
                          className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 transition cursor-pointer inline-flex items-center justify-center"
                          title="Direct call"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {onOpenCardPrint && (
                        <button
                          onClick={() => onOpenCardPrint(cust)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                          title="Print Digital Pass Card"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onOpenRenew(cust)}
                        className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-800 text-[11px] font-black rounded-xl transition cursor-pointer border border-orange-200/70"
                      >
                        Renew
                      </button>
                      <button
                        onClick={() => onOpenCustomer360(cust)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
                      >
                        <span>Profile</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
