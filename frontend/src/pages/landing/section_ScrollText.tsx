import React from "react";
import ScrollVelocity from "@/components/ui/ScrollVelocity";

const T = {
  fontDisplay: "'Plus Jakarta Sans', sans-serif",
} as const;

const SectionScrollText: React.FC = () => {
  return (
    <div
      style={{
        padding: "60px 0",
        background: "linear-gradient(180deg, #080a12 0%, #0d0f1a 100%)",
        overflow: "hidden",
        width: "100%"
      }}
    >
      {/* Adjusted timers for a slower fade-in and faster color shifting loop */}
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

        /* Base state with slow transitions back to faded mode */
        .hover-marquee .parallax span {
          color: #5e5e5e;
          opacity: 0.4;
          filter: blur(0.5px);
          transition: 
            opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1), 
            filter 1.2s cubic-bezier(0.16, 1, 0.3, 1),
            color 0.4s ease;
        }

        /* Lights up extra smooth over 1.2s, cycles colors quickly every 3s */
        .hover-marquee .parallax:hover span {
          opacity: 1;
          filter: blur(0px);
          animation: morphColors 3s linear infinite;
        }
      `}</style>

      <div className="hover-marquee">
        <ScrollVelocity
          texts={[
            "COLLABORATIVE EDITING - BUILT FOR VIDEO EDITORS - LESS FRICTION WORKFLOW",
            "INTEGRATED JOB & GIGS - ASSET MARKETPLACE - INTEGRATED CHAT SYSTEM"
          ]}
          velocity={60}
          numCopies={5}
          scrollerStyle={{
            display: "flex",
            whiteSpace: "nowrap",
            fontFamily: T.fontDisplay,
            fontSize: "clamp(3.5rem, 3vw, 6.5rem)",
            lineHeight: "1",
            fontWeight: 500,
            letterSpacing: "-0.03em",
          }}
        />
      </div>
    </div>
  );
};

export default SectionScrollText;