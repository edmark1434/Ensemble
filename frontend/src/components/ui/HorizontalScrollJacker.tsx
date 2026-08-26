import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import useGlobalState from "@/lib/global_state";

interface Props {
  children: React.ReactNode;
  numPanels: number;
}

const HorizontalScrollJacker: React.FC<Props> = ({ children, numPanels }) => {
  const targetRef = useRef<HTMLDivElement>(null);
  const theme = useGlobalState((state) => state.theme);
  
  // We track the scroll progress of this specific wrapper div
  // "start start": 0 progress when the top of the container hits the top of the viewport (pin starts)
  // "end end": 1 progress when the bottom of the container hits the bottom of the viewport (pin ends)
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end end"]
  });

  // Calculate how far to translate the inner container
  // We add a 5% "dead zone" at the start and end so it stays still for a moment after pinning and before unpinning.
  const maxTranslate = `-${100 * ((numPanels - 1) / numPanels)}%`;
  const x = useTransform(
    scrollYProgress, 
    [0, 0.1, 0.9, 1], 
    ["0%", "0%", maxTranslate, maxTranslate]
  );

  return (
    <div 
      ref={targetRef} 
      style={{ 
        // Height controls how long the user has to scroll to get through the horizontal section.
        // E.g. 3 panels = 300vh of scrolling
        height: `${numPanels * 100}vh`, 
        position: "relative",
        background: theme === 'dark' ? "#121214" : "#ffffff", // Perfectly hide 1px translate rounding gaps
        transition: "background 0.3s ease"
      }}
    >
      <div 
        style={{ 
          position: "sticky", 
          top: 0, 
          height: "100vh", 
          overflow: "hidden", // Hide the parts of the track that are off-screen
          display: "flex"
        }}
      >
        <motion.div 
          style={{ 
            x, 
            display: "flex", 
            width: `${numPanels * 100}vw`,
            height: "100vh"
          }}
        >
          {React.Children.map(children, child => (
             <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", overflowY: "auto", overflowX: "hidden", transform: "translateZ(0)", willChange: "transform" }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  {child}
                </div>
             </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default HorizontalScrollJacker;
