import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowDown } from 'lucide-react';

interface ZipperIntroScreenProps {
  onUnzipped: () => void;
  messName?: string;
}

export const ZipperIntroScreen: React.FC<ZipperIntroScreenProps> = ({
  onUnzipped,
  messName = 'Morya Mess'
}) => {
  // zipProgress from 0 (closed at top) to 1 (fully open at bottom)
  const [zipProgress, setZipProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [textureType, setTextureType] = useState<'denim' | 'leather'>('denim');
  const containerRef = useRef<HTMLDivElement>(null);

  const textureImages = {
    denim: '/src/assets/images/denim_fabric_texture_1791906779828.jpg',
    leather: '/src/assets/images/tan_leather_texture_1791906826425.jpg'
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isCompleted) return;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || isCompleted || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const currentY = e.clientY - rect.top;
    const height = rect.height;

    // Calculate progress between 0 and 1
    const rawProgress = Math.max(0, Math.min(1, currentY / height));
    setZipProgress(rawProgress);

    // If dragged past 82%, trigger complete unzip
    if (rawProgress >= 0.82) {
      triggerComplete();
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isCompleted) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}

    // Snap back if not pulled past threshold, or complete if pulled far enough
    if (zipProgress < 0.65) {
      setZipProgress(0);
    } else {
      triggerComplete();
    }
  };

  const triggerComplete = () => {
    setIsCompleted(true);
    setZipProgress(1);
    setTimeout(() => {
      onUnzipped();
    }, 450);
  };

  // Mathematical V-opening coordinates based on zipProgress (0 to 1)
  const sliderYPercent = zipProgress * 92; // 0% to 92%
  const openGapPercent = zipProgress * 44; // Max 44% opening on each side at top

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="fixed inset-0 z-[999999] overflow-hidden select-none touch-none bg-white font-sans"
    >
      {/* ========================================================== */}
      {/* UNDERNEATH LAYER: THE REVEALED GANPATI BAL GANESHA SPLASH  */}
      {/* Visible through the parting zipper flaps                   */}
      {/* ========================================================== */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white px-6 text-center overflow-hidden">
        {/* Soft Golden Sunburst Radiant Glow */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[520px] h-[520px] rounded-full bg-gradient-to-r from-orange-400/25 via-amber-300/30 to-transparent blur-3xl pointer-events-none" />
        </div>

        {/* 3D Animated Bal Ganesha & Title */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative w-56 h-56 sm:w-64 sm:h-64 mb-4 flex items-center justify-center">
            <img
              src="/src/assets/images/cartoon_bal_ganesha_1791904804248.jpg"
              alt="Bal Ganesha"
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain filter drop-shadow-[0_16px_32px_rgba(234,88,12,0.3)] animate-pulse"
            />
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 font-sans">
            <span className="bg-gradient-to-r from-slate-900 via-orange-950 to-orange-600 bg-clip-text text-transparent">
              {messName}
            </span>
          </h1>

          <div className="h-1.5 w-16 rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600 mt-3 shadow-xs" />
        </div>
      </div>

      {/* ========================================================== */}
      {/* TOP LAYER: LEFT FABRIC FLAP (PEELS TO THE LEFT)             */}
      {/* ========================================================== */}
      <motion.div
        animate={isCompleted ? { x: '-105%' } : { x: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        style={{
          clipPath: `polygon(
            0% 0%, 
            calc(50% - ${openGapPercent}%) 0%, 
            50% ${sliderYPercent}%, 
            50% 100%, 
            0% 100%
          )`
        }}
        className="absolute inset-0 z-20 pointer-events-none overflow-hidden"
      >
        <img
          src={textureImages[textureType]}
          alt="Fabric Texture Left"
          className="w-full h-full object-cover filter contrast-[1.08] brightness-[0.98]"
        />
        {/* Subtle shadow along inner unzipped edge */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-black/35 pointer-events-none" />
      </motion.div>

      {/* ========================================================== */}
      {/* TOP LAYER: RIGHT FABRIC FLAP (PEELS TO THE RIGHT)          */}
      {/* ========================================================== */}
      <motion.div
        animate={isCompleted ? { x: '105%' } : { x: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        style={{
          clipPath: `polygon(
            calc(50% + ${openGapPercent}%) 0%, 
            100% 0%, 
            100% 100%, 
            50% 100%, 
            50% ${sliderYPercent}%
          )`
        }}
        className="absolute inset-0 z-20 pointer-events-none overflow-hidden"
      >
        <img
          src={textureImages[textureType]}
          alt="Fabric Texture Right"
          className="w-full h-full object-cover filter contrast-[1.08] brightness-[0.98]"
        />
        {/* Subtle shadow along inner unzipped edge */}
        <div className="absolute inset-0 bg-gradient-to-l from-black/10 via-transparent to-black/35 pointer-events-none" />
      </motion.div>

      {/* ========================================================== */}
      {/* CLOSED METALLIC ZIPPER TEETH (BELOW THE SLIDER POINT)      */}
      {/* ========================================================== */}
      {!isCompleted && (
        <div
          style={{
            top: `${sliderYPercent}%`,
            height: `${100 - sliderYPercent}%`
          }}
          className="absolute left-1/2 -translate-x-1/2 z-25 w-7 flex flex-col items-center overflow-hidden pointer-events-none"
        >
          {/* Black cloth tape backing behind teeth */}
          <div className="absolute inset-y-0 w-6 bg-slate-900/90 shadow-[0_0_8px_rgba(0,0,0,0.8)]" />

          {/* Interlocking Metal Teeth Blocks */}
          <div className="relative w-full h-full flex flex-col items-center">
            {Array.from({ length: 60 }).map((_, i) => (
              <div
                key={i}
                className="w-5 h-2 my-0.5 rounded-[1px] bg-gradient-to-r from-slate-400 via-slate-100 to-slate-400 border-y border-slate-600 shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
              />
            ))}
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* SEPARATED ZIPPER TEETH ALONG THE V-OPENING FLAPS           */}
      {/* Left side separated teeth & Right side separated teeth     */}
      {/* ========================================================== */}
      {!isCompleted && zipProgress > 0.05 && (
        <svg className="absolute inset-0 z-25 pointer-events-none w-full h-full">
          <defs>
            <filter id="teethGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.5" />
            </filter>
          </defs>
          {/* Left separating teeth line */}
          <line
            x1={`calc(50% - ${openGapPercent}%)`}
            y1="0"
            x2="50%"
            y2={`${sliderYPercent}%`}
            stroke="#94A3B8"
            strokeWidth="5"
            strokeDasharray="4 3"
            filter="url(#teethGlow)"
          />
          {/* Right separating teeth line */}
          <line
            x1={`calc(50% + ${openGapPercent}%)`}
            y1="0"
            x2="50%"
            y2={`${sliderYPercent}%`}
            stroke="#94A3B8"
            strokeWidth="5"
            strokeDasharray="4 3"
            filter="url(#teethGlow)"
          />
        </svg>
      )}

      {/* ========================================================== */}
      {/* INTERACTIVE METALLIC ZIPPER SLIDER & PULL-TAB              */}
      {/* Exactly matching reference video with finger tracking      */}
      {/* ========================================================== */}
      {!isCompleted && (
        <div
          onPointerDown={handlePointerDown}
          style={{
            top: `${sliderYPercent}%`
          }}
          className="absolute left-1/2 -translate-x-1/2 -translate-y-4 z-40 cursor-grab active:cursor-grabbing p-6 group touch-none"
        >
          {/* Metallic Zipper Slider Head */}
          <div className="relative flex flex-col items-center">
            {/* Triangular Slider Body Wedge */}
            <div className="w-9 h-8 rounded-t-lg rounded-b-md bg-gradient-to-r from-slate-400 via-slate-100 to-slate-400 border-2 border-slate-500 shadow-[0_8px_20px_rgba(0,0,0,0.6),0_2px_4px_rgba(255,255,255,0.9)_inset] flex flex-col items-center justify-center">
              {/* Center wedge ridge */}
              <div className="w-1.5 h-5 bg-gradient-to-b from-slate-500 via-slate-300 to-slate-600 rounded-full" />
            </div>

            {/* Pivot ring connection */}
            <div className="w-4 h-3 -mt-1 bg-slate-500 rounded-sm border border-slate-600" />

            {/* The Iconic Long Metallic Pull-Tab with Oval Hole (Video Match) */}
            <motion.div
              animate={isDragging ? { rotate: [0, 2, -2, 0] } : {}}
              transition={{ repeat: Infinity, duration: 0.2 }}
              className="w-7 h-16 -mt-1 rounded-b-xl rounded-t-sm bg-gradient-to-r from-slate-400 via-slate-100 to-slate-400 border border-slate-500 shadow-[0_12px_24px_rgba(0,0,0,0.65),0_2px_4px_rgba(255,255,255,0.9)_inset] flex flex-col items-center justify-between py-2.5"
            >
              {/* Upper loop grip lines */}
              <div className="w-4 h-1 bg-slate-400/80 rounded-full" />

              {/* The Oval Window / Hole in Center of Pull-Tab */}
              <div className="w-3.5 h-6 rounded-full bg-slate-900/90 shadow-inner border border-slate-600" />

              {/* Lower grip ridges */}
              <div className="flex flex-col gap-0.5 items-center">
                <div className="w-4 h-0.5 bg-slate-400/80 rounded-full" />
                <div className="w-4 h-0.5 bg-slate-400/80 rounded-full" />
              </div>
            </motion.div>

            {/* Touch Ripple indicator prompt */}
            {zipProgress === 0 && (
              <div className="absolute -inset-2 rounded-full border-2 border-amber-300/80 animate-ping pointer-events-none" />
            )}
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* TOP PULL INSTRUCTION BADGE                                 */}
      {/* ========================================================== */}
      {!isCompleted && zipProgress < 0.2 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="absolute top-10 inset-x-0 z-30 flex flex-col items-center pointer-events-none px-4"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white text-xs font-black tracking-widest uppercase shadow-xl">
            <ArrowDown className="w-3.5 h-3.5 text-amber-300 animate-bounce" />
            <span>Drag Down Zipper</span>
            <ArrowDown className="w-3.5 h-3.5 text-amber-300 animate-bounce" />
          </div>
        </motion.div>
      )}

      {/* ========================================================== */}
      {/* FABRIC SWATCH TOGGLE CARDS (MATCHING REFERENCE VIDEO!)     */}
      {/* Video at 00:01 & 00:08 has fabric swatch switcher cards!   */}
      {/* ========================================================== */}
      {!isCompleted && (
        <div className="absolute bottom-6 inset-x-6 z-30 flex items-center justify-between pointer-events-auto">
          {/* Brand Name */}
          <div className="text-left">
            <span className="text-xs font-black tracking-widest text-white/90 uppercase drop-shadow-md">
              {messName}
            </span>
          </div>

          {/* Swatch Switcher: Denim Jeans vs Tan Leather */}
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 shadow-lg">
            <button
              onClick={() => setTextureType('denim')}
              className={`w-7 h-7 rounded-xl border-2 transition-all cursor-pointer overflow-hidden ${
                textureType === 'denim' ? 'border-white scale-110 shadow-md ring-2 ring-amber-400' : 'border-white/40 opacity-70'
              }`}
              title="Denim Jeans"
            >
              <img src={textureImages.denim} alt="Denim" className="w-full h-full object-cover" />
            </button>

            <button
              onClick={() => setTextureType('leather')}
              className={`w-7 h-7 rounded-xl border-2 transition-all cursor-pointer overflow-hidden ${
                textureType === 'leather' ? 'border-white scale-110 shadow-md ring-2 ring-amber-400' : 'border-white/40 opacity-70'
              }`}
              title="Tan Leather"
            >
              <img src={textureImages.leather} alt="Leather" className="w-full h-full object-cover" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
