import React, { useState, useEffect, useRef } from "react";
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
import ScrollExpand from "@/components/ui/ScrollExpand";
import FadeInScroll from "@/components/ui/FadeInScroll";

interface FeaturesProps {
  isMuted?: boolean;
}

const ALL_FEATURES = [
  {
    id: "01",
    title: "A.I. Caption Navigation",
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

  return (
    <section id="features" style={{ background: "#080a12", position: "relative", overflow: "hidden", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* ─── Aurora WebGL Background Layer ─── */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, opacity: 0.35 }}>
        <Aurora
          colorStops={["#A855F7", "#080a12", "#3B82F6"]}
          blend={0.6}
          amplitude={1.2}
          speed={0.5}
        />
      </div>

      <FadeInScroll distance={40} duration={0.8} style={{ width: "100%", position: "relative", zIndex: 1 }}>
        <div style={{ width: "100%", maxWidth: 1300, margin: "0 auto", padding: "40px" }}>
          {/* Header Block */}
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <h2 style={{ fontSize: "14px", color: "#3b82f6", fontWeight: 700, textTransform: "uppercase", letterSpacing: "4px", marginBottom: "16px" }}>
              Value Ecosystem
            </h2>
            <h3 style={{ fontSize: "clamp(32px, 4vw, 42px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
              Everything you need to ship faster
            </h3>
          </div>

          <AccordionGallery 
            items={accordionItems}
            height={500}
            gap={16}
            radius={24}
            accentColor="#3b82f6"
            overlayColor="#080a12"
          />
        </div>
      </FadeInScroll>
    </section>
  );
};

export default SectionFeatures;