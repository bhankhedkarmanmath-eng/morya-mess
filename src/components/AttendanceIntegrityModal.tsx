import React, { useState, useMemo } from 'react';
import { 
  X, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  ScanLine, 
  Clock, 
  Users, 
  ArrowRight,
  Filter,
  Check,
  Send,
  Zap,
  Ban,
  Activity,
  QrCode,
  DollarSign,
  Phone,
  RefreshCw
} from 'lucide-react';
import { MealLog, Customer, LeaveRecord, BusinessRulesConfig } from '../types/mess';
import { 
  runAttendanceIntegrityAudit, 
  AttendanceAnomaly, 
  IntegrityAuditReport,
  buildWhatsAppDirectUrl
} from '../lib/autoPilotSuite';
import { pushSyncToServer } from '../lib/syncEngine';

interface AttendanceIntegrityModalProps {
  isOpen: boolean;
  onClose: () => void;
  mealLogs: MealLog[];
  customers: Customer[];
  leaves: LeaveRecord[];
  rules: BusinessRulesConfig;
  onApplyPenalty?: (customerId: string, amount: number, reason: string) => void;
}

export const AttendanceIntegrityModal: React.FC<AttendanceIntegrityModalProps> = ({
  isOpen,
  onClose,
  mealLogs,
  customers,
  leaves,
  rules,
  onApplyPenalty
}) => {
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'high' | 'medium'>('all');
  const [customFineModal, setCustomFineModal] = useState<{ anomaly: AttendanceAnomaly; amount: number; reason: string } | null>(null);

  const auditReport: IntegrityAuditReport = useMemo(() => {
    return runAttendanceIntegrityAudit(mealLogs, customers, leaves);
  }, [mealLogs, customers, leaves]);

  if (!isOpen) return null;

  const handleResolveAnomaly = (anomalyId: string) => {
    setResolvedIds(prev => [...prev, anomalyId]);
  };

  const handleSendIntegrityWarningWhatsApp = (anomaly: AttendanceAnomaly) => {
    const cust = customers.find(c => c.id === anomaly.studentId);
    if (!cust?.phone) return;

    let warningText = `🚩 *${rules.messName || 'Morya Mess'} - गेट सुरक्षा आणि हजेरी तपासणी सूचना*\n\nप्रिय विद्यार्थी *${anomaly.studentName}* (ID: ${anomaly.studentId}),\n\nआपल्या मेस कार्डवर खालील संशयास्पद स्कॅन नोंदवले गेले आहे:\n• *तपशील:* ${anomaly.description}\n• *वेळ:* ${anomaly.timestamp} (${anomaly.mealType.toUpperCase()})\n\nमेस नियमांनुसार एका शिफ्टमध्ये फक्त एकच वैध स्कॅन ग्राह्य धरला जातो. मित्र/मैत्रिणीला कार्ड देणे किंवा प्रॉक्सी स्कॅन करणे नियमांचे उल्लंघन आहे.\nकाही अडचण असल्यास कृपया त्वरित व्यवस्थापकाशी संपर्क साधावा.`;

    const url = buildWhatsAppDirectUrl(cust.phone, warningText);
    window.open(url, '_blank');
    handleResolveAnomaly(anomaly.id);
  };

  const handleDeductFine = async (anomaly: AttendanceAnomaly, fineAmount: number = 80) => {
    if (onApplyPenalty) {
      onApplyPenalty(anomaly.studentId, fineAmount, `Security Fine: ${anomaly.type} during ${anomaly.mealType}`);
    } else {
      // Direct balance deduction fallback
      const target = customers.find(c => c.id === anomaly.studentId);
      if (target) {
        const updated = customers.map(c => {
          if (c.id === anomaly.studentId) {
            const newBal = (c.balance || 0) + fineAmount;
            return { ...c, balance: newBal };
          }
          return c;
        });
        await pushSyncToServer({ customers: updated });
      }
    }
    handleResolveAnomaly(anomaly.id);
    setCustomFineModal(null);
  };

  const activeAnomalies = auditReport.anomalies.filter(a => !resolvedIds.includes(a.id));
  const filteredAnomalies = activeAnomalies.filter(a => {
    if (filterSeverity === 'all') return true;
    return a.severity === filterSeverity;
  });

  // Integrity Percentage
  const integrityScore = Math.max(0, Math.min(100, Math.round(((auditReport.totalScansToday - activeAnomalies.length) / Math.max(1, auditReport.totalScansToday)) * 100)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-indigo-100 overflow-hidden my-auto">
        
        {/* HEADER - Royal Indigo & Sapphire Theme (No dull black) */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 text-white shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-inner shrink-0">
              <ShieldCheck className="w-5 h-5 text-indigo-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Gate Attendance Integrity & Anti-Theft Radar
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-400/30 border border-emerald-300/40 text-[10px] font-black uppercase text-emerald-100">
                  Anti-Fraud AI
                </span>
              </div>
              <p className="text-xs text-indigo-100/90 font-medium">
                Detects double-scan proxy passing, eating on leave, and unauthorized walk-in scans
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/25 text-white transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* METRICS BAR */}
        <div className="p-4 sm:p-5 bg-indigo-50/60 border-b border-indigo-100/80 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-indigo-200/70 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Gate Integrity Score</span>
              <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-0.5 flex items-center gap-1.5">
                <span>{integrityScore}%</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  {integrityScore >= 95 ? 'Excellent' : 'Audit Needed'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold">{auditReport.totalScansToday} scans audited</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-rose-200/70 shadow-2xs">
              <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Flagged Violations</span>
              <div className="text-xl sm:text-2xl font-black text-rose-600 mt-0.5">
                {activeAnomalies.length}
              </div>
              <span className="text-[10px] text-rose-600 font-semibold">Immediate review required</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-amber-200/70 shadow-2xs">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Proxy Dual Scans</span>
              <div className="text-xl sm:text-2xl font-black text-amber-700 mt-0.5">
                {activeAnomalies.filter(a => a.type.toLowerCase().includes('duplicate') || a.type.toLowerCase().includes('proxy')).length}
              </div>
              <span className="text-[10px] text-amber-600 font-semibold">Scanned twice in &lt;15m</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-sky-200/70 shadow-2xs">
              <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wider">Dining On Leave</span>
              <div className="text-xl sm:text-2xl font-black text-sky-700 mt-0.5">
                {activeAnomalies.filter(a => a.type.toLowerCase().includes('leave')).length}
              </div>
              <span className="text-[10px] text-sky-600 font-semibold">Gate breach during leave</span>
            </div>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="px-5 py-3 bg-white border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Filter Severity:</span>
            <button
              onClick={() => setFilterSeverity('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterSeverity === 'all' 
                  ? 'bg-indigo-600 text-white shadow-2xs' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Alerts ({activeAnomalies.length})
            </button>
            <button
              onClick={() => setFilterSeverity('high')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterSeverity === 'high' 
                  ? 'bg-rose-600 text-white shadow-2xs' 
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60'
              }`}
            >
              High Risk (Severe)
            </button>
            <button
              onClick={() => setFilterSeverity('medium')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterSeverity === 'medium' 
                  ? 'bg-amber-600 text-white shadow-2xs' 
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60'
              }`}
            >
              Medium
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Resolved Today: <strong className="text-emerald-700">{resolvedIds.length}</strong>
          </div>
        </div>

        {/* ANOMALIES LIST */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {filteredAnomalies.length === 0 ? (
            <div className="text-center py-12 bg-indigo-50/40 rounded-2xl border border-indigo-100">
              <ShieldCheck className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
              <h3 className="text-base font-bold text-slate-800">Gate Integrity is 100% Clean!</h3>
              <p className="text-xs text-slate-500 mt-1">No proxy sharing or unauthorized meal scans detected in this shift.</p>
            </div>
          ) : (
            filteredAnomalies.map((anomaly) => {
              const cust = customers.find(c => c.id === anomaly.studentId);
              const isHigh = anomaly.severity === 'high';

              return (
                <div 
                  key={anomaly.id}
                  className={`p-4 rounded-2xl border transition shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                    isHigh 
                      ? 'bg-rose-50/30 border-rose-200 hover:border-rose-400' 
                      : 'bg-white border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                      isHigh ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm">{anomaly.studentName}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                          {anomaly.studentId}
                        </span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          isHigh 
                            ? 'bg-rose-100 text-rose-800 border-rose-300' 
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}>
                          {anomaly.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-semibold mt-1">
                        {anomaly.description}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 font-medium">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Shift: <strong className="text-slate-600">{anomaly.mealType.toUpperCase()}</strong></span>
                        <span>•</span>
                        <span>Logged at: {anomaly.timestamp}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                    <button
                      onClick={() => handleResolveAnomaly(anomaly.id)}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition cursor-pointer"
                      title="Dismiss as genuine error"
                    >
                      Dismiss
                    </button>

                    <button
                      onClick={() => handleSendIntegrityWarningWhatsApp(anomaly)}
                      className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      title="Send Marathi/English WhatsApp Notice"
                    >
                      <Send className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp Notice</span>
                    </button>

                    <button
                      onClick={() => setCustomFineModal({ anomaly, amount: 80, reason: `Proxy Scan Penalty (${anomaly.mealType.toUpperCase()})` })}
                      className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Fine ₹80</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* CUSTOM FINE POPUP MODAL */}
        {customFineModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-150">
              <h3 className="font-black text-slate-900 text-base mb-1">Apply Gate Violation Penalty</h3>
              <p className="text-xs text-slate-500 mb-4">
                Deduct penalty from {customFineModal.anomaly.studentName}&apos;s account balance
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Penalty Amount (₹)</label>
                  <input
                    type="number"
                    value={customFineModal.amount}
                    onChange={(e) => setCustomFineModal({ ...customFineModal, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Reason / Notes</label>
                  <input
                    type="text"
                    value={customFineModal.reason}
                    onChange={(e) => setCustomFineModal({ ...customFineModal, reason: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCustomFineModal(null)}
                    className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeductFine(customFineModal.anomaly, customFineModal.amount)}
                    className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black cursor-pointer shadow-xs"
                  >
                    Confirm Fine
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
