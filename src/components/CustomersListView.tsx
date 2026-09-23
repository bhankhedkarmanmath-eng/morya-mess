import React, { useState } from 'react';
import { Customer } from '../types/mess';
import { calculateDaysRemaining } from '../lib/storage';
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
  MessageSquare
} from 'lucide-react';

interface CustomersListViewProps {
  customers: Customer[];
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
  onOpenAddModal,
  onOpenCardPrint,
  onOpenCustomer360,
  onOpenRenew,
  onOpenLeave,
  onOpenPenalty,
  onDeleteCustomer,
  onClearAllCustomers
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'expiring' | 'expired' | 'female' | 'male' | 'balance_due'>('ALL');
  const [customerPendingDelete, setCustomerPendingDelete] = useState<Customer | null>(null);

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

    return true;
  });

  const femaleCount = customers.filter(c => c.gender === 'female').length;
  const expiredCount = customers.filter(c => calculateDaysRemaining(c.endDate) < 0).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Members & Digital Passes</h2>
          <p className="text-xs text-slate-500">
            {customers.length} total registered members • {femaleCount} hostel girls • {expiredCount} expired passes
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer shadow-xs"
              title="Remove all members and start completely fresh"
            >
              <Trash2 className="w-4 h-4" />
              <span>Remove All Members</span>
            </button>
          )}

          <button
            id="btn-add-customer-main"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 shadow-xs cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Member</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, ID, mobile, hostel..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-orange-600"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-slate-600 font-semibold text-[11px]">
          {[
            { id: 'ALL', label: `All (${customers.length})` },
            { id: 'female', label: `Hostel Girls (${femaleCount})` },
            { id: 'active', label: 'Active' },
            { id: 'expiring', label: 'Expiring Soon' },
            { id: 'expired', label: 'Expired' },
            { id: 'balance_due', label: 'Pending Dues' }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as typeof statusFilter)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === f.id
                  ? 'bg-orange-600 text-white font-bold shadow-xs'
                  : 'bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
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
                ? 'Your customer database is currently empty. Click "Register New Member" to add hostel students.'
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
            const isExpired = daysRemaining < 0;
            const isExpiringSoon = daysRemaining >= 0 && daysRemaining <= 3;

            return (
              <div
                key={customer.id}
                className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-orange-300 transition-all flex flex-col justify-between space-y-4"
              >
                {/* Card Top */}
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-slate-900 text-sm">{customer.name}</h3>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            customer.gender === 'female'
                              ? 'bg-orange-50 text-orange-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {customer.gender === 'female' ? '👧 Girl' : '👦 Boy'}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 font-bold block mt-0.5">
                        {customer.id}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          isExpired
                            ? 'bg-rose-100 text-rose-700'
                            : isExpiringSoon
                            ? 'bg-amber-100 text-amber-700'
                            : customer.status === 'on_leave'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {isExpired
                          ? `${Math.abs(daysRemaining)}d Overdue`
                          : isExpiringSoon
                          ? `${daysRemaining}d Left`
                          : customer.status === 'on_leave'
                          ? 'On Leave'
                          : 'Active'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCustomerPendingDelete(customer);
                        }}
                        className="p-1 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title={`Delete / Remove ${customer.name}`}
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
                          className="font-bold text-orange-700 hover:text-orange-950 hover:bg-orange-100 transition-colors inline-flex items-center gap-1 bg-orange-50 px-2 py-0.5 rounded-lg text-[11px] border border-orange-200"
                          title={`Click to call ${customer.name} (${customer.phone})`}
                        >
                          <span>{customer.phone}</span>
                          <span className="text-[9px] font-extrabold uppercase px-1 py-0.2 rounded bg-emerald-100 text-emerald-800">
                            Call
                          </span>
                        </a>
                      </div>
                    )}

                    {customer.hostelOrAddress && (
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{customer.hostelOrAddress}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 pt-0.5">
                      <span>
                        {customer.planType === 'monthly_1meal' ? '1-Time Daily' : '2-Times Daily (Lunch + Dinner)'}
                      </span>
                      <span className="font-bold text-orange-700">
                        ₹{customer.totalAmount || (customer.gender === 'female' ? 2500 : 3000)}/mo
                      </span>
                    </div>
                  </div>

                  {/* Validity Matrix */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Valid Until:</span>
                      <span className={`font-bold ${isExpired ? 'text-rose-600' : 'text-slate-800'}`}>
                        {customer.endDate}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Balance Due:</span>
                      <span className={`font-bold ${customer.balance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
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
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-50 text-orange-700 font-bold hover:bg-orange-100 transition-colors cursor-pointer text-[11px]"
                      title="View & Print Digital QR Pass"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Pass</span>
                    </button>

                    <button
                      onClick={() => onOpenRenew(customer)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors cursor-pointer text-[11px]"
                      title="Renew Monthly Subscription"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Renew</span>
                    </button>

                    {customer.balance > 0 && customer.phone && (
                      <a
                        href={`https://wa.me/91${customer.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Dear ${customer.name}, greetings from Morya Mess. This is a gentle reminder that your mess membership has a balance due of ₹${customer.balance}. Kindly clear your pending dues via UPI to ensure uninterrupted meal access. Thank you!`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 transition-colors text-[11px] border border-emerald-200"
                        title="Send WhatsApp Fee Reminder"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="hidden xl:inline">Remind</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCustomerPendingDelete(customer)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer"
                      title="Delete Member"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onOpenCustomer360(customer)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors cursor-pointer text-[11px]"
                    >
                      <span>Profile 360</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive In-App Confirmation Modal for Member Removal */}
      {customerPendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Remove Student Member?</h3>
            <p className="text-sm text-slate-600 mt-2">
              Are you sure you want to remove <span className="font-bold text-slate-900">{customerPendingDelete.name}</span> (<span className="font-mono text-xs text-orange-600 font-semibold">{customerPendingDelete.id}</span>)?
            </p>
            <p className="text-xs text-slate-500 mt-1">
              This will cancel their active subscription and remove them from the Morya Mess live member roster in Supabase.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setCustomerPendingDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition-colors text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteCustomer(customerPendingDelete.id);
                  setCustomerPendingDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors text-xs cursor-pointer shadow-xs"
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
