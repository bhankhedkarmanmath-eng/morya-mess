import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { Customer } from '../types/mess';
import { calculateDaysRemaining, getStandardFee } from '../lib/storage';
import { X, Printer, Download, ShieldCheck, Phone, Calendar, MapPin, AlertCircle, Sparkles, Award, Clock, FileCheck, CheckCircle2 } from 'lucide-react';

interface CustomerCardPrintModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  messName?: string;
  messSubtitle?: string;
}

export const CustomerCardPrintModal: React.FC<CustomerCardPrintModalProps> = ({
  customer,
  isOpen,
  onClose,
  messName = 'MORYA MESS & HOSTEL DINING SERVICES',
  messSubtitle = 'Approved Tiffin & Meal Identity Authorization Pass'
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGeneratingDownload, setIsGeneratingDownload] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!customer) return;

    // Build standard tamper-evident QR payload containing token & version
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
      .catch(err => console.error('QR generation error:', err));
  }, [customer]);

  if (!isOpen || !customer) return null;

  const daysRemaining = calculateDaysRemaining(customer.endDate);
  const isExpired = daysRemaining < 0;
  const standardFee = getStandardFee(customer.gender, customer.planType);

  const handlePrint = () => {
    window.print();
  };

  // Generate and download full high-resolution colourful official pass document
  const handleDownloadColourfulPass = async () => {
    if (!customer || !qrDataUrl) return;
    setIsGeneratingDownload(true);

    try {
      const canvas = document.createElement('canvas');
      const width = 800;
      const height = 1180;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Base Background - Crisp ivory official document parchment
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // Subtle border pattern / outer document frame
      ctx.lineWidth = 12;
      ctx.strokeStyle = '#1E3A8A'; // Deep Navy Blue Frame
      ctx.strokeRect(10, 10, width - 20, height - 20);

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#D97706'; // Gold inner border
      ctx.strokeRect(20, 20, width - 40, height - 40);

      // 2. Official Header Tri-Color Top Ribbon
      ctx.fillStyle = '#FF9933'; // Saffron
      ctx.fillRect(22, 22, width - 44, 10);
      ctx.fillStyle = '#FFFFFF'; // White
      ctx.fillRect(22, 32, width - 44, 8);
      ctx.fillStyle = '#138808'; // Emerald Green
      ctx.fillRect(22, 40, width - 44, 10);

      // 3. Ganesh Mantra & Regd Emblem
      ctx.textAlign = 'center';
      ctx.fillStyle = '#7C2D12';
      ctx.font = 'bold 17px serif';
      ctx.fillText('MORYA MESS MANAGEMENT', width / 2, 74);

      // Official Title Header
      ctx.fillStyle = '#1E3A8A';
      ctx.font = '900 30px sans-serif';
      ctx.fillText('MORYA MESS & HOSTEL DINING', width / 2, 114);

      ctx.fillStyle = '#475569';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('Near Boys & Girls Hostel, College Road, Latur', width / 2, 138);

      ctx.fillStyle = '#B45309';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('OFFICIAL DIGITAL DINING PASS & IDENTITY CARD', width / 2, 160);

      // Header Divider Line
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(40, 175);
      ctx.lineTo(width - 40, 175);
      ctx.stroke();

      // 4. Pass Number & Issue Info Ribbon
      ctx.fillStyle = '#F1F5F9';
      ctx.fillRect(40, 185, width - 80, 36);
      ctx.strokeStyle = '#E2E8F0';
      ctx.strokeRect(40, 185, width - 80, 36);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`PASS ID: ${customer.id}`, 55, 208);

      ctx.textAlign = 'right';
      ctx.fillStyle = customer.gender === 'female' ? '#7E22CE' : '#1D4ED8';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(
        customer.gender === 'female' ? '★ CATEGORY: HOSTEL GIRL' : '★ CATEGORY: BOY / STUDENT',
        width - 55,
        208
      );

      // 5. Member Profile Information Box
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(40, 235, width - 80, 220);
      ctx.strokeStyle = '#E2E8F0';
      ctx.strokeRect(40, 235, width - 80, 220);

      // Member Name (Large & Clear)
      ctx.textAlign = 'left';
      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('NAME OF MEMBER:', 60, 265);
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText(customer.name.toUpperCase(), 60, 298);

      // Mobile Number & College
      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('MOBILE NUMBER:', 60, 335);
      ctx.fillStyle = '#1E293B';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(customer.phone ? `+91 ${customer.phone}` : 'NOT PROVIDED', 60, 360);

      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('HOSTEL / ROOM ADDRESS:', 420, 335);
      ctx.fillStyle = '#1E293B';
      ctx.font = 'bold 14px sans-serif';
      const addressText = customer.hostelOrAddress || 'Sahyadri Campus Area';
      ctx.fillText(addressText.substring(0, 32), 420, 360);

      // Plan Details & Fee
      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('PLAN SUBSCRIBED:', 60, 400);
      ctx.fillStyle = '#15803D';
      ctx.font = 'bold 16px sans-serif';
      const planLabel = customer.planType === 'monthly_1meal' ? '1-Time Meal (30 Days)' : '2-Times Daily (Lunch + Dinner, 30 Days)';
      ctx.fillText(`${planLabel} (₹${standardFee}/mo)`, 60, 426);

      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('COLLEGE / WORK:', 420, 400);
      ctx.fillStyle = '#1E293B';
      ctx.font = 'bold 14px sans-serif';
      const workText = customer.collegeOrWork || 'Student / Regular';
      ctx.fillText(workText.substring(0, 32), 420, 426);

      // 6. Validity Date Range Box (Gold/Emerald highlight)
      ctx.fillStyle = '#FEF3C7';
      ctx.fillRect(40, 470, width - 80, 80);
      ctx.strokeStyle = '#F59E0B';
      ctx.strokeRect(40, 470, width - 80, 80);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#92400E';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('OFFICIAL 30-DAY VALIDITY PERIOD', width / 2, 495);
      ctx.fillStyle = '#1E293B';
      ctx.font = 'bold 22px monospace';
      ctx.fillText(`${customer.startDate}   ➜   ${customer.endDate}`, width / 2, 530);

      // 7. Strict Mess Timings (Clear cut government document notice)
      ctx.fillStyle = '#FFF7ED';
      ctx.fillRect(40, 565, width - 80, 85);
      ctx.strokeStyle = '#FDBA74';
      ctx.strokeRect(40, 565, width - 80, 85);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#C2410C';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('STRICT MESS SHIFT TIMINGS', width / 2, 590);
      ctx.fillStyle = '#431407';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('☀️ LUNCH: 10:30 AM – 02:30 PM   |   🌙 DINNER: 08:30 PM – 10:30 PM', width / 2, 615);
      ctx.fillStyle = '#9A3412';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('⚠️ SUNDAY: Dinner Shift Closed', width / 2, 636);

      // 8. QR Code Image Embed
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        qrImg.onload = resolve;
        qrImg.onerror = reject;
        qrImg.src = qrDataUrl;
      });

      const qrBoxSize = 270;
      const qrBoxX = (width - qrBoxSize) / 2;
      const qrBoxY = 665;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(qrBoxX - 10, qrBoxY - 10, qrBoxSize + 20, qrBoxSize + 20);
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2;
      ctx.strokeRect(qrBoxX - 10, qrBoxY - 10, qrBoxSize + 20, qrBoxSize + 20);
      ctx.drawImage(qrImg, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`DIGITAL TOKEN: ${customer.qrToken ? customer.qrToken.substring(0, 24) : customer.id}`, width / 2, qrBoxY + qrBoxSize + 24);

      ctx.fillStyle = '#15803D';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('🛡️ SCAN AT MESS GATE FOR AUTOMATIC ATTENDANCE', width / 2, qrBoxY + qrBoxSize + 44);

      // 9. Official Seals & Signature Footer
      const footerY = 1040;
      ctx.strokeStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.moveTo(40, footerY);
      ctx.lineTo(width - 40, footerY);
      ctx.stroke();

      // Left Official Stamp
      ctx.fillStyle = '#1E3A8A';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('SECURITY VERIFIED PASS', 60, footerY + 25);
      ctx.fillStyle = '#64748B';
      ctx.font = '11px sans-serif';
      ctx.fillText('Non-transferable • Retain for 30 Days', 60, footerY + 45);

      // Right Authorized Signatory
      ctx.textAlign = 'right';
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('AUTHORIZED SIGNATORY', width - 60, footerY + 25);
      ctx.fillStyle = '#7C2D12';
      ctx.font = 'italic 12px serif';
      ctx.fillText('Morya Mess Management', width - 60, footerY + 45);

      // Convert to blob and download
      const dataUri = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUri;
      a.download = `MoryaMess_Official_Pass_${customer.name.replace(/\s+/g, '_')}_${customer.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Colourful pass generation error:', err);
      // Fallback: download raw QR
      handleDownloadQr();
    } finally {
      setIsGeneratingDownload(false);
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `MoryaMess-QR-${customer.id}-${customer.name.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-4 max-h-[95vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-xs">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Official Government-Style Dining Pass</h3>
              <p className="text-[11px] text-slate-500">Official 30-Day Digital Pass & Identity Card</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable & Preview Card Area */}
        <div className="p-4 sm:p-6 bg-slate-100 flex flex-col items-center overflow-y-auto">
          {/* Government Document Pass Container */}
          <div
            ref={cardRef}
            id="printable-mess-card"
            className="w-full max-w-md bg-white rounded-2xl border-4 border-slate-900 shadow-lg text-slate-900 relative overflow-hidden p-1"
          >
            {/* Inner Gold Border */}
            <div className="border border-amber-500 rounded-xl p-4 bg-white relative">
              {/* Top Tricolour Ribbon */}
              <div className="h-1.5 w-full -mt-4 mb-3 flex rounded-t overflow-hidden">
                <div className="h-full w-1/3 bg-[#FF9933]"></div>
                <div className="h-full w-1/3 bg-white"></div>
                <div className="h-full w-1/3 bg-[#138808]"></div>
              </div>

              {/* Official Header */}
              <div className="flex flex-col items-center pb-3 border-b-2 border-slate-200 mb-3 text-center">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 tracking-wider mb-0.5">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>MORYA MESS MANAGEMENT</span>
                </div>
                
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase">
                  {messName}
                </h1>
                <p className="text-[10px] font-semibold text-slate-600">
                  Official Digital Dining Pass & Identity Card
                </p>

                <div className="flex items-center justify-between w-full mt-2 pt-2 border-t border-slate-100 text-[11px]">
                  <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    ID: {customer.id}
                  </span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                    customer.gender === 'female' 
                      ? 'bg-orange-100 text-orange-800 border border-orange-200' 
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}>
                    {customer.gender === 'female' ? 'GIRLS HOSTEL MEMBER' : 'BOYS HOSTEL MEMBER'}
                  </span>
                </div>
              </div>

              {/* Member Details */}
              <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200 mb-3 space-y-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Member Name
                  </span>
                  <div className="font-black text-slate-900 text-sm tracking-wide">
                    {customer.name.toUpperCase()}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 font-bold block">Mobile:</span>
                    <a 
                      href={`tel:${customer.phone}`}
                      className="font-bold text-orange-700 hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3 text-emerald-600" />
                      <span>{customer.phone || 'N/A'}</span>
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Plan Rate:</span>
                    <span className="font-black text-emerald-700">
                      ₹{standardFee} / 30 Days
                    </span>
                  </div>
                </div>

                {customer.hostelOrAddress && (
                  <div className="text-[11px] text-slate-600 truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{customer.hostelOrAddress}</span>
                  </div>
                )}
              </div>

              {/* Official 30-Day Validity Highlight */}
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 mb-3 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block mb-0.5">
                  Official 30-Day Validity
                </span>
                <div className="font-mono font-black text-xs sm:text-sm text-slate-900 flex items-center justify-center gap-2">
                  <span>{customer.startDate}</span>
                  <span className="text-amber-600 font-sans">➔</span>
                  <span className={isExpired ? 'text-rose-600' : 'text-orange-700'}>{customer.endDate}</span>
                </div>
                <div className="text-[10px] font-semibold text-amber-800 mt-0.5">
                  {isExpired ? '⚠️ Plan Expired' : `${daysRemaining} Days Remaining`}
                </div>
              </div>

              {/* Strict Mess Timings Box */}
              <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200 mb-3 text-center text-xs">
                <div className="font-bold text-rose-900 flex items-center justify-center gap-1 text-[11px] mb-1">
                  <Clock className="w-3.5 h-3.5 text-rose-600" />
                  <span>STRICT MESS HOURS</span>
                </div>
                <div className="text-[11px] font-bold text-slate-800 space-y-0.5">
                  <div>☀️ Lunch: 10:30 AM – 02:30 PM</div>
                  <div>🌙 Dinner: 08:30 PM – 10:30 PM</div>
                  <div className="text-[10px] text-rose-700 font-semibold pt-0.5">
                    🚫 Sunday Dinner Shift Closed
                  </div>
                </div>
              </div>

              {/* QR Code Centerpiece */}
              <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border-2 border-slate-900 mb-3">
                {qrDataUrl ? (
                  <img 
                    src={qrDataUrl} 
                    alt={`Official QR Code for ${customer.name}`}
                    className="w-44 h-44 rounded-lg object-contain"
                  />
                ) : (
                  <div className="w-44 h-44 bg-slate-100 rounded-lg flex items-center justify-center text-xs text-slate-400">
                    Generating Official QR...
                  </div>
                )}
                <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-emerald-700">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>AUTOMATIC ATTENDANCE VERIFIED</span>
                </div>
                <span className="text-[9px] font-mono text-slate-400 mt-0.5">
                  TOKEN: {customer.qrToken ? customer.qrToken.substring(0, 18) + '...' : customer.id}
                </span>
              </div>

              {/* Official Seal and Signatory */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-500">
                <div>
                  <span className="font-bold text-slate-700 block">SECURITY CERTIFIED</span>
                  <span>Non-transferable pass</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-800 block">MORYA MESS</span>
                  <span className="italic">Authorized Signatory</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadColourfulPass}
              disabled={isGeneratingDownload}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-700 text-white font-bold hover:bg-orange-800 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingDownload ? 'Generating Pass...' : 'Download Digital Pass'}</span>
            </button>
            <button
              onClick={handleDownloadQr}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              title="Download raw QR image"
            >
              <span>Only QR</span>
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Pass</span>
          </button>
        </div>
      </div>
    </div>
  );
};
