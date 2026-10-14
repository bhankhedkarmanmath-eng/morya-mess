import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'motion/react';

interface ZipperIntroScreenProps {
  onComplete: () => void;
  messName?: string;
}

export const ZipperIntroScreen: React.FC<ZipperIntroScreenProps> = ({
  onComplete,
  messName = 'Morya Mess'
}) => {
  // zipProgress from 0.0 (top, closed) to 1.0 (bottom, fully open)
  const [zipProgress, setZipProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isUnzipped, setIsUnzipped] = useState(false);
  const [dragTilt, setDragTilt] = useState(0);
  const [isTransitioningToApp, setIsTransitioningToApp] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  progressRef.current = zipProgress;

  // Framer Motion spring-based physics model for fluid, velocity-responsive denim zipper movement
  const rawProgress = useMotionValue(0);
  const springProgress = useSpring(rawProgress, {
    stiffness: 420,
    damping: 36,
    mass: 0.55,
    restDelta: 0.001
  });

  const isFinishingRef = useRef<boolean>(false);
  const hasTriggeredHandoffRef = useRef<boolean>(false);

  // Real-time haptic & motion coordination refs
  const lastToothIndexRef = useRef<number>(-1);
  const lastHapticTimeRef = useRef<number>(0);

  // Velocity and momentum tracking (px per ms)
  const lastYRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);

  // Subtle tactile haptic feedback helper (safe across all devices)
  const triggerHaptic = useCallback((pattern: number | number[]) => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (_) {}
    }
  }, []);

  // Pure seamless Blue Denim Jeans texture (Frame 00:02 from reference video)
  const denimTexture = '/src/assets/images/denim_fabric_texture_1791906779828.jpg';

  // Coordinated transition timing: once zipper reaches bottom,
  // denim flaps part cleanly, then hand off to GanpatiSplash with 0 frame drops
  const handleFinishClearance = useCallback(() => {
    setIsUnzipped(true);
    triggerHaptic(4);

    setTimeout(() => {
      onComplete();
    }, 240);
  }, [onComplete, triggerHaptic]);

  // Synchronize spring physics with render state, haptics, and bottom-stop clearance
  useEffect(() => {
    const unsubscribe = springProgress.on('change', (latest) => {
      const clamped = Math.max(0, Math.min(1, latest));
      setZipProgress(clamped);

      // Micro-tactile tick during spring motion across teeth
      const currentTooth = Math.floor(clamped * 85);
      const now = performance.now();
      const absVelocity = Math.abs(velocityRef.current);
      const minInterval = absVelocity > 0.8 ? 12 : absVelocity > 0.3 ? 16 : 22;
      const tickDuration = absVelocity > 0.8 ? 2 : absVelocity > 0.3 ? 3 : 4;

      if (currentTooth !== lastToothIndexRef.current && now - lastHapticTimeRef.current >= minInterval) {
        triggerHaptic(tickDuration);
        lastToothIndexRef.current = currentTooth;
        lastHapticTimeRef.current = now;
      }

      // Check when spring arrives at bottom stop block
      if (isFinishingRef.current && latest >= 0.985 && !hasTriggeredHandoffRef.current) {
        hasTriggeredHandoffRef.current = true;
        handleFinishClearance();
      }
    });

    return () => unsubscribe();
  }, [springProgress, triggerHaptic, handleFinishClearance]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isUnzipped || isFinishingRef.current) return;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setIsDragging(true);
    lastToothIndexRef.current = Math.floor(progressRef.current * 85);
    lastYRef.current = e.clientY;
    lastTimeRef.current = performance.now();
    velocityRef.current = 0;

    // Crisp metallic puller grab latch haptic (8ms)
    triggerHaptic(8);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || isUnzipped || isFinishingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const currentY = e.clientY - rect.top;
    const height = rect.height;
    const now = performance.now();

    // Calculate instantaneous velocity with exponential moving average filter
    const dt = Math.max(1, now - lastTimeRef.current);
    const dy = e.clientY - lastYRef.current;
    const instantVelocity = dy / dt; // px/ms
    velocityRef.current = velocityRef.current * 0.35 + instantVelocity * 0.65;
    lastYRef.current = e.clientY;
    lastTimeRef.current = now;

    // Physical travel range from 0 to 88%
    const maxTravel = height * 0.88;
    let raw = currentY / maxTravel;

    // High-end physical denim resistance:
    // 1. Initial breakaway stiction in top 4%
    if (raw > 0 && raw < 0.04) {
      raw = raw * 0.85;
    }
    // 2. Direct zero-lag tracking with subtle velocity momentum lead
    const velocityLead = Math.min(0.025, Math.max(-0.015, (velocityRef.current / height) * 14));
    const responsiveProgress = Math.max(0, Math.min(1, raw + velocityLead));

    // Drive Framer Motion's spring physics model!
    rawProgress.set(responsiveProgress);

    // Dynamic metallic pull-tab pendulum swing based on drag velocity
    const targetTilt = Math.max(-8, Math.min(8, velocityRef.current * 4.2));
    setDragTilt(targetTilt);

    // Auto complete if pulled past 70% OR with downward momentum past 55%
    if (responsiveProgress >= 0.70 || (responsiveProgress >= 0.55 && velocityRef.current > 0.55)) {
      setIsDragging(false);
      triggerFinish();
    }
  };

  const triggerFinish = useCallback(() => {
    if (isFinishingRef.current) return;
    isFinishingRef.current = true;
    setIsDragging(false);
    setDragTilt(0);

    // Authentic mechanical stop clack haptic: dual crisp pulse
    triggerHaptic([10, 20, 16]);

    // Command the spring physics to glide firmly to bottom stop (1.0)
    rawProgress.set(1);
  }, [rawProgress, triggerHaptic]);

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isUnzipped || isFinishingRef.current) return;
    setIsDragging(false);
    setDragTilt(0);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}

    // Flick Detection & Momentum Assist:
    // Downward swipe with momentum (velocity > 0.42 px/ms) at 28%+, or threshold past 42%
    const downwardFlick = velocityRef.current > 0.42 && progressRef.current >= 0.28;
    if (progressRef.current >= 0.42 || downwardFlick) {
      triggerFinish();
    } else {
      // Smooth spring back to top stop block with soft docking haptic
      rawProgress.set(0);
      triggerHaptic([4, 15, 3]);
    }
  };

  const handleFinalExit = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        onComplete();
      });
    });
  }, [onComplete]);

  // Coordinates with natural denim tension curve
  const sliderYPercent = zipProgress * 88; // 0% to 88%
  const openGapPercent = Math.pow(zipProgress, 1.12) * 47; // 0% to 47%

  // Pre-generate 85 zipper teeth for full vertical screen
  const teethItems = useMemo(() => {
    return Array.from({ length: 85 }).map((_, i) => ({
      yPct: (i / 84) * 98,
      isLeft: i % 2 === 0
    }));
  }, []);

  return (
    <AnimatePresence>
      {!isTransitioningToApp && (
        <motion.div
          ref={containerRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03, filter: 'blur(8px)' }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[999999] overflow-hidden select-none touch-none bg-white font-sans"
        >
          {/* ========================================================== */}
          {/* UNDERNEATH LAYER: THE ALIVE GANPATI BAL GANESHA SPLASH     */}
          {/* Reactive to the unzipping in real-time, perfectly synced!   */}
          {/* ========================================================== */}
          <div
            onClick={isUnzipped ? handleFinalExit : undefined}
            className={`absolute inset-0 flex flex-col items-center justify-center bg-white px-6 text-center overflow-hidden ${
              isUnzipped ? 'cursor-pointer' : ''
            }`}
          >
            {/* Background Rotating Sunburst Aura */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
              {/* Pulsing Warm Radiant Light Glow */}
              <motion.div
                animate={{
                  scale: [1, 1.18, 1],
                  opacity: [0.35, 0.65, 0.35]
                }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                className="w-[560px] h-[560px] rounded-full bg-gradient-to-r from-orange-400/25 via-amber-300/30 to-transparent blur-3xl pointer-events-none"
              />

              {/* Rotating Sacred Sunburst Ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
                className="absolute w-[460px] h-[460px] rounded-full border border-orange-200/40 opacity-40 pointer-events-none"
              >
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-amber-300/40" />
              </motion.div>
            </div>

            {/* Floating Sparkle Dust from Glowing Modak */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {[
                { x: -38, y: -22, delay: 0.1, char: '✦', size: 'text-xl' },
                { x: 42, y: -28, delay: 0.3, char: '★', size: 'text-2xl' },
                { x: -20, y: -50, delay: 0.5, char: '✨', size: 'text-xl' },
                { x: 26, y: -56, delay: 0.7, char: '✦', size: 'text-lg' },
                { x: -48, y: -70, delay: 0.25, char: '★', size: 'text-xl' },
                { x: 46, y: -66, delay: 0.6, char: '✨', size: 'text-2xl' }
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
                    duration: 1.8,
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

            {/* Core 3D Bal Ganesha & Brand Title (Syncs dynamically with zipProgress) */}
            <motion.div
              style={{
                scale: 0.88 + zipProgress * 0.12,
                opacity: 0.3 + zipProgress * 0.7
              }}
              className="relative z-10 flex flex-col items-center"
            >
              {/* Bal Ganesha Character Container with Floating Hover */}
              <div className="relative w-56 h-56 sm:w-64 sm:h-64 mb-4 flex items-center justify-center">
                <motion.div
                  animate={{
                    y: [0, -8, 0, -5, 0],
                    rotate: [0, 1.6, 0, -1.6, 0]
                  }}
                  transition={{
                    duration: 3.2,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                  className="w-full h-full flex items-center justify-center"
                >
                  <img
                    src="/src/assets/images/cartoon_bal_ganesha_1791904804248.jpg"
                    alt="Animated Cartoon Bal Ganesha"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain filter drop-shadow-[0_18px_32px_rgba(234,88,12,0.32)]"
                  />
                </motion.div>
              </div>

              {/* ONLY ONE SINGLE TEXT: Morya Mess */}
              <div className="flex flex-col items-center">
                <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 font-sans">
                  <span className="bg-gradient-to-r from-slate-900 via-orange-950 to-orange-600 bg-clip-text text-transparent drop-shadow-xs">
                    {messName}
                  </span>
                </h1>

                {/* Animated Golden Accent Underline */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: isUnzipped ? 64 : Math.max(16, zipProgress * 64) }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="h-1.5 rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600 mt-2.5 shadow-xs"
                />
              </div>
            </motion.div>
          </div>

          {/* ========================================================== */}
          {/* TOP LAYER: LEFT PURE JEANS FLAP (NO SHIRT, NO COLLAR)      */}
          {/* Peels left in real-time, carrying left denim & left teeth! */}
          {/* ========================================================== */}
          <motion.div
            animate={isUnzipped ? { x: '-110%' } : { x: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{
              willChange: 'transform, clip-path',
              transform: 'translateZ(0)',
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
              src={denimTexture}
              alt="Jeans Left"
              loading="eager"
              decoding="async"
              className="w-full h-full object-cover filter contrast-[1.08] brightness-[0.98]"
            />

            {/* Double Golden Thread Stitching Seam along Left Zipper Edge */}
            <div className="absolute inset-y-0 right-[calc(50%-1px)] w-4 flex justify-between pr-1 pointer-events-none opacity-85">
              <div className="w-[1.5px] h-full border-r border-dashed border-amber-400/80" />
              <div className="w-[1.5px] h-full border-r border-dashed border-amber-300/70" />
            </div>

            {/* Realistic 3D fabric drop shadow along unzipped edge */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-black/55 pointer-events-none" />
          </motion.div>

          {/* ========================================================== */}
          {/* TOP LAYER: RIGHT PURE JEANS FLAP (NO SHIRT, NO COLLAR)     */}
          {/* Peels right in real-time, carrying right denim & teeth!    */}
          {/* ========================================================== */}
          <motion.div
            animate={isUnzipped ? { x: '110%' } : { x: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{
              willChange: 'transform, clip-path',
              transform: 'translateZ(0)',
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
              src={denimTexture}
              alt="Jeans Right"
              loading="eager"
              decoding="async"
              className="w-full h-full object-cover filter contrast-[1.08] brightness-[0.98]"
            />

            {/* Double Golden Thread Stitching Seam along Right Zipper Edge */}
            <div className="absolute inset-y-0 left-[calc(50%-1px)] w-4 flex justify-between pl-1 pointer-events-none opacity-85">
              <div className="w-[1.5px] h-full border-l border-dashed border-amber-400/80" />
              <div className="w-[1.5px] h-full border-l border-dashed border-amber-300/70" />
            </div>

            {/* Realistic 3D fabric drop shadow along unzipped edge */}
            <div className="absolute inset-0 bg-gradient-to-l from-black/10 via-transparent to-black/55 pointer-events-none" />
          </motion.div>

          {/* ========================================================== */}
          {/* FULL METALLIC ZIPPER SVG (TEETH + TAPE + SLIDER)           */}
          {/* Interlocked below slider, separated along V-gap above!     */}
          {/* ========================================================== */}
          {!isUnzipped && (
            <svg className="absolute inset-0 z-25 pointer-events-none w-full h-full overflow-visible">
              <defs>
                {/* Chrome Metallic Specular Gradients for Teeth */}
                <linearGradient id="toothChromeGradLeft" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#94A3B8" />
                  <stop offset="30%" stopColor="#FFFFFF" />
                  <stop offset="70%" stopColor="#CBD5E1" />
                  <stop offset="100%" stopColor="#475569" />
                </linearGradient>

                <linearGradient id="toothChromeGradRight" x1="100%" y1="0%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#94A3B8" />
                  <stop offset="30%" stopColor="#FFFFFF" />
                  <stop offset="70%" stopColor="#CBD5E1" />
                  <stop offset="100%" stopColor="#475569" />
                </linearGradient>

                <filter id="teethRealisticShadow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.8" />
                </filter>
              </defs>

              {/* Black fabric tape background (below slider) */}
              <rect
                x="calc(50% - 9px)"
                y={`${sliderYPercent}%`}
                width="18"
                height={`${100 - sliderYPercent}%`}
                fill="#111827"
                stroke="#030712"
                strokeWidth="0.5"
              />

              {/* Parting tape along V-gap (above slider) */}
              {zipProgress > 0.02 && (
                <>
                  <line
                    x1={`calc(50% - ${openGapPercent}%)`}
                    y1="0"
                    x2="50%"
                    y2={`${sliderYPercent}%`}
                    stroke="#111827"
                    strokeWidth="7"
                    filter="url(#teethRealisticShadow)"
                  />
                  <line
                    x1={`calc(50% + ${openGapPercent}%)`}
                    y1="0"
                    x2="50%"
                    y2={`${sliderYPercent}%`}
                    stroke="#111827"
                    strokeWidth="7"
                    filter="url(#teethRealisticShadow)"
                  />
                </>
              )}

              {/* 3D Interlocking Metallic Chrome Teeth */}
              {teethItems.map((item, idx) => {
                const isAboveSlider = item.yPct < sliderYPercent;

                // Above slider: parted along the V-opening
                if (isAboveSlider) {
                  const progressRatio = item.yPct / (sliderYPercent || 1);
                  const currentGap = (1 - progressRatio) * openGapPercent;

                  if (item.isLeft) {
                    return (
                      <rect
                        key={idx}
                        x={`calc(50% - ${currentGap}% - 6px)`}
                        y={`${item.yPct}%`}
                        width="7"
                        height="4.5"
                        rx="1.2"
                        fill="url(#toothChromeGradLeft)"
                        stroke="#334155"
                        strokeWidth="0.6"
                        filter="url(#teethRealisticShadow)"
                      />
                    );
                  } else {
                    return (
                      <rect
                        key={idx}
                        x={`calc(50% + ${currentGap}% - 1px)`}
                        y={`${item.yPct}%`}
                        width="7"
                        height="4.5"
                        rx="1.2"
                        fill="url(#toothChromeGradRight)"
                        stroke="#334155"
                        strokeWidth="0.6"
                        filter="url(#teethRealisticShadow)"
                      />
                    );
                  }
                }

                // Below slider: Tightly interlocked teeth in the center!
                if (item.isLeft) {
                  return (
                    <rect
                      key={idx}
                      x="calc(50% - 6.5px)"
                      y={`${item.yPct}%`}
                      width="7.5"
                      height="4.5"
                      rx="1.2"
                      fill="url(#toothChromeGradLeft)"
                      stroke="#334155"
                      strokeWidth="0.6"
                      filter="url(#teethRealisticShadow)"
                    />
                  );
                } else {
                  return (
                    <rect
                      key={idx}
                      x="calc(50% - 1px)"
                      y={`${item.yPct}%`}
                      width="7.5"
                      height="4.5"
                      rx="1.2"
                      fill="url(#toothChromeGradRight)"
                      stroke="#334155"
                      strokeWidth="0.6"
                      filter="url(#teethRealisticShadow)"
                    />
                  );
                }
              })}

              {/* Bottom Zipper Stop Block */}
              <rect
                x="calc(50% - 7px)"
                y="98%"
                width="14"
                height="6"
                rx="1.5"
                fill="url(#toothChromeGradLeft)"
                stroke="#1E293B"
                strokeWidth="0.8"
              />
            </svg>
          )}

          {/* ========================================================== */}
          {/* 3D METALLIC CHROME ZIPPER SLIDER & PULL-TAB                */}
          {/* Directly rides on the teeth with 100% transparent back!    */}
          {/* ========================================================== */}
          {!isUnzipped && (
            <div
              onPointerDown={handlePointerDown}
              style={{
                top: `${sliderYPercent}%`,
                willChange: 'top, transform'
              }}
              className="absolute left-1/2 -translate-x-1/2 -translate-y-4 z-40 cursor-grab active:cursor-grabbing p-6 group touch-none select-none"
            >
              <motion.div
                animate={
                  isDragging
                    ? { scale: 1.06, rotate: dragTilt, y: 1 }
                    : { scale: 1, rotate: 0, y: 0 }
                }
                transition={{ type: 'spring', stiffness: 520, damping: 26 }}
                className="relative w-12 h-24 flex items-center justify-center filter drop-shadow-[0_16px_28px_rgba(0,0,0,0.85)]"
              >
                <svg
                  viewBox="0 0 48 96"
                  className="w-full h-full overflow-visible"
                  fill="none"
                >
                  <defs>
                    <linearGradient id="sliderCarChrome" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#94A3B8" />
                      <stop offset="25%" stopColor="#F8FAFC" />
                      <stop offset="50%" stopColor="#CBD5E1" />
                      <stop offset="75%" stopColor="#FFFFFF" />
                      <stop offset="100%" stopColor="#64748B" />
                    </linearGradient>

                    <linearGradient id="pullTabChrome" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#CBD5E1" />
                      <stop offset="20%" stopColor="#FFFFFF" />
                      <stop offset="45%" stopColor="#94A3B8" />
                      <stop offset="70%" stopColor="#F1F5F9" />
                      <stop offset="100%" stopColor="#475569" />
                    </linearGradient>
                  </defs>

                  {/* Slider Car Body (Wedge that splits teeth) */}
                  <path
                    d="M12 6 C12 3, 36 3, 36 6 L40 22 C40 26, 8 26, 8 22 Z"
                    fill="url(#sliderCarChrome)"
                    stroke="#334155"
                    strokeWidth="1.2"
                  />

                  {/* Center separator ridge */}
                  <rect x="22" y="8" width="4" height="12" rx="2" fill="#334155" opacity="0.8" />

                  {/* Pivot Loop Bridge */}
                  <rect x="18" y="16" width="12" height="7" rx="2.5" fill="url(#sliderCarChrome)" stroke="#1E293B" strokeWidth="1" />
                  <rect x="21" y="18" width="6" height="3" rx="1.5" fill="#0F172A" />

                  {/* THE PULL-TAB (With Signature Oval Hole from reference video) */}
                  <g className="cursor-pointer">
                    {/* Pull-tab metallic body */}
                    <path
                      d="M14 22 L34 22 C36 22, 38 25, 37 30 L35 84 C34 90, 14 90, 13 84 L11 30 C10 25, 12 22, 14 22 Z"
                      fill="url(#pullTabChrome)"
                      stroke="#334155"
                      strokeWidth="1.4"
                    />

                    {/* Oval hole cutout in upper third of pull-tab */}
                    <rect
                      x="18"
                      y="34"
                      width="12"
                      height="22"
                      rx="6"
                      fill="#0F172A"
                      stroke="#334155"
                      strokeWidth="1.2"
                    />

                    {/* Inner hole metallic bevel highlight */}
                    <rect
                      x="19"
                      y="35"
                      width="10"
                      height="20"
                      rx="5"
                      stroke="#CBD5E1"
                      strokeWidth="0.8"
                      fill="none"
                      opacity="0.6"
                    />

                    {/* Lower tactile grip horizontal ridges */}
                    <line x1="16" y1="66" x2="32" y2="66" stroke="#475569" strokeWidth="1.6" strokeLinecap="round" />
                    <line x1="16" y1="67.5" x2="32" y2="67.5" stroke="#FFFFFF" strokeWidth="0.8" strokeLinecap="round" opacity="0.8" />

                    <line x1="16" y1="72" x2="32" y2="72" stroke="#475569" strokeWidth="1.6" strokeLinecap="round" />
                    <line x1="16" y1="73.5" x2="32" y2="73.5" stroke="#FFFFFF" strokeWidth="0.8" strokeLinecap="round" opacity="0.8" />
                  </g>
                </svg>
              </motion.div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
