import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import confetti from 'canvas-confetti';
import { Customer, MealLog, MessShiftAudit, SupabasePaymentRecord } from '../types/mess';
import { calculateDaysRemaining, getTodayString, getStandardFee, evaluateStrictMessShift } from '../lib/storage';
import { validateAndRecordStudentAttendance } from '../lib/supabaseSync';
import { fetchMessUpiConfig, recordNewPaymentInSupabase, fetchPaymentsFromSupabase, MessUpiConfig } from '../lib/ownerFeaturesApi';
import { 
  QrCode, 
  Calendar, 
  Clock, 
  Utensils, 
  ShieldCheck, 
  AlertCircle, 
  Download, 
  Phone, 
  MapPin, 
  LogOut, 
  Send, 
  CheckCircle2, 
  Sparkles, 
  ChevronRight, 
  HelpCircle, 
  CreditCard, 
  Building, 
  Coffee, 
  Sun, 
  Moon, 
  Info,
  Camera,
  Upload,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Zap,
  Check,
  Copy
} from 'lucide-react';

interface StudentPortalViewProps {
  customer: Customer;
  allCustomers: Customer[];
  mealLogs: MealLog[];
  onSwitchCustomer: (c: Customer) => void;
  onExitPortal: () => void;
  onRequestLeave: (customerId: string, startDate: string, endDate: string, reason: string) => void;
  onMealLogged?: (newLog: MealLog) => void;
  messName?: string;
  messSubtitle?: string;
}

export const StudentPortalView: React.FC<StudentPortalViewProps> = ({
  customer,
  allCustomers,
  mealLogs,
  onSwitchCustomer,
  onExitPortal,
  onRequestLeave,
  onMealLogged,
  messName = 'MORYA MESS',
  messSubtitle = 'Student Digital Dining Pass & Self-Service Portal'
}) => {
  const today = getTodayString();
  const daysRemaining = calculateDaysRemaining(customer.endDate);
  const isExpired = daysRemaining < 0;
  const isExpiringSoon = daysRemaining >= 0 && daysRemaining <= 3;
  const standardFee = getStandardFee(customer.gender, customer.planType);

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [shiftAudit, setShiftAudit] = useState<MessShiftAudit>(() => evaluateStrictMessShift());

  // Leave Form State
  const [leaveStart, setLeaveStart] = useState(today);
  const [leaveEnd, setLeaveEnd] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [leaveReason, setLeaveReason] = useState('Going to Hometown / Exam Vacation');
  const [leaveSubmitted, setLeaveSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<'scan_counter' | 'pass' | 'leave' | 'meals' | 'shift_timing' | 'pay_fee'>('scan_counter');

  // Student UPI Payment State
  const [upiConfig, setUpiConfig] = useState<MessUpiConfig>({
    upiId: 'moryamess@upi',
    upiPayeeName: 'Morya Mess Latur',
    upiQrCodeImage: ''
  });
  const [generatedUpiQrUrl, setGeneratedUpiQrUrl] = useState('');
  const [payAmount, setPayAmount] = useState(customer.balance > 0 ? String(customer.balance) : '2500');
  const [payUtr, setPayUtr] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState<string | null>(null);
  const [paymentErrorMessage, setPaymentErrorMessage] = useState<string | null>(null);
  const [studentPayments, setStudentPayments] = useState<SupabasePaymentRecord[]>([]);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Universal Counter Standee Scanner State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    mealShift?: string;
    time?: string;
    date?: string;
  } | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [scanInputMode, setScanInputMode] = useState<'camera' | 'upload' | 'manual'>('camera');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const systemCameraInputRef = useRef<HTMLInputElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Sound feedback
  const playAudioFeedback = (type: 'ALLOW' | 'BLOCK') => {
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
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        osc.frequency.setValueAtTime(164.81, audioCtx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      }
    } catch {
      // Audio context may be silenced
    }
  };

  const stopCameraStream = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const startCameraStream = async () => {
    stopCameraStream();
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Live camera is not enabled by this APK. Use the "Take Photo to Scan" button below!');
      }
      
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('muted', 'true');
        await videoRef.current.play();
        setIsCameraActive(true);
        animationFrameId.current = requestAnimationFrame(scanVideoFrame);

        // Check if camera stream is active or returning black frames (common in some Android WebViews)
        setTimeout(() => {
          if (videoRef.current && (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0)) {
            setCameraError('Camera preview is black because this APK restricted camera permissions. Tap "Open Phone Camera" below to scan instantly!');
          }
        }, 1500);
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError(err?.message || 'Camera permission not granted in this APK. Tap "Open Phone Camera" below!');
      setIsCameraActive(false);
    }
  };

  const scanVideoFrame = () => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animationFrameId.current = requestAnimationFrame(scanVideoFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      });

      if (code && code.data) {
        handleProcessScannedCode(code.data);
        return;
      }
    }

    animationFrameId.current = requestAnimationFrame(scanVideoFrame);
  };

  const handleProcessScannedCode = async (rawCode: string) => {
    if (isVerifying) return;
    stopCameraStream();
    setIsVerifying(true);
    setScanResult(null);

    try {
      const trimmed = rawCode.trim();
      const res = await validateAndRecordStudentAttendance({
        qrCodeText: trimmed,
        messId: '63b00e12-a702-492f-bd56-1e260338699f',
        customerId: customer.id,
        customerData: customer,
        deviceInfo: `${customer.name} - Student Camera`
      });

      if (res.success) {
        playAudioFeedback('ALLOW');
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 }
        });
        setScanResult({
          success: true,
          message: res.message || 'Attendance Marked Successfully',
          mealShift: res.mealShift,
          time: res.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          date: res.date || today
        });

        // Add to local meals list
        const newLog: MealLog = {
          id: `meal-${Date.now()}`,
          customerId: customer.id,
          customerName: customer.name,
          date: res.date || today,
          mealType: res.mealShift === 'dinner' ? 'dinner' : 'lunch',
          scanStatus: 'ALLOW',
          reason: 'Verified Standee QR Attendance',
          timestamp: new Date().toISOString()
        };
        onMealLogged?.(newLog);
      } else {
        playAudioFeedback('BLOCK');
        setScanResult({
          success: false,
          message: res.message || 'Attendance Rejected by Mess Rules.'
        });
      }
    } catch (err: any) {
      playAudioFeedback('BLOCK');
      setScanResult({
        success: false,
        message: err?.message || 'Server error during attendance marking.'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Start camera when on scan_counter tab
  useEffect(() => {
    if (activeTab === 'scan_counter' && scanInputMode === 'camera' && !scanResult) {
      startCameraStream();
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [activeTab, scanInputMode, scanResult]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            handleProcessScannedCode(code.data);
          } else {
            alert('No valid QR code found in this image. Please upload a clear photo of the Mess Counter Standee.');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Real-time Shift Ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setShiftAudit(evaluateStrictMessShift());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch mess official UPI config & generate QR
  useEffect(() => {
    fetchMessUpiConfig().then(cfg => {
      setUpiConfig(cfg);
      if (cfg.upiId) {
        const upiUrl = `upi://pay?pa=${encodeURIComponent(cfg.upiId)}&pn=${encodeURIComponent(cfg.upiPayeeName)}&cu=INR`;
        QRCode.toDataURL(upiUrl, {
          width: 300,
          margin: 2,
          color: { dark: '#0F172A', light: '#FFFFFF' }
        }).then(url => setGeneratedUpiQrUrl(url)).catch(() => {});
      }
    });
  }, []);

  // Load student's submitted payment requests and listen for owner verifications
  const loadStudentPayments = useCallback(async () => {
    try {
      const all = await fetchPaymentsFromSupabase();
      const mine = all.filter(p => p.customerId === customer.id || (customer.phone && p.customerPhone === customer.phone));
      setStudentPayments(mine);
    } catch (e) {
      console.warn('Failed to load student payments:', e);
    }
  }, [customer.id, customer.phone]);

  useEffect(() => {
    loadStudentPayments();
    const handleUpdate = () => loadStudentPayments();
    window.addEventListener('morya_payment_updated', handleUpdate);
    window.addEventListener('morya_payment_created', handleUpdate);
    return () => {
      window.removeEventListener('morya_payment_updated', handleUpdate);
      window.removeEventListener('morya_payment_created', handleUpdate);
    };
  }, [loadStudentPayments]);

  const handleRecordStudentPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payAmount || Number(payAmount) <= 0) return;

    setIsSubmittingPayment(true);
    setPaymentSuccessMessage(null);
    setPaymentErrorMessage(null);

    const res = await recordNewPaymentInSupabase({
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      amount: Number(payAmount),
      paymentMode: 'upi',
      transactionReference: payUtr.trim() || undefined,
      notes: payNotes.trim() ? `Student App: ${payNotes.trim()}` : 'Payment recorded via Student Portal Pass',
      status: 'pending' // Student payments await owner verification
    });

    if (res.success) {
      setPaymentSuccessMessage(`Payment of ₹${payAmount} submitted successfully! Reference (UTR: ${payUtr || 'Recorded'}) sent. Status is PENDING verification by Mess Owner.`);
      setPayUtr('');
      setPayNotes('');
      await loadStudentPayments();
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 }
      });
    } else {
      setPaymentErrorMessage(res.error || 'Failed to submit payment verification request. Please check connection and try again.');
    }
    setIsSubmittingPayment(false);
  };

  // Generate Pass QR Code
  useEffect(() => {
    if (!customer) return;
    const payload = JSON.stringify({
      cid: customer.id,
      token: customer.qrToken || 'TOKEN',
      v: customer.qrVersion || 1
    });

    QRCode.toDataURL(payload, {
      width: 320,
      margin: 1,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF'
      }
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('Student QR generation error:', err));
  }, [customer]);

  // Customer meal logs
  const customerMeals = mealLogs
    .filter(m => m.customerId === customer.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveStart || !leaveEnd) return;
    onRequestLeave(customer.id, leaveStart, leaveEnd, leaveReason);
    setLeaveSubmitted(true);
    setTimeout(() => {
      setLeaveSubmitted(false);
      setActiveTab('pass');
    }, 1500);
  };

  const handleDownloadPass = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `MoryaMess_Pass_${customer.name.replace(/\s+/g, '_')}_${customer.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-100 flex flex-col items-center p-2 sm:p-5 select-none">
      {/* Top Header Card */}
      <header className="w-full max-w-full sm:max-w-xl bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm p-3.5 sm:p-5 mb-3 sm:mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-orange-600 text-white flex items-center justify-center font-black text-lg sm:text-xl shadow-xs shrink-0">
            M
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="font-extrabold text-slate-900 text-sm sm:text-lg tracking-tight">
                {messName}
              </h1>
              <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                STUDENT PASS
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
              Near Boys & Girls Hostel, College Road, Latur
            </p>
          </div>
        </div>

        <button
          onClick={onExitPortal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-slate-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 text-slate-700 text-xs font-bold transition-colors cursor-pointer shadow-xs shrink-0"
          title="Sign out of Student Pass"
        >
          <LogOut className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Log Out</span>
        </button>
      </header>

      {/* Student Profile Identity Tag */}
      <div className="w-full max-w-full sm:max-w-xl mb-3 sm:mb-4 bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 flex items-center justify-between text-xs shadow-xs">
        <div className="flex items-center gap-1.5 truncate">
          <span className="text-slate-500 font-semibold text-[11px] sm:text-xs">Active Pass:</span>
          <span className="font-bold text-slate-900 truncate text-[11px] sm:text-xs">{customer.name}</span>
        </div>
        <span className="px-2 py-0.5 rounded-lg bg-orange-50 border border-orange-200 text-[10px] sm:text-xs font-mono font-bold text-orange-800 shrink-0">
          ID: {customer.id}
        </span>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="w-full max-w-full sm:max-w-xl bg-white rounded-2xl border border-slate-200 p-1 mb-4 flex items-center justify-between text-xs font-bold text-slate-600 shadow-xs overflow-x-auto gap-1 no-scrollbar">
        <button
          onClick={() => {
            setScanResult(null);
            setActiveTab('scan_counter');
          }}
          className={`flex-1 py-2 px-1.5 sm:px-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap text-[11px] sm:text-xs ${
            activeTab === 'scan_counter'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'hover:text-slate-900 hover:bg-slate-50 text-orange-700 font-extrabold bg-orange-50/60'
          }`}
        >
          <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500 animate-pulse" />
          <span>Scan Gate QR</span>
        </button>
        <button
          onClick={() => setActiveTab('pass')}
          className={`flex-1 py-2 px-1.5 sm:px-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap text-[11px] sm:text-xs ${
            activeTab === 'pass'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Digital Pass</span>
        </button>
        <button
          onClick={() => setActiveTab('leave')}
          className={`flex-1 py-2 px-1.5 sm:px-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap text-[11px] sm:text-xs ${
            activeTab === 'leave'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Leave</span>
        </button>
        <button
          onClick={() => setActiveTab('meals')}
          className={`flex-1 py-2 px-1.5 sm:px-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap text-[11px] sm:text-xs ${
            activeTab === 'meals'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Utensils className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Meals ({customerMeals.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('shift_timing')}
          className={`flex-1 py-2 px-1.5 sm:px-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap text-[11px] sm:text-xs ${
            activeTab === 'shift_timing'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Hours</span>
        </button>
        <button
          onClick={() => setActiveTab('pay_fee')}
          className={`flex-1 py-2 px-1.5 sm:px-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap text-[11px] sm:text-xs ${
            activeTab === 'pay_fee'
              ? 'bg-orange-600 text-white shadow-xs'
              : customer.balance > 0 
              ? 'hover:text-rose-700 hover:bg-rose-50 text-rose-600 font-bold bg-rose-50/70 border border-rose-200' 
              : 'hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Pay Fee {customer.balance > 0 ? `(₹${customer.balance})` : ''}</span>
        </button>
      </div>

      {/* TAB 0: SCAN UNIVERSAL COUNTER QR FOR ATTENDANCE */}
      {activeTab === 'scan_counter' && (
        <div className="w-full max-w-full sm:max-w-xl space-y-3.5">
          {/* Shift & Gate Status Pill */}
          <div className="bg-slate-900 text-white rounded-2xl p-3.5 sm:p-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-orange-600 flex items-center justify-center shrink-0">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-orange-400 tracking-wider block">
                  Official Dining Counter Standee Scanner
                </span>
                <h3 className="font-extrabold text-xs sm:text-base tracking-tight">
                  Point Camera at Wall / Standee QR
                </h3>
              </div>
            </div>
            <span className="text-[10px] sm:text-[11px] font-mono font-bold bg-slate-800 text-orange-300 px-2 py-1 rounded-lg border border-slate-700 uppercase shrink-0">
              {shiftAudit.mealType}
            </span>
          </div>

          {/* Hidden Direct System Camera & Gallery File Inputs */}
          <input
            ref={systemCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Scanner Mode Selector */}
          <div className="grid grid-cols-4 rounded-xl bg-slate-200/70 p-1 text-[11px] sm:text-xs font-bold text-slate-700 gap-1">
            <button
              onClick={() => {
                setScanResult(null);
                setScanInputMode('camera');
                startCameraStream();
              }}
              className={`py-1.5 px-1 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                scanInputMode === 'camera' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-orange-600 shrink-0" />
              <span className="truncate">Live Cam</span>
            </button>
            <button
              onClick={() => {
                systemCameraInputRef.current?.click();
              }}
              className="py-1.5 px-1 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 bg-orange-600 text-white shadow-xs hover:bg-orange-700"
              title="Opens phone native camera - 100% works in all APKs"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-200 shrink-0" />
              <span className="truncate font-black">Snap QR</span>
            </button>
            <button
              onClick={() => {
                setScanResult(null);
                setScanInputMode('upload');
              }}
              className={`py-1.5 px-1 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                scanInputMode === 'upload' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span className="truncate">Gallery</span>
            </button>
            <button
              onClick={() => {
                setScanResult(null);
                setScanInputMode('manual');
              }}
              className={`py-1.5 px-1 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                scanInputMode === 'manual' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              <QrCode className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span className="truncate">Manual</span>
            </button>
          </div>

          {/* Verification in Progress */}
          {isVerifying && (
            <div className="p-8 rounded-3xl bg-white border-2 border-orange-500 shadow-xl text-center space-y-3">
              <RefreshCw className="w-10 h-10 text-orange-600 animate-spin mx-auto" />
              <h3 className="font-black text-slate-900 text-base">Verifying with Morya Mess Server...</h3>
              <p className="text-xs text-slate-500">Checking subscription validity, active shift hours & duplicate scan prevention.</p>
            </div>
          )}

          {/* Verified Result Card */}
          {!isVerifying && scanResult && (
            <div className={`p-6 rounded-3xl border-4 shadow-xl text-center space-y-4 animate-in fade-in zoom-in-95 ${
              scanResult.success 
                ? 'bg-white border-emerald-600 text-slate-900' 
                : 'bg-white border-rose-600 text-slate-900'
            }`}>
              <div className="flex justify-center">
                {scanResult.success ? (
                  <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center">
                    <Check className="w-10 h-10 text-emerald-600 stroke-[3]" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-rose-100 border-2 border-rose-500 flex items-center justify-center">
                    <XCircle className="w-10 h-10 text-rose-600" />
                  </div>
                )}
              </div>

              <div>
                <span className={`text-[11px] font-black uppercase tracking-wider block ${
                  scanResult.success ? 'text-emerald-700' : 'text-rose-700'
                }`}>
                  {scanResult.success ? '★ ATTENDANCE RECORDED ★' : 'ATTENDANCE NOT ALLOWED'}
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  {scanResult.message}
                </h3>
              </div>

              {scanResult.success && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-2 text-left">
                  <div className="flex justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-slate-500 font-bold">Meal Shift:</span>
                    <span className="font-black uppercase text-orange-600">{scanResult.mealShift || shiftAudit.mealType}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-slate-500 font-bold">Member Name:</span>
                    <span className="font-bold text-slate-900">{customer.name}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-slate-500 font-bold">Customer ID:</span>
                    <span className="font-mono font-bold text-slate-800">{customer.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Marked Time:</span>
                    <span className="font-mono font-bold text-emerald-700">{scanResult.time || 'NOW'} ({scanResult.date || today})</span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setScanResult(null);
                    if (scanInputMode === 'camera') startCameraStream();
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Scan Again
                </button>
                <button
                  onClick={() => setActiveTab('meals')}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  View My Meals ({customerMeals.length})
                </button>
              </div>
            </div>
          )}

          {/* Active Viewport when NOT verified */}
          {!isVerifying && !scanResult && (
            <div className="space-y-3">
              {scanInputMode === 'camera' && (
                <div className="relative bg-black rounded-3xl overflow-hidden border-2 sm:border-4 border-slate-900 shadow-2xl flex flex-col items-center justify-center min-h-[300px]">
                  <video
                    ref={videoRef}
                    className="w-full h-72 sm:h-80 object-cover"
                    playsInline
                    autoPlay
                    muted
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Camera Aim Target Box */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
                    <div className="w-48 h-48 sm:w-56 sm:h-56 border-2 border-orange-400 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                      {/* Corner marks */}
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg" />
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg" />
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg" />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg" />

                      {/* Scanning laser line */}
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-orange-500 to-transparent absolute top-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                  </div>

                  {/* Top 1-Tap Native Camera Helper Button */}
                  <div className="absolute top-3 inset-x-3 flex justify-center">
                    <button
                      onClick={() => systemCameraInputRef.current?.click()}
                      className="px-3.5 py-1.5 rounded-full bg-orange-600/95 hover:bg-orange-700 text-white text-[11px] font-extrabold shadow-lg backdrop-blur-xs flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer border border-orange-400"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>If screen is black, Tap here to Scan</span>
                    </button>
                  </div>

                  {/* Camera Footer Banner */}
                  <div className="absolute bottom-3 left-3 right-3 bg-slate-900/85 backdrop-blur-xs text-white p-2 sm:p-2.5 rounded-xl text-center text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-orange-400 animate-spin shrink-0" />
                    <span className="truncate">Point at Standee QR or tap button above</span>
                  </div>

                  {/* Camera Error / Permission Fallback Overlay */}
                  {cameraError && (
                    <div className="absolute inset-0 bg-slate-950/95 text-white p-5 flex flex-col items-center justify-center text-center space-y-3 z-20">
                      <AlertTriangle className="w-9 h-9 text-amber-400" />
                      <div>
                        <h4 className="font-bold text-sm text-white">APK WebView Camera Notice</h4>
                        <p className="text-[11px] text-slate-300 mt-1 max-w-xs">{cameraError}</p>
                      </div>
                      <div className="flex flex-col gap-2 w-full max-w-xs pt-1">
                        <button
                          onClick={() => systemCameraInputRef.current?.click()}
                          className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white text-xs font-black rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Camera className="w-4 h-4" />
                          <span>📸 Open Phone Camera (100% Works)</span>
                        </button>
                        <div className="flex gap-2">
                          <button
                            onClick={startCameraStream}
                            className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold rounded-xl"
                          >
                            Retry Live Cam
                          </button>
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold rounded-xl"
                          >
                            Gallery Photo
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {scanInputMode === 'upload' && (
                <div className="bg-white rounded-2xl sm:rounded-3xl border-2 border-dashed border-slate-300 p-6 sm:p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Upload Photo of Counter Standee QR</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Snap a photo with your camera app and select it here.
                    </p>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Choose Photo from Gallery</span>
                  </button>
                </div>
              )}

              {scanInputMode === 'manual' && (
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Enter Standee QR Token Code:
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MORYA_UNIVERSAL_HQ01_PERMANENT_STANDEE"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900 uppercase"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (!manualCode.trim()) {
                        alert('Please enter a valid Standee code');
                        return;
                      }
                      handleProcessScannedCode(manualCode);
                    }}
                    className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify & Mark Attendance</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 1: OFFICIAL DIGITAL PASS (Show at Mess Entry Gate) */}
      {activeTab === 'pass' && (
        <div className="w-full max-w-full sm:max-w-xl space-y-4">
          {/* Main Card Container */}
          <div className="w-full max-w-full bg-white rounded-2xl sm:rounded-3xl border-2 sm:border-4 border-slate-900 shadow-xl overflow-hidden p-1.5 sm:p-2 text-slate-900 relative">
            <div className="border border-amber-500 rounded-xl sm:rounded-2xl p-3 sm:p-5 bg-white relative overflow-hidden">
              {/* Top Tricolour Ribbon */}
              <div className="h-1.5 w-full -mt-3.5 sm:-mt-5 mb-3 sm:mb-4 flex rounded-t overflow-hidden">
                <div className="h-full w-1/3 bg-[#FF9933]"></div>
                <div className="h-full w-1/3 bg-white"></div>
                <div className="h-full w-1/3 bg-[#138808]"></div>
              </div>

              {/* Pass Header */}
              <div className="flex flex-col items-center pb-3 border-b-2 border-slate-200 mb-3 text-center">
                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-amber-800 tracking-wider mb-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">MORYA MESS MANAGEMENT</span>
                </div>
                <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase">
                  {messName}
                </h2>
                <p className="text-[10px] font-bold text-slate-600">
                  OFFICIAL 30-DAY DIGITAL PASS & IDENTITY CARD
                </p>

                <div className="flex items-center justify-between flex-wrap gap-1.5 w-full mt-2.5 pt-2 border-t border-slate-100 text-[11px]">
                  <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 truncate max-w-[180px]">
                    PASS ID: {customer.id}
                  </span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[10px] whitespace-nowrap ${
                    customer.gender === 'female' 
                      ? 'bg-orange-100 text-orange-800 border border-orange-200' 
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}>
                    {customer.gender === 'female' ? '★ HOSTEL GIRL' : '★ STUDENT / BOY'}
                  </span>
                </div>
              </div>

              {/* Student Details */}
              <div className="bg-slate-50/90 rounded-2xl p-3 sm:p-3.5 border border-slate-200 mb-3.5 space-y-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Student Member Name
                  </span>
                  <div className="font-black text-slate-900 text-base sm:text-lg tracking-wide break-words">
                    {customer.name.toUpperCase()}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 font-bold block">Mobile:</span>
                    <a 
                      href={`tel:${customer.phone}`}
                      className="font-bold text-orange-700 hover:underline flex items-center gap-1 truncate"
                    >
                      <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span className="truncate">{customer.phone || 'N/A'}</span>
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Monthly Fee:</span>
                    <span className="font-black text-emerald-700 whitespace-nowrap">₹{standardFee} / 30 Days</span>
                  </div>
                </div>

                {customer.hostelOrAddress && (
                  <div className="text-[11px] text-slate-600 truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{customer.hostelOrAddress}</span>
                  </div>
                )}
              </div>

              {/* Validity Date Box */}
              <div className="p-2.5 sm:p-3 rounded-2xl bg-amber-50 border border-amber-300 mb-3.5 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block mb-0.5">
                  OFFICIAL 30-DAY VALIDITY PERIOD
                </span>
                <div className="font-mono font-black text-xs sm:text-base text-slate-900 flex items-center justify-center flex-wrap gap-1.5 sm:gap-2">
                  <span>{customer.startDate}</span>
                  <span className="text-amber-600 font-sans">➔</span>
                  <span className={isExpired ? 'text-rose-600' : 'text-orange-700'}>{customer.endDate}</span>
                </div>
                <div className="text-[11px] font-bold text-amber-900 mt-0.5">
                  {isExpired ? '⚠️ Subscription Expired' : `${daysRemaining} Days Remaining`}
                </div>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center justify-center p-3 sm:p-3.5 bg-white rounded-2xl border-2 border-slate-900 mb-3.5 max-w-full overflow-hidden">
                {qrDataUrl ? (
                  <img 
                    src={qrDataUrl} 
                    alt={`Pass QR Code for ${customer.name}`}
                    className="w-40 h-40 sm:w-48 sm:h-48 rounded-xl object-contain max-w-full"
                  />
                ) : (
                  <div className="w-40 h-40 sm:w-48 sm:h-48 bg-slate-100 rounded-xl flex items-center justify-center text-xs text-slate-400">
                    Generating Official QR...
                  </div>
                )}
                <div className="flex items-center gap-1.5 mt-2.5 text-[11px] font-bold text-emerald-700 text-center">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>SHOW TO SCANNER AT MESS GATE</span>
                </div>
                <span className="text-[9px] font-mono text-slate-400 mt-0.5 truncate max-w-full text-center">
                  TOKEN: {customer.qrToken ? customer.qrToken.substring(0, 20) + '...' : customer.id}
                </span>
              </div>

              {/* Gate Hours Reminder */}
              <div className="p-2.5 rounded-xl bg-orange-50/70 border border-orange-200 text-center text-xs text-orange-950">
                <strong>Shift Hours:</strong> Lunch: 10:30 AM – 2:30 PM | Dinner: 8:30 PM – 10:30 PM
                <div className="text-[10px] text-rose-700 font-bold mt-0.5">
                  ⚠️ Sunday Dinner Shift is Closed
                </div>
              </div>

              {/* Seals */}
              <div className="pt-3 mt-3 border-t border-slate-200 flex items-center justify-between flex-wrap gap-1 text-[9px] text-slate-500">
                <div>
                  <span className="font-bold text-slate-700 block">SECURITY CERTIFIED PASS</span>
                  <span>Non-transferable • Valid for 30 Days</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-800 block">MORYA MESS</span>
                  <span className="italic">Authorized Signatory</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Scan Counter Button */}
          <button
            onClick={() => {
              setScanResult(null);
              setActiveTab('scan_counter');
            }}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <Camera className="w-5 h-5" />
            <span>Scan Mess Counter Standee to Mark Meal</span>
          </button>

          {/* Download & Save Action */}
          <button
            onClick={handleDownloadPass}
            className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Save Digital Pass to Phone Gallery</span>
          </button>
        </div>
      )}

      {/* TAB 2: VACATION LEAVE REQUEST */}
      {activeTab === 'leave' && (
        <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">Request Vacation Leave</h2>
              <p className="text-xs text-slate-500">
                Approved leaves extend your 30-day subscription automatically!
              </p>
            </div>
          </div>

          {leaveSubmitted ? (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h3 className="font-bold text-sm">Leave Request Submitted!</h3>
              <p className="text-xs">
                Your leave application has been sent to Morya Mess owner for approval. Once verified, your end date will be extended.
              </p>
            </div>
          ) : (
            <form onSubmit={handleLeaveSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Leave Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveStart}
                    onChange={e => setLeaveStart(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Leave End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveEnd}
                    onChange={e => setLeaveEnd(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Reason for Leave *
                </label>
                <select
                  value={leaveReason}
                  onChange={e => setLeaveReason(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-orange-600"
                >
                  <option value="Going to Hometown / Family Function">Going to Hometown / Family Function</option>
                  <option value="College Semester Exam Break">College Semester Exam Break</option>
                  <option value="Medical / Health Leave">Medical / Health Leave</option>
                  <option value="Industrial Training / Internship">Industrial Training / Internship</option>
                  <option value="Other Personal Reason">Other Personal Reason</option>
                </select>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px]">
                💡 <strong>Hostel Notice:</strong> Minimum leave period is 2 days. Gate scanner will be temporarily paused during your leave dates.
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Submit Leave Request to Mess Manager</span>
              </button>
            </form>
          )}

          {/* Past Leave Requests History */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
              Your Leave History
            </h3>
            {(!customer.leaves || customer.leaves.length === 0) ? (
              <p className="text-xs text-slate-400 italic">No previous leaves taken during this cycle.</p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {customer.leaves.map(l => (
                  <div key={l.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800">{l.startDate} to {l.endDate}</span>
                      <span className="text-[11px] text-slate-500 ml-2">({l.days} days)</span>
                      <p className="text-[10px] text-slate-400">{l.reason}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      l.approved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {l.approved ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: MEALS LOGGED */}
      {activeTab === 'meals' && (
        <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-base">Your Gate Entry Records</h2>
                <p className="text-xs text-slate-500">Recorded scans at Morya Mess entry gate</p>
              </div>
            </div>
            <span className="font-bold text-xs bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
              {customerMeals.length} Total
            </span>
          </div>

          {customerMeals.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 space-y-1">
              <p>No meal scans recorded yet for your membership.</p>
              <p>Show your digital pass QR at the counter during meal times.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {customerMeals.map(m => {
                const timeStr = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={m.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      {m.scanStatus === 'ALLOW' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <div>
                        <span className="font-bold text-slate-800 capitalize">{m.mealType} Meal</span>
                        <span className="text-[11px] text-slate-400 ml-2 font-mono">{m.date} at {timeStr}</span>
                        <p className="text-[10px] text-slate-500">{m.reason}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      m.scanStatus === 'ALLOW' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {m.scanStatus}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: STRICT MESS TIMINGS */}
      {activeTab === 'shift_timing' && (
        <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">Strict Mess Shift Timings</h2>
              <p className="text-xs text-slate-500">Morya Mess Operational Schedule</p>
            </div>
          </div>

          {/* Current Live Status Banner */}
          <div className={`p-4 rounded-2xl border text-xs space-y-1 ${
            shiftAudit.isSundayNightClosed
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : shiftAudit.isShiftActive
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <div className="font-black text-sm flex items-center gap-2">
              <span>{shiftAudit.shiftTitle}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/70">
                {shiftAudit.isShiftActive ? 'GATE OPEN NOW' : 'GATE CLOSED'}
              </span>
            </div>
            <p className="text-[11px] opacity-90">{shiftAudit.reason}</p>
          </div>

          {/* Shifts Details */}
          <div className="space-y-3 pt-2">
            {/* Lunch Shift */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Sun className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-xs">Lunch Shift</h3>
                  <p className="text-[11px] text-slate-500">Chapati, Bhaji, Dal, Rice & Salad</p>
                </div>
              </div>
              <span className="font-bold text-slate-800 text-xs bg-white px-3 py-1.5 rounded-xl border border-slate-200 font-mono">
                10:30 AM – 02:30 PM
              </span>
            </div>

            {/* Dinner Shift */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center">
                  <Moon className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-xs">Dinner Shift</h3>
                  <p className="text-[11px] text-slate-500">Hot Bhakri/Roti, Sabzi, Rice & Sweet (Special)</p>
                </div>
              </div>
              <span className="font-bold text-slate-800 text-xs bg-white px-3 py-1.5 rounded-xl border border-slate-200 font-mono">
                08:30 PM – 10:30 PM
              </span>
            </div>

            {/* Sunday Notice */}
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-xs text-rose-900">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">SUNDAY NIGHT SPECIAL RULE:</strong>
                <span>
                  Mess is open for Sunday Lunch (Feast/Special menu). Dinner shift is closed on Sunday night for kitchen sanitization and staff rest.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: OFFICIAL MESS UPI QR & FEE PAYMENT */}
      {activeTab === 'pay_fee' && (
        <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-900 text-base">Official Mess UPI Payment</h2>
                <p className="text-xs text-slate-500">Scan official QR, pay with any app & submit UTR</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
              VERIFIED VPA
            </span>
          </div>

          {/* Student Balance Banner */}
          <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${
            customer.balance > 0 
              ? 'bg-rose-50 border-rose-200 text-rose-900' 
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}>
            <div>
              <span className="font-bold block text-[11px] opacity-80">Current Subscription Dues</span>
              <span className="font-black text-lg sm:text-xl">
                {customer.balance > 0 ? `₹${customer.balance} Pending` : 'All Fees Paid (₹0 Due)'}
              </span>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-white text-[11px] font-bold shadow-2xs">
              Plan: {customer.planType === 'both_meals' ? '2 Meals / Day' : '1 Meal / Day'}
            </span>
          </div>

          {/* Official QR Code Standee Card */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 text-center space-y-3 relative overflow-hidden shadow-md">
            <span className="bg-orange-600 text-white text-[10px] font-black tracking-widest uppercase py-1 px-3 rounded-full inline-block">
              Scan & Pay via PhonePe / GPay / Paytm
            </span>

            <div>
              <h3 className="font-black text-base uppercase text-white tracking-tight">
                {upiConfig.upiPayeeName || messName}
              </h3>
              <p className="text-[11px] text-slate-300 font-medium">Official Mess Payment QR</p>
            </div>

            {/* QR Image */}
            <div className="flex justify-center p-2 bg-white rounded-2xl mx-auto w-fit shadow-lg">
              {upiConfig.upiQrCodeImage ? (
                <img
                  src={upiConfig.upiQrCodeImage}
                  alt="Official Mess UPI QR"
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-xl"
                />
              ) : generatedUpiQrUrl ? (
                <img
                  src={generatedUpiQrUrl}
                  alt="Official Mess UPI QR"
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs">
                  Loading QR...
                </div>
              )}
            </div>

            {/* UPI ID / VPA with Copy Button */}
            <div className="bg-slate-800/90 rounded-xl p-2.5 border border-slate-700 flex items-center justify-between text-xs max-w-sm mx-auto">
              <div className="text-left truncate mr-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Official UPI ID</span>
                <span className="font-mono font-bold text-orange-400 text-xs sm:text-sm select-all">
                  {upiConfig.upiId}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (upiConfig.upiId) {
                    navigator.clipboard.writeText(upiConfig.upiId);
                    setCopiedUpi(true);
                    setTimeout(() => setCopiedUpi(false), 2000);
                  }
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
              >
                {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {paymentErrorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1">
              <div className="font-black text-sm flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Verification Request Error</span>
              </div>
              <p className="text-[11px] opacity-90">{paymentErrorMessage}</p>
            </div>
          )}

          {/* Success Banner */}
          {paymentSuccessMessage && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
              <div className="font-black text-sm flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Payment Record Submitted to Owner!</span>
              </div>
              <p className="text-[11px] opacity-90">{paymentSuccessMessage}</p>
            </div>
          )}

          {/* Payment Record / UTR Entry Form */}
          <form onSubmit={handleRecordStudentPayment} className="space-y-4 pt-2">
            <div className="border-t border-slate-100 pt-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 mb-1">
                Record Your Payment for Owner Verification
              </h3>
              <p className="text-[11px] text-slate-500 mb-3">
                After paying via your UPI App, enter the amount and 12-digit UTR/Reference number from your receipt.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Amount Paid (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  placeholder="e.g. 2500"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 font-bold text-slate-900 focus:outline-none focus:border-orange-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  12-Digit UPI Ref / UTR No. *
                </label>
                <input
                  type="text"
                  required
                  value={payUtr}
                  onChange={e => setPayUtr(e.target.value)}
                  placeholder="e.g. 425619382019"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 font-mono font-bold text-slate-900 focus:outline-none focus:border-orange-600 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1 text-xs">
                Optional Note / Payment Remarks
              </label>
              <input
                type="text"
                value={payNotes}
                onChange={e => setPayNotes(e.target.value)}
                placeholder="e.g. Paid for next month / Google Pay"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:border-orange-600 focus:bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingPayment}
              className="w-full py-3 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmittingPayment ? (
                <span>Submitting to Owner Desk...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Payment Verification Request</span>
                </>
              )}
            </button>
          </form>

          {/* Student Submitted Payments History */}
          {studentPayments.length > 0 && (
            <div className="border-t border-slate-200/80 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-orange-600" />
                  <span>Your Submitted Payments ({studentPayments.length})</span>
                </h4>
                <span className="text-[10px] text-slate-400 font-medium">Auto-refreshed</span>
              </div>

              <div className="space-y-2">
                {studentPayments.map(p => (
                  <div 
                    key={p.id}
                    className="p-3 rounded-2xl border border-slate-200 bg-slate-50/80 flex items-center justify-between gap-2.5 text-xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-slate-900 text-sm">₹{p.amount}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase bg-slate-200 text-slate-700 font-mono">
                          {p.paymentMode}
                        </span>
                        {p.transactionReference && (
                          <span className="text-[10px] font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            UTR: {p.transactionReference}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{p.notes || 'UPI Payment'}</p>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {new Date(p.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>

                    <div className="shrink-0 text-right">
                      {p.status === 'pending' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 animate-pulse" />
                          <span>Pending Owner Review</span>
                        </span>
                      ) : p.status === 'verified' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Verified by Owner</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          <span>Reversed</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
