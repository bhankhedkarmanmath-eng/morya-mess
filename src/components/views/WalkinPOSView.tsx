import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { WalkinMealType, WalkinPOSToken } from '../../types/mess';
import { 
  loadWalkinMealTypes, 
  loadWalkinTokens, 
  createWalkinToken 
} from '../../lib/ownerModulesStorage';
import { fetchMessUpiConfig } from '../../lib/ownerFeaturesApi';
import { 
  DollarSign, 
  ArrowLeft, 
  Printer, 
  Plus, 
  Minus, 
  QrCode, 
  CheckCircle2, 
  Utensils, 
  Receipt,
  User,
  Phone,
  Sparkles,
  Smartphone
} from 'lucide-react';

interface WalkinPOSViewProps {
  onBack: () => void;
  onNavigateMealTypes?: () => void;
  onNavigateHistory?: () => void;
}

export const WalkinPOSView: React.FC<WalkinPOSViewProps> = ({
  onBack,
  onNavigateMealTypes,
  onNavigateHistory
}) => {
  const [mealTypes, setMealTypes] = useState<WalkinMealType[]>([]);
  const [selectedMealTypeId, setSelectedMealTypeId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [guestName, setGuestName] = useState('Guest Diner');
  const [guestPhone, setGuestPhone] = useState('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi'>('cash');
  const [utrRef, setUtrRef] = useState('');
  const [lastIssuedToken, setLastIssuedToken] = useState<WalkinPOSToken | null>(null);
  const [upiQrDataUrl, setUpiQrDataUrl] = useState('');

  useEffect(() => {
    const types = loadWalkinMealTypes().filter(t => t.isActive);
    setMealTypes(types);
    if (types.length > 0) {
      setSelectedMealTypeId(types[0].id);
    }
  }, []);

  const activeMealType = mealTypes.find(t => t.id === selectedMealTypeId);
  const totalAmount = (activeMealType?.price || 80) * quantity;

  // Generate UPI QR for instant walk-in payment
  useEffect(() => {
    if (paymentMode === 'upi' && totalAmount > 0) {
      fetchMessUpiConfig().then(cfg => {
        const upiUrl = `upi://pay?pa=${encodeURIComponent(cfg.upiId)}&pn=${encodeURIComponent(cfg.upiPayeeName)}&am=${totalAmount}&cu=INR&tn=WalkinPOS`;
        QRCode.toDataURL(upiUrl, { width: 220, margin: 1 }).then(setUpiQrDataUrl);
      });
    }
  }, [paymentMode, totalAmount]);

  const handleIssueToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMealType) return;

    const token = createWalkinToken({
      guestName: guestName.trim() || 'Guest Diner',
      guestPhone: guestPhone.trim() || undefined,
      mealTypeId: activeMealType.id,
      mealTypeName: activeMealType.name,
      quantity,
      ratePerMeal: activeMealType.price,
      totalAmount,
      paymentMode,
      utrReference: paymentMode === 'upi' ? utrRef.trim() : undefined,
      recordedBy: 'Counter Staff',
      status: 'paid'
    });

    setLastIssuedToken(token);
    setGuestName('Guest Diner');
    setGuestPhone('');
    setUtrRef('');
    setQuantity(1);
  };

  const handlePrintToken = () => {
    window.print();
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
              <DollarSign className="w-5 h-5 text-orange-600" />
              <span>Walk-in POS & Guest Dining Counter</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Issue instant dining meal tokens for guest visitors, parents, and walk-in customers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
          {onNavigateMealTypes && (
            <button
              onClick={onNavigateMealTypes}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
            >
              Configure Meal Rates
            </button>
          )}
          {onNavigateHistory && (
            <button
              onClick={onNavigateHistory}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition cursor-pointer"
            >
              Walk-in History
            </button>
          )}
        </div>
      </div>

      {/* POS Grid: Ordering Panel + Live Token Receipt */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Order Form */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-5">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Utensils className="w-4 h-4 text-orange-600" />
              <span>Select Meal Thali & Quantity</span>
            </h3>

            {/* Meal Type Radio Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {mealTypes.map(meal => (
                <div
                  key={meal.id}
                  onClick={() => setSelectedMealTypeId(meal.id)}
                  className={`p-4 rounded-2xl border-2 transition cursor-pointer relative ${
                    selectedMealTypeId === meal.id
                      ? 'border-orange-500 bg-orange-50/30'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-black text-slate-900 text-sm">{meal.name}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{meal.description}</p>
                    </div>
                    <span className="text-base font-black text-orange-600 shrink-0">
                      ₹{meal.price}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <span className="font-bold text-xs text-slate-800 block">Quantity (Number of Thalis)</span>
                <span className="text-[11px] text-slate-400">Total plates to be served</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-100 transition cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-black text-lg text-slate-900 w-8 text-center">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-100 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Customer Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Guest Diner Name</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Guest / Visitor Name"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-900"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Mobile Number (Optional)</label>
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="10-digit mobile"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-900"
                />
              </div>
            </div>

            {/* Payment Method Toggle */}
            <div className="space-y-3">
              <label className="font-bold text-xs text-slate-700 block">Payment Method</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMode('cash')}
                  className={`p-3.5 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                    paymentMode === 'cash'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-black'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Cash Payment (Counter)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMode('upi')}
                  className={`p-3.5 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                    paymentMode === 'upi'
                      ? 'border-orange-500 bg-orange-50 text-orange-950 font-black'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-orange-600" />
                  <span>UPI / QR Scan</span>
                </button>
              </div>

              {paymentMode === 'upi' && (
                <div className="p-4 rounded-2xl bg-orange-50/50 border border-orange-200 flex flex-col sm:flex-row items-center gap-4 text-xs">
                  {upiQrDataUrl && (
                    <img src={upiQrDataUrl} alt="UPI QR" className="w-28 h-28 rounded-xl border border-white shadow-xs" />
                  )}
                  <div className="space-y-2 flex-1">
                    <span className="font-bold text-slate-800 block">Scan to Pay ₹{totalAmount}</span>
                    <input
                      type="text"
                      placeholder="Optional 12-digit UTR ref from guest..."
                      value={utrRef}
                      onChange={(e) => setUtrRef(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Total and Submit */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase block">Total Payable</span>
                <span className="text-2xl font-black text-slate-900">₹{totalAmount}</span>
              </div>

              <button
                type="button"
                onClick={handleIssueToken}
                className="px-6 py-3 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs shadow-md transition cursor-pointer flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Collect ₹{totalAmount} & Issue Token</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Col: Printed Token Receipt Card */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4 print:border-none">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                Digital Token Preview
              </h3>
              {lastIssuedToken && (
                <button
                  onClick={handlePrintToken}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                  title="Print Token"
                >
                  <Printer className="w-4 h-4" />
                </button>
              )}
            </div>

            {lastIssuedToken ? (
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-5 text-center space-y-3 bg-slate-50/50">
                <span className="text-[10px] uppercase font-black tracking-widest text-orange-600">
                  MORYA MESS DINING TOKEN
                </span>

                <div className="text-4xl font-black text-slate-900 font-mono">
                  #{lastIssuedToken.tokenNumber}
                </div>

                <div className="text-xs space-y-1 text-slate-600 pt-2 border-t border-slate-200">
                  <div className="font-bold text-slate-900">{lastIssuedToken.mealTypeName}</div>
                  <div>Qty: <span className="font-bold">{lastIssuedToken.quantity} Plate(s)</span></div>
                  <div>Amount Paid: <span className="font-black text-emerald-700">₹{lastIssuedToken.totalAmount}</span> ({lastIssuedToken.paymentMode.toUpperCase()})</div>
                  <div className="text-[10px] text-slate-400 font-mono pt-1">
                    {new Date(lastIssuedToken.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(lastIssuedToken.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <button
                  onClick={handlePrintToken}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5 mt-2"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                Ready for token generation. Select items and click "Issue Token".
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
