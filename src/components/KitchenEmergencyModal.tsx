import React, { useState, useEffect } from 'react';
import { 
  X, 
  Flame, 
  Send, 
  AlertTriangle, 
  CheckCircle2, 
  Bell, 
  Users, 
  Utensils, 
  Sparkles, 
  Radio, 
  Clock, 
  Trash2,
  ChefHat
} from 'lucide-react';
import { 
  KitchenEmergencyAlert, 
  getActiveEmergencyAlert, 
  publishEmergencyAlert, 
  clearEmergencyAlert 
} from '../lib/kitchenEmergencyService';
import { evaluateStrictMessShift } from '../lib/storage';

interface KitchenEmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  messName?: string;
}

export const KitchenEmergencyModal: React.FC<KitchenEmergencyModalProps> = ({
  isOpen,
  onClose,
  messName = 'Morya Mess'
}) => {
  const [activeAlert, setActiveAlert] = useState<KitchenEmergencyAlert | null>(null);
  const [alertType, setAlertType] = useState<'roti_shortage' | 'curry_shortage' | 'delayed_service' | 'general'>('roti_shortage');
  const [title, setTitle] = useState('⚠️ Chapati / Roti Emergency Notice');
  const [message, setMessage] = useState('Due to an unexpected kitchen emergency, chapati service is running limited. Unlimited hot rice, dal & sabji are available.');
  const [shortageItem, setShortageItem] = useState('Chapatis / Rotis');
  const [alternativeOffered, setAlternativeOffered] = useState('Hot Rice, Tadka Dal & Extra Sabji');
  const [justPublished, setJustPublished] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = getActiveEmergencyAlert();
      setActiveAlert(current);
      setJustPublished(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentShift = evaluateStrictMessShift().mealType === 'dinner' ? 'dinner' : 'lunch';

  const handleQuickPreset = (type: 'roti_shortage' | 'curry_shortage' | 'delayed_service' | 'general') => {
    setAlertType(type);
    if (type === 'roti_shortage') {
      setTitle('⚠️ Chapati / Roti Running Limited Today');
      setMessage('Due to sudden staff emergency, chapatis are running in limited stock. Unlimited hot rice, dal & sabji are fully available for everyone.');
      setShortageItem('Chapatis (Rotis)');
      setAlternativeOffered('Hot Steamed Rice, Dal & Sabji');
    } else if (type === 'curry_shortage') {
      setTitle('⚠️ Special Sabji Running Out — Alternative Ready');
      setMessage('Main vegetable curry is running low. Fresh alternative curry and hot dal are freshly prepared and being served.');
      setShortageItem('Main Vegetable Curry');
      setAlternativeOffered('Fresh Tadka Dal & Alternative Bhaji');
    } else if (type === 'delayed_service') {
      setTitle('⏳ Service Delayed by 15 Minutes');
      setMessage('Cooking batch is finishing up. Food service will start 15 minutes later than usual. We apologize for the wait.');
      setShortageItem('Fresh Batch Preparation');
      setAlternativeOffered('Seating Open & Hot Water / Drinking Water Available');
    } else {
      setTitle('📢 Important Kitchen Notice');
      setMessage('Please note the temporary operational update for today’s dining shift.');
      setShortageItem('General Kitchen Update');
      setAlternativeOffered('Standard Mess Menu Available');
    }
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    const published = publishEmergencyAlert({
      active: true,
      type: alertType,
      title: title.trim(),
      message: message.trim(),
      shortageItem: shortageItem.trim(),
      alternativeOffered: alternativeOffered.trim(),
      shift: currentShift
    });
    setActiveAlert(published);
    setJustPublished(true);
  };

  const handleClear = () => {
    clearEmergencyAlert();
    setActiveAlert(null);
    setJustPublished(false);
  };

  const handleShareWhatsAppGroup = () => {
    if (!activeAlert) return;
    const text = `🚩 *${messName} - Urgent Dining Notice* 🚩\n\n${activeAlert.title}\n\n${activeAlert.message}\n\n• *Affected Item:* ${activeAlert.shortageItem}\n• *Alternative Ready:* ${activeAlert.alternativeOffered}\n• *Shift:* ${activeAlert.shift.toUpperCase()} (${activeAlert.announcedAt})\n\n_We sincerely apologize for any inconvenience caused._\n— *Team ${messName}*`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4.5 bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-inner">
              <Flame className="w-5 h-5 text-amber-200 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Kitchen Emergency 1-Tap Broadcast
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-white/20 border border-white/30 text-[10px] font-black tracking-wide uppercase text-amber-100">
                  Instant Alert
                </span>
              </div>
              <p className="text-xs text-rose-100 font-medium">
                Broadcast shortage or delays directly to all student apps in 1 click
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ACTIVE STATUS BANNER */}
        {activeAlert && activeAlert.active && (
          <div className="px-6 py-3.5 bg-rose-50 border-b border-rose-200 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping shrink-0" />
              <div>
                <span className="font-black text-rose-900 block">BROADCAST IS CURRENTLY LIVE ON STUDENT APPS!</span>
                <span className="text-[11px] text-rose-700">
                  Posted at {activeAlert.announcedAt} for {activeAlert.shift.toUpperCase()} shift
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleShareWhatsAppGroup}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
              <button
                onClick={handleClear}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-100 border border-rose-300 text-rose-700 font-bold text-xs flex items-center gap-1 cursor-pointer transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>End Alert</span>
              </button>
            </div>
          </div>
        )}

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* PRESET CHIPS */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
              Select Emergency Reason Preset:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleQuickPreset('roti_shortage')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition text-left cursor-pointer ${
                  alertType === 'roti_shortage'
                    ? 'border-rose-500 bg-rose-50 text-rose-900 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                🥖 Roti / Chapati Shortage
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('curry_shortage')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition text-left cursor-pointer ${
                  alertType === 'curry_shortage'
                    ? 'border-rose-500 bg-rose-50 text-rose-900 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                🍲 Sabji / Curry Shortage
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('delayed_service')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition text-left cursor-pointer ${
                  alertType === 'delayed_service'
                    ? 'border-rose-500 bg-rose-50 text-rose-900 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                ⏳ 15m Service Delay
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('general')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition text-left cursor-pointer ${
                  alertType === 'general'
                    ? 'border-rose-500 bg-rose-50 text-rose-900 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                📢 Custom Kitchen Notice
              </button>
            </div>
          </div>

          {/* FORM */}
          <form onSubmit={handlePublish} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alert Title (Shown in bold on Student Home)
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-xs text-slate-900 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Student Explanation Message
              </label>
              <textarea
                required
                rows={3}
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-rose-500 leading-relaxed font-sans"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Item Running Short / Limited
                </label>
                <input
                  type="text"
                  required
                  value={shortageItem}
                  onChange={e => setShortageItem(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-rose-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alternative Offered (Compensation)
                </label>
                <input
                  type="text"
                  required
                  value={alternativeOffered}
                  onChange={e => setAlternativeOffered(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-rose-500 font-semibold"
                />
              </div>
            </div>

            {/* PREVIEW OF STUDENT APP BANNER */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-amber-600 text-white shadow-sm space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-200">
                  Student Live View Preview:
                </span>
              </div>
              <h4 className="font-black text-sm text-white">{title}</h4>
              <p className="text-xs text-rose-100 leading-relaxed">{message}</p>
              <div className="pt-1 flex items-center justify-between text-[11px] text-amber-100 font-bold border-t border-white/20">
                <span>⚠️ Limited: {shortageItem}</span>
                <span>✅ Available: {alternativeOffered}</span>
              </div>
            </div>

            {/* BUTTONS */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 active:scale-[0.98] text-white font-black text-xs shadow-md transition cursor-pointer flex items-center gap-2"
              >
                <Radio className="w-4 h-4 text-amber-200 animate-pulse" />
                <span>Publish Broadcast to All Students ➔</span>
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};
