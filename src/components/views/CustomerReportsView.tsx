import React, { useState, useMemo } from 'react';
import { Customer } from '../../types/mess';
import { calculateDaysRemaining } from '../../lib/storage';
import { 
  BarChart3, 
  ArrowLeft, 
  Search, 
  Users, 
  Filter, 
  Clock, 
  Calendar, 
  GraduationCap, 
  Venus, 
  Mars,
  Download,
  Phone,
  MessageSquare,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Building,
  UserCheck
} from 'lucide-react';
import { exportToSpreadsheet } from '../../lib/exportUtils';

interface CustomerReportsViewProps {
  customers: Customer[];
  onBack: () => void;
  onOpenCustomer360?: (c: Customer) => void;
}

export const CustomerReportsView: React.FC<CustomerReportsViewProps> = ({
  customers,
  onBack,
  onOpenCustomer360
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expiring' | 'expired'>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [selectedCollege, setSelectedCollege] = useState<string>('all');

  // Aggregates
  const total = customers.length;
  const activeCount = customers.filter(c => calculateDaysRemaining(c.endDate) >= 0).length;
  const expiringCount = customers.filter(c => {
    const d = calculateDaysRemaining(c.endDate);
    return d >= 0 && d <= 3;
  }).length;
  const expiredCount = customers.filter(c => calculateDaysRemaining(c.endDate) < 0).length;
  const femaleCount = customers.filter(c => c.gender === 'female').length;
  const maleCount = customers.filter(c => c.gender !== 'female').length;

  // Retention / Renewal rate calculation
  const renewedCount = customers.filter(c => (c.renewals && c.renewals.length > 0) || (c.notes && c.notes.includes('RENEWAL'))).length;
  const retentionRate = total > 0 ? Math.round((renewedCount / total) * 100) : 0;

  // College & Hostel Distribution
  const collegeStats = useMemo(() => {
    const stats: Record<string, number> = {};
    customers.forEach(c => {
      const col = c.collegeOrWork || c.college || 'Hostel / Private Room';
      stats[col] = (stats[col] || 0) + 1;
    });
    return Object.entries(stats)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [customers]);

  const maxCollegeCount = Math.max(1, ...collegeStats.map(s => s.count));

  // Meal preference breakdown
  const mealPrefStats = useMemo(() => {
    const both = customers.filter(c => c.mealPreference === 'lunch_dinner' || !c.mealPreference).length;
    const lunchOnly = customers.filter(c => c.mealPreference === 'lunch_only').length;
    const dinnerOnly = customers.filter(c => c.mealPreference === 'dinner_only').length;
    return { both, lunchOnly, dinnerOnly };
  }, [customers]);

  // Filtered List
  const filtered = useMemo(() => {
    return customers.filter(c => {
      const days = calculateDaysRemaining(c.endDate);
      const isActive = days >= 0;
      const isExpiring = days >= 0 && days <= 3;
      const isExpired = days < 0;

      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || 
        c.name.toLowerCase().includes(q) || 
        c.id.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.college && c.college.toLowerCase().includes(q)) ||
        (c.collegeOrWork && c.collegeOrWork.toLowerCase().includes(q)) ||
        (c.hostel && c.hostel.toLowerCase().includes(q)) ||
        ((c as any).roomNo && String((c as any).roomNo).toLowerCase().includes(q));

      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'active' && isActive) ||
        (statusFilter === 'expiring' && isExpiring) ||
        (statusFilter === 'expired' && isExpired);

      const matchesGender = 
        genderFilter === 'all' ||
        (genderFilter === 'female' ? c.gender === 'female' : c.gender !== 'female');

      const colName = c.collegeOrWork || c.college || 'Hostel / Private Room';
      const matchesCollege = selectedCollege === 'all' || colName === selectedCollege;

      return matchesSearch && matchesStatus && matchesGender && matchesCollege;
    });
  }, [customers, searchTerm, statusFilter, genderFilter, selectedCollege]);

  const handleExport = (format: 'xlsx' | 'csv') => {
    const rows = filtered.map(c => ({
      'Student ID': c.id,
      'Full Name': c.name,
      'Mobile Phone': c.phone,
      'Gender': (c.gender || 'male').toUpperCase(),
      'College / Institution': c.collegeOrWork || c.college || 'N/A',
      'Hostel / Room': `${c.hostel || 'Hostel'} Room #${(c as any).roomNo || 'N/A'}`,
      'Start Date': c.startDate,
      'End Date': c.endDate,
      'Days Remaining': calculateDaysRemaining(c.endDate),
      'Plan Fee (INR)': c.totalAmount,
      'Paid Fee (INR)': c.paidAmount,
      'Pending Due (INR)': c.balance,
      'Meal Plan': (c.mealPreference || 'lunch_dinner').toUpperCase()
    }));

    exportToSpreadsheet(rows, {
      filename: `Customer_Demographics_Report_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Customers_Demographics',
      format
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-600" />
                <span>Customer Reports & Demographics Analytics</span>
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                🟢 Supabase Synced
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Registration cohorts, active/expired watchlists, college distributions, and retention metrics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleExport('xlsx')}
            className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase block">Total Enrolled</span>
          <span className="text-2xl font-black text-slate-900 block">{total} Diners</span>
          <span className="text-[10px] text-slate-400 font-medium">All-time student records</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-emerald-700 uppercase block">Active Members</span>
          <span className="text-2xl font-black text-emerald-600 block">{activeCount} Diners</span>
          <span className="text-[10px] text-emerald-600 font-semibold">Valid passes for entry</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-amber-700 uppercase block">Expiring (3 Days)</span>
          <span className="text-2xl font-black text-amber-600 block">{expiringCount} Diners</span>
          <span className="text-[10px] text-amber-600 font-semibold">Ready for renewal notice</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-rose-700 uppercase block">Expired Passes</span>
          <span className="text-2xl font-black text-rose-600 block">{expiredCount} Diners</span>
          <span className="text-[10px] text-rose-600 font-semibold">Suspended / Needs renewal</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-indigo-700 uppercase block">Renewal Rate</span>
          <span className="text-2xl font-black text-indigo-600 block">{retentionRate}%</span>
          <span className="text-[10px] text-indigo-600 font-semibold">{renewedCount} renewed members</span>
        </div>
      </div>

      {/* College & Demographics Insights Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* College / Institution Distribution */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-orange-600" />
              <span>Top College / Hostel Cohorts</span>
            </h3>
            <span className="text-xs text-slate-500 font-bold">{collegeStats.length} institutions</span>
          </div>

          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {collegeStats.map((col, idx) => {
              const pct = Math.round((col.count / maxCollegeCount) * 100);
              return (
                <div key={idx} className="space-y-1 text-xs">
                  <div className="flex justify-between font-bold">
                    <span className="text-slate-800 truncate max-w-[240px]">{col.name}</span>
                    <span className="text-slate-500">{col.count} diners ({Math.round((col.count / Math.max(1, total)) * 100)}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all duration-300" 
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gender & Meal Preference Breakdown */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Gender & Meal Preferences</span>
            </h3>
            <span className="text-xs text-slate-500 font-bold">Diversity Audit</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl">
              <span className="text-[11px] font-bold text-blue-900 uppercase flex items-center gap-1">
                <Mars className="w-3.5 h-3.5" /> Boys Students
              </span>
              <div className="text-xl font-black text-blue-800 mt-1">{maleCount}</div>
              <span className="text-[10px] text-blue-600 font-semibold">{total > 0 ? Math.round((maleCount / total) * 100) : 0}% of mess diners</span>
            </div>

            <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-2xl">
              <span className="text-[11px] font-bold text-rose-900 uppercase flex items-center gap-1">
                <Venus className="w-3.5 h-3.5" /> Girls Students
              </span>
              <div className="text-xl font-black text-rose-800 mt-1">{femaleCount}</div>
              <span className="text-[10px] text-rose-600 font-semibold">{total > 0 ? Math.round((femaleCount / total) * 100) : 0}% of mess diners</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5 text-xs">
            <span className="font-bold text-slate-700 block">Meal Plan Preferences:</span>
            <div className="flex justify-between text-slate-600">
              <span>Full Mess (Lunch + Dinner):</span>
              <strong className="text-slate-900">{mealPrefStats.both} diners</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>One Time Lunch Only:</span>
              <strong className="text-slate-900">{mealPrefStats.lunchOnly} diners</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>One Time Dinner Only:</span>
              <strong className="text-slate-900">{mealPrefStats.dinnerOnly} diners</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status filter */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
            {(['all', 'active', 'expiring', 'expired'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-lg font-bold capitalize transition cursor-pointer ${
                  statusFilter === s 
                    ? 'bg-orange-600 text-white shadow-2xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {s === 'expiring' ? 'Expiring (3d)' : s}
              </button>
            ))}
          </div>

          {/* Gender filter */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
            {(['all', 'male', 'female'] as const).map(g => (
              <button
                key={g}
                onClick={() => setGenderFilter(g)}
                className={`px-3 py-1 rounded-lg font-bold capitalize transition cursor-pointer ${
                  genderFilter === g 
                    ? 'bg-slate-900 text-white shadow-2xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* College filter */}
          <select
            value={selectedCollege}
            onChange={(e) => setSelectedCollege(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 text-xs"
          >
            <option value="all">All Colleges / Hostels</option>
            {collegeStats.map((col, idx) => (
              <option key={idx} value={col.name}>{col.name}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search name, phone, college, room..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Student Details</th>
                <th className="p-3.5">College & Room</th>
                <th className="p-3.5">Validity Period</th>
                <th className="p-3.5">Plan Fee & Balance</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                    No customer records found matching the active filters.
                  </td>
                </tr>
              ) : (
                filtered.map(c => {
                  const days = calculateDaysRemaining(c.endDate);
                  const isActive = days >= 0;
                  const isExpiring = days >= 0 && days <= 3;
                  const isExpired = days < 0;
                  const cleanPhone = c.phone.replace(/[^0-9]/g, '');

                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5">
                        <div className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                          <span>{c.name}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            c.gender === 'female' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {c.gender === 'female' ? 'F' : 'M'}
                          </span>
                        </div>
                        <span className="font-mono text-slate-500 text-[11px] block mt-0.5">{c.phone} • {c.id}</span>
                      </td>

                      <td className="p-3.5 text-slate-700">
                        <div className="font-bold truncate max-w-[180px]">{c.collegeOrWork || c.college || 'Hostel'}</div>
                        <div className="text-[11px] text-slate-400">Room #{((c as any).roomNo || 'N/A')}</div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-slate-800">{c.startDate} to {c.endDate}</div>
                        <div className={`text-[11px] font-semibold ${
                          isExpired ? 'text-rose-600' : isExpiring ? 'text-amber-600' : 'text-emerald-600'
                        }`}>
                          {isExpired ? `Expired ${Math.abs(days)}d ago` : `${days} days left`}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">₹{c.totalAmount || 2500}</div>
                        <div className="text-[11px] text-slate-500">
                          Paid: ₹{c.paidAmount || 0}
                          {c.balance > 0 && (
                            <span className="text-rose-600 font-bold ml-1">(Due: ₹{c.balance})</span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase inline-block ${
                          isExpired 
                            ? 'bg-rose-50 text-rose-800 border border-rose-200' 
                            : isExpiring 
                            ? 'bg-amber-50 text-amber-800 border border-amber-200' 
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          {isExpired ? 'EXPIRED' : isExpiring ? 'EXPIRING' : 'ACTIVE'}
                        </span>
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {cleanPhone && (
                            <a
                              href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Hello ${c.name}, greeting from Morya Mess!`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {cleanPhone && (
                            <a
                              href={`tel:${cleanPhone}`}
                              className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition"
                              title="Call Student"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {onOpenCustomer360 && (
                            <button
                              onClick={() => onOpenCustomer360(c)}
                              className="px-2.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition cursor-pointer"
                            >
                              <span>360°</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
