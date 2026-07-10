import React from "react";
import CircularGallery from "@/pages/landing/ui/CircularGallery.tsx";

const ENSEMBLE_ECOSYSTEM = [
  { text: "Video Editing",    image: "/gallery_images/video_editing.jpg" },
  { text: "Collaboration",    image: "/gallery_images/collab.jpg" },
  { text: "Look for Service", image: "/gallery_images/look_service.jpg" },
  { text: "Freelancing",      image: "/gallery_images/freelancing.jpg" },
  { text: "Milestones",       image: "/gallery_images/milestones.jpg" },
  { text: "Earn Credits",     image: "/gallery_images/earn_creds.jpg" },
  { text: "Browse Assets",    image: "/gallery_images/browse_asset.jpg" },
  { text: "Chat & Call",      image: "/gallery_images/chat_call.jpg" },
  { text: "Contracting",      image: "/gallery_images/contracts.jpg" },
  { text: "Less Friction",    image: "/gallery_images/less_friction.jpg" },
];

const SectionGallery: React.FC = () => {
  return (
    <section
      id="gallery-showcase"
      style={{
        background: "#080a12",
        padding: "80px 0 40px",
        position: "relative",
        overflow: "hidden",
        borderBottom: "1px solid #1e2130",
        display: "flex",
        flexDirection: "column",
        gap: "32px"
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "1300px", margin: "0 auto", padding: "0 40px" }}>
        {/*<h2 style={{ fontSize: "14px", color: "#3b82f6", fontWeight: 700, textTransform: "uppercase", letterSpacing: "4px", marginBottom: "12px" }}>*/}
        {/*  What to expect?*/}
        {/*</h2>*/}
        <h3 style={{ fontSize: "clamp(28px, 3.5vw, 38px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
          Ensemble is...
        </h3>
      </div>

      <div style={{ width: "100%", height: "550px", position: "relative" }}>
        <CircularGallery
          items={ENSEMBLE_ECOSYSTEM}
          bend={2.5}
          textColor="#ffffff"
          borderRadius={0.05}
          scrollSpeed={2}
          scrollEase={0.04}
        />
      </div>
    </section>
  );
};

export default SectionGallery;