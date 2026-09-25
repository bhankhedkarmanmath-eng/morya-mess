import React, { useState, useMemo } from 'react';
import { Customer } from '../../types/mess';
import { calculateDaysRemaining } from '../../lib/storage';
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
  ChevronRight
} from 'lucide-react';

interface SubscriptionsViewProps {
  customers: Customer[];
  onBack: () => void;
  onOpenRenew: (customer: Customer) => void;
  onOpenCustomer360: (customer: Customer) => void;
  onOpenAddCustomer: () => void;
}

export const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({
  customers,
  onBack,
  onOpenRenew,
  onOpenCustomer360,
  onOpenAddCustomer
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expiring' | 'expired'>('all');

  const subscriptions = useMemo(() => {
    return customers.map(c => {
      const remainingDays = calculateDaysRemaining(c.endDate);
      let calculatedStatus: 'active' | 'expiring' | 'expired' = 'active';
      if (remainingDays <= 0) {
        calculatedStatus = 'expired';
      } else if (remainingDays <= 5) {
        calculatedStatus = 'expiring';
      }

      return {
        customer: c,
        remainingDays,
        status: calculatedStatus
      };
    });
  }, [customers]);

  const filtered = useMemo(() => {
    return subscriptions.filter(item => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || 
        item.customer.name.toLowerCase().includes(q) ||
        item.customer.phone.includes(q) ||
        item.customer.id.toLowerCase().includes(q);

      const matchesStatus = 
        statusFilter === 'all' || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [subscriptions, searchTerm, statusFilter]);

  const totalActive = subscriptions.filter(s => s.status === 'active').length;
  const totalExpiring = subscriptions.filter(s => s.status === 'expiring').length;
  const totalExpired = subscriptions.filter(s => s.status === 'expired').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
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
              <Calendar className="w-5 h-5 text-orange-600" />
              <span>Membership Subscriptions Manager</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Track validity cycles, plans, dues, and renewal extensions across all members
            </p>
          </div>
        </div>

        <button
          onClick={onOpenAddCustomer}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-sm transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Subscription</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div 
          onClick={() => setStatusFilter('active')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'active' ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Active Subscriptions</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalActive}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Currently valid gate access</p>
        </div>

        <div 
          onClick={() => setStatusFilter('expiring')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'expiring' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Expiring Soon (≤ 5 Days)</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-700 mt-1">{totalExpiring}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Renewal required soon</p>
        </div>

        <div 
          onClick={() => setStatusFilter('expired')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'expired' ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Expired / Suspended</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-700 mt-1">{totalExpired}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Blocked from attendance scan</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search member name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {(['all', 'active', 'expiring', 'expired'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition cursor-pointer ${
                statusFilter === st 
                  ? 'bg-slate-900 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'all' ? 'All' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Subscriptions Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="font-bold text-slate-800 text-sm">No Subscriptions Found</h4>
            <p className="text-xs text-slate-500 mt-0.5">Try altering the search keyword or filter tab.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Member Details</th>
                  <th className="px-5 py-3.5">Plan & Meals</th>
                  <th className="px-5 py-3.5">Cycle Dates</th>
                  <th className="px-5 py-3.5">Validity</th>
                  <th className="px-5 py-3.5">Fees & Dues</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(({ customer: c, remainingDays, status }) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3.5">
                      <div className="font-black text-slate-900 text-sm">{c.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{c.phone}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-bold text-slate-800 capitalize block">
                        {c.planType?.replace('_', ' ') || 'Monthly'}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {c.mealType === 'both' ? 'Lunch + Dinner' : c.mealType === 'lunch_only' ? 'Lunch Only' : 'Dinner Only'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11px] text-slate-600">
                      <div>From: {c.startDate}</div>
                      <div>To: {c.endDate}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      {status === 'active' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{remainingDays} days left</span>
                        </span>
                      ) : status === 'expiring' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{remainingDays} days left</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-800">
                          <XCircle className="w-3 h-3" />
                          <span>Expired</span>
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">₹{c.totalAmount || 3000}</div>
                      <div className={`text-[11px] font-black ${c.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {c.balance > 0 ? `Due: ₹${c.balance}` : 'Fully Paid'}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onOpenRenew(c)}
                          className="px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs transition cursor-pointer flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Renew / Extend</span>
                        </button>
                        <button
                          onClick={() => onOpenCustomer360(c)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                          title="View 360 Profile"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
