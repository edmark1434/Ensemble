import React, { useEffect, useRef } from "react";
import ScrollExpand from "@/components/ui/ScrollExpand";
import MaskedHeading from "@/components/ui/MaskedHeading";
import FaultyTerminal from "@/components/ui/FaultyTerminal";
import useGlobalState from "@/lib/global_state";
import { 
  Megaphone, Play, Smartphone, PenTool, 
  Briefcase, Gamepad2, Plane, Music, 
  Heart, Calendar, Lightbulb, Film, 
  Clapperboard, Popcorn, Mic, Trophy, 
  Scissors, Tv, Theater, BookOpen, 
  Eye, Zap, Presentation, Camera, Sparkles
} from "lucide-react";

interface ScrollExpandSectionProps {
  isMuted?: boolean;
}

const CATEGORIES = [
  { label: "Ads & Social", icon: Megaphone },
  { label: "Youtube Videos", icon: Play },
  { label: "Tiktoks", icon: Smartphone },
  { label: "Design", icon: PenTool },
  { label: "Corporate Videos", icon: Briefcase },
  { label: "Gaming Videos", icon: Gamepad2 },
  { label: "Family & Travel", icon: Plane },
  { label: "Music Videos", icon: Music },
  { label: "Wedding", icon: Heart },
  { label: "Events", icon: Calendar },
  { label: "Explainer Videos", icon: Lightbulb },
  { label: "Showreels", icon: Film },
  { label: "Fiction Films", icon: Clapperboard },
  { label: "Movie Trailers", icon: Popcorn },
  { label: "Podcast", icon: Mic },
  { label: "Sports Video", icon: Trophy },
  { label: "Montages", icon: Scissors },
  { label: "Anime Edits", icon: Tv },
  { label: "Short Drama", icon: Theater },
  { label: "Tutorial Videos", icon: BookOpen },
  { label: "Teaser Videos", icon: Eye },
  { label: "Animation", icon: Zap },
  { label: "Presentation", icon: Presentation },
  { label: "Cinematic", icon: Camera },
  { label: "Others", icon: Sparkles }
];

const ROW_1 = CATEGORIES.slice(0, 8);
const ROW_2 = CATEGORIES.slice(8, 17);
const ROW_3 = CATEGORIES.slice(17, 25);

const TickerRow = ({ items, direction = "left", theme = "dark" }: { items: typeof CATEGORIES, direction?: "left" | "right", theme?: "light" | "dark" }) => {
  const duplicatedItems = [...items, ...items, ...items, ...items];
  const animationClass = direction === "left" ? "marquee-content-left" : "marquee-content-right";

  const bg = theme === 'dark' ? "rgba(0, 0, 0, 0.7)" : "rgba(255, 255, 255, 0.8)";
  const border = theme === 'dark' ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid rgba(0, 0, 0, 0.1)";
  const color = theme === 'dark' ? "#fff" : "#111827";
  const hoverBg = theme === 'dark' ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";

  return (
    <div className="marquee-container" style={{ margin: "6px 0" }}>
      <div className={animationClass} style={{ paddingLeft: "16px" }}>
        {duplicatedItems.map(({ label, icon: Icon }, i) => (
          <button
            key={`${label}-${i}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: bg,
              border: border,
              color: color,
              fontSize: 15,
              fontWeight: 600,
              padding: "14px 22px",
              borderRadius: "100px",
              cursor: "pointer",
              transition: "all 0.2s",
              backdropFilter: "blur(12px)",
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = hoverBg;
              const audio = new Audio("/sounds/minimalhover.mp3");
              audio.volume = 0.2;
              audio.play().catch(() => {});
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = bg;
            }}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

const SectionScrollExpand: React.FC<ScrollExpandSectionProps> = ({ isMuted = false }) => {
  const theme = useGlobalState((state) => state.theme);
  const containerRef = useRef<HTMLDivElement>(null);
  const textMaskRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);

  const bgColor = theme === 'dark' ? "#121214" : "#ffffff";
  const scrimBg = theme === 'dark' 
    ? "radial-gradient(circle at center, rgba(18,18,20,0.3) 0%, rgba(18,18,20,1) 100%)"
    : "radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, rgba(255,255,255,1) 100%)";

  useEffect(() => {
    const container = containerRef.current;
    const textMask = textMaskRef.current;
    const content = contentRef.current;
    const scrim = scrimRef.current;
    const video = videoRef.current; // Might be null in light mode if terminal is active

    if (!container || !textMask || !content || !scrim) return;

    let raf = 0;
    
    const handleScroll = () => {
      const rect = container.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      const scrollableDistance = rect.height - windowHeight;
      if (scrollableDistance <= 0) return;
      
      let p = -rect.top / scrollableDistance;
      p = Math.max(0, Math.min(1, p));
      
      // PHASE 1: Text Mask Zoom and Fade (0 to 0.5)
      const p1 = Math.min(p / 0.5, 1);
      
      // Moderate zoom effect
      const scale = 1 + p1 * 1.5; // scales from 1x to 2.5x
      
      // Fade out mask smoothly over the scroll to reveal the full video
      const maskOpacity = 1 - Math.pow(p1, 1.5);
      
      textMask.style.transform = `scale(${scale})`;
      textMask.style.opacity = maskOpacity.toString();
      textMask.style.pointerEvents = p1 > 0.95 ? "none" : "auto";

      // Video slight zoom out for scroll parallax effect
      if (video) {
        const vidScale = 1.2 - (p1 * 0.2);
        video.style.transform = `scale(${vidScale})`;
      }

      // PHASE 2: Content Fade In (0.6 to 1.0)
      const p2 = Math.max(0, (p - 0.6) / 0.4);
      
      content.style.opacity = p2.toString();
      content.style.transform = `translateY(${(1 - p2) * 40}px)`;
      content.style.pointerEvents = p2 > 0.5 ? "auto" : "none";
      
      scrim.style.opacity = (p2 * 0.85).toString();
    };

    const tick = () => {
      handleScroll();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section id="scroll-expand-showcase" ref={containerRef} style={{ position: "relative", zIndex: 5001, height: "400vh", background: bgColor, transition: "background 0.3s ease" }}>
      <style>{`
        @keyframes marquee-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .marquee-container {
          display: flex;
          overflow: hidden;
          width: 100vw;
          max-width: 100vw;
          mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
        }
        .marquee-content-left {
          display: flex;
          gap: 16px;
          min-width: 200%;
          animation: marquee-left 45s linear infinite;
        }
        .marquee-content-right {
          display: flex;
          gap: 16px;
          min-width: 200%;
          animation: marquee-right 45s linear infinite;
        }
        .marquee-content-left:hover, .marquee-content-right:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden", width: "100%" }}>
        
        {/* Layer 1: Background Layer */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: bgColor, transition: "background 0.3s ease" }}>
          {theme === 'dark' ? (
            <video 
              ref={videoRef}
              src="/landing/clip-1.mp4" 
              autoPlay 
              muted 
              loop 
              playsInline
              preload="none"
              style={{ width: "100%", height: "100%", objectFit: "cover", transformOrigin: "center", willChange: "transform" }}
            />
          ) : (
            <FaultyTerminal 
              theme="light" 
              mouseReact={false} 
              scale={1.5}
              gridMul={[2, 1]}
              digitSize={1.2}
              timeScale={1}
              scanlineIntensity={1}
              glitchAmount={1}
              flickerAmount={1}
              noiseAmp={1}
              chromaticAberration={0}
              dither={0}
              curvature={0}
              pageLoadAnimation={false}
              brightness={0.2}
            />
          )}
        </div>

        {/* Layer 2: Masked Heading Text Layer */}
        <div 
          ref={textMaskRef}
          style={{ 
            position: "absolute", 
            inset: -50, // Bleed to prevent edge tearing during scale
            backgroundColor: bgColor, // Dynamic background color for text mask
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            transformOrigin: "center",
            willChange: "transform, opacity",
            pointerEvents: "none", // Let users interact with potential underlying elements later
            transition: "background-color 0.3s ease"
          }}
        >
          <MaskedHeading 
            text="Ensemble" 
            mediaType="video" 
            src="/landing/clip-1.mp4" 
            reveal="none" 
            parallax={20}
            fillScale={1.1}
            className="whitespace-nowrap"
            style={{ 
              fontSize: "clamp(20px, 4vw, 50px)", 
              fontFamily: "Inter, sans-serif",
              letterSpacing: "-0.04em"
            }}
          />
        </div>

        {/* Layer 3: Darkening Scrim (Fades in later) */}
        <div 
          ref={scrimRef}
          style={{ 
            position: "absolute", 
            inset: 0, 
            background: theme === 'dark'
              ? "radial-gradient(circle at center, rgba(18,18,20,0.3) 0%, rgba(18,18,20,1) 100%)"
              : "radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, rgba(255,255,255,1) 100%)", 
            opacity: 0, 
            pointerEvents: "none", 
            willChange: "opacity",
            transition: "background 0.3s ease"
          }}
        />

        {/* Bottom Fade Mask to smoothly blend into the next section */}
        <div style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0, height: "15vh",
          background: theme === 'dark' ? "linear-gradient(to top, #121214 0%, transparent 100%)" : "linear-gradient(to top, #f9fafb 0%, transparent 100%)",
          zIndex: 5,
          pointerEvents: "none"
        }} />

        {/* Layer 4: Expanded Marquee Content (Fades in last) */}
        <div 
          ref={contentRef}
          style={{ 
            position: "absolute", 
            inset: 0, 
            zIndex: 10, 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            justifyContent: "center",
            opacity: 0,
            willChange: "transform, opacity"
          }}
        >
          <div style={{ position: "relative", zIndex: 1, textAlign: "center", width: "100%", padding: "40px 0", display: "flex", flexDirection: "column", alignItems: "center", overflow: "hidden" }}>
            <p style={{ 
              fontSize: "clamp(16px, 2.2vw, 20px)", // Slightly larger
              fontWeight: 600, 
              color: theme === 'dark' ? "#fff" : "#111827", 
              lineHeight: 1.6, 
              letterSpacing: 0.5, 
              marginBottom: "40px", 
              maxWidth: "600px",
              padding: "0 20px",
              textShadow: theme === 'dark' ? "0 2px 12px rgba(0,0,0,1), 0 0 24px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,1)" : "none",
              transition: "all 0.3s ease"
            }}>
              Discover the perfect creative partner for your next masterpiece. Select a category below to explore top-tier talent and specialized workflows.
            </p>
            
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "2px" }}>
              <TickerRow items={ROW_1} direction="left" theme={theme} />
              <TickerRow items={ROW_2} direction="right" theme={theme} />
              <TickerRow items={ROW_3} direction="left" theme={theme} />
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default SectionScrollExpand;
