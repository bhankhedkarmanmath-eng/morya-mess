import React, { useState, useMemo } from 'react';
import { MealLog, Customer } from '../../types/mess';
import { 
  BarChart3, 
  ArrowLeft, 
  Search, 
  Calendar, 
  Clock, 
  Utensils, 
  TrendingUp, 
  TrendingDown, 
  User, 
  Filter,
  CheckCircle,
  XCircle,
  HelpCircle,
  Download,
  Printer,
  ShieldAlert,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  PieChart,
  Activity
} from 'lucide-react';
import { exportToSpreadsheet } from '../../lib/exportUtils';
import { pullSyncFromServer } from '../../lib/syncEngine';

interface AttendanceReportsViewProps {
  mealLogs: MealLog[];
  customers: Customer[];
  onBack: () => void;
}

type DateRangeFilter = 'today' | 'yesterday' | 'week' | 'month' | 'all';

export const AttendanceReportsView: React.FC<AttendanceReportsViewProps> = ({
  mealLogs,
  customers,
  onBack
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeFilter>('today');
  const [customDate, setCustomDate] = useState('');
  const [selectedMealType, setSelectedMealType] = useState<'all' | 'lunch' | 'dinner'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'ALLOW' | 'BLOCK'>('all');
  const [activeTab, setActiveTab] = useState<'all_logs' | 'hourly_peaks' | 'absentees' | 'security_blocks'>('all_logs');

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  })();

  const sevenDaysAgoStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  })();

  const thirtyDaysAgoStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  })();

  // 1. Filter logs by date range
  const dateFilteredLogs = useMemo(() => {
    return mealLogs.filter(log => {
      if (customDate) return log.date === customDate;
      if (dateRange === 'today') return log.date === todayStr;
      if (dateRange === 'yesterday') return log.date === yesterdayStr;
      if (dateRange === 'week') return log.date >= sevenDaysAgoStr;
      if (dateRange === 'month') return log.date >= thirtyDaysAgoStr;
      return true;
    });
  }, [mealLogs, dateRange, customDate, todayStr, yesterdayStr, sevenDaysAgoStr, thirtyDaysAgoStr]);

  // 2. Further filtered by search, meal type, and status
  const filteredLogs = useMemo(() => {
    return dateFilteredLogs.filter(log => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || 
        log.customerName.toLowerCase().includes(q) || 
        log.customerId.toLowerCase().includes(q) ||
        (log.reason && log.reason.toLowerCase().includes(q));
      
      const matchesType = selectedMealType === 'all' || log.mealType === selectedMealType;
      const matchesStatus = selectedStatus === 'all' || log.scanStatus === selectedStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [dateFilteredLogs, searchTerm, selectedMealType, selectedStatus]);

  // 3. Metrics
  const totalScans = dateFilteredLogs.length;
  const allowedScans = dateFilteredLogs.filter(l => l.scanStatus === 'ALLOW').length;
  const blockedScans = dateFilteredLogs.filter(l => l.scanStatus === 'BLOCK').length;
  const lunchScans = dateFilteredLogs.filter(l => l.mealType === 'lunch' && l.scanStatus === 'ALLOW').length;
  const dinnerScans = dateFilteredLogs.filter(l => l.mealType === 'dinner' && l.scanStatus === 'ALLOW').length;

  const activeCustomerCount = customers.filter(c => c.status === 'active').length;
  const turnoutRate = activeCustomerCount > 0 
    ? Math.min(100, Math.round(((allowedScans / (activeCustomerCount * (dateRange === 'today' || dateRange === 'yesterday' ? 2 : 14))) * 100))) 
    : 0;

  // 4. Hourly Peak Distribution (from ISO timestamps)
  const hourlyData = useMemo(() => {
    const hours: Record<string, { label: string; lunch: number; dinner: number }> = {
      '11:00': { label: '11 AM - 12 PM', lunch: 0, dinner: 0 },
      '12:00': { label: '12 PM - 01 PM', lunch: 0, dinner: 0 },
      '13:00': { label: '01 PM - 02 PM', lunch: 0, dinner: 0 },
      '14:00': { label: '02 PM - 03 PM', lunch: 0, dinner: 0 },
      '19:00': { label: '07 PM - 08 PM', lunch: 0, dinner: 0 },
      '20:00': { label: '08 PM - 09 PM', lunch: 0, dinner: 0 },
      '21:00': { label: '09 PM - 10 PM', lunch: 0, dinner: 0 }
    };

    dateFilteredLogs.filter(l => l.scanStatus === 'ALLOW').forEach(l => {
      try {
        const timePart = l.timestamp?.split('T')[1]?.slice(0, 2);
        if (timePart === '11') hours['11:00'].lunch++;
        else if (timePart === '12') hours['12:00'].lunch++;
        else if (timePart === '13') hours['13:00'].lunch++;
        else if (timePart === '14') hours['14:00'].lunch++;
        else if (timePart === '19') hours['19:00'].dinner++;
        else if (timePart === '20') hours['20:00'].dinner++;
        else if (timePart === '21') hours['21:00'].dinner++;
      } catch {}
    });

    return Object.values(hours);
  }, [dateFilteredLogs]);

  const maxHourCount = Math.max(1, ...hourlyData.map(h => Math.max(h.lunch, h.dinner)));

  // 5. Absentee Watchlist (Active students who haven't scanned in 3+ days)
  const absentees = useMemo(() => {
    const recentScannedIds = new Set(
      mealLogs
        .filter(l => l.date >= sevenDaysAgoStr && l.scanStatus === 'ALLOW')
        .map(l => l.customerId)
    );

    return customers
      .filter(c => c.status === 'active' && !recentScannedIds.has(c.id))
      .slice(0, 20);
  }, [customers, mealLogs, sevenDaysAgoStr]);

  // 6. Security & Blocked Logs
  const securityLogs = useMemo(() => {
    return dateFilteredLogs.filter(l => l.scanStatus === 'BLOCK');
  }, [dateFilteredLogs]);

  // Export to Excel / CSV
  const handleExport = (format: 'xlsx' | 'csv') => {
    const rows = filteredLogs.map(l => ({
      'Date': l.date,
      'Time': l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : 'N/A',
      'Student ID': l.customerId,
      'Customer Name': l.customerName,
      'Meal Shift': l.mealType.toUpperCase(),
      'Gate Status': l.scanStatus,
      'Gate Reason': l.reason || 'Normal Entry'
    }));

    exportToSpreadsheet(rows, {
      filename: `Attendance_Report_${dateRange}_${todayStr}`,
      sheetName: 'Attendance_Logs',
      format
    });
  };

  const handleShareWhatsAppTurnout = () => {
    const text = `🍽️ *MORYA MESS GATE ATTENDANCE DIGEST* 🍽️\nDate: *${customDate || (dateRange === 'today' ? todayStr : dateRange.toUpperCase())}*\n\n📊 *MEAL TURNOUT:*\n• Total Valid Plates Served: *${allowedScans} Meals*\n• Lunch Shift: *${lunchScans} Plates*\n• Dinner Shift: *${dinnerScans} Plates*\n• Turnout Ratio: *${turnoutRate}%*\n• Blocked / Refused: *${blockedScans} Scans*\n\n_Auto-synced from Morya Mess Operations Radar_`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleSyncLatest = async () => {
    try {
      await pullSyncFromServer();
    } catch {}
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
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
                <BarChart3 className="w-5 h-5 text-orange-600" />
                <span>Gate Attendance & Dining Analytics</span>
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                🟢 Supabase Sync
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live turnout monitoring, rush hour peak traffic, proxy scan audits, and absentee watchlists
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleShareWhatsAppTurnout}
            className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            title="Share summary to WhatsApp"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            <span>WA Digest</span>
          </button>
          <button
            onClick={() => handleExport('xlsx')}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Sheet</span>
          </button>
        </div>
      </div>

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase block">Total Scans</span>
          <span className="text-2xl font-black text-slate-900 block">{totalScans}</span>
          <span className="text-[10px] text-slate-400 font-medium">Scans recorded</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-emerald-700 uppercase block">Plates Served</span>
          <span className="text-2xl font-black text-emerald-600 block">{allowedScans}</span>
          <span className="text-[10px] text-emerald-600 font-semibold">Valid meals eaten</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-orange-700 uppercase block">Lunch Scans</span>
          <span className="text-2xl font-black text-orange-600 block">{lunchScans}</span>
          <span className="text-[10px] text-slate-500 font-medium">10:30 AM - 02:30 PM</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-indigo-700 uppercase block">Dinner Scans</span>
          <span className="text-2xl font-black text-indigo-600 block">{dinnerScans}</span>
          <span className="text-[10px] text-slate-500 font-medium">07:30 PM - 09:45 PM</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-rose-700 uppercase block">Blocked Scans</span>
          <span className="text-2xl font-black text-rose-600 block">{blockedScans}</span>
          <span className="text-[10px] text-rose-600 font-semibold">Expired / double scan</span>
        </div>
      </div>

      {/* Date Range & Filter Controls Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Range:
          </span>
          {(['today', 'yesterday', 'week', 'month', 'all'] as const).map(r => (
            <button
              key={r}
              onClick={() => {
                setDateRange(r);
                setCustomDate('');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold capitalize transition cursor-pointer ${
                dateRange === r && !customDate
                  ? 'bg-orange-600 text-white shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {r === 'week' ? 'Last 7 Days' : r === 'month' ? 'Last 30 Days' : r}
            </button>
          ))}
          <input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
            title="Pick Specific Date"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Shift Filter */}
          <select
            value={selectedMealType}
            onChange={(e) => setSelectedMealType(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 text-xs"
          >
            <option value="all">All Shifts (Lunch & Dinner)</option>
            <option value="lunch">Lunch Only</option>
            <option value="dinner">Dinner Only</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 text-xs"
          >
            <option value="all">All Scan Outcomes</option>
            <option value="ALLOW">Allowed Only</option>
            <option value="BLOCK">Blocked Only</option>
          </select>

          {/* Search Box */}
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search student or ID..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('all_logs')}
          className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'all_logs' 
              ? 'bg-slate-900 text-white shadow-xs' 
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Utensils className="w-3.5 h-3.5 text-orange-400" />
          <span>Detailed Attendance Logs ({filteredLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('hourly_peaks')}
          className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'hourly_peaks' 
              ? 'bg-slate-900 text-white shadow-xs' 
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-amber-400" />
          <span>Rush Hour Traffic Analyzer</span>
        </button>

        <button
          onClick={() => setActiveTab('absentees')}
          className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'absentees' 
              ? 'bg-slate-900 text-white shadow-xs' 
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          <span>Absentee Watchlist ({absentees.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('security_blocks')}
          className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'security_blocks' 
              ? 'bg-slate-900 text-white shadow-xs' 
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span>Security & Blocked Scans ({securityLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: DETAILED LOGS */}
      {activeTab === 'all_logs' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Student Details</th>
                  <th className="p-3.5">Date & Time</th>
                  <th className="p-3.5">Shift</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Gate Reason / Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                      No attendance scan records found matching the active filters.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5">
                        <span className="font-black text-slate-900 block text-sm">{log.customerName}</span>
                        <span className="font-mono text-slate-500 text-[11px]">{log.customerId}</span>
                      </td>
                      <td className="p-3.5 text-slate-700">
                        <div className="font-bold">{log.date}</div>
                        <div className="text-[11px] text-slate-400">
                          {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase ${
                          log.mealType === 'lunch'
                            ? 'bg-orange-50 text-orange-800 border border-orange-200'
                            : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                        }`}>
                          {log.mealType}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase inline-flex items-center gap-1 ${
                          log.scanStatus === 'ALLOW'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}>
                          {log.scanStatus === 'ALLOW' ? <CheckCircle className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-rose-600" />}
                          <span>{log.scanStatus}</span>
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 font-medium text-[11px]">
                        {log.reason || 'Normal QR Verified Pass'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: HOURLY PEAKS TRAFFIC ANALYZER */}
      {activeTab === 'hourly_peaks' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-base text-slate-900">Kitchen Rush Hour Traffic Analysis</h3>
              <p className="text-xs text-slate-500">Distribution of dining scans across peak serving windows</p>
            </div>
            <span className="text-xs font-bold text-slate-500">Max Hour Traffic: {maxHourCount} diners</span>
          </div>

          <div className="space-y-4">
            {hourlyData.map((slot, idx) => {
              const lunchPercent = Math.round((slot.lunch / maxHourCount) * 100);
              const dinnerPercent = Math.round((slot.dinner / maxHourCount) * 100);
              const isLunch = slot.lunch > 0;
              const isDinner = slot.dinner > 0;

              return (
                <div key={idx} className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-800">{slot.label}</span>
                    <span className="text-slate-500">
                      {isLunch ? `${slot.lunch} Lunch Diners` : isDinner ? `${slot.dinner} Dinner Diners` : '0 Diners (Slack Period)'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden flex">
                    {isLunch && (
                      <div 
                        className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${lunchPercent}%` }}
                      />
                    )}
                    {isDinner && (
                      <div 
                        className="bg-gradient-to-r from-indigo-500 to-blue-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${dinnerPercent}%` }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: ABSENTEE WATCHLIST */}
      {activeTab === 'absentees' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span>Absentee Diners Radar (No Scans in 3+ Days)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Students with active paid plans who haven't shown up. Check in on their health or hostel status via WhatsApp.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-amber-50 text-amber-800 rounded-xl border border-amber-200">
              {absentees.length} Students At Risk
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {absentees.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-medium col-span-2">
                🎉 Excellent attendance! All active students have scanned recently.
              </div>
            ) : (
              absentees.map(c => {
                const cleanPhone = c.phone.replace(/[^0-9]/g, '');
                const waUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Hello ${c.name}, we noticed you haven't visited Morya Mess for meals in the last couple of days. Is everything alright? Please let us know if you are on leave or need anything!`)}`;

                return (
                  <div key={c.id} className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/70 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-black text-slate-900 text-sm block">{c.name}</span>
                      <span className="font-mono text-slate-500 text-xs">{c.phone} • Plan Valid till: {c.endDate}</span>
                    </div>

                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp Check</span>
                    </a>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SECURITY BLOCKS */}
      {activeTab === 'security_blocks' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>Gate Integrity & Anti-Theft Blocks</span>
              </h3>
              <p className="text-xs text-slate-500">Every rejected scan attempt logged with precise gate rationale</p>
            </div>
            <span className="text-xs font-bold text-rose-600 px-3 py-1 rounded-xl bg-rose-50 border border-rose-200">
              {securityLogs.length} Unauthorized Scans Blocked
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Student / ID</th>
                  <th className="p-3.5">Date & Time</th>
                  <th className="p-3.5">Shift</th>
                  <th className="p-3.5">Rejection Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {securityLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400 font-medium">
                      🛡️ Clean gate record! No unauthorized or blocked scans in this timeframe.
                    </td>
                  </tr>
                ) : (
                  securityLogs.map(l => (
                    <tr key={l.id} className="hover:bg-rose-50/20 transition-colors">
                      <td className="p-3.5">
                        <span className="font-black text-slate-900 block text-sm">{l.customerName}</span>
                        <span className="font-mono text-slate-500 text-[11px]">{l.customerId}</span>
                      </td>
                      <td className="p-3.5 text-slate-700">
                        <div className="font-bold">{l.date}</div>
                        <div className="text-[11px] text-slate-400">
                          {l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : 'N/A'}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 font-bold uppercase text-[10px]">
                          {l.mealType}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded-xl bg-rose-100 text-rose-900 font-bold text-xs inline-block">
                          {l.reason || 'Expired Plan / Card Suspended'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
