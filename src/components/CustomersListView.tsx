import React, { useState } from 'react';
import { Customer, MealLog } from '../types/mess';
import { calculateDaysRemaining, getTodayString } from '../lib/storage';
import { exportToSpreadsheet } from '../lib/exportUtils';
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
  ExternalLink,
  Download
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
  onOpenWhatsAppDuesBot?: () => void;
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
  onClearAllCustomers,
  onOpenWhatsAppDuesBot
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
  const totalDueAmount = customers.reduce((sum, c) => sum + (c.balance > 0 ? Number(c.balance) : 0), 0);
  const activeCount = customers.filter(c => c.status === 'active' && calculateDaysRemaining(c.endDate) >= 0).length;

  const handleExportCustomers = () => {
    const rows = filteredCustomers.map(c => ({
      'Customer ID': c.id,
      'Full Name': c.name,
      'Mobile Number': c.phone,
      'Gender': c.gender,
      'Plan Type': c.planType,
      'Start Date': c.startDate,
      'Valid Until': c.endDate,
      'Total Plan Fee': c.totalAmount,
      'Paid Amount': c.paidAmount,
      'Dues Balance': c.balance,
      'Hostel / Room': c.hostelOrAddress || '',
      'Status': c.status
    }));

    exportToSpreadsheet(rows, {
      filename: `Morya_Mess_Members_Roster_${today}`,
      sheetName: 'Members',
      format: 'xlsx'
    });
  };

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
          <button
            onClick={handleExportCustomers}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer shadow-2xs"
            title="Download member roster in Excel"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Excel</span>
          </button>

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

          {onOpenWhatsAppDuesBot && (
            <button
              onClick={onOpenWhatsAppDuesBot}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs cursor-pointer transition"
              title="Open WhatsApp Auto-Pilot Dues Recovery"
            >
              <MessageSquare className="w-4 h-4 text-emerald-100" />
              <span>WhatsApp Dues Bot {dueCount > 0 ? `(${dueCount})` : ''}</span>
            </button>
          )}

          <button
            id="btn-add-customer-main"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 hover:from-orange-600 hover:to-orange-800 text-white text-xs font-black shadow-xs cursor-pointer transition"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Member</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, ID, phone, hostel..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-50/70 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-slate-600 font-semibold text-[11px]">
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
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition cursor-pointer ${
                statusFilter === f.id
                  ? 'bg-orange-600 text-white font-bold shadow-xs'
                  : 'bg-white border border-slate-200/90 hover:bg-orange-50 hover:text-orange-700 text-slate-700'
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
            className="p-1.5 px-2.5 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-900"
          >
            <option value="expiry">Sort: Expiry Date</option>
            <option value="name">Sort: Name (A-Z)</option>
            <option value="balance">Sort: Balance Due</option>
            <option value="joined">Sort: Join Date</option>
          </select>
        </div>
      </div>

      {/* WhatsApp Dues Recovery Banner */}
      {dueCount > 0 && onOpenWhatsAppDuesBot && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-emerald-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0 shadow-inner">
              <MessageSquare className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-sm block text-white">
                  WhatsApp Auto-Pilot: {dueCount} Students Have ₹{totalDueAmount.toLocaleString('en-IN')} Pending Dues!
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-400/30 text-[10px] font-black uppercase tracking-wider text-emerald-100">
                  Instant UPI Bot
                </span>
              </div>
              <span className="text-xs text-emerald-100/90 font-medium">
                Tap here to open WhatsApp Auto-Pilot bot & send 1-click reminders to defaulters with personalized bills & UPI links.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenWhatsAppDuesBot}
            className="px-4 py-2.5 rounded-xl bg-white text-emerald-800 font-black text-xs hover:bg-emerald-50 transition shadow-xs cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
          >
            <span>Open WhatsApp Dues Bot</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Customers List / Grid */}
      {filteredCustomers.length === 0 ? (
        <div className="p-12 rounded-xl bg-white border border-slate-200/80 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto border border-orange-200/80">
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
              className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
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
                className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:border-orange-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
              >
                {/* Card Top */}
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-black text-slate-900 text-sm group-hover:text-orange-600 transition-colors font-display">{customer.name}</h3>
                        <span
                          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                            customer.gender === 'female'
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : 'bg-blue-50 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {customer.gender === 'female' ? '👧 Girl' : '👦 Boy'}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 font-bold block mt-0.5">
                        ID: {customer.id}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase border ${
                          isExpired
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : isExpiringSoon
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : customer.status === 'on_leave'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : customer.status === 'inactive'
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300'
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
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
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
                          className="font-bold text-orange-700 hover:text-orange-900 inline-flex items-center gap-1 bg-orange-50 px-2.5 py-0.5 rounded-lg text-[11px] border border-orange-200"
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
                    <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100">
                      <span className="text-slate-600 flex items-center gap-1 font-medium">
                        <Utensils className="w-3 h-3 text-orange-600" />
                        Today:
                      </span>
                      <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                        hasLunch || hasDinner 
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {attendanceStatusStr}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 pt-0.5">
                      <span>{customer.planType}</span>
                      <span className="font-extrabold text-orange-600">
                        ₹{customer.totalAmount || 2500}/mo
                      </span>
                    </div>
                  </div>

                  {/* Validity Matrix */}
                  <div className="p-3 rounded-xl bg-gradient-to-r from-slate-50 to-orange-50/20 border border-slate-200/80 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold">VALID TILL:</span>
                      <span className={`font-black font-mono ${isExpired ? 'text-rose-600' : 'text-slate-900'}`}>
                        {customer.endDate}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold">DUE BALANCE:</span>
                      <span className={`font-black font-mono ${customer.balance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {customer.balance > 0 ? `₹${customer.balance}` : '✓ Clear'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5 text-xs">
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      onClick={() => onOpenCardPrint(customer)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 text-orange-800 font-bold hover:from-orange-100 hover:to-amber-100 border border-orange-200 transition cursor-pointer text-[11px] shadow-2xs"
                      title="View & Print Digital QR Pass"
                    >
                      <QrCode className="w-3.5 h-3.5 text-orange-600" />
                      <span>Pass</span>
                    </button>

                    <button
                      onClick={() => onOpenRenew(customer)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition cursor-pointer text-[11px] shadow-2xs"
                      title="Renew Monthly Subscription"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Renew</span>
                    </button>

                    {(customer.balance > 0 || calculateDaysRemaining(customer.endDate) <= 3) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const cleanDigits = (customer.phone || '').replace(/[^0-9]/g, '');
                          let finalPhone = cleanDigits;
                          if (cleanDigits.length === 10) finalPhone = `91${cleanDigits}`;
                          else if (cleanDigits.length === 11 && cleanDigits.startsWith('0')) finalPhone = `91${cleanDigits.slice(1)}`;
                          else if (cleanDigits.length === 12 && cleanDigits.startsWith('91')) finalPhone = cleanDigits;

                          const text = customer.balance > 0 
                            ? `🙏 *सस्नेह नमस्कार ${customer.name} ji!*\nआपल्या मोरया मेस वर्गणीचे *₹${customer.balance}* बाकी आहेत. कृपया Google Pay / PhonePe द्वारे थकबाकी जमा करावी ही नम्र विनंती. धन्यवाद!`
                            : `🙏 *सस्नेह नमस्कार ${customer.name} ji!*\nआपला मोरया मेस पास संपत आला आहे (${customer.endDate}). कृपया वेळेवर नूतनीकरण करून आपली भोजन सेवा अखंडित ठेवावी. धन्यवाद!`;
                          
                          const waUrl = finalPhone 
                            ? `https://wa.me/${finalPhone}?text=${encodeURIComponent(text)}`
                            : `https://wa.me/?text=${encodeURIComponent(text)}`;
                          
                          try {
                            const a = document.createElement('a');
                            a.href = waUrl;
                            a.target = '_blank';
                            a.rel = 'noopener noreferrer';
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          } catch {
                            window.open(waUrl, '_blank', 'noopener,noreferrer');
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-black transition text-[11px] shadow-xs cursor-pointer shrink-0 active:scale-95"
                        title="Send WhatsApp Dues Reminder"
                      >
                        <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                        </svg>
                        <span>{customer.balance > 0 ? `WhatsApp (₹${customer.balance})` : 'Remind'}</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onOpenCustomer360(customer)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold transition cursor-pointer text-[11px] shadow-xs"
                    >
                      <span>360° Profile</span>
                      <ChevronRight className="w-3.5 h-3.5" />
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
