import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ShieldCheck, Sparkles, Utensils } from 'lucide-react';

interface GanpatiSplashProps {
  onFinish?: () => void;
  onEnter?: () => void;
  autoCloseDelay?: number;
  messName?: string;
  messSubtitle?: string;
  ganpatiImage?: string;
}

export const GanpatiSplash: React.FC<GanpatiSplashProps> = ({
  onFinish,
  onEnter,
  autoCloseDelay = 1800,
  messName = 'MORYA MESS',
  messSubtitle = 'Digital Dining & Mess Operations Management System',
  ganpatiImage
}) => {
  const [progress, setProgress] = useState(0);

  const handleComplete = () => {
    if (onFinish) onFinish();
    if (onEnter) onEnter();
  };

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / autoCloseDelay) * 100));
      setProgress(pct);

      if (elapsed >= autoCloseDelay) {
        clearInterval(interval);
        handleComplete();
      }
    }, 35);

    return () => clearInterval(interval);
  }, [autoCloseDelay]);

  return (
    <AnimatePresence>
      <motion.div
        id="ganpati-splash-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 0.99 }}
        transition={{ duration: 0.35 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-6 text-center select-none"
      >
        {/* Subtle decorative background circles in warm orange */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
          <div className="w-[450px] h-[450px] rounded-full border border-orange-100/60 opacity-60" />
          <div className="w-[650px] h-[650px] rounded-full border border-orange-50/40 opacity-40" />
        </div>

        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.08, duration: 0.5 }}
          className="relative z-10 max-w-md w-full flex flex-col items-center"
        >
          {/* Top Brand Tag */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-50 border border-orange-200 shadow-xs mb-6 text-xs font-bold tracking-wider text-orange-800 uppercase">
            <Sparkles className="w-3.5 h-3.5 text-orange-600" />
            <span>MORYA MESS MANAGEMENT</span>
          </div>

          {/* Ganpati Logo / Brand Icon */}
          <div className="relative w-32 h-32 mb-6 flex items-center justify-center rounded-3xl bg-white border border-slate-200/90 shadow-sm p-3">
            {ganpatiImage ? (
              <img
                src={ganpatiImage}
                alt="Morya Mess Emblem"
                className="w-full h-full object-contain rounded-2xl"
              />
            ) : (
              <svg
                viewBox="0 0 100 100"
                className="w-24 h-24 text-orange-600"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* Crown / Mukut */}
                <path d="M42 22 L50 12 L58 22 Z" fill="#EA580C" stroke="#C2410C" />
                <circle cx="50" cy="11" r="2" fill="#EA580C" />

                {/* Tilak */}
                <path d="M50 22 L50 34" stroke="#EA580C" strokeWidth="2.8" />
                <path d="M46 25 Q50 30 54 25" stroke="#EA580C" strokeWidth="2" />

                {/* Ears */}
                <path d="M38 28 C26 24, 20 38, 28 50 C32 56, 38 52, 40 48" />
                <path d="M62 28 C74 24, 80 38, 72 50 C68 56, 62 52, 60 48" />

                {/* Eyes */}
                <circle cx="43" cy="36" r="1.6" fill="#1E2028" />
                <circle cx="57" cy="36" r="1.6" fill="#1E2028" />

                {/* Curved Trunk */}
                <path d="M50 38 Q50 62, 58 64 Q66 66, 64 54 Q62 50, 58 50" strokeWidth="2.8" />
                <path d="M59 47 C57 44, 63 44, 61 47 Z" fill="#EA580C" />

                {/* Modak & Hand */}
                <line x1="45" y1="46" x2="42" y2="48" strokeWidth="2.4" />
                <path d="M30 60 C30 52, 36 50, 38 56" />
              </svg>
            )}
            <div className="absolute -bottom-2.5 px-3 py-0.5 rounded-full bg-orange-600 text-white text-[10px] font-bold tracking-wider shadow-xs">
              MORYA
            </div>
          </div>

          {/* Brand Name */}
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-1">
            {messName}
          </h1>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm font-medium text-slate-500 mb-8 max-w-xs">
            {messSubtitle}
          </p>

          {/* Progress loader */}
          <div className="w-60 h-1.5 bg-slate-100 rounded-full overflow-hidden mb-5">
            <motion.div
              className="h-full bg-orange-600 rounded-full"
              style={{ width: `${progress}%` }}
              transition={{ ease: 'linear' }}
            />
          </div>

          {/* Quick Enter Action Button */}
          <button
            id="btn-skip-splash"
            onClick={handleComplete}
            className="group inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold shadow-xs hover:bg-orange-700 active:scale-98 transition-all cursor-pointer"
          >
            <span>Enter Dashboard</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Anti-fraud note */}
          <div className="mt-7 flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Digital QR Verification Active</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
