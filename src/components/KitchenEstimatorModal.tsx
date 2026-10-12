import React, { useState, useMemo } from 'react';
import { 
  X, 
  ChefHat, 
  Plus, 
  Minus, 
  Sparkles, 
  Send, 
  Copy, 
  Check, 
  Scale, 
  Utensils, 
  Flame, 
  Clock, 
  Info,
  CheckCircle2,
  Users,
  Calendar,
  Languages,
  Printer,
  Package
} from 'lucide-react';
import { Customer, BusinessRulesConfig, MealLog } from '../types/mess';
import { getTodayString, evaluateStrictMessShift } from '../lib/storage';
import { getTodayActiveSkipsCount } from '../lib/autoPilotSuite';

interface KitchenEstimatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  rules?: BusinessRulesConfig;
  mealLogs?: MealLog[];
  onNavigateInventory?: () => void;
}

export const KitchenEstimatorModal: React.FC<KitchenEstimatorModalProps> = ({
  isOpen,
  onClose,
  customers,
  rules,
  mealLogs = [],
  onNavigateInventory
}) => {
  const today = getTodayString();
  const currentShiftAudit = evaluateStrictMessShift();
  const [shift, setShift] = useState<'lunch' | 'dinner'>(
    currentShiftAudit.mealType === 'dinner' ? 'dinner' : 'lunch'
  );
  const [extraBuffer, setExtraBuffer] = useState<number>(5);
  const [copied, setCopied] = useState(false);
  const [lang, setLang] = useState<'mr' | 'hi' | 'en'>('mr');

  // Filter Active Enrolled Members
  const activeMembers = useMemo(() => {
    return customers.filter(c => c.status === 'active');
  }, [customers]);

  const boysMembers = useMemo(() => {
    return activeMembers.filter(c => c.gender === 'male' || (c.gender !== 'female' && c.gender !== 'other'));
  }, [activeMembers]);

  const girlsMembers = useMemo(() => {
    return activeMembers.filter(c => c.gender === 'female');
  }, [activeMembers]);

  // Leaves Today
  const allLeaves = useMemo(() => {
    return customers.flatMap(c => (c.leaves || []).map(l => ({
      ...l,
      customerId: c.id,
      customerGender: c.gender
    })));
  }, [customers]);

  const leavesTodayRecords = useMemo(() => {
    return allLeaves.filter(l => (l.approved || (l as any).status === 'approved') && l.startDate <= today && l.endDate >= today);
  }, [allLeaves, today]);

  const boysOnLeave = useMemo(() => {
    return leavesTodayRecords.filter(l => l.customerGender !== 'female').length;
  }, [leavesTodayRecords]);

  const girlsOnLeave = useMemo(() => {
    return leavesTodayRecords.filter(l => l.customerGender === 'female').length;
  }, [leavesTodayRecords]);

  // Skips Today
  const totalSkips = getTodayActiveSkipsCount(shift);
  const boysRatio = boysMembers.length / Math.max(1, activeMembers.length);
  const boysSkips = Math.round(totalSkips * boysRatio);
  const girlsSkips = Math.max(0, totalSkips - boysSkips);

  // Buffer split
  const boysBuffer = Math.ceil(extraBuffer * 0.6);
  const girlsBuffer = Math.floor(extraBuffer * 0.4);

  // Net Expected Diners
  const netBoys = Math.max(0, boysMembers.length - boysOnLeave - boysSkips + boysBuffer);
  const netGirls = Math.max(0, girlsMembers.length - girlsOnLeave - girlsSkips + girlsBuffer);
  const totalCookCount = Math.max(1, netBoys + netGirls);

  // ROTI FORMULA: Boys 4, Girls 3
  const totalRotisNeeded = (netBoys * 4) + (netGirls * 3);
  const attaKg = ((totalRotisNeeded * 30) / 1000).toFixed(1);
  const riceKg = ((totalCookCount * 70) / 1000).toFixed(1);
  const dalKg = ((totalCookCount * 35) / 1000).toFixed(1);
  const sabjiKg = ((totalCookCount * 130) / 1000).toFixed(1);
  const oilLitres = ((totalCookCount * 20) / 1000).toFixed(1);

  if (!isOpen) return null;

  const buildWhatsAppText = (): string => {
    const shiftLabel = shift === 'lunch' ? 'दुपारचे जेवण (Lunch)' : 'रात्रीचे जेवण (Dinner)';
    if (lang === 'mr') {
      return `👨‍🍳 *किचन हेडकाउंट आणि स्वयंपाक अंदाज — ${rules?.messName || 'मोर्या मेस'}*\n📅 दिनांक: ${today} (${shiftLabel})\n\n👥 *अपेक्षित जेवणारे:* *${totalCookCount} विद्यार्थी*\n• मुले (४ पोळ्या): ${netBoys}\n• मुली (३ पोळ्या): ${netGirls}\n• सुट्टीवर (वजा): ${leavesTodayRecords.length}\n• बफर: +${extraBuffer}\n\n🥖 *एकूण पोळ्या:* *${totalRotisNeeded} चपात्या* (कणीक: ${attaKg} किलो)\n🍚 *तांदूळ:* ${riceKg} किलो\n🥣 *डाळ:* ${dalKg} किलो\n🥔 *भाज्या:* ${sabjiKg} किलो\n🛢️ *तेल:* ${oilLitres} लिटर`;
    }
    return `👨‍🍳 *Kitchen Headcount & Estimator — ${rules?.messName || 'Morya Mess'}*\nDate: ${today} (${shift.toUpperCase()})\n\nTotal Expected: ${totalCookCount} pax\n• Boys (4 Rotis): ${netBoys}\n• Girls (3 Rotis): ${netGirls}\n\nTotal Rotis: ${totalRotisNeeded} pcs (Atta: ${attaKg} kg)\nRice: ${riceKg} kg | Dal: ${dalKg} kg | Sabji: ${sabjiKg} kg | Oil: ${oilLitres} L`;
  };

  const handleShareWhatsApp = () => {
    const text = buildWhatsAppText();
    const cookPhone = rules?.contactPhone || '';
    const cleanDigits = cookPhone.replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopy = () => {
    const text = buildWhatsAppText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[94vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-amber-200 overflow-hidden my-auto">
        
        {/* HEADER - Sunset Terracotta (Zero black backgrounds) */}
        <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-inner shrink-0">
              <ChefHat className="w-5 h-5 text-amber-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Kitchen Headcount & Meal Estimator
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-400/30 border border-emerald-300/40 text-[10px] font-black uppercase text-emerald-100">
                  Roti Intelligence
                </span>
              </div>
              <p className="text-xs text-orange-100/90 font-medium">
                Accurate headcounts for Boys (4 rotis) and Girls (3 rotis) with raw material scaling
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

        {/* SHIFT & BUFFER CONTROLS */}
        <div className="px-5 py-3.5 bg-orange-50/60 border-b border-orange-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShift('lunch')}
              className={`px-4 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                shift === 'lunch'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-orange-200 hover:bg-orange-50'
              }`}
            >
              ☀️ Lunch Shift
            </button>
            <button
              onClick={() => setShift('dinner')}
              className={`px-4 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                shift === 'dinner'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-orange-200 hover:bg-orange-50'
              }`}
            >
              🌙 Dinner Shift
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-orange-200 shadow-2xs">
              <span className="text-xs font-bold text-slate-600">Guest Buffer:</span>
              <button
                onClick={() => setExtraBuffer(Math.max(0, extraBuffer - 2))}
                className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer"
              >
                -
              </button>
              <span className="text-xs font-black text-orange-600 w-6 text-center">+{extraBuffer}</span>
              <button
                onClick={() => setExtraBuffer(extraBuffer + 2)}
                className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer"
              >
                +
              </button>
            </div>

            {onNavigateInventory && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateInventory();
                }}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer"
              >
                <Package className="w-3.5 h-3.5 text-orange-600" />
                <span>Check Stock</span>
              </button>
            )}
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* BIG SUMMARY STATS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="p-4.5 rounded-2xl bg-orange-50/70 border border-orange-200 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Total Expected Diners</span>
              <div className="text-2xl sm:text-3xl font-black text-orange-600 mt-2">
                {totalCookCount} Members
              </div>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-600 font-semibold">
                <span>Boys: <strong>{netBoys}</strong></span>
                <span>•</span>
                <span>Girls: <strong>{netGirls}</strong></span>
                <span>•</span>
                <span>Leaves: <strong className="text-rose-600">-{leavesTodayRecords.length}</strong></span>
              </div>
            </div>

            <div className="p-4.5 rounded-2xl bg-amber-50/70 border border-amber-200 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Total Rotis to Roll</span>
              <div className="text-2xl sm:text-3xl font-black text-amber-700 mt-2">
                {totalRotisNeeded} Chapatis
              </div>
              <span className="text-[11px] text-slate-600 font-semibold block mt-1">
                Atta Required: <strong>{attaKg} KG</strong> (Flour)
              </span>
            </div>

            <div className="p-4.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Raw Rice to Cook</span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-2">
                {riceKg} KG Rice
              </div>
              <span className="text-[11px] text-slate-600 font-semibold block mt-1">
                Dal Required: <strong>{dalKg} KG</strong>
              </span>
            </div>
          </div>

          {/* ROTI INTELLIGENCE FORMULA BOX */}
          <div className="p-4.5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-600" />
              <span>Smart Roti Calculation Rule (User Formula)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-800 block text-sm">👦 Boys Consumption Formula</span>
                <p className="text-slate-600 mt-1">
                  <strong>4 Rotis per boy</strong> × {netBoys} active boys = <strong>{netBoys * 4} Chapatis</strong>
                </p>
                <span className="text-[11px] text-slate-400 block mt-1">Accounts for hostel student appetite</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-800 block text-sm">👧 Girls Consumption Formula</span>
                <p className="text-slate-600 mt-1">
                  <strong>3 Rotis per girl</strong> × {netGirls} active girls = <strong>{netGirls * 3} Chapatis</strong>
                </p>
                <span className="text-[11px] text-slate-400 block mt-1">Eliminates extra unconsumed rotis</span>
              </div>
            </div>
          </div>

          {/* RAW MATERIALS SCALE */}
          <div>
            <h3 className="font-black text-slate-900 text-sm mb-3 flex items-center gap-2">
              <Scale className="w-4 h-4 text-orange-600" />
              <span>Raw Materials Required from Pantry (किचन सामान वजन)</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 bg-white rounded-2xl border border-orange-200 text-center shadow-2xs">
                <span className="text-xl block mb-0.5">🌾</span>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Atta / Flour</span>
                <div className="text-lg font-black text-orange-600 mt-0.5">{attaKg} KG</div>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-slate-200 text-center shadow-2xs">
                <span className="text-xl block mb-0.5">🍚</span>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Raw Rice</span>
                <div className="text-lg font-black text-slate-800 mt-0.5">{riceKg} KG</div>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-slate-200 text-center shadow-2xs">
                <span className="text-xl block mb-0.5">🥣</span>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Toor/Moong Dal</span>
                <div className="text-lg font-black text-slate-800 mt-0.5">{dalKg} KG</div>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-slate-200 text-center shadow-2xs">
                <span className="text-xl block mb-0.5">🥔</span>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Sabji / Veggies</span>
                <div className="text-lg font-black text-slate-800 mt-0.5">{sabjiKg} KG</div>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-slate-200 text-center shadow-2xs">
                <span className="text-xl block mb-0.5">🛢️</span>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Cooking Oil</span>
                <div className="text-lg font-black text-slate-800 mt-0.5">{oilLitres} LTR</div>
              </div>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="p-4 bg-orange-50/70 rounded-2xl border border-orange-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-900 block">1-Click Dispatch to Cook / Maharaj</span>
              <span className="text-[11px] text-slate-500">Send clear headcount & ration checklist to WhatsApp</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Checklist'}</span>
              </button>

              <button
                onClick={handleShareWhatsApp}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>WhatsApp Maharaj</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
