import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { Customer, MealLog, MealType, ScanEligibility, ScanAuditResult, BusinessRulesConfig } from '../types/mess';
import { auditCustomerMealScan, getCurrentMealType, evaluateStrictMessShift, MessShiftAudit } from '../lib/storage';
import { 
  Camera, 
  Upload, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Search, 
  Utensils, 
  Calendar,
  AlertCircle,
  FileImage,
  RefreshCw,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Lock,
  Moon,
  Sun,
  Sparkles
} from 'lucide-react';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  mealLogs: MealLog[];
  rules: BusinessRulesConfig;
  onRecordMeal: (customerId: string, scanStatus: ScanEligibility, reason: string, mealType: MealType, overrideReason?: string) => void;
  onOpenPayment?: (c: Customer) => void;
  userRole?: 'owner' | 'manager' | 'staff';
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  customers,
  mealLogs,
  rules,
  onRecordMeal,
  onOpenPayment,
  userRole = 'owner'
}) => {
  const [scanMode, setScanMode] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [shiftAudit, setShiftAudit] = useState<MessShiftAudit>(() => evaluateStrictMessShift());
  const [activeMealType, setActiveMealType] = useState<MealType>(() => evaluateStrictMessShift().mealType);
  const [manualInput, setManualInput] = useState('');
  const [scanResult, setScanResult] = useState<ScanAuditResult | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [overrideNotes, setOverrideNotes] = useState('');
  const [showOverrideInput, setShowOverrideInput] = useState(false);
  const [mealMarkedSuccess, setMealMarkedSuccess] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const systemCameraInputRef = useRef<HTMLInputElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const countdownTimerRef = useRef<any>(null);

  // Automatic live shift update ticker: automatically switches meal type without manual selection!
  useEffect(() => {
    if (!isOpen) return;
    const checkShift = () => {
      const current = evaluateStrictMessShift();
      setShiftAudit(current);
      setActiveMealType(current.mealType);
    };
    checkShift();
    const interval = setInterval(checkShift, 3000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const clearTimer = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
  };

  // Sound feedback
  const playAudioFeedback = (type: ScanEligibility) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'ALLOW') {
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } else if (type === 'BLOCK') {
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        osc.frequency.setValueAtTime(180, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      } else {
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      }
    } catch {
      // Ignore if AudioContext is blocked
    }
  };

  useEffect(() => {
    if (isOpen) {
      clearTimer();
      setActiveMealType(getCurrentMealType());
      setScanResult(null);
      setManualInput('');
      setCameraError(null);
      setFileError(null);
      setMealMarkedSuccess(false);
      setShowOverrideInput(false);
      setOverrideNotes('');

      if (scanMode === 'camera') {
        startCamera();
      }
    } else {
      clearTimer();
      stopCamera();
    }
    return () => {
      clearTimer();
      stopCamera();
    };
  }, [isOpen, scanMode]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera not available in this browser. Please use "Upload QR from Gallery" or "Manual Search".');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play();
        setIsCameraActive(true);
        animationFrameId.current = requestAnimationFrame(scanVideoFrame);
      }
    } catch (err) {
      console.warn('Camera access error:', err);
      setCameraError('Camera access denied or unavailable. Use "Upload QR from Gallery" or manual ID entry.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const scanVideoFrame = () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animationFrameId.current = requestAnimationFrame(scanVideoFrame);
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert'
    });

    if (code && code.data) {
      handleCodeDetected(code.data);
      return; // Stop scanning after hit
    }

    animationFrameId.current = requestAnimationFrame(scanVideoFrame);
  };

  const handleCodeDetected = (rawPayload: string) => {
    stopCamera();
    clearTimer();
    const result = auditCustomerMealScan(rawPayload, activeMealType, customers, mealLogs, rules);
    setScanResult(result);

    if (result.eligibility === 'ALLOW') {
      // AUTOMATIC ATTENDANCE MARKING: Mark attendance immediately without requiring any confirm button!
      onRecordMeal(result.customer!.id, 'ALLOW', result.reason, activeMealType);
      setMealMarkedSuccess(true);
      playAudioFeedback('ALLOW');
      
      // Auto-resume camera for the next student in 2s
      setCountdown(2);
      let t = 2;
      countdownTimerRef.current = setInterval(() => {
        t -= 1;
        if (t <= 0) {
          clearTimer();
          handleResetForNext();
        } else {
          setCountdown(t);
        }
      }, 1000);
    } else if (result.eligibility === 'REVIEW_REQUIRED') {
      // Mark attendance automatically with audit advisory note
      onRecordMeal(result.customer!.id, 'REVIEW_REQUIRED', result.reason, activeMealType);
      setMealMarkedSuccess(true);
      playAudioFeedback('REVIEW_REQUIRED');

      setCountdown(3);
      let t = 3;
      countdownTimerRef.current = setInterval(() => {
        t -= 1;
        if (t <= 0) {
          clearTimer();
          handleResetForNext();
        } else {
          setCountdown(t);
        }
      }, 1000);
    } else {
      // BLOCK: e.g. already logged this meal today, or expired subscription
      playAudioFeedback('BLOCK');
      setMealMarkedSuccess(false);
    }
  };

  // Upload QR from Gallery / Attach Image File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);
    setIsProcessingFile(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            setFileError('Could not process image on this device.');
            setIsProcessingFile(false);
            return;
          }
          ctx.drawImage(img, 0, 0, img.width, img.height);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);

          if (code && code.data) {
            handleCodeDetected(code.data);
          } else {
            setFileError('No QR code detected in the uploaded image. Please make sure the photo is clear, focused, and well-lit.');
          }
        } catch (err) {
          console.error('File scan error:', err);
          setFileError('Failed to read QR image. Please try another photo or enter Member ID.');
        } finally {
          setIsProcessingFile(false);
        }
      };
      img.onerror = () => {
        setFileError('Invalid image file format.');
        setIsProcessingFile(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleCodeDetected(manualInput.trim());
  };

  const handleConfirmMeal = () => {
    if (!scanResult?.customer) return;
    onRecordMeal(scanResult.customer.id, scanResult.eligibility, scanResult.reason, activeMealType);
    setMealMarkedSuccess(true);
    playAudioFeedback('ALLOW');
  };

  const handleOverrideMeal = () => {
    if (!scanResult?.customer) return;
    if (!overrideNotes.trim()) {
      alert('Please enter a valid override justification reason.');
      return;
    }
    onRecordMeal(scanResult.customer.id, 'ALLOW', `Authorized Manual Override: ${overrideNotes.trim()}`, activeMealType, overrideNotes.trim());
    setMealMarkedSuccess(true);
    setShowOverrideInput(false);
    playAudioFeedback('ALLOW');
  };

  const handleResetForNext = () => {
    clearTimer();
    setScanResult(null);
    setMealMarkedSuccess(false);
    setShowOverrideInput(false);
    setOverrideNotes('');
    setManualInput('');
    setFileError(null);
    if (scanMode === 'camera') {
      startCamera();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">QR Dining Pass Verification</h2>
              <p className="text-[11px] text-slate-500">Morya Mess Gate Scanner & Audit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Meal Shift Selector & Automatic Switch Status */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-orange-600" />
              <span className="font-bold text-slate-800">
                Shift: <span className="capitalize text-orange-700">{activeMealType}</span>
              </span>
              <span className="text-[10px] bg-orange-100 text-orange-800 font-extrabold px-1.5 py-0.5 rounded">
                ⚡ Auto-Switched by Clock
              </span>
            </div>
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
              {(['breakfast', 'lunch', 'dinner'] as MealType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveMealType(type)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold capitalize transition-all cursor-pointer ${
                    activeMealType === type
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Strict Timing Status Alert */}
          {shiftAudit.isSundayNightClosed ? (
            <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-rose-600" />
                Sunday Dinner Closed (Mess is closed on Sunday evening)
              </span>
              <span className="text-[10px] text-rose-600 font-mono">GATE LOCKED</span>
            </div>
          ) : !shiftAudit.isShiftActive ? (
            <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>{shiftAudit.reason || 'Outside strict mess timings'}</span>
              </span>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                {shiftAudit.shiftTimingLabel}
              </span>
            </div>
          ) : (
            <div className="p-1.5 px-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Gate Open: {shiftAudit.shiftTitle.toUpperCase()} in progress</span>
              </span>
              <span className="text-[10px] text-emerald-700 font-bold">
                {activeMealType === 'lunch' ? '10:30 AM – 2:30 PM' : '8:30 PM – 10:30 PM'}
              </span>
            </div>
          )}
        </div>

        {/* Automatic Attendance Indicator */}
        <div className="px-5 py-2 bg-orange-50/70 border-b border-orange-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-orange-950 font-bold">
            <Zap className="w-3.5 h-3.5 text-orange-600 fill-orange-600" />
            <span>Automatic Attendance Active</span>
          </div>
          <span className="text-[11px] text-orange-700 font-medium">
            Instant Digital Pass Verification
          </span>
        </div>

        {/* Scan Mode Tabs (Camera vs Snap vs Upload Gallery vs Manual) */}
        {!scanResult && (
          <div className="px-3 sm:px-5 pt-3 flex border-b border-slate-100 bg-white text-xs font-semibold text-slate-500 gap-1 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setScanMode('camera')}
              className={`flex-1 pb-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                scanMode === 'camera'
                  ? 'text-orange-600 border-orange-600 font-bold'
                  : 'border-transparent hover:text-slate-800'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Live Cam</span>
            </button>
            <button
              onClick={() => {
                systemCameraInputRef.current?.click();
              }}
              className="flex-1 pb-2.5 flex items-center justify-center gap-1.5 border-b-2 border-transparent text-orange-600 font-bold transition-all cursor-pointer hover:text-orange-700 whitespace-nowrap"
              title="Opens phone native camera - 100% works in APK"
            >
              <Sparkles className="w-4 h-4 text-orange-500" />
              <span>Snap Photo</span>
            </button>
            <button
              onClick={() => {
                stopCamera();
                setScanMode('upload');
              }}
              className={`flex-1 pb-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                scanMode === 'upload'
                  ? 'text-orange-600 border-orange-600 font-bold'
                  : 'border-transparent hover:text-slate-800'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Gallery</span>
            </button>
            <button
              onClick={() => {
                stopCamera();
                setScanMode('manual');
              }}
              className={`flex-1 pb-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                scanMode === 'manual'
                  ? 'text-orange-600 border-orange-600 font-bold'
                  : 'border-transparent hover:text-slate-800'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Manual ID</span>
            </button>
          </div>
        )}

        {/* Hidden System Camera Input */}
        <input
          ref={systemCameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* 1. If result exists, show verification screen */}
          {scanResult ? (
            <div className="space-y-4">
              {/* Automatic Attendance Success Notification */}
              {mealMarkedSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-600 text-white shadow-md text-center space-y-2 animate-in fade-in">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-[11px] font-extrabold uppercase tracking-wide">
                      <Zap className="w-3.5 h-3.5 fill-white" />
                      <span>Meal Attendance Verified & Recorded</span>
                    </div>
                    <h3 className="font-extrabold text-base tracking-tight mt-2">
                      {scanResult.customer?.name}
                    </h3>
                    <p className="text-xs text-emerald-100 font-medium mt-0.5">
                      {scanResult.customer?.id} • {activeMealType.toUpperCase()} MEAL RECORDED
                    </p>
                  </div>
                  {countdown !== null && (
                    <div className="pt-1">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/20 text-[11px] font-semibold text-emerald-50">
                        <span>Ready for next member in {countdown}s...</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Access Blocked Banner */}
              {!mealMarkedSuccess && scanResult.eligibility === 'BLOCK' && (
                <div className="p-4 rounded-2xl bg-rose-600 text-white shadow-md text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mx-auto">
                    <ShieldAlert className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 text-[11px] font-extrabold uppercase tracking-wide">
                      <span>ACCESS BLOCKED</span>
                    </div>
                    <h3 className="font-extrabold text-base tracking-tight mt-2">
                      {scanResult.customer?.name || 'Invalid Pass'}
                    </h3>
                    <p className="text-xs text-rose-100 font-bold mt-1.5 leading-relaxed">
                      {scanResult.reason}
                    </p>
                  </div>
                </div>
              )}

              {/* Customer Profile Card */}
              {scanResult.customer && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{scanResult.customer.name}</h3>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {scanResult.customer.id} • {scanResult.customer.gender === 'female' ? '👧 Hostel Girl' : '👦 Boy'}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 font-bold capitalize">
                      {scanResult.customer.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Subscription Expiry:</span>
                      <span className="font-bold text-slate-800">{scanResult.customer.endDate}</span>
                      <span className="text-[10px] text-slate-500 block">
                        ({scanResult.daysRemaining < 0
                          ? `${Math.abs(scanResult.daysRemaining)} days ago`
                          : `${scanResult.daysRemaining} days left`})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Fee Balance / Dues:</span>
                      <span
                        className={`font-bold ${
                          scanResult.customer.balance > 0 ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        {scanResult.customer.balance > 0 ? `₹${scanResult.customer.balance} Due` : 'Fully Paid'}
                      </span>
                      {scanResult.unpaidPenalty > 0 && (
                        <span className="text-[10px] text-amber-600 block font-semibold">
                          + ₹{scanResult.unpaidPenalty} Card Penalty
                        </span>
                      )}
                    </div>
                  </div>

                  {scanResult.customer.hostelOrAddress && (
                    <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600">
                      <span className="text-slate-500">Hostel:</span> {scanResult.customer.hostelOrAddress}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                {scanResult.eligibility === 'BLOCK' && (userRole === 'owner' || userRole === 'manager') && (
                  <div className="space-y-2">
                    {!showOverrideInput ? (
                      <button
                        onClick={() => setShowOverrideInput(true)}
                        className="w-full py-2.5 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition-all cursor-pointer shadow-xs"
                      >
                        Authorized Manager Override (Mark Meal Manually)
                      </button>
                    ) : (
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2 text-xs">
                        <label className="font-semibold text-amber-900 block">
                          Override Justification Reason (Required for Audit):
                        </label>
                        <input
                          type="text"
                          value={overrideNotes}
                          onChange={(e) => setOverrideNotes(e.target.value)}
                          placeholder="e.g. Student paid cash on spot / Promised renewal tomorrow"
                          className="w-full px-3 py-2 rounded-lg bg-white border border-amber-300 text-slate-800 text-xs focus:outline-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleOverrideMeal}
                            className="flex-1 py-2 rounded-lg bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 cursor-pointer"
                          >
                            Confirm Override & Mark Meal
                          </button>
                          <button
                            onClick={() => setShowOverrideInput(false)}
                            className="px-3 py-2 rounded-lg bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleResetForNext}
                    className="flex-1 py-3 rounded-xl bg-orange-600 text-white font-bold text-xs hover:bg-orange-700 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Scan Next Pass</span>
                  </button>
                  {scanResult.customer && onOpenPayment && (
                    <button
                      onClick={() => {
                        clearTimer();
                        onClose();
                        onOpenPayment(scanResult.customer!);
                      }}
                      className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Collect Dues
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* 2. Camera Mode */}
              {scanMode === 'camera' && (
                <div className="space-y-3">
                  <div className="relative aspect-4/3 w-full bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center shadow-inner">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* QR Target Overlay Box */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-56 h-56 border-2 border-orange-400/90 rounded-2xl relative shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]">
                        <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-orange-400 -mt-1 -ml-1 rounded-tl-lg" />
                        <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-orange-400 -mt-1 -mr-1 rounded-tr-lg" />
                        <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-orange-400 -mb-1 -ml-1 rounded-bl-lg" />
                        <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-orange-400 -mb-1 -mr-1 rounded-br-lg" />
                        <div className="absolute inset-x-0 top-1/2 h-0.5 bg-orange-400/70 shadow-[0_0_8px_#f97316] animate-pulse" />
                      </div>
                    </div>

                    {cameraError && (
                      <div className="absolute inset-0 bg-slate-950/95 p-5 flex flex-col items-center justify-center text-center text-white space-y-2 z-20">
                        <AlertCircle className="w-8 h-8 text-amber-400" />
                        <p className="text-xs font-semibold max-w-xs">{cameraError}</p>
                        <div className="flex flex-col gap-2 pt-2 w-full max-w-xs">
                          <button
                            onClick={() => systemCameraInputRef.current?.click()}
                            className="w-full py-2.5 px-3 rounded-xl bg-orange-600 text-white text-xs font-black hover:bg-orange-700 shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Camera className="w-4 h-4" />
                            <span>📸 Open Phone Camera (100% Works)</span>
                          </button>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setScanMode('upload')}
                              className="flex-1 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-bold hover:bg-slate-700 cursor-pointer"
                            >
                              Upload Gallery
                            </button>
                            <button
                              onClick={() => setScanMode('manual')}
                              className="flex-1 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-bold hover:bg-slate-700 cursor-pointer"
                            >
                              Manual Search
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-center text-[11px] text-slate-500">
                    Align student digital pass QR code inside the box for instant verification.
                  </p>
                </div>
              )}

              {/* 3. Upload QR from Gallery / File Mode */}
              {scanMode === 'upload' && (
                <div className="space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-orange-200 hover:border-orange-400 bg-orange-50/40 rounded-2xl p-8 text-center cursor-pointer transition-all space-y-3"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="w-14 h-14 rounded-2xl bg-white border border-orange-200 text-orange-600 flex items-center justify-center mx-auto shadow-xs">
                      <FileImage className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {isProcessingFile ? 'Analyzing QR Code...' : 'Tap to Upload QR from Gallery or Files'}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Supports screenshot, photo from WhatsApp, PNG, JPG, JPEG
                      </p>
                    </div>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold shadow-xs hover:bg-orange-700 transition-colors pointer-events-none"
                    >
                      Choose Image File
                    </button>
                  </div>

                  {fileError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{fileError}</span>
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                    💡 <strong>Tip for Mess Staff:</strong> If a student sends their card on WhatsApp or has a saved photo, tap above to pick it from your phone gallery.
                  </div>
                </div>
              )}

              {/* 4. Manual Search Mode */}
              {scanMode === 'manual' && (
                <div className="space-y-4">
                  <form onSubmit={handleManualSearch} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Search Member ID, Name or Mobile
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={manualInput}
                          onChange={(e) => setManualInput(e.target.value)}
                          placeholder="e.g. MM-2026-001 or 9822100001"
                          className="w-full px-3.5 py-2.5 pl-9 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-orange-600"
                        />
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-orange-600 text-white font-bold text-xs hover:bg-orange-700 transition-colors cursor-pointer"
                    >
                      Verify Member Pass
                    </button>
                  </form>

                  {/* Quick Select from Registered Customers */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      Quick Select ({customers.length} Members)
                    </span>
                    {customers.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3 text-center">
                        No registered members in database yet. Add members in the Customers tab.
                      </p>
                    ) : (
                      <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 text-xs">
                        {customers.slice(0, 8).map((c) => (
                          <div
                            key={c.id}
                            onClick={() => handleCodeDetected(c.id)}
                            className="py-2 px-2 hover:bg-slate-50 rounded-lg flex items-center justify-between cursor-pointer"
                          >
                            <div>
                              <span className="font-bold text-slate-800">{c.name}</span>
                              <span className="text-[11px] text-slate-500 ml-2 font-mono">({c.id})</span>
                            </div>
                            <span className="text-[10px] font-semibold text-orange-600">Select ➔</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
