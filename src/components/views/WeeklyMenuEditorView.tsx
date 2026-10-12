import React, { useState, useEffect } from 'react';
import { WeeklyMenuSchedule, DayMenuDetail } from '../../types/mess';
import { loadWeeklyMenu, saveWeeklyMenu } from '../../lib/ownerModulesStorage';
import { fetchWeeklyMenuFromSupabase, saveWeeklyMenuToSupabase } from '../../lib/ownerFeaturesApi';
import { pushSyncToServer } from '../../lib/syncEngine';
import { 
  Utensils, 
  ArrowLeft, 
  Save, 
  CheckCircle2, 
  Sparkles, 
  Calendar, 
  Clock, 
  RotateCcw,
  Send,
  Printer,
  Copy,
  Check,
  Flame,
  Plus
} from 'lucide-react';

interface WeeklyMenuEditorViewProps {
  onBack: () => void;
}

const DAYS: { key: keyof WeeklyMenuSchedule; label: string; sub: string }[] = [
  { key: 'monday', label: 'Monday', sub: 'सोमवार' },
  { key: 'tuesday', label: 'Tuesday', sub: 'मंगळवार' },
  { key: 'wednesday', label: 'Wednesday', sub: 'बुधवार' },
  { key: 'thursday', label: 'Thursday', sub: 'गुरुवार' },
  { key: 'friday', label: 'Friday', sub: 'शुक्रवार' },
  { key: 'saturday', label: 'Saturday', sub: 'शनिवार' },
  { key: 'sunday', label: 'Sunday', sub: 'रविवार (Special)' }
];

const PRESET_FEASTS = [
  {
    name: 'Special Paneer Feast',
    lunch: { special: 'Matar Paneer', dal: 'Dal Tadka', roti: 'Fresh Chapati (4 pcs)', rice: 'Jeera Rice', sweet: 'Gulab Jamun' },
    dinner: { special: 'Sev Tamatar Bhaji', dal: 'Dal Fry', roti: 'Hot Phulka Roti', rice: 'Steamed Rice', sweet: 'Pickle & Salad' }
  },
  {
    name: 'Maharashtrian Traditional',
    lunch: { special: 'Batata Rassa & Methi Sabji', dal: 'Varan / Amti', roti: 'Tawa Chapati', rice: 'Indrayani Rice', sweet: 'Kanda Bhaji' },
    dinner: { special: 'Shev Bhaji Kolhapuri', dal: 'Dal Tadka', roti: 'Bhakri / Chapati', rice: 'Masala Bhat', sweet: 'Salad & Thecha' }
  },
  {
    name: 'Punjabi Chole Special',
    lunch: { special: 'Amritsari Chole', dal: 'Kadi Pakoda', roti: 'Bhature / Puri', rice: 'Jeera Rice', sweet: 'Boondi Raita' },
    dinner: { special: 'Mix Veg Korma', dal: 'Dal Fry', roti: 'Tawa Roti', rice: 'Plain Rice', sweet: 'Papad & Salad' }
  },
  {
    name: 'Sunday Grand Feast',
    lunch: { special: 'Shahi Paneer / Special Thali', dal: 'Dal Makhani', roti: 'Ghee Puri', rice: 'Veg Pulao', sweet: 'Puran Poli / Shrikhand' },
    dinner: { special: 'Khichdi Kadi / Light Dinner', dal: 'Kadi', roti: 'Papad', rice: 'Moong Dal Khichdi', sweet: 'Pickle' }
  }
];

export const WeeklyMenuEditorView: React.FC<WeeklyMenuEditorViewProps> = ({ onBack }) => {
  const [menu, setMenu] = useState<WeeklyMenuSchedule>(loadWeeklyMenu());
  const [activeDay, setActiveDay] = useState<keyof WeeklyMenuSchedule>('monday');
  const [isSaved, setIsSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchWeeklyMenuFromSupabase().then(m => {
      if (m) setMenu(m);
    });
  }, []);

  const activeDayDetail = menu[activeDay] || {
    lunchSpecial: '', lunchDal: '', lunchRoti: '', lunchRice: '', lunchSweet: '',
    dinnerSpecial: '', dinnerDal: '', dinnerRoti: '', dinnerRice: '', dinnerSweet: ''
  };

  const handleUpdateField = (field: keyof DayMenuDetail, value: string) => {
    setMenu(prev => ({
      ...prev,
      [activeDay]: {
        ...prev[activeDay],
        [field]: value
      }
    }));
    setIsSaved(false);
  };

  const handleApplyPreset = (preset: typeof PRESET_FEASTS[0]) => {
    setMenu(prev => ({
      ...prev,
      [activeDay]: {
        lunchSpecial: preset.lunch.special,
        lunchDal: preset.lunch.dal,
        lunchRoti: preset.lunch.roti,
        lunchRice: preset.lunch.rice,
        lunchSweet: preset.lunch.sweet,
        dinnerSpecial: preset.dinner.special,
        dinnerDal: preset.dinner.dal,
        dinnerRoti: preset.dinner.roti,
        dinnerRice: preset.dinner.rice,
        dinnerSweet: preset.dinner.sweet
      }
    }));
    setIsSaved(false);
  };

  const handleSave = async () => {
    saveWeeklyMenu(menu);
    await saveWeeklyMenuToSupabase(menu);
    await pushSyncToServer({ weeklyMenu: [menu] });
    setIsSaved(true);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('morya_menu_updated'));
    }
    setTimeout(() => setIsSaved(false), 3000);
  };

  const buildWeeklyMenuWhatsApp = (): string => {
    let text = `🍱 *साप्ताहिक मेस मेनू वेळापत्रक (Weekly Menu Schedule) — मोर्या मेस*\n\n`;
    DAYS.forEach(d => {
      const dayData = menu[d.key];
      text += `📅 *${d.label.toUpperCase()} (${d.sub}):*\n`;
      text += `☀️ *दुपारी (Lunch):* ${dayData?.lunchSpecial || 'भाजी'}, ${dayData?.lunchDal || 'डाळ'}, ${dayData?.lunchRoti || 'चपाती'}, ${dayData?.lunchRice || 'भात'}${dayData?.lunchSweet ? `, ${dayData.lunchSweet}` : ''}\n`;
      text += `🌙 *रात्री (Dinner):* ${dayData?.dinnerSpecial || 'भाजी'}, ${dayData?.dinnerDal || 'डाळ'}, ${dayData?.dinnerRoti || 'चपाती'}, ${dayData?.dinnerRice || 'भात'}${dayData?.dinnerSweet ? `, ${dayData.dinnerSweet}` : ''}\n\n`;
    });
    text += `🙏 *टीप:* गरमागरम आणि चवदार घरगुती जेवणासाठी नेहमी तत्पर. धन्यवाद!`;
    return text;
  };

  const handleShareWhatsApp = () => {
    const text = buildWeeklyMenuWhatsApp();
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopy = () => {
    const text = buildWeeklyMenuWhatsApp();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
              <Utensils className="w-5 h-5 text-orange-600" />
              <span>Weekly Dining Menu Timetable Editor</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Plan and publish daily Lunch & Dinner timetables directly visible on the Student App in real time
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isSaved && (
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Published Live!</span>
            </span>
          )}

          <button
            onClick={handleCopy}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Text'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            title="Print A4 Kitchen Menu Wall Poster"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print A4 Poster</span>
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-emerald-600" />
            <span>WhatsApp Broadcast</span>
          </button>

          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-xs font-black flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Publish Live</span>
          </button>
        </div>
      </div>

      {/* DAYS TABS BAR */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {DAYS.map(day => {
          const isActive = activeDay === day.key;
          return (
            <button
              key={day.key}
              onClick={() => setActiveDay(day.key)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition shrink-0 cursor-pointer text-left border ${
                isActive
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-500 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="block font-black text-sm">{day.label}</span>
              <span className={`text-[10px] block ${isActive ? 'text-orange-100' : 'text-slate-400'}`}>
                {day.sub}
              </span>
            </button>
          );
        })}
      </div>

      {/* QUICK PRESETS PICKER */}
      <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-amber-700" />
          <span className="text-xs font-black text-amber-900">1-Click Popular Feast Presets:</span>
          <span className="text-[11px] text-amber-700">Tap to auto-fill {DAYS.find(d => d.key === activeDay)?.label}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {PRESET_FEASTS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleApplyPreset(preset)}
              className="px-3 py-1.5 bg-white hover:bg-amber-100 border border-amber-300 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs flex items-center gap-1"
            >
              <Plus className="w-3 h-3 text-orange-600" />
              <span>{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* EDITING COLUMNS: LUNCH VS DINNER */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* LUNCH CARD */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-orange-100">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">☀️</span>
              <div>
                <h3 className="font-black text-slate-900 text-base">Lunch Menu (दुपारचे जेवण)</h3>
                <span className="text-xs text-slate-400">Timing: 10:30 AM to 02:30 PM</span>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 border border-orange-200">
              Shift 1
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Main Special Sabji / Curry</label>
              <input
                type="text"
                placeholder="e.g. Paneer Butter Masala / Sev Bhaji..."
                value={activeDayDetail.lunchSpecial}
                onChange={(e) => handleUpdateField('lunchSpecial', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Dal / Gravy Item</label>
              <input
                type="text"
                placeholder="e.g. Dal Tadka / Dal Fry / Kolhapuri Kat..."
                value={activeDayDetail.lunchDal}
                onChange={(e) => handleUpdateField('lunchDal', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Roti / Chapati</label>
                <input
                  type="text"
                  placeholder="e.g. Hot Tawa Chapati..."
                  value={activeDayDetail.lunchRoti}
                  onChange={(e) => handleUpdateField('lunchRoti', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Rice / Bhat</label>
                <input
                  type="text"
                  placeholder="e.g. Steamed Rice / Jeera Rice..."
                  value={activeDayDetail.lunchRice}
                  onChange={(e) => handleUpdateField('lunchRice', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Salad / Sweet / Accompaniments</label>
              <input
                type="text"
                placeholder="e.g. Gulab Jamun / Kanda Salad / Papad..."
                value={activeDayDetail.lunchSweet || ''}
                onChange={(e) => handleUpdateField('lunchSweet', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>

        {/* DINNER CARD */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🌙</span>
              <div>
                <h3 className="font-black text-slate-900 text-base">Dinner Menu (रात्रीचे जेवण)</h3>
                <span className="text-xs text-slate-400">Timing: 07:30 PM to 09:45 PM (Mon-Sat)</span>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
              Shift 2
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Main Special Sabji / Curry</label>
              <input
                type="text"
                placeholder="e.g. Chole Masala / Mix Veg..."
                value={activeDayDetail.dinnerSpecial}
                onChange={(e) => handleUpdateField('dinnerSpecial', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Dal / Gravy Item</label>
              <input
                type="text"
                placeholder="e.g. Dal Fry / Moong Dal..."
                value={activeDayDetail.dinnerDal}
                onChange={(e) => handleUpdateField('dinnerDal', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Roti / Chapati</label>
                <input
                  type="text"
                  placeholder="e.g. Phulka Chapati..."
                  value={activeDayDetail.dinnerRoti}
                  onChange={(e) => handleUpdateField('dinnerRoti', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Rice / Bhat</label>
                <input
                  type="text"
                  placeholder="e.g. Rice / Khichdi..."
                  value={activeDayDetail.dinnerRice}
                  onChange={(e) => handleUpdateField('dinnerRice', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Salad / Sweet / Dessert</label>
              <input
                type="text"
                placeholder="e.g. Sheera / Kheer / Pickled Chutney..."
                value={activeDayDetail.dinnerSweet || ''}
                onChange={(e) => handleUpdateField('dinnerSweet', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
