import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Customer } from '../types/mess';
import { 
  fetchActiveUniversalQr, 
  generateOrReplaceUniversalQr, 
  revokeUniversalQr, 
  recordEmergencyOwnerAttendance,
  UniversalQrTokenInfo 
} from '../lib/supabaseSync';
import { 
  QrCode, 
  Printer, 
  RefreshCw, 
  ShieldAlert, 
  ShieldCheck, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  User, 
  Phone, 
  Sparkles,
  Layers,
  FileCheck,
  AlertCircle
} from 'lucide-react';

interface UniversalQrManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  messId: string;
  customers: Customer[];
  onAttendanceRecorded?: () => void;
  messName?: string;
}

export const UniversalQrManagerModal: React.FC<UniversalQrManagerModalProps> = ({
  isOpen,
  onClose,
  messId,
  customers,
  onAttendanceRecorded,
  messName = 'MORYA MESS'
}) => {
  const [activeTab, setActiveTab] = useState<'universal' | 'emergency'>('universal');
  const [universalInfo, setUniversalInfo] = useState<UniversalQrTokenInfo | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);

  // Emergency Student QR State
  const [selectedStudentId, setSelectedStudentId] = useState<string>(customers[0]?.id || '');
  const [emergencyQrUrl, setEmergencyQrUrl] = useState<string>('');
  const [emergencyNotes, setEmergencyNotes] = useState('');
  const [isEmergencySubmitting, setIsEmergencySubmitting] = useState(false);
  const [emergencyResult, setEmergencyResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load Active Universal QR
  const loadActiveQr = async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const info = await fetchActiveUniversalQr(messId);
      setUniversalInfo(info);
      if (info.tokenCode) {
        const url = await QRCode.toDataURL(info.tokenCode, {
          width: 480,
          margin: 2,
          color: {
            dark: '#0F172A',
            light: '#FFFFFF'
          }
        });
        setQrDataUrl(url);
      }
    } catch (err: any) {
      console.error('Failed to load universal QR:', err);
      setActionError('Failed to load universal QR.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadActiveQr();
      setActionSuccess(null);
      setActionError(null);
      setConfirmReplace(false);
      setEmergencyResult(null);
    }
  }, [isOpen, messId]);

  // Update Emergency Student QR preview
  const selectedStudent = customers.find(c => c.id === selectedStudentId) || customers[0];
  useEffect(() => {
    if (!selectedStudent) return;
    const payload = JSON.stringify({
      cid: selectedStudent.id,
      token: selectedStudent.qrToken || `MORYA-${selectedStudent.id}`,
      v: selectedStudent.qrVersion || 1
    });

    QRCode.toDataURL(payload, {
      width: 260,
      margin: 1,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF'
      }
    }).then(setEmergencyQrUrl).catch(console.error);
  }, [selectedStudent]);

  if (!isOpen) return null;

  const handleGenerateOrReplace = async () => {
    setIsLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await generateOrReplaceUniversalQr(messId, 'Main Dining Hall Counter Standee');
      if (res.success) {
        setActionSuccess('New Universal QR Generated & Activated! Previous QR is now invalid.');
        setConfirmReplace(false);
        await loadActiveQr();
      } else {
        setActionError(res.error || 'Failed to generate QR.');
      }
    } catch (err: any) {
      setActionError(err?.message || 'Error generating new QR.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!window.confirm('Are you sure you want to deactivate the Universal QR? Students will not be able to scan attendance until a new QR is generated.')) {
      return;
    }
    setIsLoading(true);
    try {
      await revokeUniversalQr(messId);
      setActionSuccess('Universal QR has been revoked.');
      await loadActiveQr();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to revoke QR.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintStandee = () => {
    window.print();
  };

  const handleMarkEmergencyAttendance = async () => {
    if (!selectedStudent) return;
    setIsEmergencySubmitting(true);
    setEmergencyResult(null);
    try {
      const res = await recordEmergencyOwnerAttendance({
        messId,
        customerId: selectedStudent.id,
        reason: emergencyNotes || 'Student Phone/Camera Emergency Check-in',
        verifiedBy: 'Owner Desk'
      });
      setEmergencyResult(res);
      if (res.success && onAttendanceRecorded) {
        onAttendanceRecorded();
      }
    } catch (err: any) {
      setEmergencyResult({
        success: false,
        message: err?.message || 'Unable to record emergency attendance.'
      });
    } finally {
      setIsEmergencySubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-auto">
        {/* Modal Top Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center font-black text-lg">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                Attendance QR Management
              </h2>
              <p className="text-xs text-slate-400">
                Official Universal Mess Wall QR & Owner Emergency Desk
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-100 flex gap-2">
          <button
            onClick={() => setActiveTab('universal')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'universal'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Universal Morya Mess QR (Counter Standee)</span>
          </button>
          <button
            onClick={() => setActiveTab('emergency')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'emergency'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Student Emergency QR (Owner Only)</span>
          </button>
        </div>

        {/* Action Notifications */}
        {actionSuccess && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs font-bold text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Tab 1: Universal Morya Mess QR */}
        {activeTab === 'universal' && (
          <div className="p-6 space-y-5">
            {/* Status Banner */}
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <div>
                  <span className="text-xs font-black text-emerald-950 uppercase tracking-wider block">
                    Active & Authoritative Universal QR
                  </span>
                  <span className="text-[11px] text-emerald-800">
                    Permanently displayed on mess wall/counter for student phone camera scanning
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-bold">
                BRANCH: MORYA-HQ-01
              </span>
            </div>

            {/* Printable Standee View Container */}
            <div 
              id="morya-universal-qr-standee" 
              className="bg-white rounded-2xl border-4 border-slate-900 p-5 shadow-lg flex flex-col items-center text-center relative"
            >
              {/* Indian Tricolour Stripe */}
              <div className="h-1.5 w-full -mt-5 mb-4 flex rounded-t overflow-hidden">
                <div className="h-full w-1/3 bg-[#FF9933]"></div>
                <div className="h-full w-1/3 bg-white"></div>
                <div className="h-full w-1/3 bg-[#138808]"></div>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold text-orange-800 tracking-wider mb-0.5 uppercase">
                <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                <span>Morya Dining Hall Attendance</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                {messName}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mb-3">
                Near Boys & Girls Hostel, College Road, Latur
              </p>

              {/* High-Resolution QR */}
              <div className="p-3 bg-white rounded-2xl border-2 border-slate-900 shadow-xs mb-3">
                {isLoading ? (
                  <div className="w-56 h-56 flex items-center justify-center text-xs text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-orange-600 mb-2" />
                    <span>Loading Standee QR...</span>
                  </div>
                ) : qrDataUrl ? (
                  <img 
                    src={qrDataUrl} 
                    alt="Universal Morya Mess Attendance QR" 
                    className="w-56 h-56 rounded-xl object-contain"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-xs text-slate-400">
                    No active QR found
                  </div>
                )}
              </div>

              {/* Instructions on Standee */}
              <div className="w-full bg-orange-50 border border-orange-200 rounded-xl p-3 text-left space-y-1 mb-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-orange-950">
                  <Clock className="w-3.5 h-3.5 text-orange-600" />
                  <span>Mess Shift Hours:</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-orange-900 font-semibold">
                  <div>☀ Lunch: 11:00 AM – 2:30 PM</div>
                  <div>🌙 Dinner: 7:30 PM – 10:15 PM</div>
                </div>
                <div className="text-[10px] text-rose-700 font-bold">
                  ⚠️ Sunday Dinner Shift is Closed
                </div>
              </div>

              <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Open Morya Mess Student Pass App ➔ Tap "Scan Attendance"</span>
              </div>
              <span className="text-[9px] font-mono text-slate-400 mt-1">
                REF: {universalInfo?.tokenCode || 'MORYA_UNIVERSAL_HQ01_PERMANENT_STANDEE'}
              </span>
            </div>

            {/* Owner Operational Controls */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handlePrintStandee}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Standee Poster</span>
              </button>

              {!confirmReplace ? (
                <button
                  onClick={() => setConfirmReplace(true)}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-slate-600" />
                  <span>Generate / Replace QR</span>
                </button>
              ) : (
                <div className="flex-1 bg-amber-50 border border-amber-300 rounded-xl p-2.5 flex items-center justify-between gap-2">
                  <div className="text-[11px] font-bold text-amber-900">
                    Confirm new QR? Previous wall QR will be revoked.
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={handleGenerateOrReplace}
                      disabled={isLoading}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmReplace(false)}
                      className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={handleRevoke}
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-1.5 py-3 px-3.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer"
                title="Emergency QR Shutoff"
              >
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Revoke</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Student Emergency QR (Owner Desk Only) */}
        {activeTab === 'emergency' && (
          <div className="p-6 space-y-5">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="text-xs font-bold text-amber-900">
                  Emergency Student Pass & Manual Desk Attendance
                </span>
              </div>
              <p className="text-[11px] text-amber-800 mt-1">
                Used exclusively by mess staff when a student experiences phone camera issues or broken screen. Student app does not have this QR.
              </p>
            </div>

            {/* Student Selector */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Select Student Member:
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 bg-white focus:outline-hidden focus:border-orange-500"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id}) — {c.phone} — {c.gender === 'female' ? 'Girls Hostel' : 'Boys'}
                  </option>
                ))}
              </select>
            </div>

            {selectedStudent && (
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="flex flex-col items-center p-3 bg-white rounded-xl border border-slate-200">
                  {emergencyQrUrl ? (
                    <img src={emergencyQrUrl} alt="Emergency QR" className="w-36 h-36 object-contain" />
                  ) : (
                    <div className="w-36 h-36 bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                      Loading...
                    </div>
                  )}
                  <span className="text-[10px] font-mono text-slate-500 mt-1">
                    PASS ID: {selectedStudent.id}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Student Name</span>
                    <span className="font-bold text-slate-900 text-sm">{selectedStudent.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Subscription Validity</span>
                    <span className="font-mono text-slate-800">{selectedStudent.startDate} ➔ {selectedStudent.endDate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Status</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedStudent.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {selectedStudent.status.toUpperCase()}
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                      Desk Check-in Reason:
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Phone battery dead / Camera broken"
                      value={emergencyNotes}
                      onChange={(e) => setEmergencyNotes(e.target.value)}
                      className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-slate-300"
                    />
                  </div>

                  <button
                    onClick={handleMarkEmergencyAttendance}
                    disabled={isEmergencySubmitting}
                    className="w-full py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isEmergencySubmitting ? 'Verifying with Supabase...' : 'Mark Desk Attendance'}</span>
                  </button>
                </div>
              </div>
            )}

            {emergencyResult && (
              <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                emergencyResult.success 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {emergencyResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{emergencyResult.message}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
