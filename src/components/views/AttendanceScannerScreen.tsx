import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { Customer, MealLog, BusinessRulesConfig, UserRole, MealType, ScanEligibility } from '../../types/mess';
import { evaluateStrictMessShift, auditCustomerMealScan } from '../../lib/storage';
import { 
  QrCode, 
  ArrowLeft, 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ShieldCheck, 
  Clock, 
  Sparkles,
  RefreshCw,
  Volume2,
  VolumeX,
  Smartphone
} from 'lucide-react';

interface AttendanceScannerScreenProps {
  customers: Customer[];
  mealLogs: MealLog[];
  rules: BusinessRulesConfig;
  userRole: UserRole;
  onBack: () => void;
  onRecordMeal: (customerId: string, manualShift?: MealType) => { success: boolean; message: string };
  onOpenPayment?: (customer: Customer) => void;
}

export const AttendanceScannerScreen: React.FC<AttendanceScannerScreenProps> = ({
  customers,
  mealLogs,
  rules,
  userRole,
  onBack,
  onRecordMeal,
  onOpenPayment
}) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{
    customer?: Customer;
    status: 'success' | 'warning' | 'error';
    title: string;
    message: string;
  } | null>(null);
  const [recentScans, setRecentScans] = useState<{ name: string; time: string; status: string }[]>([]);
  const [manualCode, setManualCode] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  const shiftAudit = evaluateStrictMessShift();

  const playSound = (type: 'success' | 'error') => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (type === 'success') {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else {
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(180, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch {
      // Audio blocked or unsupported
    }
  };

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play();
        setCameraActive(true);
        scanFrame();
      }
    } catch (err: any) {
      setCameraError('Camera access not granted or not available. Use manual code input below.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const scanFrame = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.height = videoRef.current.videoHeight;
          canvas.width = videoRef.current.videoWidth;
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
          });

          if (code && code.data) {
            handleProcessScannedData(code.data);
            return;
          }
        }
      }
    }
    animationFrameRef.current = requestAnimationFrame(scanFrame);
  };

  const handleProcessScannedData = (rawText: string) => {
    const trimmed = rawText.trim();
    const currentShift = shiftAudit.mealType || 'lunch';

    // Authoritative Audit & Strict Shift Integrity Check
    const auditRes = auditCustomerMealScan(trimmed, currentShift, customers, mealLogs, rules);

    if (auditRes.eligibility === 'BLOCK') {
      if (soundEnabled) playSound('error');
      setScanResult({
        customer: auditRes.customer,
        status: 'error',
        title: 'Access Restricted',
        message: auditRes.reason
      });
      return;
    }

    const matched = auditRes.customer;
    if (!matched) {
      if (soundEnabled) playSound('error');
      setScanResult({
        status: 'error',
        title: 'Unrecognized QR Code',
        message: auditRes.reason || `No active member found with token: "${trimmed}". Please register student.`
      });
      return;
    }

    // Record meal attendance
    const res = onRecordMeal(matched.id, currentShift);
    if (res.success) {
      if (soundEnabled) playSound('success');
      setScanResult({
        customer: matched,
        status: 'success',
        title: 'Gate Access Granted',
        message: `${matched.name} verified successfully for ${currentShift.toUpperCase()}!`
      });
      setRecentScans(prev => [
        { name: matched.name, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), status: 'Verified' },
        ...prev.slice(0, 9)
      ]);
    } else {
      if (soundEnabled) playSound('error');
      setScanResult({
        customer: matched,
        status: 'error',
        title: 'Access Restricted',
        message: res.message
      });
    }

    // Cooldown before next auto-scan
    setTimeout(() => {
      if (cameraActive) {
        scanFrame();
      }
    }, 2500);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleProcessScannedData(manualCode.trim());
    setManualCode('');
  };

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
              <QrCode className="w-5 h-5 text-orange-600" />
              <span>Gate Attendance Scanner Screen</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Live camera & counter verification console with instant eligibility detection
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{shiftAudit.shiftTitle} ({shiftAudit.shiftTimingLabel})</span>
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title={soundEnabled ? 'Mute' : 'Enable Sound'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Grid: Scanner Viewport + Audit Card + Recent Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Camera & Standee Scan */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl border border-slate-800">
            <div className="max-w-md mx-auto space-y-4">
              {/* Camera Window */}
              <div className="relative aspect-4/3 rounded-2xl bg-black overflow-hidden border-2 border-orange-500/40 shadow-inner flex items-center justify-center">
                <video
                  ref={videoRef}
                  className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                />
                <canvas ref={canvasRef} className="hidden" />

                {!cameraActive && (
                  <div className="p-6 text-center space-y-2">
                    <Camera className="w-12 h-12 text-slate-600 mx-auto animate-pulse" />
                    <p className="text-xs text-slate-400">
                      {cameraError || 'Camera initializing...'}
                    </p>
                    <button
                      onClick={startCamera}
                      className="px-4 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
                    >
                      Retry Camera
                    </button>
                  </div>
                )}

                {/* Viewfinder Target Lines */}
                {cameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-orange-500/80 rounded-2xl relative shadow-2xl animate-pulse">
                      <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-orange-400"></div>
                      <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-orange-400"></div>
                      <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-orange-400"></div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-orange-400"></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Manual input fallback */}
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter Student ID / Mobile Number manually..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition cursor-pointer shadow-md"
                >
                  Verify
                </button>
              </form>
            </div>
          </div>

          {/* Real-time Scan Result Banner & Smart Overdue Gate Alert */}
          {scanResult && (
            <div className="space-y-3">
              <div className={`p-5 rounded-2xl border shadow-sm flex items-start gap-4 animate-in fade-in zoom-in duration-200 ${
                scanResult.status === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : scanResult.status === 'warning'
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : 'bg-rose-50 border-rose-300 text-rose-950'
              }`}>
                <div className="p-2 rounded-xl bg-white shadow-xs shrink-0">
                  {scanResult.status === 'success' ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  ) : scanResult.status === 'warning' ? (
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                  ) : (
                    <XCircle className="w-6 h-6 text-rose-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <h4 className="font-black text-sm">{scanResult.title}</h4>
                  <p className="text-xs font-medium opacity-90">{scanResult.message}</p>
                  {scanResult.customer && (
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs pt-1">
                      <span className="font-bold">Plan: {scanResult.customer.planType}</span>
                      <span>•</span>
                      <span className="font-bold">Valid Until: {scanResult.customer.endDate}</span>
                      {scanResult.customer.balance > 0 && (
                        <span className="text-rose-700 font-black px-2 py-0.5 rounded-md bg-rose-100/80">
                          Due: ₹{scanResult.customer.balance}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* High-Impact Overdue Action Card at Gate */}
              {scanResult.customer && scanResult.customer.balance > 0 && (
                <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-bounce-short">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black shrink-0">
                      ₹
                    </div>
                    <div>
                      <div className="text-xs font-black text-rose-900 flex items-center gap-1.5">
                        <span>🚨 PENDING DUES ALERT: ₹{scanResult.customer.balance}</span>
                        <span className="text-[10px] bg-rose-200 text-rose-800 px-2 py-0.5 rounded font-bold">Collect at Gate</span>
                      </div>
                      <p className="text-[11px] text-rose-700">
                        Ask student for fee payment or send instant WhatsApp UPI pay link
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        const cust = scanResult.customer!;
                        const upiId = rules.upiId || 'moryamess@upi';
                        const messName = rules.messName || 'Morya Mess';
                        const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(messName)}&am=${cust.balance}&cu=INR`;
                        const text = `🙏 Namaskar *${cust.name}* ji,\n\nAapki *${messName}* ki monthly mess fees *₹${cust.balance}* pending hai.\n\n⚡ *Niche diye UPI link se turant pay karein:*\n👉 ${upiUrl}\n\n*Mess UPI ID:* \`${upiId}\`\n\nDhanyawad!\n_${messName} Management_`;
                        const cleanPhone = cust.phone ? cust.phone.replace(/[^0-9]/g, '') : '';
                        const waUrl = cleanPhone 
                          ? `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(text)}`
                          : `https://wa.me/?text=${encodeURIComponent(text)}`;
                        window.open(waUrl, '_blank');
                      }}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>WhatsApp UPI Pay Link</span>
                    </button>

                    {onOpenPayment && (
                      <button
                        onClick={() => onOpenPayment(scanResult.customer!)}
                        className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                      >
                        Collect Cash / Settle
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Col: Recent Scans Live Queue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-orange-600" />
              <span>Recent Gate Scans</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">Live Queue</span>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto">
            {recentScans.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Awaiting scans. Present student QR card to camera.
              </div>
            ) : (
              recentScans.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-black text-slate-900">{item.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{item.time}</div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {item.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
