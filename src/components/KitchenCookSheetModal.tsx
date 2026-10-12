import React, { useState, useMemo } from 'react';
import { 
  X, 
  ChefHat, 
  Send, 
  Copy, 
  Check, 
  Printer, 
  Users, 
  Utensils, 
  Sparkles, 
  Plus, 
  Minus, 
  Calendar, 
  AlertCircle, 
  Scale, 
  Flame, 
  Clock, 
  Languages, 
  CheckCircle2, 
  ShieldCheck,
  PackageCheck
} from 'lucide-react';
import { Customer, LeaveRecord, BusinessRulesConfig, MealLog } from '../types/mess';
import { generateMaharajCookSheet } from '../lib/autoPilotSuite';

interface KitchenCookSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  leaves: LeaveRecord[];
  rules: BusinessRulesConfig;
  defaultMealType?: 'lunch' | 'dinner';
  mealLogs?: MealLog[];
}

export const KitchenCookSheetModal: React.FC<KitchenCookSheetModalProps> = ({
  isOpen,
  onClose,
  customers,
  leaves,
  rules,
  defaultMealType = 'lunch',
  mealLogs = []
}) => {
  const [mealType, setMealType] = useState<'lunch' | 'dinner'>(defaultMealType);
  const [bufferCount, setBufferCount] = useState<number>(5);
  const [copied, setCopied] = useState<boolean>(false);
  const [customDish, setCustomDish] = useState<string>('');
  const [lang, setLang] = useState<'mr' | 'hi' | 'en'>('mr');

  // Active enrolled
  const activeCustomers = useMemo(() => {
    return customers.filter(c => c.status === 'active');
  }, [customers]);

  const boysCount = useMemo(() => {
    return activeCustomers.filter(c => c.gender === 'male' || (c.gender !== 'female' && c.gender !== 'other')).length;
  }, [activeCustomers]);

  const girlsCount = useMemo(() => {
    return activeCustomers.filter(c => c.gender === 'female').length;
  }, [activeCustomers]);

  // Leaves today
  const todayStr = new Date().toISOString().split('T')[0];
  const leavesToday = useMemo(() => {
    return customers.flatMap(c => (c.leaves || []).map(l => ({ ...l, customerGender: c.gender })))
      .filter(l => (l.approved || (l as any).status === 'approved') && l.startDate <= todayStr && l.endDate >= todayStr);
  }, [customers, todayStr]);

  const boysOnLeave = leavesToday.filter(l => l.customerGender !== 'female').length;
  const girlsOnLeave = leavesToday.filter(l => l.customerGender === 'female').length;

  const netBoys = Math.max(0, boysCount - boysOnLeave + Math.ceil(bufferCount * 0.6));
  const netGirls = Math.max(0, girlsCount - girlsOnLeave + Math.floor(bufferCount * 0.4));
  const totalDinersExpected = netBoys + netGirls;

  // Real-time scans today in this shift
  const todayScansInShift = useMemo(() => {
    return mealLogs.filter(m => m.date === todayStr && m.mealType === mealType && m.scanStatus === 'ALLOW').length;
  }, [mealLogs, todayStr, mealType]);

  const remainingToEat = Math.max(0, totalDinersExpected - todayScansInShift);

  // Roti Formula: Boys 4, Girls 3
  const totalRotis = (netBoys * 4) + (netGirls * 3);
  const attaKg = ((totalRotis * 30) / 1000).toFixed(1); // 30g flour per roti
  const riceKg = ((totalDinersExpected * 70) / 1000).toFixed(1); // 70g raw grain per plate
  const dalKg = ((totalDinersExpected * 35) / 1000).toFixed(1); // 35g raw dal per plate
  const sabjiKg = ((totalDinersExpected * 130) / 1000).toFixed(1); // 130g vegetables per plate
  const oilLitres = ((totalDinersExpected * 20) / 1000).toFixed(1); // 20ml oil per plate

  if (!isOpen) return null;

  // Generate localized text for Maharaj
  const generateMaharajText = (): string => {
    const shiftLabel = mealType === 'lunch' ? 'दुपारचे जेवण (LUNCH)' : 'रात्रीचे जेवण (DINNER)';
    const dish = customDish.trim() ? customDish : 'दैनिक स्पेशल मेनू';

    if (lang === 'mr') {
      return `👨‍🍳 *महाराज स्वयंपाक मोजमाप पत्रक — ${rules.messName || 'मोर्या मेस'}*\n📅 दिनांक: ${todayStr} (${shiftLabel})\n🍲 भाजी/मेनू: *${dish}*\n\n👥 *एकूण जेवणारे विद्यार्थी:* *${totalDinersExpected} जण*\n• मुले (४ पोळ्या): ${netBoys} जण\n• मुली (३ पोळ्या): ${netGirls} जण\n• एक्स्ट्रा बफर: +${bufferCount}\n\n📋 *नेमके मोजमाप (कच्चा माल):*\n🥖 *एकूण पोळ्या:* *${totalRotis} चपात्या* (कणीक: *${attaKg} किलो*)\n🍚 *कच्चा तांदूळ:* *${riceKg} किलो*\n🥣 *कच्ची डाळ:* *${dalKg} किलो*\n🥔 *भाजी/भाज्या:* *${sabjiKg} किलो*\n🛢️ *गोडेतेल:* *${oilLitres} लिटर*\n\n⚠️ *टीप:* गेटवर आतापर्यंत *${todayScansInShift}* स्कॅन झाले आहेत. बाकी *${remainingToEat}* विद्यार्थी शिल्लक आहेत.\nअन्न वाया जाऊ नये म्हणून शेवटच्या बॅचमध्ये गरजेनुसारच पोळ्या शेकाव्यात.`;
    }

    if (lang === 'hi') {
      return `👨‍🍳 *महाराज कुक क्वांटिटी शीट — ${rules.messName || 'मोर्या मेस'}*\n📅 तारीख: ${todayStr} (${mealType.toUpperCase()})\n🍲 सब्जी/मेनू: *${dish}*\n\n👥 *कुल भोजन सदस्य:* *${totalDinersExpected} लोग*\n• लड़के (4 रोटी): ${netBoys}\n• लड़कियां (3 रोटी): ${netGirls}\n• बफर: +${bufferCount}\n\n📋 *कच्ची सामग्री माप:*\n🥖 *कुल रोटी:* *${totalRotis} रोटियां* (आटा: *${attaKg} KG*)\n🍚 *कच्चा चावल:* *${riceKg} KG*\n🥣 *दाल:* *${dalKg} KG*\n🥔 *सब्जी:* *${sabjiKg} KG*\n🛢️ *कुकिंग ऑइल:* *${oilLitres} LTR*\n\nगेट पर अब तक *${todayScansInShift}* प्लेट्स स्कैन हो चुकी हैं। शेष *${remainingToEat}* लोग बाकी हैं।`;
    }

    return `👨‍🍳 *Cook Auto Ration Sheet — ${rules.messName || 'Morya Mess'}*\nDate: ${todayStr} | Shift: ${mealType.toUpperCase()}\n\nExpected Diners: ${totalDinersExpected} pax\nTotal Chapatis: ${totalRotis} pcs (Atta: ${attaKg} kg)\nRice: ${riceKg} kg | Dal: ${dalKg} kg | Sabji: ${sabjiKg} kg | Oil: ${oilLitres} L\n\nScans Arrived: ${todayScansInShift} | Pending: ${remainingToEat}`;
  };

  const handleShareWhatsApp = () => {
    const text = generateMaharajText();
    const cookPhone = rules.contactPhone || '';
    const cleanDigits = cookPhone.replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopy = () => {
    const text = generateMaharajText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[94vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-orange-200 overflow-hidden my-auto">
        
        {/* HEADER - Terracotta & Warm Orange (No black backgrounds) */}
        <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-inner shrink-0">
              <ChefHat className="w-5 h-5 text-amber-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Cook Auto Quantity Sheet (महाराज स्वयंपाक पत्रक)
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-400/30 border border-emerald-300/40 text-[10px] font-black uppercase text-emerald-100">
                  Zero Waste
                </span>
              </div>
              <p className="text-xs text-orange-100/90 font-medium">
                Live ration calculations based on enrolled boys (4 rotis) & girls (3 rotis) minus approved leaves
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
          {/* Shift Toggle */}
          <div className="flex items-center gap-1.5 p-1 bg-white border border-orange-200 rounded-xl shadow-2xs">
            <button
              onClick={() => setMealType('lunch')}
              className={`px-4 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                mealType === 'lunch' 
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ☀️ Lunch Shift
            </button>
            <button
              onClick={() => setMealType('dinner')}
              className={`px-4 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                mealType === 'dinner' 
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🌙 Dinner Shift
            </button>
          </div>

          {/* Buffer Stepper */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-orange-200 shadow-2xs">
              <span className="text-xs font-bold text-slate-600">Extra Buffer:</span>
              <button
                onClick={() => setBufferCount(Math.max(0, bufferCount - 2))}
                className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer"
              >
                -
              </button>
              <span className="text-xs font-black text-orange-600 w-6 text-center">+{bufferCount}</span>
              <button
                onClick={() => setBufferCount(bufferCount + 2)}
                className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer"
              >
                +
              </button>
            </div>

            {/* Language Selector */}
            <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl">
              <button
                onClick={() => setLang('mr')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                  lang === 'mr' ? 'bg-orange-500 text-white' : 'text-slate-600'
                }`}
              >
                मराठी
              </button>
              <button
                onClick={() => setLang('hi')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                  lang === 'hi' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                }`}
              >
                हिंदी
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                  lang === 'en' ? 'bg-indigo-600 text-white' : 'text-slate-600'
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* LIVE HEADCOUNT & ARRIVAL RADAR */}
          <div className="p-4.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/60">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Gate Arrival vs Expected Diners</span>
                <div className="text-2xl font-black text-slate-900 mt-0.5">
                  {totalDinersExpected} Expected Diners
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-bold">
                <div className="bg-white px-3 py-1.5 rounded-xl border border-emerald-200 text-emerald-800 shadow-2xs">
                  ✅ Arrived & Scanned: <strong>{todayScansInShift}</strong>
                </div>
                <div className="bg-white px-3 py-1.5 rounded-xl border border-amber-200 text-amber-800 shadow-2xs">
                  ⏳ Yet to Arrive: <strong>{remainingToEat}</strong>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-100">
                <span className="text-slate-500">Boys Active (4 Rotis)</span>
                <div className="font-black text-slate-800 text-sm mt-0.5">{netBoys} boys</div>
                <span className="text-[10px] text-slate-400">({boysOnLeave} on leave)</span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-100">
                <span className="text-slate-500">Girls Active (3 Rotis)</span>
                <div className="font-black text-slate-800 text-sm mt-0.5">{netGirls} girls</div>
                <span className="text-[10px] text-slate-400">({girlsOnLeave} on leave)</span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-100">
                <span className="text-slate-500">Approved Leaves</span>
                <div className="font-black text-rose-600 text-sm mt-0.5">-{leavesToday.length} skips</div>
                <span className="text-[10px] text-slate-400">Ration deducted</span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-100">
                <span className="text-slate-500">Leftover Safeguard</span>
                <div className="font-black text-emerald-700 text-sm mt-0.5">
                  {remainingToEat <= 5 && todayScansInShift > 0 ? '🛑 Stop Extra Rotis' : '🟢 Keep Baking'}
                </div>
                <span className="text-[10px] text-slate-400">Live theft & waste alert</span>
              </div>
            </div>
          </div>

          {/* RATION INGREDIENTS GRID */}
          <div>
            <h3 className="font-black text-slate-900 text-sm mb-3 flex items-center gap-2">
              <Scale className="w-4 h-4 text-orange-600" />
              <span>Exact Kitchen Ration Quantities (नेमके साहित्य वजन)</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {/* Chapatis / Atta */}
              <div className="bg-white p-3.5 rounded-2xl border-2 border-orange-200 shadow-2xs text-center">
                <span className="text-2xl block mb-1">🥖</span>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Total Chapatis</span>
                <div className="text-xl font-black text-orange-600 mt-1">{totalRotis} pcs</div>
                <div className="text-xs font-bold text-slate-700 mt-1 bg-orange-50 py-1 rounded-lg">
                  Atta: <strong>{attaKg} kg</strong>
                </div>
              </div>

              {/* Rice */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs text-center">
                <span className="text-2xl block mb-1">🍚</span>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Raw Rice (तांदूळ)</span>
                <div className="text-xl font-black text-slate-800 mt-1">{riceKg} kg</div>
                <div className="text-[11px] text-slate-500 mt-1 font-semibold">
                  Yields ~{((Number(riceKg) * 2.5)).toFixed(1)} kg cooked
                </div>
              </div>

              {/* Dal */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs text-center">
                <span className="text-2xl block mb-1">🥣</span>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Raw Dal (डाळ)</span>
                <div className="text-xl font-black text-slate-800 mt-1">{dalKg} kg</div>
                <div className="text-[11px] text-slate-500 mt-1 font-semibold">
                  Toor / Moong Mix
                </div>
              </div>

              {/* Vegetables */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs text-center">
                <span className="text-2xl block mb-1">🥔</span>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Sabji (भाज्या)</span>
                <div className="text-xl font-black text-slate-800 mt-1">{sabjiKg} kg</div>
                <div className="text-[11px] text-slate-500 mt-1 font-semibold">
                  Cleaned & chopped
                </div>
              </div>

              {/* Cooking Oil */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs text-center">
                <span className="text-2xl block mb-1">🛢️</span>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Cooking Oil (तेल)</span>
                <div className="text-xl font-black text-slate-800 mt-1">{oilLitres} L</div>
                <div className="text-[11px] text-slate-500 mt-1 font-semibold">
                  Tadka & Dough
                </div>
              </div>
            </div>
          </div>

          {/* CUSTOM DISH NOTE */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
            <span className="text-xs font-bold text-slate-600 shrink-0">Today&apos;s Special Dish:</span>
            <input
              type="text"
              placeholder="e.g. Paneer Bhurji / Matar Paneer / Sheera..."
              value={customDish}
              onChange={(e) => setCustomDish(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          {/* ACTIONS: 1-Click WhatsApp to Maharaj */}
          <div className="p-4 bg-orange-50/70 rounded-2xl border border-orange-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-900 block">1-Click Send to Maharaj / Cook</span>
              <span className="text-[11px] text-slate-500">Directly sends formatted Marathi / Hindi ration checklist to Maharaj&apos;s phone</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Slip</span>
              </button>

              <button
                onClick={handleCopy}
                className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
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
