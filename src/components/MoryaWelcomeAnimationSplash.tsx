import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  Volume2, 
  VolumeX, 
  ArrowRight, 
  Sparkles, 
  Flame, 
  Heart,
  ChevronRight,
  RotateCcw
} from 'lucide-react';

interface MoryaWelcomeAnimationSplashProps {
  onFinish: () => void;
  messName?: string;
  messSubtitle?: string;
}

export const MoryaWelcomeAnimationSplash: React.FC<MoryaWelcomeAnimationSplashProps> = ({
  onFinish,
  messName = 'MORYA MESS',
  messSubtitle = 'Pure Hygienic Meals & Student Dining'
}) => {
  const [progress, setProgress] = useState(0);
  const [scene, setScene] = useState<'auto' | 'thali'>('auto');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isHonking, setIsHonking] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Initialize Web Audio safely
  const getAudioContext = () => {
    if (typeof window === 'undefined') return null;
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  };

  // Playful Indian Auto Rickshaw Double Horn Sound (Peep-Peep!)
  const playHornSound = () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const playBeep = (startTime: number, duration: number) => {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        // Brass auto horn dual tones (F#4 & A4)
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(430, startTime);
        osc1.frequency.exponentialRampToValueAtTime(445, startTime + duration);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(545, startTime);
        osc2.frequency.exponentialRampToValueAtTime(560, startTime + duration);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.18, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(startTime);
        osc2.start(startTime);
        osc1.stop(startTime + duration);
        osc2.stop(startTime + duration);
      };

      const now = ctx.currentTime;
      playBeep(now, 0.12);
      playBeep(now + 0.18, 0.16);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  // Duolingo-style celebratory chime
  const playWelcomeChime = () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      const now = ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        gain.gain.setValueAtTime(0, now + idx * 0.07);
        gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.07 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.48);
      });
    } catch {
      // Audio fallback
    }
  };

  // Trigger horn animation & sound
  const handleHonk = () => {
    setIsHonking(true);
    playHornSound();
    setTimeout(() => setIsHonking(false), 500);
  };

  // Progress bar & scene timeline
  useEffect(() => {
    // Initial sound after short interaction or delay
    const initialHornTimer = setTimeout(() => {
      playHornSound();
    }, 600);

    const startTime = Date.now();
    const duration = 4200; // 4.2s full cinematic intro

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      // Transition to Thali / Chef scene at 55%
      if (pct >= 55 && scene === 'auto') {
        setScene('thali');
      }

      if (pct >= 100) {
        clearInterval(interval);
        playWelcomeChime();
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 },
            colors: ['#F59E0B', '#EA580C', '#10B981', '#F43F5E']
          });
        } catch {}
      }
    }, 35);

    return () => {
      clearTimeout(initialHornTimer);
      clearInterval(interval);
    };
  }, []);

  const getStatusText = () => {
    if (progress < 25) return 'Starting the Morya Tiffin Auto... 🛺💨';
    if (progress < 50) return 'Loading Hot Wheat Chapatis & Pure Ghee Dal... 🍲';
    if (progress < 80) return 'Polishing Gleaming Stainless Steel Thalis... ✨';
    return 'Ghar Jaisa Shuddh Bhojan Ready! 🍛';
  };

  return (
    <motion.div
      id="morya-welcome-video-splash"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#F5B800] via-[#EFA605] to-[#E29000] text-slate-900 select-none font-sans"
    >
      {/* Background Animated Sunburst & Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Subtle radial sunburst lines */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'repeating-conic-gradient(from 0deg at 50% 40%, rgba(255,255,255,0.4) 0deg 15deg, transparent 15deg 30deg)'
          }}
        />

        {/* Floating golden food sparkles */}
        <motion.div
          animate={{
            y: [-10, 10, -10],
            rotate: [0, 10, -10, 0]
          }}
          transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
          className="absolute top-12 left-8 text-yellow-100/40 text-4xl"
        >
          ✨
        </motion.div>
        <motion.div
          animate={{
            y: [10, -15, 10],
            rotate: [0, -12, 12, 0]
          }}
          transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
          className="absolute top-28 right-10 text-yellow-100/40 text-3xl"
        >
          🍛
        </motion.div>
        <motion.div
          animate={{
            y: [-15, 8, -15]
          }}
          transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut' }}
          className="absolute bottom-32 left-6 text-yellow-100/30 text-3xl"
        >
          🛺
        </motion.div>
      </div>

      {/* Top Bar: Brand Pill, Sound Toggle, and Skip Button */}
      <header className="relative z-20 flex items-center justify-between p-4 sm:p-6 max-w-xl mx-auto w-full">
        {/* Logo Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-xs font-black tracking-wider text-slate-900 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-900" />
          <span className="uppercase">{messName}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-slate-900 backdrop-blur-md transition cursor-pointer"
            title={soundEnabled ? 'Mute sound' : 'Unmute sound'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-700" />}
          </button>

          <button
            type="button"
            onClick={onFinish}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/25 hover:bg-white/35 text-xs font-black text-slate-900 backdrop-blur-md transition cursor-pointer"
          >
            <span>Skip</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Center Stage: The 3D Animation Video Experience */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 max-w-lg mx-auto w-full text-center">
        <AnimatePresence mode="wait">
          {scene === 'auto' ? (
            /* Scene 1: The Iconic Welcome Auto-Rickshaw */
            <motion.div
              key="auto-scene"
              initial={{ scale: 0.7, opacity: 0, x: 120 }}
              animate={{ 
                scale: isHonking ? [1, 1.05, 0.98, 1] : 1, 
                opacity: 1, 
                x: 0,
                y: isHonking ? [-4, 4, -2, 0] : [0, -6, 0]
              }}
              exit={{ scale: 0.85, opacity: 0, x: -100 }}
              transition={{ 
                scale: { duration: 0.3 },
                x: { type: 'spring', stiffness: 180, damping: 14 },
                y: { repeat: Infinity, duration: 2.2, ease: 'easeInOut' }
              }}
              onClick={handleHonk}
              className="relative cursor-pointer group flex flex-col items-center"
            >
              {/* Tap to Honk Tooltip Bubble */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-2 px-3 py-1 rounded-full bg-white text-orange-900 text-[11px] font-black shadow-md border border-amber-200 inline-flex items-center gap-1.5 animate-bounce"
              >
                <span>📯 Tap Auto to Honk Horn!</span>
              </motion.div>

              {/* Main 3D Auto Rickshaw Artwork */}
              <div className="relative w-64 h-64 sm:w-76 sm:h-76 flex items-center justify-center">
                {/* Ground shadow */}
                <div className="absolute bottom-2 w-52 h-6 bg-black/20 rounded-full blur-md" />

                {/* The 3D Auto Rickshaw Image */}
                <img
                  src="/images/morya_welcome_auto.jpg"
                  alt="Morya Mess Welcome Auto Rickshaw"
                  className="w-full h-full object-contain drop-shadow-2xl rounded-3xl"
                  referrerPolicy="no-referrer"
                />

                {/* Headlight Glow effect */}
                <motion.div
                  animate={{ opacity: [0.4, 0.9, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className="absolute bottom-16 -left-4 w-12 h-12 bg-yellow-300/60 rounded-full blur-lg pointer-events-none"
                />
              </div>

              {/* Catchy Tagline */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-3 space-y-1"
              >
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-1.5">
                  <span>ओह! वेलकम टू मोर्या मेस</span>
                </h1>
                <p className="text-xs sm:text-sm font-bold text-amber-950/80">
                  घरचं अस्सल जेवण • Pune's Most Loved Student Mess
                </p>
              </motion.div>
            </motion.div>
          ) : (
            /* Scene 2: Maharaj Chef with Fresh Hot Maharashtrian Thali */
            <motion.div
              key="thali-scene"
              initial={{ scale: 0.75, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 16 }}
              className="relative flex flex-col items-center"
            >
              {/* Badge */}
              <div className="mb-2 px-3 py-1 rounded-full bg-white text-emerald-800 text-[11px] font-black shadow-md border border-emerald-200 inline-flex items-center gap-1.5">
                <Flame className="w-3 h-3 text-orange-600 fill-orange-600" />
                <span>गर्मागरम चपात्या & शुद्ध सात्विक थाळी तयार!</span>
              </div>

              {/* 3D Chef Mascot with Thali */}
              <div className="relative w-60 h-60 sm:w-72 sm:h-72 flex items-center justify-center">
                <div className="absolute bottom-2 w-48 h-6 bg-black/20 rounded-full blur-md" />
                <img
                  src="/images/morya_chef_mascot.jpg"
                  alt="Morya Mess Chef Serving Pure Indian Thali"
                  className="w-full h-full object-contain drop-shadow-2xl rounded-3xl"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Welcome Headline */}
              <div className="mt-3 space-y-1">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  अतिथी देवो भव! स्वागत आहे!
                </h1>
                <p className="text-xs sm:text-sm font-bold text-amber-950/85">
                  {messSubtitle}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scene Switcher Pills */}
        <div className="flex items-center gap-2 mt-4">
          <button
            type="button"
            onClick={() => setScene('auto')}
            className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide transition cursor-pointer ${
              scene === 'auto' ? 'bg-slate-900 text-white shadow-xs' : 'bg-white/30 text-slate-800 hover:bg-white/40'
            }`}
          >
            🛺 Auto Tuk-Tuk
          </button>
          <button
            type="button"
            onClick={() => setScene('thali')}
            className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide transition cursor-pointer ${
              scene === 'thali' ? 'bg-slate-900 text-white shadow-xs' : 'bg-white/30 text-slate-800 hover:bg-white/40'
            }`}
          >
            🍛 Maharaj Thali
          </button>
        </div>
      </main>

      {/* Bottom Bar: Duolingo-style Progress & Enter Button */}
      <footer className="relative z-20 p-5 sm:p-6 max-w-md mx-auto w-full space-y-3">
        {/* Progress Text */}
        <div className="flex items-center justify-between text-xs font-bold text-slate-900 px-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-700 animate-ping" />
            <span className="truncate max-w-[260px]">{getStatusText()}</span>
          </span>
          <span className="font-mono font-black text-slate-900">{progress}%</span>
        </div>

        {/* Duolingo Chunky 3D Progress Bar */}
        <div className="h-4 w-full bg-white/40 rounded-full p-1 border border-white/60 shadow-inner overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 rounded-full relative overflow-hidden"
            style={{ width: `${progress}%` }}
            transition={{ ease: 'easeOut', duration: 0.2 }}
          >
            {/* Glossy top stripe */}
            <div className="absolute top-0 inset-x-0 h-1/2 bg-white/30 rounded-full" />
          </motion.div>
        </div>

        {/* Enter / Start Button */}
        <div className="pt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={handleHonk}
            className="px-4 py-3.5 rounded-2xl bg-white/20 hover:bg-white/30 active:scale-95 text-slate-900 border border-white/40 font-black text-xs transition cursor-pointer shadow-xs flex items-center gap-1.5"
            title="Honk the horn!"
          >
            <span>📯 Honk</span>
          </button>

          <button
            type="button"
            onClick={onFinish}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl font-black text-sm tracking-wide shadow-lg transition transform active:scale-98 cursor-pointer ${
              progress >= 100
                ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/30 animate-pulse'
                : 'bg-white hover:bg-white/95 text-orange-900 shadow-orange-950/15'
            }`}
          >
            <span>{progress >= 100 ? 'मेस मध्ये प्रवेश करा • Enter Mess' : 'Continue to Portal'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-footer Note */}
        <div className="text-center text-[10px] font-bold text-amber-950/70 pt-1">
          <span>✨ Fast QR Passes • Hot Meals • 100% Student Verified</span>
        </div>
      </footer>
    </motion.div>
  );
};
