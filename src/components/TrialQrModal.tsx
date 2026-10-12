import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  QrCode, 
  Printer, 
  Download, 
  Copy, 
  ExternalLink, 
  CheckCircle2, 
  Sparkles, 
  Utensils, 
  X, 
  ShieldCheck,
  Smartphone,
  Share2,
  Check,
  Zap,
  Flame,
  IndianRupee,
  PhoneCall,
  Sliders,
  Palette,
  Maximize2,
  Award,
  Layers,
  Radio,
  FileText
} from 'lucide-react';
import { BusinessRulesConfig } from '../types/mess';
import { fetchTrialStudents } from '../lib/ownerFeaturesApi';

interface TrialQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: BusinessRulesConfig;
  onOpenLivePreview?: () => void;
}

type StandeeTheme = 'saffron_royal' | 'emerald_fresh' | 'royal_indigo' | 'crimson_luxury' | 'cyber_sunset';
type StandeeFormat = 'table_tent_a5' | 'counter_a4' | 'notice_board_a3' | 'pocket_card';

export const TrialQrModal: React.FC<TrialQrModalProps> = ({
  isOpen,
  onClose,
  rules,
  onOpenLivePreview
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [standeeTheme, setStandeeTheme] = useState<StandeeTheme>('saffron_royal');
  const [standeeFormat, setStandeeFormat] = useState<StandeeFormat>('table_tent_a5');
  const [trialPrice, setTrialPrice] = useState<number>(70);
  const [highlightPerk, setHighlightPerk] = useState('Hot Tawa Chapatis & Unlimited Dal-Bhat');
  const [whatsappCopied, setWhatsappCopied] = useState(false);
  const [liveTrialCount, setLiveTrialCount] = useState<number>(0);
  const [showPortalPreview, setShowPortalPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Construct target public URL for trial student self check-in
  const getTrialUrl = () => {
    if (typeof window === 'undefined') return '';
    const host = window.location.hostname.toLowerCase();
    
    // In AI Studio Dev/Internal environment, use the public Shared URL so phone camera scanning works anywhere
    if (host.includes('ais-dev') || host.includes('googleusercontent') || host === 'localhost' || host === '127.0.0.1') {
      return 'https://ais-pre-cksq6uanqdaavz6ct6vlu7-176566267971.asia-southeast1.run.app/?portal=trial';
    }

    const origin = window.location.origin || `${window.location.protocol}//${window.location.host}`;
    return `${origin.replace(/\/+$/, '')}/?portal=trial`;
  };

  const trialUrl = getTrialUrl();

  useEffect(() => {
    if (!isOpen) return;

    // Fetch live trial count from Supabase
    fetchTrialStudents().then(res => {
      setLiveTrialCount(res.length);
    }).catch(() => {});

    // QR Color by theme
    let darkColor = '#7C2D12';
    if (standeeTheme === 'emerald_fresh') darkColor = '#064E3B';
    else if (standeeTheme === 'royal_indigo') darkColor = '#1E1B4B';
    else if (standeeTheme === 'crimson_luxury') darkColor = '#881337';
    else if (standeeTheme === 'cyber_sunset') darkColor = '#9A3412';

    // Generate crisp QR code
    QRCode.toDataURL(trialUrl, {
      width: 512,
      margin: 2,
      color: {
        dark: darkColor,
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'H'
    })
      .then((url: string) => {
        setQrDataUrl(url);
      })
      .catch((err: any) => {
        console.error('Failed to generate trial QR code:', err);
      });
  }, [isOpen, trialUrl, standeeTheme]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (!trialUrl) return;
    navigator.clipboard.writeText(trialUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `morya-mess-trial-qr-standee-${standeeTheme}.png`;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsAppInvite = () => {
    const text = `🍱 *${rules.messName || 'Morya Mess Pune'} — Special Trial Dining Pass* 🍱\n\nLooking for pure home-cooked hygienic meals near hostel? Try our 1-Day Trial Meal for just *₹${trialPrice}*!\n\n✨ *Today's Highlights:* ${highlightPerk}\n📲 *Instant Self Check-in Link:* ${trialUrl}\n\n👉 Scan our table standee or tap the link to get your instant digital dining pass!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    setWhatsappCopied(true);
    setTimeout(() => setWhatsappCopied(false), 2000);
  };

  // Theme-specific styles
  const getThemeClasses = () => {
    switch (standeeTheme) {
      case 'emerald_fresh':
        return {
          banner: 'bg-emerald-50 text-emerald-900 border-emerald-300',
          badge: 'bg-emerald-600 text-white',
          border: 'border-emerald-500',
          accent: 'text-emerald-700',
          gradient: 'from-emerald-600 to-teal-600',
          ring: 'ring-emerald-500/20'
        };
      case 'royal_indigo':
        return {
          banner: 'bg-indigo-50 text-indigo-900 border-indigo-300',
          badge: 'bg-indigo-600 text-white',
          border: 'border-indigo-500',
          accent: 'text-indigo-700',
          gradient: 'from-indigo-600 to-blue-700',
          ring: 'ring-indigo-500/20'
        };
      case 'crimson_luxury':
        return {
          banner: 'bg-rose-50 text-rose-900 border-rose-300',
          badge: 'bg-rose-600 text-white',
          border: 'border-rose-500',
          accent: 'text-rose-700',
          gradient: 'from-rose-600 to-pink-700',
          ring: 'ring-rose-500/20'
        };
      case 'cyber_sunset':
        return {
          banner: 'bg-amber-50 text-amber-900 border-amber-300',
          badge: 'bg-gradient-to-r from-orange-500 to-pink-600 text-white',
          border: 'border-orange-500',
          accent: 'text-orange-700',
          gradient: 'from-orange-500 to-rose-600',
          ring: 'ring-orange-500/20'
        };
      default:
        return {
          banner: 'bg-orange-50 text-orange-950 border-orange-300',
          badge: 'bg-gradient-to-r from-orange-600 to-amber-600 text-white',
          border: 'border-orange-500',
          accent: 'text-orange-800',
          gradient: 'from-orange-500 to-amber-500',
          ring: 'ring-orange-500/20'
        };
    }
  };

  const themeStyle = getThemeClasses();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-bold shadow-xs shadow-orange-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-slate-800 leading-tight">
                  Trial Student Standee Studio (Special QR Standee)
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <Radio className="w-2.5 h-2.5 text-emerald-600 animate-pulse" />
                  <span>Live Cloud Sync</span>
                </span>
              </div>
              <p className="text-xs text-orange-700 font-semibold mt-0.5">
                Self-Registration Acrylic Standee Designer with Multi-Theme Customizer & High-DPI Print Ready Posters
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customization Toolbar */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Theme Selector */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600 flex items-center gap-1">
              <Palette className="w-3.5 h-3.5 text-orange-600" />
              <span>Theme:</span>
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setStandeeTheme('saffron_royal')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer border ${
                  standeeTheme === 'saffron_royal' 
                    ? 'bg-orange-500 text-white border-orange-600 shadow-2xs' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Saffron Gold
              </button>
              <button
                onClick={() => setStandeeTheme('emerald_fresh')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer border ${
                  standeeTheme === 'emerald_fresh' 
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Emerald Fresh
              </button>
              <button
                onClick={() => setStandeeTheme('royal_indigo')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer border ${
                  standeeTheme === 'royal_indigo' 
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Royal Indigo
              </button>
              <button
                onClick={() => setStandeeTheme('crimson_luxury')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer border ${
                  standeeTheme === 'crimson_luxury' 
                    ? 'bg-rose-600 text-white border-rose-700 shadow-2xs' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Crimson Spice
              </button>
              <button
                onClick={() => setStandeeTheme('cyber_sunset')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer border ${
                  standeeTheme === 'cyber_sunset' 
                    ? 'bg-amber-600 text-white border-amber-700 shadow-2xs' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Cyber Sunset
              </button>
            </div>
          </div>

          {/* Format Selector */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Standee Format:</span>
            </span>
            <div className="flex items-center gap-1">
              {[
                { id: 'table_tent_a5', label: 'A5 Table Tent' },
                { id: 'counter_a4', label: 'A4 Counter' },
                { id: 'notice_board_a3', label: 'A3 Poster' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setStandeeFormat(f.id as any)}
                  className={`px-2 py-1 rounded-md font-bold text-[11px] cursor-pointer transition ${
                    standeeFormat === f.id
                      ? 'bg-slate-800 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price Selector */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600">Trial Price:</span>
            <div className="flex items-center gap-1">
              {[50, 60, 70, 80, 99].map(p => (
                <button
                  key={p}
                  onClick={() => setTrialPrice(p)}
                  className={`px-2 py-0.5 rounded-md font-bold text-[11px] cursor-pointer transition ${
                    trialPrice === p 
                      ? 'bg-orange-600 text-white' 
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  ₹{p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Highlight Perk Modifier Chips */}
        <div className="px-5 py-2.5 bg-white border-b border-slate-100 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="font-bold text-slate-500 shrink-0">Menu Perk:</span>
          {[
            'Hot Tawa Chapatis & Unlimited Dal-Bhat',
            'Pure Veg Thali + Sweet Gulab Jamun & Papad',
            'Hygienic Home-Cooked Pure Veg Taste',
            'Full Meal + Mineral Water + Pickle & Salad'
          ].map((perk, idx) => (
            <button
              key={idx}
              onClick={() => setHighlightPerk(perk)}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] whitespace-nowrap transition cursor-pointer border ${
                highlightPerk === perk
                  ? 'bg-orange-50 text-orange-800 border-orange-300 font-bold'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {perk}
            </button>
          ))}
        </div>

        {/* Printable Standee Preview Area */}
        <div className="p-4 sm:p-6 bg-slate-100/70 max-h-[58vh] overflow-y-auto">
          <div 
            ref={printRef}
            className={`rounded-3xl p-6 sm:p-8 border-2 shadow-md text-center space-y-4 max-w-md mx-auto transition-all bg-white ${themeStyle.border}`}
          >
            {/* Top Brand Banner */}
            <div className="space-y-1.5">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${themeStyle.banner}`}>
                <Sparkles className="w-3.5 h-3.5" />
                <span>OFFICIAL DINING PASS STANDEE</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {rules.messName || 'MORYA MESS'}
              </h2>
              <p className="text-xs text-slate-500 font-semibold">
                {rules.messSubtitle || 'Pure & Hygienic Tiffin & Dining Service Pune'}
              </p>
            </div>

            {/* Trial Offer Pill */}
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl shadow-xs ${themeStyle.badge}`}>
              <Flame className="w-4 h-4 text-yellow-200" />
              <span className="font-extrabold text-xs">Special 1-Day Trial Meal: ₹{trialPrice} Only</span>
            </div>

            {/* Trial QR Code Container */}
            <div className={`relative inline-block p-4 rounded-3xl bg-white border-2 shadow-lg ${themeStyle.border}`}>
              {qrDataUrl ? (
                <img 
                  src={qrDataUrl} 
                  alt="Trial Student QR Code" 
                  className="w-56 h-56 sm:w-64 sm:h-64 object-contain mx-auto"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-xs text-slate-400">
                  Generating High-Res QR Code...
                </div>
              )}

              {/* Floating Center Badge */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${themeStyle.gradient} text-white flex items-center justify-center font-black text-base shadow-lg border-2 border-white`}>
                  M
                </div>
              </div>
            </div>

            {/* Highlight Perk */}
            <div className="py-1 px-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800">
              ✨ {highlightPerk}
            </div>

            {/* Step Instructions */}
            <div className="space-y-2 pt-1">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold">
                <Smartphone className="w-4 h-4 text-orange-600" />
                <span>Scan With ANY Scanner / Google Lens / Phone Camera</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs text-slate-700 space-y-1 font-medium">
                <p className="flex items-center gap-1.5 font-bold text-slate-900">
                  <span className="w-4 h-4 rounded-full bg-orange-600 text-white text-[10px] flex items-center justify-center shrink-0">1</span>
                  <span>Scan QR Code with your mobile camera</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-slate-300 text-slate-700 text-[10px] flex items-center justify-center shrink-0">2</span>
                  <span>Select Lunch / Dinner shift & pay ₹{trialPrice}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-slate-300 text-slate-700 text-[10px] flex items-center justify-center shrink-0">3</span>
                  <span>Show instant Dining Pass token at counter</span>
                </p>
              </div>

              {rules.upiId && (
                <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-center gap-2">
                  <span>Mess Direct UPI:</span>
                  <strong className="font-mono text-slate-900 font-bold bg-white px-2 py-0.5 rounded-lg border border-slate-200">{rules.upiId}</strong>
                </div>
              )}
            </div>

            {/* Standee Base Cut/Fold Guide Note */}
            {standeeFormat === 'table_tent_a5' && (
              <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-dashed border-slate-300">
                [ Acrylic Standee Insert Size: 148mm × 210mm (A5) | Double Sided Display ]
              </div>
            )}
          </div>
        </div>

        {/* Live Standee Cloud Analytics Bar */}
        <div className="px-5 py-2.5 bg-orange-50/70 border-t border-orange-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-slate-700 font-medium">
              Live Standee Status: <strong className="text-slate-900">Active & Ready for Student Scans</strong>
            </span>
          </div>
          <div className="flex items-center gap-3 text-slate-600 font-semibold">
            <span>Total Guests Registered via Standee: <strong className="text-orange-700 font-black">{liveTrialCount} Students</strong></span>
          </div>
        </div>

        {/* Action Controls Toolbar */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-white space-y-3">
          {/* Quick Copy Link Row */}
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200">
            <input 
              type="text" 
              readOnly 
              value={trialUrl} 
              className="bg-transparent text-xs text-slate-700 font-mono w-full px-2 outline-none select-all truncate font-semibold"
            />
            <button
              onClick={handleCopyLink}
              className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-orange-50 text-slate-700 hover:text-orange-600 text-xs font-bold border border-slate-200 transition cursor-pointer shadow-2xs"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Link!' : 'Copy Link'}</span>
            </button>
          </div>

          {/* Action Buttons Grid */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
                title="Print Acrylic Standee Poster"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Print Standee</span>
              </button>

              <button
                onClick={handleDownloadQr}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
                title="Save High-Res QR Image"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span>Save QR Image</span>
              </button>

              <button
                onClick={handleShareWhatsAppInvite}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition cursor-pointer"
                title="Broadcast on WhatsApp"
              >
                <Share2 className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp Invite</span>
              </button>
            </div>

            <div className="flex items-center gap-2 ml-auto flex-wrap">
              {onOpenLivePreview && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenLivePreview();
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Preview In-App</span>
                </button>
              )}

              <a
                href={trialUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (typeof window !== 'undefined') {
                    window.open(trialUrl, '_blank', 'noopener,noreferrer');
                    e.preventDefault();
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black shadow-xs shadow-orange-500/25 transition cursor-pointer"
                title="Open standalone trial portal in new tab"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Test Standee Portal ↗</span>
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
