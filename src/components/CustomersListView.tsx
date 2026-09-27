import React, { useState } from 'react';
import { Customer, MealLog } from '../types/mess';
import { calculateDaysRemaining, getTodayString } from '../lib/storage';
import { 
  Search, 
  Plus, 
  QrCode, 
  RefreshCw, 
  Calendar, 
  AlertTriangle, 
  Phone, 
  MapPin, 
  ChevronRight,
  Sparkles,
  Users,
  ShieldCheck,
  AlertCircle,
  Trash2,
  MessageSquare,
  ArrowUpDown,
  Utensils,
  CheckCircle2,
  Clock,
  ExternalLink
} from 'lucide-react';

interface CustomersListViewProps {
  customers: Customer[];
  mealLogs?: MealLog[];
  onOpenAddModal: () => void;
  onOpenCardPrint: (c: Customer) => void;
  onOpenCustomer360: (c: Customer) => void;
  onOpenRenew: (c: Customer) => void;
  onOpenLeave: (c: Customer) => void;
  onOpenPenalty: (c: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  onClearAllCustomers?: () => void;
}

export const CustomersListView: React.FC<CustomersListViewProps> = ({
  customers,
  mealLogs = [],
  onOpenAddModal,
  onOpenCardPrint,
  onOpenCustomer360,
  onOpenRenew,
  onOpenLeave,
  onOpenPenalty,
  onDeleteCustomer,
  onClearAllCustomers
}) => {
  const today = getTodayString();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'expiring' | 'expired' | 'female' | 'male' | 'balance_due' | 'inactive'>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'expiry' | 'balance' | 'joined'>('expiry');
  const [customerPendingDelete, setCustomerPendingDelete] = useState<Customer | null>(null);

  // Today's attendance set for fast lookup
  const todayLogs = mealLogs.filter(m => m.date === today && m.scanStatus === 'ALLOW');
  const todayLunchSet = new Set(todayLogs.filter(m => m.mealType === 'lunch').map(m => m.customerId));
  const todayDinnerSet = new Set(todayLogs.filter(m => m.mealType === 'dinner').map(m => m.customerId));

  const filteredCustomers = customers.filter(c => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      c.name.toLowerCase().includes(term) ||
      c.id.toLowerCase().includes(term) ||
      c.phone.toLowerCase().includes(term) ||
      (c.hostelOrAddress && c.hostelOrAddress.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    const days = calculateDaysRemaining(c.endDate);
    if (statusFilter === 'active') return c.status === 'active' && days >= 0;
    if (statusFilter === 'expiring') return days >= 0 && days <= 3;
    if (statusFilter === 'expired') return days < 0 || c.status === 'expired';
    if (statusFilter === 'female') return c.gender === 'female';
    if (statusFilter === 'male') return c.gender === 'male';
    if (statusFilter === 'balance_due') return c.balance > 0;
    if (statusFilter === 'inactive') return c.status === 'inactive';

    return true;
  }).sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'expiry') return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
    if (sortBy === 'balance') return (b.balance || 0) - (a.balance || 0);
    if (sortBy === 'joined') return new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime();
    return 0;
  });

  const femaleCount = customers.filter(c => c.gender === 'female').length;
  const expiredCount = customers.filter(c => calculateDaysRemaining(c.endDate) < 0 || c.status === 'expired').length;
  const dueCount = customers.filter(c => c.balance > 0).length;
  const activeCount = customers.filter(c => c.status === 'active' && calculateDaysRemaining(c.endDate) >= 0).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Members & Digital Passes</h2>
          <p className="text-xs text-slate-500">
            {customers.length} total registered members • {activeCount} active • {femaleCount} hostel girls • {expiredCount} expired passes
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {customers.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm(`⚠️ Permanently remove all ${customers.length} registered members from Morya Mess? This will wipe the list completely so you can register fresh members.`)) {
                  if (onClearAllCustomers) {
                    onClearAllCustomers();
                  } else {
                    customers.forEach(c => onDeleteCustomer(c.id));
                  }
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-100 transition cursor-pointer shadow-2xs"
              title="Remove all members and start completely fresh"
            >
              <Trash2 className="w-4 h-4" />
              <span>Reset List</span>
            </button>
          )}

          <button
            id="btn-add-customer-main"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-black hover:bg-orange-700 shadow-xs cursor-pointer transition"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Member</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, ID, phone, hostel..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-orange-600"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 text-slate-600 font-bold text-[11px]">
          {[
            { id: 'ALL', label: `All (${customers.length})` },
            { id: 'active', label: `Active (${activeCount})` },
            { id: 'female', label: `Girls (${femaleCount})` },
            { id: 'balance_due', label: `Dues (${dueCount})` },
            { id: 'expiring', label: 'Expiring Soon' },
            { id: 'expired', label: `Expired (${expiredCount})` }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as typeof statusFilter)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
                statusFilter === f.id
                  ? 'bg-orange-600 text-white font-black shadow-xs'
                  : 'bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-1.5 shrink-0 self-end md:self-auto">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="p-1.5 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700"
          >
            <option value="expiry">Sort: Expiry Date</option>
            <option value="name">Sort: Name (A-Z)</option>
            <option value="balance">Sort: Balance Due</option>
            <option value="joined">Sort: Join Date</option>
          </select>
        </div>
      </div>

      {/* Customers List / Grid */}
      {filteredCustomers.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-sm font-bold text-slate-900">
              {customers.length === 0 ? 'No Members Registered Yet' : 'No Members Match Your Filter'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {customers.length === 0
                ? 'Your customer database is clean and empty. Click "Register New Member" to add hostel students.'
                : 'Try adjusting your search terms or filter selection.'}
            </p>
          </div>
          {customers.length === 0 && (
            <button
              onClick={onOpenAddModal}
              className="px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Register New Member</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => {
            const daysRemaining = calculateDaysRemaining(customer.endDate);
            const isExpired = daysRemaining < 0 || customer.status === 'expired';
            const isExpiringSoon = daysRemaining >= 0 && daysRemaining <= 3;

            // Today's attendance status
            const hasLunch = todayLunchSet.has(customer.id);
            const hasDinner = todayDinnerSet.has(customer.id);
            const attendanceStatusStr = hasLunch && hasDinner 
              ? 'Both Meals Taken' 
              : hasLunch 
              ? 'Lunch Taken' 
              : hasDinner 
              ? 'Dinner Taken' 
              : customer.status === 'on_leave'
              ? 'On Leave'
              : 'Not Scanned Today';

            return (
              <div
                key={customer.id}
                className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs hover:border-orange-300 transition-all flex flex-col justify-between space-y-4"
              >
                {/* Card Top */}
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-black text-slate-900 text-sm">{customer.name}</h3>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            customer.gender === 'female'
                              ? 'bg-orange-50 text-orange-700 border border-orange-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {customer.gender === 'female' ? '👧 Girl' : '👦 Boy'}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 font-bold block mt-0.5">
                        ID: {customer.id}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                          isExpired
                            ? 'bg-rose-100 text-rose-700'
                            : isExpiringSoon
                            ? 'bg-amber-100 text-amber-700'
                            : customer.status === 'on_leave'
                            ? 'bg-blue-100 text-blue-700'
                            : customer.status === 'inactive'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {isExpired
                          ? `${Math.abs(daysRemaining)}d Overdue`
                          : isExpiringSoon
                          ? `${daysRemaining}d Left`
                          : customer.status === 'on_leave'
                          ? 'On Leave'
                          : customer.status === 'inactive'
                          ? 'Inactive'
                          : 'Active'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCustomerPendingDelete(customer);
                        }}
                        className="p-1 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title={`Remove ${customer.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Info details */}
                  <div className="space-y-1.5 text-xs text-slate-600">
                    {customer.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <a 
                          href={`tel:${customer.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-bold text-orange-700 hover:text-orange-950 inline-flex items-center gap-1 bg-orange-50 px-2 py-0.5 rounded-lg text-[11px] border border-orange-200"
                        >
                          <span>{customer.phone}</span>
                        </a>
                      </div>
                    )}

                    {customer.hostelOrAddress && (
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{customer.hostelOrAddress}</span>
                      </div>
                    )}

                    {/* Today's Attendance Badge */}
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Utensils className="w-3 h-3 text-orange-600" />
                        Today:
                      </span>
                      <span className={`font-bold px-2 py-0.2 rounded-full text-[10px] ${
                        hasLunch || hasDinner 
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {attendanceStatusStr}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 pt-0.5">
                      <span>{customer.planType}</span>
                      <span className="font-bold text-orange-700">
                        ₹{customer.totalAmount || 2500}/mo
                      </span>
                    </div>
                  </div>

                  {/* Validity Matrix */}
                  <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">VALID TILL:</span>
                      <span className={`font-bold ${isExpired ? 'text-rose-600' : 'text-slate-800'}`}>
                        {customer.endDate}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">DUE BALANCE:</span>
                      <span className={`font-black ${customer.balance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {customer.balance > 0 ? `₹${customer.balance}` : 'Clear'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5 text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onOpenCardPrint(customer)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-orange-50 text-orange-700 font-bold hover:bg-orange-100 transition cursor-pointer text-[11px]"
                      title="View & Print Digital QR Pass"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Pass</span>
                    </button>

                    <button
                      onClick={() => onOpenRenew(customer)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition cursor-pointer text-[11px]"
                      title="Renew Monthly Subscription"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Renew</span>
                    </button>

                    {customer.balance > 0 && customer.phone && (
                      <a
                        href={`https://wa.me/91${customer.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Dear ${customer.name}, greetings from Morya Mess. This is a reminder that your mess membership has a balance due of ₹${customer.balance}. Kindly clear your pending dues via UPI. Thank you!`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 transition text-[11px] border border-emerald-200"
                        title="Send WhatsApp Fee Reminder"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="hidden xl:inline">Remind</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onOpenCustomer360(customer)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition cursor-pointer text-[11px]"
                    >
                      <span>360 Profile</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Member Removal */}
      {customerPendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Remove Student Member?</h3>
              <p className="text-xs text-slate-600 mt-1">
                Are you sure you want to remove <span className="font-bold text-slate-900">{customerPendingDelete.name}</span> (<span className="font-mono text-xs text-orange-600 font-semibold">{customerPendingDelete.id}</span>)?
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Historical attendance, payments, and ledger records remain preserved in Supabase archives.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCustomerPendingDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteCustomer(customerPendingDelete.id);
                  setCustomerPendingDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black transition text-xs cursor-pointer shadow-xs"
              >
                Yes, Remove Student
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
