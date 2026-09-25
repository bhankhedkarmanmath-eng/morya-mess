import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Customer } from '../types/mess';
import { SupabasePaymentRecord, PaymentMode } from '../types/mess';
import { 
  fetchPaymentsFromSupabase, 
  recordNewPaymentInSupabase, 
  verifyPaymentInSupabase, 
  reversePaymentInSupabase,
  fetchMessUpiConfig,
  saveMessUpiConfig,
  MessUpiConfig
} from '../lib/ownerFeaturesApi';
import { 
  DollarSign, 
  CreditCard, 
  Plus, 
  CheckCircle2, 
  Clock, 
  RotateCcw, 
  Search, 
  Filter, 
  ShieldCheck, 
  TrendingUp, 
  QrCode, 
  Receipt,
  X,
  Upload,
  Image as ImageIcon,
  Check,
  Copy,
  Smartphone,
  Save,
  AlertCircle
} from 'lucide-react';

interface PaymentsManagerViewProps {
  customers: Customer[];
  initialSubTab?: 'all' | 'upi' | 'cash' | 'pending' | 'qr_config';
  onOpenCustomer360?: (c: Customer) => void;
  onRefreshCustomers?: () => void;
}

export const PaymentsManagerView: React.FC<PaymentsManagerViewProps> = ({
  customers,
  initialSubTab = 'all',
  onOpenCustomer360,
  onRefreshCustomers
}) => {
  const [payments, setPayments] = useState<SupabasePaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<'all' | 'upi' | 'cash' | 'pending' | 'qr_config'>(initialSubTab);
  const [searchTerm, setSearchTerm] = useState('');

  // UPI QR and Official VPA Settings State
  const [upiConfig, setUpiConfig] = useState<MessUpiConfig>({
    upiId: 'moryamess@upi',
    upiPayeeName: 'Morya Mess Latur',
    upiQrCodeImage: ''
  });
  const [isSavingUpiConfig, setIsSavingUpiConfig] = useState(false);
  const [upiSaveSuccess, setUpiSaveSuccess] = useState(false);
  const [generatedUpiQrUrl, setGeneratedUpiQrUrl] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add Cash / UPI Payment Modal
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reversal Modal
  const [isReversalOpen, setIsReversalOpen] = useState(false);
  const [reversalTarget, setReversalTarget] = useState<SupabasePaymentRecord | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  useEffect(() => {
    loadPayments();
    loadUpiConfig();
  }, []);

  const loadUpiConfig = async () => {
    const config = await fetchMessUpiConfig();
    setUpiConfig(config);
    generateQrForUpi(config.upiId, config.upiPayeeName);
  };

  const generateQrForUpi = async (vpa: string, payee: string) => {
    try {
      const upiUrl = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payee)}&cu=INR`;
      const qrDataUrl = await QRCode.toDataURL(upiUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });
      setGeneratedUpiQrUrl(qrDataUrl);
    } catch (e) {
      console.warn('Error generating QR code:', e);
    }
  };

  const handleSaveUpiSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingUpiConfig(true);
    setUpiSaveSuccess(false);

    const res = await saveMessUpiConfig(upiConfig);
    if (res.success) {
      setUpiSaveSuccess(true);
      await generateQrForUpi(upiConfig.upiId, upiConfig.upiPayeeName);
      setTimeout(() => setUpiSaveSuccess(false), 3000);
    } else {
      alert(res.error || 'Failed to save UPI Settings');
    }
    setIsSavingUpiConfig(false);
  };

  const processQrImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, JPEG, WEBP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setUpiConfig(prev => ({ ...prev, upiQrCodeImage: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDropFile = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processQrImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processQrImageFile(e.target.files[0]);
    }
  };

  const loadPayments = async () => {
    setIsLoading(true);
    const data = await fetchPaymentsFromSupabase();
    setPayments(data);
    setIsLoading(false);
  };

  // Metrics
  const todayStr = new Date().toISOString().split('T')[0];
  const thisMonthStr = todayStr.substring(0, 7);

  const collectedToday = payments
    .filter(p => p.createdAt?.startsWith(todayStr) && p.status === 'verified')
    .reduce((sum, p) => sum + p.amount, 0);

  const upiToday = payments
    .filter(p => p.createdAt?.startsWith(todayStr) && p.paymentMode === 'upi' && p.status === 'verified')
    .reduce((sum, p) => sum + p.amount, 0);

  const cashToday = payments
    .filter(p => p.createdAt?.startsWith(todayStr) && p.paymentMode === 'cash' && p.status === 'verified')
    .reduce((sum, p) => sum + p.amount, 0);

  const collectedMonth = payments
    .filter(p => p.createdAt?.startsWith(thisMonthStr) && p.status === 'verified')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingVerificationCount = payments.filter(p => p.status === 'pending').length;

  const totalOutstanding = customers.reduce((sum, c) => sum + (c.balance || 0), 0);

  // Filtered Payments
  const filtered = payments.filter(p => {
    if (filterMode === 'upi' && p.paymentMode !== 'upi') return false;
    if (filterMode === 'cash' && p.paymentMode !== 'cash') return false;
    if (filterMode === 'pending' && p.status !== 'pending') return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matches = 
        p.customerName.toLowerCase().includes(term) ||
        p.customerId.toLowerCase().includes(term) ||
        (p.transactionReference && p.transactionReference.toLowerCase().includes(term));
      if (!matches) return false;
    }

    return true;
  });

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !amount || Number(amount) <= 0) return;

    setIsSubmitting(true);
    const res = await recordNewPaymentInSupabase({
      customerId: selectedCustomerId,
      amount: Number(amount),
      paymentMode,
      transactionReference: transactionRef || undefined,
      notes: notes || undefined,
      status: 'verified' // Direct owner entry is instantly verified
    });

    if (res.success) {
      setIsAddPaymentOpen(false);
      setAmount('');
      setTransactionRef('');
      setNotes('');
      await loadPayments();
      if (onRefreshCustomers) onRefreshCustomers();
    } else {
      alert(res.error || 'Failed to record payment');
    }
    setIsSubmitting(false);
  };

  const handleVerify = async (paymentId: string) => {
    const res = await verifyPaymentInSupabase(paymentId);
    if (res.success) {
      await loadPayments();
      if (onRefreshCustomers) onRefreshCustomers();
    } else {
      alert('Verification failed: ' + res.error);
    }
  };

  const handleExecuteReversal = async () => {
    if (!reversalTarget || !reversalReason.trim()) return;

    const res = await reversePaymentInSupabase({
      originalPaymentId: reversalTarget.id,
      customerId: reversalTarget.customerId,
      amount: reversalTarget.amount,
      reason: reversalReason.trim(),
      reversedBy: 'Owner Desk'
    });

    if (res.success) {
      setIsReversalOpen(false);
      setReversalTarget(null);
      setReversalReason('');
      await loadPayments();
      if (onRefreshCustomers) onRefreshCustomers();
    } else {
      alert('Reversal failed: ' + res.error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Billing & Payments Center
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real-time financial transactions, UPI verification & cash collection desk
          </p>
        </div>

        <button
          onClick={() => setIsAddPaymentOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Payment</span>
        </button>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 block">Collected Today</span>
          <span className="text-lg font-black text-slate-900 block mt-1">₹{collectedToday.toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-emerald-600 font-semibold">Today's total</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 block">UPI Today</span>
          <span className="text-lg font-black text-emerald-600 block mt-1">₹{upiToday.toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-slate-400 font-semibold">Digital collection</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 block">Cash Today</span>
          <span className="text-lg font-black text-orange-600 block mt-1">₹{cashToday.toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-slate-400 font-semibold">In register drawer</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 block">This Month</span>
          <span className="text-lg font-black text-slate-900 block mt-1">₹{collectedMonth.toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-slate-400 font-semibold">Monthly intake</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 block">Total Dues Pending</span>
          <span className="text-lg font-black text-rose-600 block mt-1">₹{totalOutstanding.toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-rose-600 font-semibold">{customers.filter(c => c.balance > 0).length} students pending</span>
        </div>

        <div className={`p-3.5 rounded-2xl border shadow-2xs ${
          pendingVerificationCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'
        }`}>
          <span className="text-[11px] font-bold text-slate-500 block">Pending Verification</span>
          <span className={`text-lg font-black block mt-1 ${
            pendingVerificationCount > 0 ? 'text-amber-700' : 'text-slate-900'
          }`}>
            {pendingVerificationCount}
          </span>
          <span className="text-[10px] font-semibold text-slate-400">Awaiting UTR match</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold text-slate-600">
          {[
            { id: 'all', label: `All Payments (${payments.length})` },
            { id: 'upi', label: 'UPI / QR' },
            { id: 'cash', label: 'Cash' },
            { id: 'pending', label: `Pending Verification (${pendingVerificationCount})` },
            { id: 'qr_config', label: '⚙️ Mess Payment QR & UPI ID' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterMode(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                filterMode === tab.id
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {tab.id === 'qr_config' && <QrCode className="w-3.5 h-3.5" />}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {filterMode !== 'qr_config' && (
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search student, UTR..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
            />
          </div>
        )}
      </div>

      {/* VIEW 1: OFFICIAL QR CODE & UPI ID CONFIGURATION WITH FILE DROP */}
      {filterMode === 'qr_config' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left / Settings Form */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-[11px] font-bold text-orange-800 mb-2">
                  <Smartphone className="w-3.5 h-3.5 text-orange-600" />
                  <span>SUPABASE INTEGRATED PAYMENT SYSTEM</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  Official Mess UPI & Scanner Setup
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure your specific phone/bank UPI ID or drop your custom QR code image. This instantly updates across both Owner App and the Student App.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveUpiSettings} className="space-y-5">
              {/* Payee Name */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Payee / Mess Name (Displayed on UPI Apps) *
                </label>
                <input
                  type="text"
                  required
                  value={upiConfig.upiPayeeName}
                  onChange={e => setUpiConfig(prev => ({ ...prev, upiPayeeName: e.target.value }))}
                  placeholder="e.g. Morya Mess Latur / Bhai Management"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-orange-600 focus:bg-white transition-all"
                />
              </div>

              {/* UPI ID / VPA */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Official Mess UPI ID / VPA *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={upiConfig.upiId}
                    onChange={e => setUpiConfig(prev => ({ ...prev, upiId: e.target.value }))}
                    placeholder="e.g. 9876543210@ybl, moryamess@okhdfcbank, paytmqr..."
                    className="w-full pl-3.5 pr-24 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-orange-600 focus:bg-white transition-all"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (upiConfig.upiId) {
                          navigator.clipboard.writeText(upiConfig.upiId);
                          setCopiedUpi(true);
                          setTimeout(() => setCopiedUpi(false), 2000);
                        }
                      }}
                      className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    >
                      {copiedUpi ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Enter your Google Pay, PhonePe, Paytm or BHIM UPI ID.
                </p>
              </div>

              {/* DROP QR FILE OR PHOTO SECTION */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Upload or Drop Official Phone/Bank QR File (Optional Custom Image)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={handleDropFile}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                    isDraggingFile 
                      ? 'border-orange-500 bg-orange-50/70 scale-[1.01]' 
                      : upiConfig.upiQrCodeImage 
                      ? 'border-emerald-400 bg-emerald-50/30' 
                      : 'border-slate-300 bg-slate-50 hover:bg-slate-100/70 hover:border-orange-400'
                  }`}
                >
                  {upiConfig.upiQrCodeImage ? (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                      <img
                        src={upiConfig.upiQrCodeImage}
                        alt="Uploaded QR Code"
                        className="w-24 h-24 sm:w-28 sm:h-28 object-contain rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
                      />
                      <div className="text-left space-y-1 text-xs">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <Check className="w-3 h-3" /> Custom QR Image Uploaded
                        </span>
                        <p className="font-bold text-slate-800">PhonePe / GooglePay Scanner Active</p>
                        <p className="text-[11px] text-slate-500">Click or drag a new image file to replace this QR.</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUpiConfig(prev => ({ ...prev, upiQrCodeImage: '' }));
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:underline pt-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" /> Remove Image (Use Auto Generated QR)
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto shadow-xs">
                        <Upload className="w-6 h-6 animate-bounce" />
                      </div>
                      <div className="text-xs">
                        <span className="font-bold text-slate-800 block text-sm">
                          Drop your PhonePe / GPay QR code image here
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          or click to browse from your device (PNG, JPG, WEBP)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Saves directly to Supabase mess settings
                </span>

                <button
                  type="submit"
                  disabled={isSavingUpiConfig}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingUpiConfig ? (
                    <span>Saving to Supabase...</span>
                  ) : upiSaveSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-200" />
                      <span>Saved Successfully!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save QR & UPI Settings</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right / Live Student & Counter Standee Preview */}
          <div className="lg:col-span-5 bg-gradient-to-b from-slate-900 to-slate-950 rounded-3xl p-5 sm:p-6 text-white shadow-xl flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-orange-600 flex items-center justify-center font-black text-sm">
                    M
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Live Payment QR Preview</h4>
                    <p className="text-[10px] text-slate-400">Official View seen by Students</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  READY
                </span>
              </div>

              {/* QR Standee Card */}
              <div className="bg-white text-slate-900 rounded-2xl p-5 mt-5 shadow-2xl text-center space-y-3 relative overflow-hidden border-2 border-orange-500">
                <div className="bg-orange-600 text-white text-[10px] font-black tracking-widest uppercase py-1 px-3 rounded-full inline-block">
                  Scan & Pay Using Any UPI App
                </div>

                <div className="text-center">
                  <h3 className="font-black text-base tracking-tight uppercase text-slate-900">
                    {upiConfig.upiPayeeName || 'MORYA MESS'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-semibold">Official Mess Counter QR</p>
                </div>

                {/* Display QR: Custom image if uploaded, or auto-generated high-res SVG */}
                <div className="flex justify-center p-2 bg-slate-50 rounded-2xl border border-slate-200">
                  {upiConfig.upiQrCodeImage ? (
                    <img
                      src={upiConfig.upiQrCodeImage}
                      alt="Official Payment QR"
                      className="w-52 h-52 object-contain rounded-xl"
                    />
                  ) : generatedUpiQrUrl ? (
                    <img
                      src={generatedUpiQrUrl}
                      alt="Generated UPI QR"
                      className="w-52 h-52 object-contain"
                    />
                  ) : (
                    <div className="w-52 h-52 flex items-center justify-center text-slate-400 text-xs">
                      Generating QR...
                    </div>
                  )}
                </div>

                {/* Specific UPI ID Banner */}
                <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Official UPI ID / VPA
                  </span>
                  <span className="font-mono font-black text-xs sm:text-sm text-slate-900 select-all block mt-0.5">
                    {upiConfig.upiId}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-2 pt-1 text-[10px] font-bold text-slate-500">
                  <span>BHIM</span>
                  <span>•</span>
                  <span>Google Pay</span>
                  <span>•</span>
                  <span>PhonePe</span>
                  <span>•</span>
                  <span>Paytm</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <AlertCircle className="w-4 h-4 text-orange-400" />
                <span>Student App Integration</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Students can tap the <strong className="text-white">Pay Fee</strong> tab in their Student Pass to scan this official QR code, make UPI transfers, and enter their 12-digit UTR reference for instant owner verification.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: PAYMENTS AUDIT TABLE (Shown when not on qr_config) */}
      {filterMode !== 'qr_config' && (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Payment ID</th>
                <th className="p-3">Student Name</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Mode</th>
                <th className="p-3">Transaction / UTR</th>
                <th className="p-3">Date & Time</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                    Loading payments from Supabase...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                    No payment transactions matching your filter.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono text-[11px] text-slate-500">{p.id.slice(0, 8)}...</td>
                    <td className="p-3">
                      <button
                        onClick={() => {
                          const matched = customers.find(c => c.id === p.customerId);
                          if (matched && onOpenCustomer360) onOpenCustomer360(matched);
                        }}
                        className="font-bold text-slate-900 hover:text-orange-600 hover:underline cursor-pointer"
                      >
                        {p.customerName}
                      </button>
                      <span className="block text-[10px] text-slate-400">{p.customerId}</span>
                    </td>
                    <td className="p-3">
                      <span className={`font-black text-sm ${p.amount < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {p.amount < 0 ? `-₹${Math.abs(p.amount)}` : `₹${p.amount}`}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                        {p.paymentMode}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-600">
                      {p.transactionReference || p.notes || 'Counter Payment'}
                    </td>
                    <td className="p-3 text-slate-500 text-[11px]">
                      {p.createdAt?.split('T')[0]} {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        p.status === 'verified'
                          ? 'bg-emerald-100 text-emerald-800'
                          : p.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {p.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {p.status === 'pending' && (
                          <button
                            onClick={() => handleVerify(p.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer"
                          >
                            Verify
                          </button>
                        )}
                        {p.status === 'verified' && p.amount > 0 && (
                          <button
                            onClick={() => {
                              setReversalTarget(p);
                              setIsReversalOpen(true);
                            }}
                            className="px-2 py-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-[11px] font-bold cursor-pointer"
                            title="Reverse payment with audit reason"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {isAddPaymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-orange-600" />
                <h3 className="font-black text-slate-900 text-sm">Record Official Payment</h3>
              </div>
              <button
                onClick={() => setIsAddPaymentOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Student</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  required
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone}) — Due: ₹{c.balance}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="2500"
                    min="1"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI / QR Code</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              {paymentMode === 'upi' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Bank UTR / Transaction ID</label>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="e.g. 427819283749"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Note (Optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Received at desk"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddPaymentOpen(false)}
                  className="px-3 py-2 rounded-xl text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Confirm & Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVERSAL MODAL */}
      {isReversalOpen && reversalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <RotateCcw className="w-5 h-5" />
                <h3 className="font-black text-slate-900 text-sm">Reverse Payment Record</h3>
              </div>
              <button
                onClick={() => setIsReversalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800 space-y-1">
              <p className="font-bold">Financial Audit Protection:</p>
              <p>This will permanently mark the payment as reversed and generate a compensatory adjustment record with full audit tracking.</p>
            </div>

            <div className="text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Student:</span>
                <span className="font-bold text-slate-900">{reversalTarget.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount to reverse:</span>
                <span className="font-black text-rose-600">₹{reversalTarget.amount}</span>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Reason for Reversal *</label>
                <input
                  type="text"
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="e.g. Wrong student selected / UPI chargeback"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                  required
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setIsReversalOpen(false)}
                className="px-3 py-2 rounded-xl text-slate-600 font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteReversal}
                disabled={!reversalReason.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer disabled:opacity-50"
              >
                Execute Reversal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
