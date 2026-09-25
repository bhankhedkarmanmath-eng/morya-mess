import React, { useState, useEffect } from 'react';
import { WeeklyMenuSchedule, DayMenuDetail } from '../../types/mess';
import { loadWeeklyMenu, saveWeeklyMenu } from '../../lib/ownerModulesStorage';
import { 
  Utensils, 
  ArrowLeft, 
  Save, 
  CheckCircle2, 
  Sparkles, 
  Calendar,
  Clock,
  RotateCcw
} from 'lucide-react';

interface WeeklyMenuEditorViewProps {
  onBack: () => void;
}

const DAYS: { key: keyof WeeklyMenuSchedule; label: string; sub: string }[] = [
  { key: 'monday', label: 'Monday', sub: 'Somwar' },
  { key: 'tuesday', label: 'Tuesday', sub: 'Mangalwar' },
  { key: 'wednesday', label: 'Wednesday', sub: 'Budhwar' },
  { key: 'thursday', label: 'Thursday', sub: 'Guruwar' },
  { key: 'friday', label: 'Friday', sub: 'Shukrawar' },
  { key: 'saturday', label: 'Saturday', sub: 'Shaniwar' },
  { key: 'sunday', label: 'Sunday', sub: 'Raviwar (Special)' }
];

export const WeeklyMenuEditorView: React.FC<WeeklyMenuEditorViewProps> = ({ onBack }) => {
  const [menu, setMenu] = useState<WeeklyMenuSchedule>(loadWeeklyMenu());
  const [activeDay, setActiveDay] = useState<keyof WeeklyMenuSchedule>('monday');
  const [isSaved, setIsSaved] = useState(false);

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

  const handleSave = () => {
    saveWeeklyMenu(menu);
    setIsSaved(true);
    // Broadcast event so Student Portal and counters update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
    }
    setTimeout(() => setIsSaved(false), 3000);
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
              Plan and publish daily Lunch & Dinner timetables directly visible on the Student App
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
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save & Publish Menu</span>
          </button>
        </div>
      </div>

      {/* Day Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {DAYS.map(d => (
          <button
            key={d.key}
            onClick={() => setActiveDay(d.key)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition cursor-pointer shrink-0 border ${
              activeDay === d.key
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div>{d.label}</div>
            <div className={`text-[10px] font-normal ${activeDay === d.key ? 'text-orange-400' : 'text-slate-400'}`}>
              {d.sub}
            </div>
          </button>
        ))}
      </div>

      {/* Editor Form for Selected Day */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lunch Shift Box */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <span>Lunch Shift Menu (11:00 AM – 02:30 PM)</span>
            </h3>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full uppercase">
              Day Shift
            </span>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Special Sabji / Main Gravy</label>
              <input
                type="text"
                value={activeDayDetail.lunchSpecial}
                onChange={(e) => handleUpdateField('lunchSpecial', e.target.value)}
                placeholder="e.g. Matar Paneer & Methi Sabji"
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Dal Preparation</label>
                <input
                  type="text"
                  value={activeDayDetail.lunchDal}
                  onChange={(e) => handleUpdateField('lunchDal', e.target.value)}
                  placeholder="e.g. Tadka Dal Fry"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Roti / Bread</label>
                <input
                  type="text"
                  value={activeDayDetail.lunchRoti}
                  onChange={(e) => handleUpdateField('lunchRoti', e.target.value)}
                  placeholder="e.g. Hot Wheat Chapati"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Rice Variety</label>
                <input
                  type="text"
                  value={activeDayDetail.lunchRice}
                  onChange={(e) => handleUpdateField('lunchRice', e.target.value)}
                  placeholder="e.g. Steamed Jeera Rice"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Sweet / Dessert (Optional)</label>
                <input
                  type="text"
                  value={activeDayDetail.lunchSweet || ''}
                  onChange={(e) => handleUpdateField('lunchSweet', e.target.value)}
                  placeholder="e.g. Gulab Jamun / Jalebi"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-900"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dinner Shift Box */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-indigo-600"></span>
              <span>Dinner Shift Menu (07:30 PM – 10:15 PM)</span>
            </h3>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">
              Night Shift
            </span>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Special Sabji / Dinner Dish</label>
              <input
                type="text"
                value={activeDayDetail.dinnerSpecial}
                onChange={(e) => handleUpdateField('dinnerSpecial', e.target.value)}
                placeholder="e.g. Sev Bhaji / Baingan Bharta"
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Dal / Kadhi</label>
                <input
                  type="text"
                  value={activeDayDetail.dinnerDal}
                  onChange={(e) => handleUpdateField('dinnerDal', e.target.value)}
                  placeholder="e.g. Moong Dal / Khichdi"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Roti / Bhakri</label>
                <input
                  type="text"
                  value={activeDayDetail.dinnerRoti}
                  onChange={(e) => handleUpdateField('dinnerRoti', e.target.value)}
                  placeholder="e.g. Phulka / Jowar Bhakri"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Rice / Pulao</label>
                <input
                  type="text"
                  value={activeDayDetail.dinnerRice}
                  onChange={(e) => handleUpdateField('dinnerRice', e.target.value)}
                  placeholder="e.g. Plain Rice / Masale Bhaat"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Dinner Sweet / Special</label>
                <input
                  type="text"
                  value={activeDayDetail.dinnerSweet || ''}
                  onChange={(e) => handleUpdateField('dinnerSweet', e.target.value)}
                  placeholder="e.g. Sheera / Fruit Custard"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-900"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
