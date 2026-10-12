import React, { useState, useMemo } from 'react';
import { MealLog } from '../../types/mess';
import { SecurityAuditEntry, loadSecurityLogs } from '../../lib/ownerModulesStorage';
import { 
  Shield, 
  ArrowLeft, 
  Search, 
  Filter, 
  Clock, 
  User, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ScanLine, 
  Download, 
  RefreshCw,
  Calendar,
  Lock,
  Layers
} from 'lucide-react';

interface SecurityActivityLogViewProps {
  mealLogs: MealLog[];
  onBack: () => void;
  onOpenScanner?: () => void;
}

export const SecurityActivityLogView: React.FC<SecurityActivityLogViewProps> = ({
  mealLogs,
  onBack,
  onOpenScanner
}) => {
  const [activeTab, setActiveTab] = useState<'security_audit' | 'meal_scans'>('security_audit');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedScanStatus, setSelectedScanStatus] = useState<string>('all');
  const [securityLogs, setSecurityLogs] = useState<SecurityAuditEntry[]>(() => loadSecurityLogs());

  const handleRefresh = () => {
    setSecurityLogs(loadSecurityLogs());
  };

  // Distinct modules in security logs
  const availableModules = useMemo(() => {
    const set = new Set<string>();
    securityLogs.forEach(l => { if (l.module) set.add(l.module); });
    return Array.from(set);
  }, [securityLogs]);

  // Filtered Security Logs
  const filteredSecurityLogs = useMemo(() => {
    return securityLogs.filter(log => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        log.actor.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.module.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q);
      
      const matchesModule = selectedModule === 'all' || log.module === selectedModule;
      return matchesSearch && matchesModule;
    });
  }, [securityLogs, searchQuery, selectedModule]);

  // Filtered Meal Logs
  const filteredMealLogs = useMemo(() => {
    return mealLogs.filter(log => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        log.customerName.toLowerCase().includes(q) ||
        log.customerId.toLowerCase().includes(q) ||
        log.reason.toLowerCase().includes(q);

      const matchesStatus = selectedScanStatus === 'all' || log.scanStatus === selectedScanStatus;
      return matchesSearch && matchesStatus;
    });
  }, [mealLogs, searchQuery, selectedScanStatus]);

  const handleExportCSV = () => {
    if (activeTab === 'security_audit') {
      const headers = ['Timestamp', 'Actor', 'Module', 'Action', 'Details', 'Related ID'];
      const rows = filteredSecurityLogs.map(l => [
        new Date(l.timestamp).toLocaleString('en-IN'),
        `"${l.actor.replace(/"/g, '""')}"`,
        `"${l.module.replace(/"/g, '""')}"`,
        `"${l.action.replace(/"/g, '""')}"`,
        `"${l.details.replace(/"/g, '""')}"`,
        `"${(l.relatedId || '').replace(/"/g, '""')}"`
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `morya_security_audit_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
    } else {
      const headers = ['Date', 'Time', 'Student ID', 'Student Name', 'Meal Shift', 'Scan Status', 'Verdict/Reason'];
      const rows = filteredMealLogs.map(l => [
        l.date,
        new Date(l.timestamp).toLocaleTimeString('en-IN'),
        `"${l.customerId}"`,
        `"${l.customerName.replace(/"/g, '""')}"`,
        l.mealType,
        l.scanStatus,
        `"${l.reason.replace(/"/g, '""')}"`
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `morya_gate_attendance_log_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                <span>Security & Activity Audit Log</span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time operational audit trail, administrative security logs, and dining hall gate scans
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleRefresh}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            {onOpenScanner && (
              <button
                onClick={onOpenScanner}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <ScanLine className="w-4 h-4" />
                <span>Open Scanner</span>
              </button>
            )}
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 mt-5 border-b border-slate-100 pb-3">
          <button
            onClick={() => setActiveTab('security_audit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'security_audit'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Admin & Security Events ({securityLogs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('meal_scans')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'meal_scans'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Gate & Scanner Activity ({mealLogs.length})</span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mt-4">
          <div className="sm:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'security_audit'
                  ? "Search by actor, action, module, or details..."
                  : "Search student name, ID, or gate verdict..."
              }
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="sm:col-span-4">
            {activeTab === 'security_audit' ? (
              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">All Modules ({availableModules.length})</option>
                {availableModules.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            ) : (
              <select
                value={selectedScanStatus}
                onChange={(e) => setSelectedScanStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">All Statuses</option>
                <option value="ALLOW">ALLOW (Granted)</option>
                <option value="BLOCK">BLOCK (Denied)</option>
                <option value="REVIEW_REQUIRED">REVIEW REQUIRED</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'security_audit' ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              Audit Stream ({filteredSecurityLogs.length} events)
            </span>
            <span className="text-[11px] text-slate-400">
              Preserved with Actor, Action & Timestamp
            </span>
          </div>

          {filteredSecurityLogs.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Shield className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">No security audit logs found</p>
              <p className="text-xs text-slate-400 mt-1">Actions taken across POS, Auth, and Settings will log here automatically.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredSecurityLogs.map(log => (
                <div key={log.id} className="p-4 sm:p-5 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 uppercase">
                        {log.module}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {log.action}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        {log.actor}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      {log.details}
                    </p>
                    {log.relatedId && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        Ref: {log.relatedId}
                      </span>
                    )}
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-[11px] text-slate-500 font-medium flex items-center sm:justify-end gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(log.timestamp).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <ScanLine className="w-3.5 h-3.5 text-orange-600" />
              Dining Gate Scans ({filteredMealLogs.length} scans)
            </span>
            <span className="text-[11px] text-slate-400">
              Universal & Digital Pass QR Gate Verifications
            </span>
          </div>

          {filteredMealLogs.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <ScanLine className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">No gate attendance logs recorded</p>
              <p className="text-xs text-slate-400 mt-1">Student attendance scanned at gate counter appears here in real-time.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredMealLogs.map(log => {
                const isAllow = log.scanStatus === 'ALLOW';
                const isBlock = log.scanStatus === 'BLOCK';
                return (
                  <div key={log.id} className="p-4 sm:p-5 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          isAllow 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isBlock
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {log.scanStatus}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {log.customerName}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 uppercase">
                          {log.mealType}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          ID: {log.customerId}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        {log.reason}
                      </p>
                      {log.overrideNotes && (
                        <p className="text-[11px] text-amber-700 italic">
                          Override: {log.overrideNotes}
                        </p>
                      )}
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <span className="text-[11px] text-slate-500 font-medium flex items-center sm:justify-end gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {log.date} • {new Date(log.timestamp).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
