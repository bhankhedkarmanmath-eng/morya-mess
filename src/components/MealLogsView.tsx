import React, { useState } from 'react';
import { MealLog, MealType } from '../types/mess';
import { getTodayString } from '../lib/storage';
import { exportToSpreadsheet } from '../lib/exportUtils';
import { 
  Utensils, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  Download,
  ShieldCheck,
  ShieldAlert,
  Moon,
  Sun,
  Coffee
} from 'lucide-react';

interface MealLogsViewProps {
  mealLogs: MealLog[];
  onOpenScanner: () => void;
}

export const MealLogsView: React.FC<MealLogsViewProps> = ({
  mealLogs,
  onOpenScanner
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());

  const filteredLogs = mealLogs.filter(log => {
    const matchesDate = !selectedDate || log.date === selectedDate;
    const matchesSearch = 
      log.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.customerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.reason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || log.mealType === filterType;
    const matchesStatus = filterStatus === 'ALL' || log.scanStatus === filterStatus;

    return matchesDate && matchesSearch && matchesType && matchesStatus;
  });

  const totalScans = filteredLogs.length;
  const allowedScans = filteredLogs.filter(l => l.scanStatus === 'ALLOW').length;
  const blockedScans = filteredLogs.filter(l => l.scanStatus === 'BLOCK').length;
  const reviewScans = filteredLogs.filter(l => l.scanStatus === 'REVIEW_REQUIRED').length;

  const exportToCSV = () => {
    if (filteredLogs.length === 0) {
      alert('No data available for the selected filters.');
      return;
    }

    const data = filteredLogs.map(l => ({
      'Date': l.date,
      'Time': new Date(l.timestamp).toLocaleTimeString(),
      'Customer ID': l.customerId,
      'Customer Name': l.customerName,
      'Meal Type': l.mealType.toUpperCase(),
      'Scan Status': l.scanStatus,
      'Audit Reason': l.reason,
      'Notes': l.overrideNotes || ''
    }));

    exportToSpreadsheet(data, {
      filename: `Morya_Mess_Attendance_${selectedDate || 'all'}`,
      sheetName: 'Attendance_Logs',
      format: 'xlsx'
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Live Attendance & Gate Audit Log</h2>
          <p className="text-xs text-slate-500">
            Real-time audit log of student gate entries, double-meal blocks & manager overrides
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
            title="Export filtered log to Excel/CSV"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            id="btn-open-scanner-from-meals"
            onClick={onOpenScanner}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 shadow-xs transition-colors cursor-pointer"
          >
            <Utensils className="w-4 h-4" />
            <span>Open Gate Scanner</span>
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Total Scans Audited</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalScans}</div>
          <span className="text-[11px] text-slate-400">For selected criteria</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Approved Gate Admissions</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{allowedScans}</div>
          <span className="text-[11px] text-emerald-700 font-semibold">Valid meals served</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Blocked Gate Attempts</span>
          <div className="text-2xl font-bold text-rose-600 mt-1">{blockedScans}</div>
          <span className="text-[11px] text-rose-700 font-semibold">Double meal / expired</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Reviews & Overrides</span>
          <div className="text-2xl font-bold text-amber-600 mt-1">{reviewScans}</div>
          <span className="text-[11px] text-amber-700 font-semibold">Manager authorizations</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="flex-1 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-meals"
              type="text"
              placeholder="Search student name, ID or reason..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-orange-600"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              id="input-date-filter"
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:outline-none"
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate('')}
                className="text-[11px] text-orange-600 font-bold hover:underline cursor-pointer"
              >
                All Dates
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <select
            id="select-filter-mealtype"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:outline-none"
          >
            <option value="ALL">All Shifts</option>
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
          </select>

          <select
            id="select-filter-status"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="ALLOW">Allowed Only</option>
            <option value="BLOCK">Blocked Only</option>
            <option value="REVIEW_REQUIRED">Review / Overrides</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      {filteredLogs.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <Utensils className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Attendance Logs Match Your Filter</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Scan student digital QR passes at the mess entry gate to audit attendance and eliminate meal leakage.
          </p>
          <button
            id="btn-empty-scan"
            onClick={onOpenScanner}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 cursor-pointer"
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Launch Gate Scanner</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Time & Date</th>
                  <th className="px-4 py-3 font-semibold">Student / Member</th>
                  <th className="px-4 py-3 font-semibold">Meal Shift</th>
                  <th className="px-4 py-3 font-semibold">Gate Decision</th>
                  <th className="px-4 py-3 font-semibold">Audit Verification Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map(log => {
                  const time = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-800">{time}</div>
                        <div className="text-[11px] text-slate-500">{log.date}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{log.customerName}</div>
                        <span className="font-mono text-[10px] text-orange-700 font-semibold">{log.customerId}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold capitalize bg-slate-100 text-slate-700">
                          {log.mealType === 'lunch' ? <Sun className="w-3 h-3 text-amber-500" /> : <Moon className="w-3 h-3 text-indigo-500" />}
                          <span>{log.mealType}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {log.scanStatus === 'ALLOW' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>ALLOWED</span>
                          </span>
                        )}
                        {log.scanStatus === 'BLOCK' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>BLOCKED</span>
                          </span>
                        )}
                        {log.scanStatus === 'REVIEW_REQUIRED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>REVIEW / OVERRIDE</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-700 font-medium">{log.reason}</div>
                        {log.overrideNotes && (
                          <div className="text-[11px] text-amber-700 italic mt-0.5">
                            Override Justification: "{log.overrideNotes}"
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
