import React, { useState, useMemo } from 'react';
import { Customer } from '../../types/mess';
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
  Filter
} from 'lucide-react';

interface SearchCustomerViewProps {
  customers: Customer[];
  onBack: () => void;
  onOpenCustomer360: (customer: Customer) => void;
  onOpenRenew: (customer: Customer) => void;
  onOpenAddCustomer?: () => void;
}

export const SearchCustomerView: React.FC<SearchCustomerViewProps> = ({
  customers,
  onBack,
  onOpenCustomer360,
  onOpenRenew
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expiring' | 'expired'>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || 
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.id.toLowerCase().includes(q) ||
        (c.college && c.college.toLowerCase().includes(q)) ||
        (c.roomNumber && c.roomNumber.toLowerCase().includes(q));

      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'active' && c.status === 'active') ||
        (statusFilter === 'expiring' && c.status === 'expiring_soon') ||
        (statusFilter === 'expired' && (c.status === 'expired' || c.status === 'suspended'));

      const matchesGender = genderFilter === 'all' || c.gender === genderFilter;

      return matchesSearch && matchesStatus && matchesGender;
    });
  }, [customers, searchTerm, statusFilter, genderFilter]);

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Search className="w-5 h-5 text-orange-600" />
              <span>Customer Search & Discovery</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Instant search across {customers.length} registered diners by Name, Mobile, Customer ID, or Room
            </p>
          </div>
        </div>
        <div className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
          Found: <span className="text-orange-600 font-black">{filteredCustomers.length}</span> members
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Type customer name, 10-digit mobile number, or ID (e.g. 9822... or cust-1)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium text-slate-900"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            {(['all', 'active', 'expiring', 'expired'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg font-bold capitalize transition cursor-pointer ${
                  statusFilter === st ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'all' ? 'All Status' : st === 'expiring' ? 'Expiring Soon' : st}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs ml-auto">
            {(['all', 'male', 'female'] as const).map(g => (
              <button
                key={g}
                onClick={() => setGenderFilter(g)}
                className={`px-3 py-1 rounded-lg font-bold capitalize transition cursor-pointer ${
                  genderFilter === g ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {g === 'all' ? 'All Genders' : g === 'male' ? 'Boys' : 'Girls'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Customer Results List */}
      {filteredCustomers.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800">No Customers Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            No member matched "{searchTerm}". Check for spelling errors or clear the active filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map(cust => {
            const isActive = cust.status === 'active';
            const isExpiring = cust.status === 'expiring_soon';

            return (
              <div
                key={cust.id}
                onClick={() => onOpenCustomer360(cust)}
                className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-orange-300 hover:shadow-md transition-all cursor-pointer space-y-3 relative group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-black text-sm shrink-0">
                      {cust.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-sm group-hover:text-orange-600 transition">
                        {cust.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {cust.phone}
                      </p>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                    isActive ? 'bg-emerald-100 text-emerald-800' :
                    isExpiring ? 'bg-amber-100 text-amber-800' :
                    'bg-rose-100 text-rose-800'
                  }`}>
                    {cust.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-medium">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Plan Type</span>
                    <span className="text-slate-800 font-bold capitalize">
                      {cust.planType?.replace('_', ' ') || 'Monthly'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Dues Balance</span>
                    <span className={`font-black ${cust.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      ₹{cust.balance}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Valid Until</span>
                    <span className="text-slate-700 font-mono text-[11px]">
                      {cust.endDate || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">College / Hostel</span>
                    <span className="text-slate-700 truncate block">
                      {cust.college || cust.hostel || 'Hostel'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-orange-600 font-bold flex items-center gap-1 group-hover:underline">
                    View 360 Profile <ExternalLink className="w-3 h-3" />
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenRenew(cust);
                    }}
                    className="px-3 py-1 bg-slate-100 hover:bg-orange-50 hover:text-orange-700 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
                  >
                    Renew
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
