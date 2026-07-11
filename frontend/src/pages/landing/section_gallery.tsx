import React, { useEffect, useRef } from "react";
import CircularGallery from "@/pages/landing/ui/CircularGallery.tsx";

interface GalleryProps {
  isMuted?: boolean;
}

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

const SectionGallery: React.FC<GalleryProps> = ({ isMuted = false }) => {
  const swooshAudioRef = useRef<HTMLAudioElement | null>(null);

  const isDragging = useRef<boolean>(false);
  const startX = useRef<number>(0);
  const maxDistanceTraveled = useRef<number>(0);

  useEffect(() => {
    // Initialize only the swoosh audio asset
    swooshAudioRef.current = new Audio("/sounds/swoosh.mp3");
    swooshAudioRef.current.volume = 0.45;
  }, []);

  const handleDragStart = (clientX: number) => {
    isDragging.current = true;
    startX.current = clientX;
    maxDistanceTraveled.current = 0; // Reset tracking bounds for the gesture
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging.current) return;

    // Track the highest absolute distance covered from the initial point
    const currentDistance = Math.abs(clientX - startX.current);
    if (currentDistance > maxDistanceTraveled.current) {
      maxDistanceTraveled.current = currentDistance;
    }
  };

  const handleDragEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    // Direct exit if sound configuration is muted globally
    if (isMuted) return;

    const finalDistance = maxDistanceTraveled.current;

    // Trigger the swoosh effect once drag threshold is crossed upon mouse/touch release
    if (finalDistance > 15) {
      if (swooshAudioRef.current) {
        swooshAudioRef.current.currentTime = 0;
        swooshAudioRef.current.play().catch(() => {});
      }
    }
  };

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
        <h3 style={{ fontSize: "clamp(28px, 3.5vw, 38px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
          Ensemble is...
        </h3>
      </div>

      <div
        style={{ width: "100%", height: "550px", position: "relative", cursor: "grab" }}
        onMouseDown={(e) => handleDragStart(e.clientX)}
        onMouseMove={(e) => handleDragMove(e.clientX)}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={(e) => {
          if (e.touches[0]) handleDragStart(e.touches[0].clientX);
        }}
        onTouchMove={(e) => {
          if (e.touches[0]) handleDragMove(e.touches[0].clientX);
        }}
        onTouchEnd={handleDragEnd}
      >
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