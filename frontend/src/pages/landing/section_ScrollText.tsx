import React, { useEffect, useRef } from "react";
import ScrollVelocity from "@/components/ui/ScrollVelocity";

interface ScrollTextProps {
  isMuted?: boolean;
}

const T = {
  fontDisplay: "'Plus Jakarta Sans', sans-serif",
} as const;

const SectionScrollText: React.FC<ScrollTextProps> = ({ isMuted = false }) => {
  const blissHoverAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize the blisshover sound asset
    blissHoverAudioRef.current = new Audio("/sounds/blisshover.mp3");
    blissHoverAudioRef.current.volume = 0.25;
  }, []);

  const playBlissHover = () => {
    if (isMuted || !blissHoverAudioRef.current) return;
    blissHoverAudioRef.current.currentTime = 0; // Rewind for rapid crossover triggers
    blissHoverAudioRef.current.play().catch(() => {});
  };

  return (
    <div
      style={{
        padding: "60px 0",
        background: "linear-gradient(180deg, #080a12 0%, #0d0f1a 100%)",
        overflow: "hidden",
        width: "100%"
      }}
    >
      <style>{`
        @keyframes morphColors {
          0% {
            color: #3b82f6;
            text-shadow: 0 0 25px rgba(59, 130, 246, 0.5);
          }
          33% {
            color: #a855f7;
            text-shadow: 0 0 25px rgba(168, 85, 247, 0.5);
          }
          66% {
            color: #ec4899;
            text-shadow: 0 0 25px rgba(236, 72, 153, 0.5);
          }
          100% {
            color: #3b82f6;
            text-shadow: 0 0 25px rgba(59, 130, 246, 0.5);
          }
        }

        .hover-marquee .row-wrapper .parallax span {
          color: #5e5e5e;
          opacity: 0.4;
          filter: blur(0.5px);
          transition: 
            opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1), 
            filter 1.2s cubic-bezier(0.16, 1, 0.3, 1),
            color 0.4s ease;
        }

        .hover-marquee .row-wrapper:hover .parallax span {
          opacity: 1;
          filter: blur(0px);
          animation: morphColors 3s linear infinite;
        }
      `}</style>

      <div className="hover-marquee" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Row 1 Wrapper */}
        <div className="row-wrapper" onMouseEnter={playBlissHover} style={{ width: "100%" }}>
          <ScrollVelocity
            texts={["COLLABORATIVE EDITING - BUILT FOR VIDEO EDITORS - LESS FRICTION WORKFLOW"]}
            velocity={60}
            numCopies={5}
            scrollerStyle={{
              display: "flex",
              whiteSpace: "nowrap",
              fontFamily: T.fontDisplay,
              fontSize: "clamp(2.5rem, 3vw, 4.5rem)", // Adjusted slightly for row stacking
              lineHeight: "1",
              fontWeight: 500,
              letterSpacing: "-0.03em",
            }}
          />
        </div>

        {/* Row 2 Wrapper */}
        <div className="row-wrapper" onMouseEnter={playBlissHover} style={{ width: "100%" }}>
          <ScrollVelocity
            texts={["INTEGRATED JOB & GIGS - ASSET MARKETPLACE - INTEGRATED CHAT SYSTEM"]}
            velocity={-60} // Reversed velocity direction to make row 2 scroll oppositely for maximum dynamic depth
            numCopies={5}
            scrollerStyle={{
              display: "flex",
              whiteSpace: "nowrap",
              fontFamily: T.fontDisplay,
              fontSize: "clamp(2.5rem, 3vw, 4.5rem)",
              lineHeight: "1",
              fontWeight: 500,
              letterSpacing: "-0.03em",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default SectionScrollText;