import React from "react";
import { motion } from "framer-motion";
import {
  Users,
  Zap,
  Trash2,
  ShoppingBag,
  Video,
  BarChart3
} from "lucide-react";
import Aurora from "@/components/ui/Aurora";
import AccordionGallery from "@/components/ui/AccordionGallery";
import FadeInScroll from "@/components/ui/FadeInScroll";
import useGlobalState from "@/lib/global_state";

interface FeaturesProps {
  isMuted?: boolean;
}

const ALL_FEATURES = [
  {
    id: "01",
    title: "A.I. Captioning",
    desc: "Type any word or phrase and our AI will pinpoint the clip. Instantly navigate to exactly where it was spoken in your video.",
    img: "/features/m2.png",
    icon: <Zap size={18} />
  },
  {
    id: "02",
    title: "Seamless Collaboration",
    desc: "Collaborate without friction through real-time team editing. No more wasting time on rendering or sending over large files.",
    img: "/features/m1.png",
    icon: <Users size={18} />
  },
  {
    id: "03",
    title: "Auto Dead-Air Clean Up",
    desc: "Remove silence with a single click to streamline your edit. Keep your viewers engaged and get your content ready for export.",
    img: "/features/m3.png",
    icon: <Trash2 size={18} />
  },
  {
    id: "04",
    title: "Creative Marketplace",
    desc: "Buy or sell premium audio, templates, and assets to fuel any production. Browse our job board to hire top talent.",
    img: "/features/m4.png",
    icon: <ShoppingBag size={18} />
  },
  {
    id: "05",
    title: "Integrated Chat & Call",
    desc: "Conduct interviews or team meetings with high-quality video. Streamline your hiring and feedback without leaving the app.",
    img: "/features/m5.png",
    icon: <Video size={18} />
  },
  {
    id: "06",
    title: "Progress Tracking",
    desc: "Monitor every milestone with an intuitive, live visual dashboard. Track task completion and ensure your content is ready.",
    img: "/features/m6.png",
    icon: <BarChart3 size={18} />
  },
];

const SectionFeatures: React.FC<FeaturesProps> = ({ isMuted = false }) => {
  const accordionItems = ALL_FEATURES.map(f => ({
    image: f.img,
    label: f.title,
    description: f.desc
  }));
  const theme = useGlobalState((state) => state.theme);

  return (
    <section id="features" style={{ background: theme === 'dark' ? "#121214" : "#ffffff", position: "relative", overflow: "hidden", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.3s ease" }}>
      {/* ─── Aurora WebGL Background Layer (Dark Mode) ─── */}
      {theme === 'dark' && (
        <div style={{ 
          position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, 
          opacity: 0.35,
          mixBlendMode: "screen"
        }}>
          <Aurora
            colorStops={["#A855F7", "#121214", "#3B82F6"]}
            blend={0.6}
            amplitude={1.2}
            speed={0.5}
          />
        </div>
      )}

      {/* ─── Soft Gradient Ovals Background Layer (Light Mode) ─── */}
      {theme === 'light' && (
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
          {/* Light Blue Oval */}
          <motion.div
            animate={{ x: [0, 80, -40, 0], y: [0, -80, 40, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute", top: "5%", left: "15%", width: "45vw", height: "45vw",
              background: "radial-gradient(circle, rgba(125,211,252,0.9) 0%, rgba(125,211,252,0) 70%)",
              filter: "blur(60px)", opacity: 1
            }}
          />
          {/* Light Yellow Oval */}
          <motion.div
            animate={{ x: [0, -100, 80, 0], y: [0, 80, -40, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute", top: "35%", right: "5%", width: "40vw", height: "40vw",
              background: "radial-gradient(circle, rgba(253,224,71,0.85) 0%, rgba(253,224,71,0) 70%)",
              filter: "blur(60px)", opacity: 1
            }}
          />
          {/* Very Light Purple Oval */}
          <motion.div
            animate={{ x: [0, 60, -80, 0], y: [0, 100, -60, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute", bottom: "-10%", left: "35%", width: "50vw", height: "50vw",
              background: "radial-gradient(circle, rgba(216,180,254,0.9) 0%, rgba(216,180,254,0) 70%)",
              filter: "blur(60px)", opacity: 1
            }}
          />
        </div>
      )}

      {/* Left Side Gradient Overlay (To blend seamlessly out of the horizontal adjacent section) */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, bottom: 0,
        width: "15%",
        background: theme === 'dark' ? "linear-gradient(to right, #121214 0%, transparent 100%)" : "linear-gradient(to right, #ffffff 0%, transparent 100%)",
        zIndex: 0,
        transition: "background 0.3s ease",
        pointerEvents: "none"
      }} />

      {/* Bottom Gradient Overlay (To blend smoothly into the next vertical section without clipping ovals) */}
      <div style={{
        position: "absolute",
        left: 0, right: 0, bottom: 0,
        height: "15%",
        background: theme === 'dark' ? "linear-gradient(to top, #121214 0%, transparent 100%)" : "linear-gradient(to top, #ffffff 0%, transparent 100%)",
        zIndex: 0,
        transition: "background 0.3s ease",
        pointerEvents: "none"
      }} />

      <FadeInScroll distance={40} duration={0.8} style={{ width: "100%", position: "relative", zIndex: 1 }}>
        <div style={{ width: "100%", maxWidth: 1300, margin: "0 auto", padding: "40px" }}>
          {/* Header Block */}
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <h2 style={{ fontSize: "14px", color: "#3b82f6", fontWeight: 700, textTransform: "uppercase", letterSpacing: "4px", marginBottom: "16px" }}>
              Value Ecosystem
            </h2>
            <h3 style={{ fontSize: "clamp(32px, 4vw, 42px)", fontWeight: 800, color: theme === 'dark' ? "#fff" : "#111827", letterSpacing: "-0.02em", textShadow: theme === 'dark' ? "0 2px 10px rgba(0,0,0,0.5)" : "none", transition: "color 0.3s ease" }}>
              Everything you need to ship faster
            </h3>
          </div>

          <AccordionGallery 
            items={accordionItems}
            height={500}
            gap={16}
            radius={24}
            accentColor="#3b82f6"
            overlayColor="#060010"
            textColor="#ffffff"
          />
        </div>
      </FadeInScroll>
    </section>
  );
};

export default SectionFeatures;