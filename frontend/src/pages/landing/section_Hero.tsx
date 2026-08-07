import { useState, useEffect, useMemo, useRef } from "react";
import type { CSSProperties, FC } from "react";
import { Search } from "lucide-react";

interface HeroProps {
  onStart: () => void;
  isMuted?: boolean;
}

const T_HERO = {
  muted: "#7a8499",
} as const;

import TrueFocus from "@/components/ui/TrueFocus";

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
    <section id="hero" style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-start",
      padding: "120px 60px 60px",
      position: "relative",
      overflow: "hidden",
      background: "#080a12",
    }}>

      {/* Video Backdrop */}
      <div style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1, overflow: "hidden" }}>
        <video autoPlay muted loop playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }}>
          <source src="/clip/hero_vid.mp4" type="video/mp4" />
        </video>
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(90deg, rgba(8,10,18,0.96) 0%, rgba(8,10,18,0.88) 50%, rgba(8,10,18,0.65) 100%)",
          zIndex: 2
        }} />
      </div>

      <div style={{ maxWidth: "1400px", width: "100%", margin: "0 auto", position: "relative", zIndex: 3 }}>
        <div style={{ maxWidth: "800px" }}>

          {/* STATIC BADGE */}
          <div style={{ ...animLoad(0), display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", padding: "6px 14px", borderRadius: "100px", marginBottom: "24px", backdropFilter: "blur(8px)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: 0.5 }}>
              <TrueFocus 
                sentence="COLLABORATIVE VIDEO EDITING|& CREATIVE MARKETPLACE"
                separator="|"
                manualMode={false}
                blurAmount={2}
                borderColor="#a1a1aa"
                glowColor="rgba(255, 255, 255, 0.2)"
                animationDuration={0.8}
                pauseBetweenAnimations={2}
              />
            </div>
          </div>

          {/* SLIDING CONTENT */}
          <div key={`text-${intent}`} className={isSwitching ? "opacity-0" : (slideDirection === "right" ? "slide-from-right" : "slide-from-left")}>
            <h1 style={{ fontSize: "clamp(42px, 5.5vw, 64px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: "24px", color: "#fff" }}>
              {intent === "hire" && "Work at the speed of your ambition"}
              {intent === "work" && "Find the freedom to secure top tier gigs"}
              {intent === "edit" && "Create high-impact edits in real-time"}
            </h1>

            <p style={{ fontSize: 18, color: "#a1a1aa", marginBottom: "36px", lineHeight: 1.5, maxWidth: "580px" }}>
              {intent === "hire" && "Hire specialized filmmakers and editors who use cutting-edge AI pipelines to transform complex production workflows into high impact outcomes."}
              {intent === "work" && "Gain access to premium global project creators, scale your remote freelance career, and automate empty dead-air cleanups synchronously."}
              {intent === "edit" && "Edit directly in your browser with zero rendering delay. Leverage automated caption markers and audio-syncing with team members simultaneously."}
            </p>
          </div>

          {/* FADING BUTTONS */}
          <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", padding: 4, borderRadius: 12, width: "fit-content", marginBottom: "24px", backdropFilter: "blur(12px)" }}>
            {(["hire", "work", "edit"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => handleIntentTransition(mode)}
                onMouseEnter={(e) => {
                  playHoverSound();
                  if (intent !== mode) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    e.currentTarget.style.color = "#fff";
                  }
                }}
                onMouseLeave={(e) => {
                  if (intent !== mode) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = T_HERO.muted;
                  }
                }}
                className={!isSwitching && intent === mode ? "fade-only" : ""}
                style={{
                  padding: "8px 20px",
                  borderRadius: 8,
                  border: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  background: intent === mode ? "rgba(255,255,255,0.1)" : "transparent",
                  color: intent === mode ? "#fff" : T_HERO.muted
                }}
              >
                I want to {mode}
              </button>
            ))}
          </div>

          {/* SLIDING SEARCH / ACTION AREA */}
          <div key={`action-${intent}`} className={isSwitching ? "opacity-0" : (slideDirection === "right" ? "slide-from-right" : "slide-from-left")} style={{ maxWidth: "580px", marginBottom: "24px" }}>
            {intent !== "edit" ? (
              <div style={{ display: "flex", alignItems: "center", background: "rgba(18, 20, 36, 0.75)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "100px", padding: "6px 6px 6px 18px", backdropFilter: "blur(16px)" }}>
                <Search style={{ width: 18, height: 18, color: "rgba(255,255,255,0.4)", marginRight: 12, flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder={intent === "hire" ? "Describe what you need to hire for..." : "Search for available asset listings or jobs..."}
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: 14, paddingRight: 12 }}
                />
                <button
                  onClick={() => {
                    playClickSound();
                    onStart();
                  }}
                  onMouseEnter={(e) => {
                    playHoverSound();
                    e.currentTarget.style.background = "#dde3ed";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#fff";
                  }}
                  style={{ background: "#fff", color: "#000", border: "none", fontWeight: 700, fontSize: 13, padding: "10px 24px", borderRadius: "100px", cursor: "pointer", transition: "all 0.2s" }}
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
                onMouseEnter={(e) => {
                  playHoverSound();
                  e.currentTarget.style.background = "#dde3ed";
                  e.currentTarget.style.transform = "scale(1.02)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#fff";
                  e.currentTarget.style.transform = "scale(1)";
                }}
                style={{
                  background: "#fff",
                  color: "#080a12",
                  border: "none",
                  padding: "18px 42px",
                  borderRadius: "14px",
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "0 10px 25px -5px rgba(255,255,255,0.2)",
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
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>{dynamicTags.title}</span>
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
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.75)",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "5px 12px",
                  borderRadius: "100px",
                  cursor: intent === "edit" ? "default" : "pointer",
                  transition: "all 0.15s",
                  backdropFilter: "blur(4px)"
                }}
                onMouseEnter={(e) => {
                  if (intent !== "edit") {
                    playHoverSound();
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
                    e.currentTarget.style.color = "#fff";
                    e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (intent !== "edit") {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.75)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  }
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