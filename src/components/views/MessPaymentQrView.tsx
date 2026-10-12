import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Customer } from '../../types/mess';
import { 
  fetchMessUpiConfig, 
  saveMessUpiConfig, 
  MessUpiConfig 
} from '../../lib/ownerFeaturesApi';
import { 
  QrCode, 
  ArrowLeft, 
  Printer, 
  Download, 
  Copy, 
  Check, 
  Smartphone, 
  Volume2, 
  ShieldCheck, 
  Sparkles, 
  Store, 
  Upload, 
  Save, 
  Search, 
  User, 
  Share2, 
  ExternalLink,
  Palette,
  CreditCard,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface MessPaymentQrViewProps {
  customers: Customer[];
  onBack: () => void;
  onOpenCustomer360?: (c: Customer) => void;
}

type StandeeTheme = 'saffron' | 'midnight' | 'emerald' | 'navy';
type StandeeFormat = 'a5_tent' | 'a4_poster' | 'pocket_card';

export const MessPaymentQrView: React.FC<MessPaymentQrViewProps> = ({
  customers,
  onBack,
  onOpenCustomer360
}) => {
  // Config state
  const [upiConfig, setUpiConfig] = useState<MessUpiConfig>({
    upiId: 'moryamess@upi',
    upiPayeeName: 'Morya Mess Pune',
    upiQrCodeImage: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Standee customization
  const [theme, setTheme] = useState<StandeeTheme>('saffron');
  const [format, setFormat] = useState<StandeeFormat>('a5_tent');
  const [messDisplayName, setMessDisplayName] = useState('MORYA MESS & DINING');
  const [tagline, setTagline] = useState('Pure Homemade Hygenic Meals • Scan & Pay Anytime');
  const [contactPhone, setContactPhone] = useState('+91 98765 43210');
  
  // Dynamic Amount QR generator
  const [isDynamicAmount, setIsDynamicAmount] = useState(false);
  const [customAmount, setCustomAmount] = useState<string>('3000');
  const [customNote, setCustomNote] = useState('Monthly Mess Subscription');
  const [selectedStudentForQr, setSelectedStudentForQr] = useState<string>('');

  // Generated QR data URL
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [soundboxLanguage, setSoundboxLanguage] = useState<'hindi' | 'english' | 'marathi'>('hindi');

  // File upload for custom QR
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active view tab inside module
  const [activeTab, setActiveTab] = useState<'standee' | 'quick_qr' | 'settings' | 'soundbox'>('standee');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    const cfg = await fetchMessUpiConfig();
    setUpiConfig(cfg);
    if (cfg.upiPayeeName) setMessDisplayName(cfg.upiPayeeName);
    setIsLoading(false);
  };

  // Generate UPI QR whenever upiId, customAmount, or dynamic mode changes
  useEffect(() => {
    generateUpiQr();
  }, [upiConfig.upiId, upiConfig.upiPayeeName, isDynamicAmount, customAmount, customNote, upiConfig.upiQrCodeImage]);

  const generateUpiQr = async () => {
    if (upiConfig.upiQrCodeImage) {
      // If user uploaded a physical QR photo/scan, use it
      setQrDataUrl(upiConfig.upiQrCodeImage);
      return;
    }

    try {
      const upiId = upiConfig.upiId || 'moryamess@upi';
      const payee = encodeURIComponent(upiConfig.upiPayeeName || 'Morya Mess');
      let upiUri = `upi://pay?pa=${upiId}&pn=${payee}&cu=INR`;

      if (isDynamicAmount && Number(customAmount) > 0) {
        upiUri += `&am=${Number(customAmount).toFixed(2)}`;
        if (customNote) {
          upiUri += `&tn=${encodeURIComponent(customNote)}`;
        }
      }

      const url = await QRCode.toDataURL(upiUri, {
        width: 600,
        margin: 2,
        color: {
          dark: theme === 'midnight' ? '#000000' : '#0f172a',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      });
      setQrDataUrl(url);
    } catch (e) {
      console.error('Failed to generate UPI QR:', e);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    const res = await saveMessUpiConfig(upiConfig);
    if (res.success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
    setIsSaving(false);
  };

  const handleCopyUpiId = () => {
    if (!upiConfig.upiId) return;
    navigator.clipboard.writeText(upiConfig.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleCustomFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      setUpiConfig(prev => ({ ...prev, upiQrCodeImage: b64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadQrPng = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `MORYA_MESS_UPI_QR_${isDynamicAmount ? `Rs${customAmount}_` : ''}${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintStandee = () => {
    window.print();
  };

  // Soundbox Voice Test Simulator
  const handlePlaySoundbox = (amt: number = Number(customAmount) || 2500) => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported on this browser.');
      return;
    }

    window.speechSynthesis.cancel();
    setIsSpeaking(true);

    let message = '';
    let langCode = 'hi-IN';

    if (soundboxLanguage === 'hindi') {
      message = `पेटीएम पर ${amt} रुपये प्राप्त हुए! मोरया मेस की तरफ से धन्यवाद।`;
      langCode = 'hi-IN';
    } else if (soundboxLanguage === 'marathi') {
      message = `फोनपे वर ${amt} रुपये प्राप्त झाले! मोरया मेस धन्यवाद।`;
      langCode = 'mr-IN';
    } else {
      message = `Payment of ${amt} Rupees received via UPI on Morya Mess. Thank you!`;
      langCode = 'en-IN';
    }

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = langCode;
    utterance.rate = 0.95;
    utterance.pitch = 1.05;

    utterance.onend = () => {
      setIsSpeaking(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Student specific quick QR
  const handleSelectStudentForQr = (customerId: string) => {
    setSelectedStudentForQr(customerId);
    const student = customers.find(c => c.id === customerId);
    if (student) {
      const dues = student.balance && student.balance > 0 ? student.balance : 3000;
      setIsDynamicAmount(true);
      setCustomAmount(dues.toString());
      setCustomNote(`${student.name} - Mess Dues`);
    }
  };

  // WhatsApp share dynamic payment link
  const handleShareWhatsAppPaymentRequest = () => {
    const student = customers.find(c => c.id === selectedStudentForQr);
    const amt = customAmount || '3000';
    const upiLink = `upi://pay?pa=${upiConfig.upiId}&pn=${encodeURIComponent(upiConfig.upiPayeeName)}&am=${amt}&cu=INR&tn=${encodeURIComponent(customNote)}`;

    const text = `🍽️ *${messDisplayName.toUpperCase()}* 🍽️\n\nNamaste ${student?.name || 'Student'} ji,\nYour mess fee request for *₹${Number(amt).toLocaleString('en-IN')}* has been generated.\n\n📲 *Click to Pay directly via UPI:* \n${upiLink}\n\n💳 *UPI ID:* \`${upiConfig.upiId}\`\nBeneficiary: *${upiConfig.upiPayeeName}*\n\n_After payment, please share your UTR screenshot or entry in Student App for instant verification._\nThank you! 🙏`;

    const phone = student?.phone ? student.phone.replace(/\D/g, '') : '';
    const waUrl = phone ? `https://wa.me/91${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  // Theme configurations for Standee
  const themeStyles = {
    saffron: {
      bg: 'bg-gradient-to-b from-amber-500 via-orange-600 to-amber-700',
      headerBadge: 'bg-amber-400 text-orange-950',
      border: 'border-amber-400',
      cardBg: 'bg-white',
      accentText: 'text-orange-700',
      accentFill: 'bg-orange-600'
    },
    midnight: {
      bg: 'bg-gradient-to-b from-slate-900 via-zinc-900 to-black',
      headerBadge: 'bg-amber-400 text-slate-950',
      border: 'border-amber-500/60',
      cardBg: 'bg-white',
      accentText: 'text-slate-900',
      accentFill: 'bg-slate-900'
    },
    emerald: {
      bg: 'bg-gradient-to-b from-emerald-600 via-teal-700 to-emerald-900',
      headerBadge: 'bg-emerald-300 text-emerald-950',
      border: 'border-emerald-300',
      cardBg: 'bg-white',
      accentText: 'text-emerald-700',
      accentFill: 'bg-emerald-600'
    },
    navy: {
      bg: 'bg-gradient-to-b from-blue-700 via-indigo-800 to-slate-950',
      headerBadge: 'bg-cyan-300 text-indigo-950',
      border: 'border-cyan-400',
      cardBg: 'bg-white',
      accentText: 'text-indigo-700',
      accentFill: 'bg-indigo-600'
    }
  };

  const currentTheme = themeStyles[theme];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Back to Billing & Payments"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-orange-600" />
                <span>Mess Payment QR & UPI ID Standee Studio</span>
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Cloud Synced VPA
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Design printable counter standees, configure official UPI VPA, dynamic amount QRs, and soundbox voice announcements
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => handlePlaySoundbox()}
            disabled={isSpeaking}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs shadow-xs transition cursor-pointer ${
              isSpeaking 
                ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse' 
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
            }`}
          >
            <Volume2 className="w-4 h-4 text-indigo-600" />
            <span>{isSpeaking ? 'Announcing...' : 'Test Soundbox'}</span>
          </button>

          <button
            onClick={handlePrintStandee}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-300" />
            <span>Print Standee</span>
          </button>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('standee')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer ${
            activeTab === 'standee'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>🎨 Standee Designer & Print Preview</span>
        </button>

        <button
          onClick={() => setActiveTab('quick_qr')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer ${
            activeTab === 'quick_qr'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>⚡ Dynamic Amount & Student Dues QR</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>⚙️ Official UPI ID & Bank Config</span>
        </button>

        <button
          onClick={() => setActiveTab('soundbox')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer ${
            activeTab === 'soundbox'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Volume2 className="w-4 h-4" />
          <span>🔊 Soundbox Audio Simulation</span>
        </button>
      </div>

      {/* TAB 1: STANDEE DESIGNER & PRINT PREVIEW */}
      {activeTab === 'standee' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Panel (Left 5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                <Sparkles className="w-4 h-4 text-orange-600" />
                <span>Standee Styling & Customization</span>
              </h2>

              {/* Theme Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Theme & Color Scheme</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setTheme('saffron')}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left cursor-pointer transition ${
                      theme === 'saffron' ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-400/20' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600"></span>
                    <span className="text-xs font-bold text-slate-800">Royal Saffron & Gold</span>
                  </button>

                  <button
                    onClick={() => setTheme('midnight')}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left cursor-pointer transition ${
                      theme === 'midnight' ? 'border-slate-900 bg-slate-100 ring-2 ring-slate-900/20' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-gradient-to-tr from-zinc-800 to-black"></span>
                    <span className="text-xs font-bold text-slate-800">Midnight Gold Luxury</span>
                  </button>

                  <button
                    onClick={() => setTheme('emerald')}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left cursor-pointer transition ${
                      theme === 'emerald' ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-400/20' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-700"></span>
                    <span className="text-xs font-bold text-slate-800">Emerald Fresh Green</span>
                  </button>

                  <button
                    onClick={() => setTheme('navy')}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left cursor-pointer transition ${
                      theme === 'navy' ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-400/20' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-900"></span>
                    <span className="text-xs font-bold text-slate-800">Executive Navy Blue</span>
                  </button>
                </div>
              </div>

              {/* Format Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Standee Physical Format</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setFormat('a5_tent')}
                    className={`p-2.5 rounded-xl border text-center cursor-pointer transition ${
                      format === 'a5_tent' ? 'border-orange-500 bg-orange-50 font-bold text-orange-950' : 'border-slate-200 hover:bg-slate-50 text-slate-700 text-xs'
                    }`}
                  >
                    <p className="text-xs font-bold">A5 Tent</p>
                    <p className="text-3xs text-slate-500">Acrylic Standee</p>
                  </button>
                  <button
                    onClick={() => setFormat('a4_poster')}
                    className={`p-2.5 rounded-xl border text-center cursor-pointer transition ${
                      format === 'a4_poster' ? 'border-orange-500 bg-orange-50 font-bold text-orange-950' : 'border-slate-200 hover:bg-slate-50 text-slate-700 text-xs'
                    }`}
                  >
                    <p className="text-xs font-bold">A4 Poster</p>
                    <p className="text-3xs text-slate-500">Wall / Notice</p>
                  </button>
                  <button
                    onClick={() => setFormat('pocket_card')}
                    className={`p-2.5 rounded-xl border text-center cursor-pointer transition ${
                      format === 'pocket_card' ? 'border-orange-500 bg-orange-50 font-bold text-orange-950' : 'border-slate-200 hover:bg-slate-50 text-slate-700 text-xs'
                    }`}
                  >
                    <p className="text-xs font-bold">Pocket Card</p>
                    <p className="text-3xs text-slate-500">Counter Desk</p>
                  </button>
                </div>
              </div>

              {/* Text Fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-2xs font-bold text-slate-600 mb-1">Mess Display Title</label>
                  <input
                    type="text"
                    value={messDisplayName}
                    onChange={(e) => setMessDisplayName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-slate-600 mb-1">Tagline / Hygiene Subtitle</label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-bold text-slate-600 mb-1">Helpline Phone Number</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Export Buttons */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={handleDownloadQrPng}
                  className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Ultra High-Res Standee (PNG)</span>
                </button>

                <button
                  onClick={handlePrintStandee}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-amber-300" />
                  <span>Print Direct (100% Scale To Paper)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Standee Live Print Preview (Right 7 Cols) */}
          <div className="lg:col-span-7">
            <div className="bg-slate-100 p-6 rounded-2xl border border-slate-200 flex justify-center items-center overflow-auto">
              {/* Printable Standee Sheet */}
              <div 
                id="printable-standee" 
                className={`w-full max-w-sm rounded-3xl p-6 text-center text-white shadow-xl relative overflow-hidden transition-all ${currentTheme.bg}`}
              >
                {/* Background Decor Circles */}
                <div className="absolute -top-12 -right-12 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
                <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none"></div>

                {/* Top Badge */}
                <div className="flex justify-center mb-3">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-2xs font-black uppercase tracking-wider shadow-xs ${currentTheme.headerBadge}`}>
                    <Store className="w-3.5 h-3.5" />
                    <span>Official Verified Merchant</span>
                  </span>
                </div>

                {/* Header Title */}
                <h1 className="text-2xl font-black tracking-tight leading-tight uppercase drop-shadow-xs">
                  {messDisplayName}
                </h1>
                <p className="text-2xs text-white/90 font-medium mt-1 mb-4 px-2">
                  {tagline}
                </p>

                {/* White QR Card Container */}
                <div className="bg-white p-5 rounded-2xl shadow-lg border-2 border-white/40 max-w-xs mx-auto">
                  <div className="relative flex justify-center items-center">
                    {qrDataUrl ? (
                      <img 
                        src={qrDataUrl} 
                        alt="Mess UPI QR Code" 
                        className="w-56 h-56 object-contain rounded-xl"
                      />
                    ) : (
                      <div className="w-56 h-56 flex items-center justify-center bg-slate-50 text-slate-400">
                        Loading QR...
                      </div>
                    )}
                  </div>

                  {/* Dynamic Amount Banner if enabled */}
                  {isDynamicAmount && Number(customAmount) > 0 && (
                    <div className="mt-3 bg-amber-50 border border-amber-200 py-1.5 px-3 rounded-xl text-center">
                      <span className="text-3xs font-bold text-amber-800 uppercase tracking-wide">Amount Due: </span>
                      <span className="text-sm font-black text-amber-950">₹{Number(customAmount).toLocaleString('en-IN')}</span>
                      {customNote && <p className="text-3xs text-amber-700 truncate">{customNote}</p>}
                    </div>
                  )}

                  {/* UPI ID display */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-slate-800 text-xs px-1">
                    <span className="text-3xs font-black uppercase tracking-wider text-slate-400">UPI ID:</span>
                    <span className="font-black text-slate-900 tracking-tight font-mono text-2xs">{upiConfig.upiId}</span>
                  </div>
                </div>

                {/* Accepted Apps Badges */}
                <div className="mt-4 pt-3 border-t border-white/20">
                  <p className="text-3xs font-black uppercase tracking-widest text-white/80 mb-2">
                    ALL UPI APPS ACCEPTED HERE
                  </p>
                  <div className="flex items-center justify-center gap-2 flex-wrap text-2xs font-black text-slate-900">
                    <span className="bg-white px-2.5 py-1 rounded-lg shadow-xs">GPay</span>
                    <span className="bg-white px-2.5 py-1 rounded-lg shadow-xs">PhonePe</span>
                    <span className="bg-white px-2.5 py-1 rounded-lg shadow-xs">Paytm</span>
                    <span className="bg-white px-2.5 py-1 rounded-lg shadow-xs">BHIM</span>
                    <span className="bg-white px-2.5 py-1 rounded-lg shadow-xs">AmazonPay</span>
                  </div>
                </div>

                {/* Footer Helpline */}
                <div className="mt-3 text-3xs text-white/80 font-medium">
                  Help Desk: <span className="font-bold text-white">{contactPhone}</span>
                </div>

                {/* Folding Cut Mark Guide for A5 Tent */}
                {format === 'a5_tent' && (
                  <div className="mt-4 pt-2 border-t border-dashed border-white/40 text-3xs text-white/70">
                    ✂️ Cut along line & fold for acrylic table tent display
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DYNAMIC AMOUNT & STUDENT DUES QR */}
      {activeTab === 'quick_qr' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-orange-600" />
                <span>On-The-Spot Dynamic Amount QR Generator</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate dynamic QR pre-filled with the student's exact pending fee. The student scans and pays without typing the amount!
              </p>
            </div>

            {/* Quick Student Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Auto-fill from Student Profile & Outstanding Balance
              </label>
              <select
                value={selectedStudentForQr}
                onChange={(e) => handleSelectStudentForQr(e.target.value)}
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium bg-slate-50"
              >
                <option value="">-- Or Choose Custom Amount Below --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone || 'No phone'}) — Due: ₹{(c.balance || 0).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            {/* Preset Amount Chips */}
            <div>
              <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Quick Fee Presets
              </label>
              <div className="flex flex-wrap gap-2">
                {['3000', '3200', '1600', '1500', '1000', '500', '100'].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setIsDynamicAmount(true);
                      setCustomAmount(preset);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      customAmount === preset && isDynamicAmount
                        ? 'bg-orange-600 text-white border-orange-600'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    ₹{preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount & Note Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Requested Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-black text-slate-400">₹</span>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => {
                      setIsDynamicAmount(true);
                      setCustomAmount(e.target.value);
                    }}
                    placeholder="Enter amount"
                    className="w-full pl-7 pr-3 py-2 text-xs font-black rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Transaction Note</label>
                <input
                  type="text"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="e.g. May Mess Fee"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleShareWhatsAppPaymentRequest}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Send Payment Link on WhatsApp</span>
              </button>

              <button
                onClick={handleDownloadQrPng}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Save PNG</span>
              </button>
            </div>
          </div>

          {/* Right Live Preview Box */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-2xl text-center max-w-xs w-full">
              <span className="text-2xs font-black text-orange-800 uppercase tracking-widest bg-orange-200/60 px-2.5 py-0.5 rounded-full">
                Instant UPI Scanner
              </span>

              <div className="my-3 flex justify-center">
                {qrDataUrl && (
                  <img src={qrDataUrl} alt="Dynamic QR" className="w-52 h-52 object-contain bg-white p-2 rounded-xl border border-orange-100 shadow-xs" />
                )}
              </div>

              <div className="bg-white p-3 rounded-xl border border-orange-100">
                <p className="text-xs text-slate-500 font-medium">Locked Scan Amount</p>
                <p className="text-2xl font-black text-slate-900">₹{Number(customAmount || 0).toLocaleString('en-IN')}</p>
                <p className="text-3xs text-slate-500 mt-0.5 truncate">{customNote}</p>
              </div>

              <p className="text-3xs text-slate-400 mt-2">
                UPI ID: <span className="font-mono font-bold text-slate-700">{upiConfig.upiId}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: OFFICIAL UPI ID & BANK SETTINGS */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-orange-600" />
              <span>Official Mess UPI ID & Bank Settlement VPA</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Updates your mess UPI ID across the entire system (Student portal, counter standees, and auto-generated receipts).
            </p>
          </div>

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>UPI settings saved to Supabase cloud successfully!</span>
            </div>
          )}

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Official UPI VPA ID (Virtual Payment Address)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={upiConfig.upiId}
                  onChange={(e) => setUpiConfig({ ...upiConfig, upiId: e.target.value })}
                  placeholder="e.g. moryamess@okaxis or 9876543210@paytm"
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono font-bold"
                  required
                />
                <button
                  type="button"
                  onClick={handleCopyUpiId}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  {copiedUpi ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-3xs text-slate-400 mt-1">
                This is where all student money is credited directly. Ensure zero typos.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Merchant / Business Name (As registered in bank)
              </label>
              <input
                type="text"
                value={upiConfig.upiPayeeName}
                onChange={(e) => setUpiConfig({ ...upiConfig, upiPayeeName: e.target.value })}
                placeholder="e.g. Morya Mess Pune"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                required
              />
            </div>

            {/* Custom Standee QR Image Upload */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Optional: Upload Bank-Issued Standee QR Photo
              </label>
              <p className="text-3xs text-slate-500 mb-2">
                If your bank provided an official physical standee QR (PhonePe / BharatPe / Paytm merchant sticker), you can upload its image here.
              </p>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleCustomFileUpload}
                className="hidden"
              />

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Choose Image File</span>
                </button>

                {upiConfig.upiQrCodeImage && (
                  <button
                    type="button"
                    onClick={() => setUpiConfig({ ...upiConfig, upiQrCodeImage: '' })}
                    className="text-xs text-rose-600 hover:underline cursor-pointer font-bold"
                  >
                    Reset To Auto-Generated QR
                  </button>
                )}
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving Settings...' : 'Save UPI Settings to Cloud'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: SOUNDBOX VOICE SIMULATION */}
      {activeTab === 'soundbox' && (
        <div className="max-w-2xl bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-indigo-600" />
              <span>Mess UPI Audio Soundbox Simulator</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulates real-time voice announcements like Paytm / PhonePe Soundbox for busy lunch/dinner rush hours.
            </p>
          </div>

          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-4">
            <div>
              <label className="block text-xs font-bold text-indigo-950 mb-1.5">Announcement Language</label>
              <div className="flex gap-2">
                {(['hindi', 'marathi', 'english'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setSoundboxLanguage(lang)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition cursor-pointer ${
                      soundboxLanguage === lang
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-indigo-900 border border-indigo-200 hover:bg-indigo-100'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-indigo-950 mb-1.5">Simulate Payment of:</label>
              <div className="flex flex-wrap gap-2">
                {[100, 500, 1500, 2500, 3000].map(amt => (
                  <button
                    key={amt}
                    onClick={() => handlePlaySoundbox(amt)}
                    disabled={isSpeaking}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-indigo-100 border border-indigo-300 text-indigo-950 font-black text-xs transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>₹{amt} Received</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 text-3xs text-indigo-700">
              💡 Tip: Keep sound on your device to let customers hear voice confirmation during counter rush.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
