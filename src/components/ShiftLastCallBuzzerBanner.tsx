import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  BellRing, 
  Volume2, 
  VolumeX, 
  Clock, 
  Flame, 
  Lock, 
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { evaluateStrictMessShift } from '../lib/storage';
import { 
  playLastCallChime, 
  playGateClosingBuzzer, 
  isGateSoundEnabled, 
  setGateSoundEnabled 
} from '../lib/shiftBellAudio';
import { MessShiftAudit } from '../types/mess';

interface ShiftLastCallBuzzerBannerProps {
  compact?: boolean;
  onShiftChange?: (shift: MessShiftAudit) => void;
}

export const ShiftLastCallBuzzerBanner: React.FC<ShiftLastCallBuzzerBannerProps> = ({
  compact = false,
  onShiftChange
}) => {
  const [shiftAudit, setShiftAudit] = useState<MessShiftAudit>(() => evaluateStrictMessShift());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => isGateSoundEnabled());
  const lastAlertedShiftRef = useRef<string | null>(null);

  useEffect(() => {
    const checkShift = () => {
      const current = evaluateStrictMessShift();
      setShiftAudit(current);
      if (onShiftChange) onShiftChange(current);

      // Auto chime when entering the 15-minute last-call window
      if (current.isLast15MinutesCall) {
        const alertKey = `${current.mealType}_last15_${new Date().getHours()}`;
        if (lastAlertedShiftRef.current !== alertKey) {
          lastAlertedShiftRef.current = alertKey;
          playLastCallChime();
        }
      }
    };

    checkShift();
    const interval = setInterval(checkShift, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, [onShiftChange]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setGateSoundEnabled(next);
    if (next) {
      playLastCallChime();
    }
  };

  const handleTestChime = (e: React.MouseEvent) => {
    e.stopPropagation();
    playLastCallChime();
  };

  const minsRemaining = shiftAudit.minutesRemainingInShift ?? 0;

  // 1. LAST 15 MINUTES CALL (URGENT ALERT MODE)
  if (shiftAudit.isLast15MinutesCall) {
    return (
      <div className={`w-full rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 text-white shadow-md border-2 border-amber-300 p-3 sm:p-3.5 flex items-center justify-between gap-3 animate-pulse`}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/30">
            <BellRing className="w-5 h-5 text-amber-200 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-black tracking-tight text-white uppercase flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-200 fill-amber-200" />
                LAST CALL: {shiftAudit.mealType.toUpperCase()} CLOSES IN {minsRemaining} MINS!
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white text-rose-700 text-[10px] font-black uppercase font-mono tracking-wider">
                {shiftAudit.shiftTimingLabel.split('–')[1]?.trim()} Closing
              </span>
            </div>
            <p className="text-[11px] text-amber-100 font-medium">
              Final batch of fresh hot rotis & plates. Gate scanner locks automatically at closing!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleTestChime}
            title="Play Chime Bell"
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold cursor-pointer transition"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Chime</span>
          </button>

          <button
            onClick={toggleSound}
            title={soundEnabled ? 'Mute Chime' : 'Unmute Chime'}
            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white cursor-pointer transition"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-amber-200" />}
          </button>
        </div>
      </div>
    );
  }

  // 2. SHIFT ACTIVE (> 15 MINS LEFT)
  if (shiftAudit.isShiftActive) {
    if (compact) {
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>{shiftAudit.shiftTimingLabel}</span>
          <span className="text-emerald-600 font-mono text-[10px]">({minsRemaining}m left)</span>
        </div>
      );
    }

    return (
      <div className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 text-white p-3 flex items-center justify-between gap-3 shadow-xs border border-emerald-400/30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-emerald-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wide text-white">
                ● {shiftAudit.mealType.toUpperCase()} SHIFT ACTIVE
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-200 font-bold">
                {shiftAudit.shiftTimingLabel}
              </span>
            </div>
            <p className="text-[11px] text-emerald-100 font-medium">
              Gate scanner active • Closing in {minsRemaining} minutes (Last call at {minsRemaining - 15 > 0 ? `${minsRemaining - 15}m` : 'now'}).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={toggleSound}
            title={soundEnabled ? 'Gate Chime On' : 'Gate Chime Muted'}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 cursor-pointer transition"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-emerald-200" />}
          </button>
        </div>
      </div>
    );
  }

  // 3. SHIFT CLOSED / GATE LOCKED (WARM ORANGE & RICH BROWN MIX-UP THEME)
  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-100 via-amber-100 to-amber-50 border-2 border-amber-400/80 text-amber-950 text-xs font-black shadow-2xs">
        <Lock className="w-3.5 h-3.5 text-amber-900" />
        <span>Gate Closed</span>
        {shiftAudit.nextShiftLabel && (
          <span className="text-orange-950 font-mono text-[10px] font-bold">({shiftAudit.nextShiftLabel})</span>
        )}
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl bg-gradient-to-r from-orange-50 via-amber-50 to-orange-100/60 text-slate-800 p-3 sm:p-3.5 flex items-center justify-between gap-3 shadow-xs border-2 border-amber-400/70 hover:border-amber-500 transition-all">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-950 via-amber-800 to-orange-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-950/20">
          <Lock className="w-4 h-4 text-amber-100" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black uppercase tracking-wide text-amber-950 flex items-center gap-1">
              🔒 GATE SCANNER CLOSED
            </span>
            {shiftAudit.nextShiftLabel && (
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-200 via-orange-200 to-amber-100 text-amber-950 border border-amber-400 font-extrabold shadow-2xs">
                Next: {shiftAudit.nextShiftLabel}
              </span>
            )}
          </div>
          <p className="text-[11px] text-amber-950/85 font-semibold mt-0.5 leading-snug">
            {shiftAudit.reason} Strict timings: Lunch (10:30 AM – 02:30 PM), Dinner (07:30 PM – 09:45 PM).
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={toggleSound}
          title={soundEnabled ? 'Gate Chime On' : 'Gate Chime Muted'}
          className="p-2 rounded-xl bg-white hover:bg-orange-100/80 text-amber-950 hover:text-orange-800 border border-amber-300 shadow-2xs cursor-pointer transition"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-amber-800" />}
        </button>
      </div>
    </div>
  );
};
