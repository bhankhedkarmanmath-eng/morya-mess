import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface GanpatiSplashProps {
  onFinish?: () => void;
  onEnter?: () => void;
  autoCloseDelay?: number;
  messName?: string;
  messSubtitle?: string;
}

export const GanpatiSplash: React.FC<GanpatiSplashProps> = ({
  onFinish,
  onEnter,
  autoCloseDelay = 2200,
  messName = 'Morya Mess'
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const finishedRef = useRef(false);

  const handleFinish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (onFinish) onFinish();
    if (onEnter) onEnter();
  }, [onFinish, onEnter]);

  const handleInstantExit = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      handleFinish();
    }, 280);
  }, [isClosing, handleFinish]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleInstantExit();
    }, autoCloseDelay);

    return () => {
      clearTimeout(timer);
    };
  }, [autoCloseDelay, handleInstantExit]);

  return (
    <AnimatePresence onExitComplete={handleFinish}>
      {!isClosing && (
        <motion.div
          id="morya-cartoon-splash"
          onClick={handleInstantExit}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02, filter: 'blur(6px)' }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          style={{ willChange: 'opacity, transform', transform: 'translateZ(0)' }}
          className="fixed inset-0 z-[999990] flex flex-col items-center justify-center bg-white select-none px-6 text-center overflow-hidden cursor-pointer"
        >
          {/* ========================================================== */}
          {/* BACKGROUND DIVINE AURA & SUNBEAM RAY BURSTS                */}
          {/* ========================================================== */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
            {/* Pulsing Warm Golden-Orange Core Bloom */}
            <motion.div
              animate={{
                scale: [1, 1.22, 1],
                opacity: [0.35, 0.65, 0.35]
              }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              className="w-[560px] h-[560px] rounded-full bg-gradient-to-r from-orange-500/20 via-amber-300/30 to-transparent blur-3xl pointer-events-none"
            />

            {/* Concentric Golden Shockwave Rings (Fast Pop-in Impact) */}
            <motion.div
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: [0.2, 1.5], opacity: [0.8, 0] }}
              transition={{ duration: 1.0, delay: 0.25, ease: 'easeOut' }}
              className="absolute w-72 h-72 rounded-full border-4 border-orange-300/50 pointer-events-none"
            />
            <motion.div
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: [0.2, 1.9], opacity: [0.6, 0] }}
              transition={{ duration: 1.2, delay: 0.35, ease: 'easeOut' }}
              className="absolute w-72 h-72 rounded-full border-2 border-amber-200/60 pointer-events-none"
            />

            {/* Rotating Sacred Sunburst Halo */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute w-[460px] h-[460px] rounded-full border border-orange-200/50 opacity-45 pointer-events-none"
            >
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-amber-400/40" />
            </motion.div>
          </div>

          {/* ========================================================== */}
          {/* FLOATING GOLDEN MODAK SPARKLES (Snappy & Alive)             */}
          {/* ========================================================== */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {[
              { x: -42, y: -22, delay: 0.1, char: '✦', size: 'text-xl' },
              { x: 44, y: -30, delay: 0.25, char: '★', size: 'text-2xl' },
              { x: -22, y: -52, delay: 0.4, char: '✨', size: 'text-xl' },
              { x: 28, y: -58, delay: 0.55, char: '✦', size: 'text-lg' },
              { x: -52, y: -72, delay: 0.2, char: '★', size: 'text-xl' },
              { x: 50, y: -68, delay: 0.5, char: '✨', size: 'text-2xl' }
            ].map((spark, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0, x: spark.x, y: spark.y + 12 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0.4, 1.3, 0.4],
                  y: [spark.y + 12, spark.y - 28]
                }}
                transition={{
                  duration: 1.6,
                  delay: spark.delay,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
                className={`absolute ${spark.size} text-amber-400 drop-shadow-[0_2px_10px_rgba(251,191,36,0.9)]`}
              >
                {spark.char}
              </motion.div>
            ))}
          </div>

          {/* ========================================================== */}
          {/* 3D CARTOON BAL GANESHA CHARACTER                           */}
          {/* ========================================================== */}
          <div className="relative z-10 flex flex-col items-center">
            <motion.div
              initial={{ scale: 0.25, y: -70, opacity: 0 }}
              animate={{
                scale: [0.25, 1.14, 0.96, 1.03, 1],
                y: [-70, 10, -6, 2, 0],
                opacity: 1
              }}
              transition={{
                duration: 0.75,
                ease: [0.175, 0.885, 0.32, 1.275]
              }}
              className="relative w-56 h-56 sm:w-64 sm:h-64 mb-4 flex items-center justify-center overflow-hidden"
            >
              {/* Diagonal Light Sheen Beam Sweep across Bal Ganesha */}
              <motion.div
                initial={{ x: '-180%' }}
                animate={{ x: '260%' }}
                transition={{ duration: 1.1, delay: 0.4, ease: 'easeInOut' }}
                className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/70 to-transparent skew-x-[-25deg] pointer-events-none z-20"
              />

              {/* Gentle Floating & Playful Tilt Loop */}
              <motion.div
                animate={{
                  y: [0, -8, 0, -5, 0],
                  rotate: [0, 1.6, 0, -1.6, 0]
                }}
                transition={{
                  duration: 2.8,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
                className="w-full h-full flex items-center justify-center"
              >
                <img
                  src="/src/assets/images/cartoon_bal_ganesha_1791904804248.jpg"
                  alt="Animated Cartoon Bal Ganesha"
                  loading="eager"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain filter drop-shadow-[0_16px_30px_rgba(234,88,12,0.28)]"
                />
              </motion.div>
            </motion.div>

            {/* ========================================================== */}
            {/* ONLY ONE SINGLE TEXT: Morya Mess                           */}
            {/* ========================================================== */}
            <motion.div
              initial={{ scale: 0.6, y: 18, opacity: 0 }}
              animate={{
                scale: [0.6, 1.08, 1],
                y: [18, -3, 0],
                opacity: 1
              }}
              transition={{
                duration: 0.55,
                delay: 0.32,
                ease: [0.175, 0.885, 0.32, 1.275]
              }}
              className="flex flex-col items-center"
            >
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 font-sans">
                <span className="bg-gradient-to-r from-slate-900 via-orange-950 to-orange-600 bg-clip-text text-transparent drop-shadow-xs">
                  {messName || 'Morya Mess'}
                </span>
              </h1>

              {/* Smooth Animated Golden Underline Accent */}
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 64, opacity: 1 }}
                transition={{ duration: 0.45, delay: 0.55, ease: 'easeOut' }}
                className="h-1.5 rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600 mt-2.5 shadow-xs"
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
