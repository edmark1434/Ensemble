import { useState, useEffect, useMemo, useRef } from "react";
import type { CSSProperties, FC } from "react";
import { Search } from "lucide-react";

interface HeroProps {
  onStart: () => void;
  isMuted?: boolean;
}

import TrueFocus from "@/components/ui/TrueFocus";
import GradientBlinds from "@/components/ui/GradientBlinds";

const INTENT_INDEX = { hire: 0, work: 1, edit: 2 } as const;

const SectionHero: FC<HeroProps> = ({ onStart, isMuted = false }) => {
  const [mounted, setMounted] = useState<boolean>(false);
  const [intent, setIntent] = useState<"hire" | "work" | "edit">("hire");
  const [isSwitching, setIsSwitching] = useState<boolean>(false);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");
  const [searchVal, setSearchVal] = useState("");

  // Sound references
  const hoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setMounted(true);

    // Initializing interface sound effects
    hoverAudioRef.current = new Audio("/sounds/minimalhover.mp3");
    clickAudioRef.current = new Audio("/sounds/softclick.mp3");

    hoverAudioRef.current.volume = 0.25;
    clickAudioRef.current.volume = 0.4;

    const styleEl = document.createElement("style");
    styleEl.textContent = `
      @keyframes slideInFromRight {
        from { opacity: 0; transform: translateX(30px); filter: blur(4px); }
        to { opacity: 1; transform: translateX(0); filter: blur(0); }
      }
      @keyframes slideInFromLeft {
        from { opacity: 0; transform: translateX(-30px); filter: blur(4px); }
        to { opacity: 1; transform: translateX(0); filter: blur(0); }
      }
      @keyframes simpleFade {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .slide-from-right { animation: slideInFromRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      .slide-from-left { animation: slideInFromLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      .fade-only { animation: simpleFade 0.4s ease forwards; }

      /* Bulletproof Light/Dark Mode injected CSS */
      .hero-overlay { background: linear-gradient(90deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.82) 50%, rgba(255,255,255,0.65) 100%); }
      .dark .hero-overlay { background: linear-gradient(90deg, rgba(18,18,20,0.96) 0%, rgba(18,18,20,0.88) 50%, rgba(18,18,20,0.65) 100%); }

      .hero-bottom-fade { background: linear-gradient(to top, #ffffff, transparent); }
      .dark .hero-bottom-fade { background: linear-gradient(to top, #121214, transparent); }

      .hero-btn { background: transparent; color: #4b5563; }
      .dark .hero-btn { color: #7a8499; }
      .hero-btn:hover { background: rgba(0,0,0,0.05); color: #111827; }
      .dark .hero-btn:hover { background: rgba(255,255,255,0.05); color: #fff; }
      .hero-btn.active { background: #fff; color: #111827; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
      .dark .hero-btn.active { background: rgba(255,255,255,0.1); color: #fff; box-shadow: none; }

      .hero-search { background: rgba(255,255,255,0.8); border-color: #e5e7eb; }
      .dark .hero-search { background: rgba(18,20,22,0.75); border-color: rgba(255,255,255,0.15); }

      .hero-search-btn { background: #111827; color: #fff; }
      .hero-search-btn:hover { background: #1f2937; }
      .dark .hero-search-btn { background: #fff; color: #000; }
      .dark .hero-search-btn:hover { background: #dde3ed; }

      .hero-action-btn { background: #111827; color: #fff; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
      .hero-action-btn:hover { background: #1f2937; transform: scale(1.02); }
      .dark .hero-action-btn { background: #fff; color: #121214; box-shadow: 0 10px 25px -5px rgba(255,255,255,0.2); }
      .dark .hero-action-btn:hover { background: #dde3ed; transform: scale(1.02); }

      .hero-tag { background: #fff; border-color: #e5e7eb; color: #4b5563; }
      .hero-tag:hover { background: #f3f4f6; border-color: #d1d5db; color: #111827; }
      .dark .hero-tag { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.1); color: rgba(255,255,255,0.75); }
      .dark .hero-tag:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.3); color: #fff; }
      .hero-tag:disabled { background: #f3f4f6; border-color: #e5e7eb; color: #9ca3af; cursor: default; }
      .dark .hero-tag:disabled { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.05); color: rgba(255,255,255,0.4); cursor: default; }
    `;
    document.head.appendChild(styleEl);
    return () => { document.head.removeChild(styleEl); };
  }, []);

  const playHoverSound = () => {
    if (isMuted || !hoverAudioRef.current) return;
    hoverAudioRef.current.currentTime = 0;
    hoverAudioRef.current.play().catch(() => {});
  };

  const playClickSound = () => {
    if (isMuted || !clickAudioRef.current) return;
    clickAudioRef.current.currentTime = 0;
    clickAudioRef.current.play().catch(() => {});
  };

  const handleIntentTransition = (targetMode: "hire" | "work" | "edit") => {
    if (targetMode === intent) return;
    playClickSound();

    const currentIdx = INTENT_INDEX[intent];
    const targetIdx = INTENT_INDEX[targetMode];
    setSlideDirection(targetIdx > currentIdx ? "right" : "left");

    setIsSwitching(true);
    setTimeout(() => {
      setIntent(targetMode);
      setIsSwitching(false);
    }, 40);
  };

  const dynamicTags = useMemo(() => {
    if (intent === "hire") return { title: "Popular:", items: ["Wedding Video", "AI Development", "YouTube Intro", "Color Grading"] };
    if (intent === "work") return { title: "Popular Jobs:", items: ["Short Form Reels", "Logo Animation", "Cinematic Grading", "Vlog Editing"] };
    return { title: "Video Editing Features:", items: ["Real-time Sync", "Auto Dead-Air Clean", "AI Caption Nav", "Multi-cam Edit"] };
  }, [intent]);

  const animLoad = (delay = 0): CSSProperties => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(20px)",
    transition: `all .8s ${delay}s cubic-bezier(.16,1,.3,1)`,
  });

  return (
    <section id="hero" className="bg-white dark:bg-[#121214]" style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-start",
      padding: "120px 60px 60px",
      position: "relative",
      overflow: "hidden",
    }}>

      {/* Background Layer */}
      <div style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1, overflow: "hidden" }}>
        
        {/* Base Video - Always visible */}
        <video autoPlay muted loop playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 1 }}>
          <source src="/clip/hero_vid.mp4" type="video/mp4" />
        </video>

        {/* Theme Overlay - Handles white mist for light mode, dark mist for dark mode */}
        <div className="hero-overlay" style={{
          position: "absolute",
          inset: 0,
          zIndex: 2
        }} />

        {/* Light Mode: Interactive Gradient Blinds projected onto the white mist */}
        <div className="block dark:hidden" style={{ position: "absolute", inset: 0, zIndex: 3, opacity: 0.35 }}>
          <GradientBlinds
            gradientColors={['#60a5fa', '#fde047', '#d8b4fe', '#60a5fa']}
            angle={45}
            noise={0.3}
            blindCount={12}
            blindMinWidth={50}
            spotlightRadius={0.5}
            spotlightSoftness={1}
            spotlightOpacity={1}
            mouseDampening={0.15}
            distortAmount={0}
            shineDirection="left"
            mixBlendMode="screen"
          />
        </div>
        
        {/* Bottom Fade to blend seamlessly with the SectionScrollText below */}
        <div className="hero-bottom-fade" style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          height: "160px",
          zIndex: 4,
          pointerEvents: "none"
        }} />
      </div>

      <div style={{ maxWidth: "1400px", width: "100%", margin: "0 auto", position: "relative", zIndex: 3 }}>
        <div style={{ maxWidth: "800px" }}>

          {/* STATIC BADGE */}
          <div className="bg-white/50 border-gray-200 dark:bg-white/[0.03] dark:border-white/[0.08]" style={{ ...animLoad(0), display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: "100px", marginBottom: "24px", backdropFilter: "blur(8px)", borderWidth: "1px", borderStyle: "solid" }}>
            <div className="text-gray-500 dark:text-[#a1a1aa]" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
              <TrueFocus 
                sentence="COLLABORATIVE VIDEO EDITING|& CREATIVE MARKETPLACE"
                separator="|"
                manualMode={false}
                blurAmount={2}
                borderColor="#a1a1aa"
                glowColor="rgba(150, 150, 150, 0.2)"
                animationDuration={0.8}
                pauseBetweenAnimations={2}
              />
            </div>
          </div>

          {/* SLIDING CONTENT */}
          <div key={`text-${intent}`} className={isSwitching ? "opacity-0" : (slideDirection === "right" ? "slide-from-right" : "slide-from-left")}>
            <h1 className="text-gray-900 dark:text-white" style={{ fontSize: "clamp(42px, 5.5vw, 64px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: "24px" }}>
              {intent === "hire" && "Work at the speed of your ambition"}
              {intent === "work" && "Find the freedom to secure top tier gigs"}
              {intent === "edit" && "Create high-impact edits in real-time"}
            </h1>

            <p className="text-gray-600 dark:text-[#a1a1aa]" style={{ fontSize: 18, marginBottom: "36px", lineHeight: 1.5, maxWidth: "580px" }}>
              {intent === "hire" && "Hire specialized filmmakers and editors who use cutting-edge AI pipelines to transform complex production workflows into high impact outcomes."}
              {intent === "work" && "Gain access to premium global project creators, scale your remote freelance career, and automate empty dead-air cleanups synchronously."}
              {intent === "edit" && "Edit directly in your browser with zero rendering delay. Leverage automated caption markers and audio-syncing with team members simultaneously."}
            </p>
          </div>

          {/* FADING BUTTONS */}
          <div className="bg-white/50 border-gray-200 dark:bg-white/[0.03] dark:border-white/10" style={{ display: "flex", gap: 4, padding: 4, borderRadius: 12, width: "fit-content", marginBottom: "24px", backdropFilter: "blur(12px)", borderWidth: "1px", borderStyle: "solid" }}>
            {(["hire", "work", "edit"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => handleIntentTransition(mode)}
                onMouseEnter={playHoverSound}
                className={`hero-btn ${intent === mode ? "active" : ""} ${!isSwitching && intent === mode ? "fade-only" : ""}`}
                style={{
                  padding: "8px 20px",
                  borderRadius: 8,
                  border: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                I want to {mode}
              </button>
            ))}
          </div>

          {/* SLIDING SEARCH / ACTION AREA */}
          <div key={`action-${intent}`} className={isSwitching ? "opacity-0" : (slideDirection === "right" ? "slide-from-right" : "slide-from-left")} style={{ maxWidth: "580px", marginBottom: "24px" }}>
            {intent !== "edit" ? (
              <div className="hero-search" style={{ display: "flex", alignItems: "center", borderRadius: "100px", padding: "6px 6px 6px 18px", backdropFilter: "blur(16px)", borderWidth: "1px", borderStyle: "solid" }}>
                <Search className="text-gray-400 dark:text-white/40" style={{ width: 18, height: 18, marginRight: 12, flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder={intent === "hire" ? "Describe what you need to hire for..." : "Search for available asset listings or jobs..."}
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  className="text-gray-900 placeholder-gray-500 dark:text-white dark:placeholder-gray-400"
                  style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontSize: 14, paddingRight: 12 }}
                />
                <button
                  onClick={() => {
                    playClickSound();
                    onStart();
                  }}
                  onMouseEnter={playHoverSound}
                  className="hero-search-btn"
                  style={{ border: "none", fontWeight: 700, fontSize: 13, padding: "10px 24px", borderRadius: "100px", cursor: "pointer", transition: "all 0.2s" }}
                >
                  Search
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  playClickSound();
                  onStart();
                }}
                onMouseEnter={playHoverSound}
                className="hero-action-btn"
                style={{
                  border: "none",
                  padding: "18px 42px",
                  borderRadius: "14px",
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                Get Started
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </button>
            )}
          </div>

          {/* SLIDING TAGS */}
          <div key={`tags-${intent}`} className={isSwitching ? "opacity-0" : (slideDirection === "right" ? "slide-from-right" : "slide-from-left")} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
            <span className="text-gray-500 dark:text-white/40" style={{ fontSize: 12, fontWeight: 500 }}>{dynamicTags.title}</span>
            {dynamicTags.items.map(tag => (
              <button
                key={tag}
                onClick={() => {
                  if (intent !== "edit") {
                    playClickSound();
                    setSearchVal(tag);
                  }
                }}
                disabled={intent === "edit"}
                onMouseEnter={() => {
                  if (intent !== "edit") playHoverSound();
                }}
                className="hero-tag"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "5px 12px",
                  borderRadius: "100px",
                  cursor: intent === "edit" ? "default" : "pointer",
                  transition: "all 0.15s",
                  backdropFilter: "blur(4px)",
                  borderWidth: "1px",
                  borderStyle: "solid"
                }}
              >
                {tag}
              </button>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
};

export default SectionHero;