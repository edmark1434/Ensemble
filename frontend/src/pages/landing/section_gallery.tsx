import React, { useEffect, useRef } from "react";
import DriftWall from "@/components/ui/DriftWall";
import StatsBar from "@/components/ui/StatsBar";
import FadeInScroll from "@/components/ui/FadeInScroll";

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
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const containerRef = useRef<HTMLElement>(null);
  const swooshAudioRef = useRef<HTMLAudioElement | null>(null);

  const isDragging = useRef<boolean>(false);
  const startX = useRef<number>(0);
  const maxDistanceTraveled = useRef<number>(0);

  useEffect(() => {
    // Initialize only the swoosh audio asset
    swooshAudioRef.current = new Audio("/sounds/swoosh.mp3");
    swooshAudioRef.current.volume = 0.45;
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasLoaded(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px" } // Preload when it is 600px close
    );
    
    observer.observe(containerRef.current);
    
    return () => observer.disconnect();
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

  // Map to DriftWall format
  const driftWallItems = ENSEMBLE_ECOSYSTEM.map(item => ({
    image: item.image,
    title: item.text,
  }));

  return (
    <section
      ref={containerRef}
      id="gallery-showcase"
      style={{
        background: "#080a12",
        padding: "80px 0 40px",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: "32px"
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "1300px", margin: "0 auto", padding: "0 40px" }}>
        <FadeInScroll distance={20} duration={0.6}>
          <h3 style={{ fontSize: "clamp(28px, 3.5vw, 38px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
            Ensemble is...
          </h3>
        </FadeInScroll>
      </div>

      <div
        style={{ 
          width: "100%", 
          height: "600px", 
          position: "relative", 
          pointerEvents: "none" 
        }}
      >
        {hasLoaded ? (
          <DriftWall
            items={driftWallItems}
            columns={5}
            speed={30}
            parallax={0.6}
            pauseOnHover={false}
            overlayColor="#080a12"
            grayscale={false}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "#080a12" }} />
        )}
      </div>

        {/* Text Overlay */}
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
          textAlign: "center",
          background: "rgba(8, 10, 18, 0.45)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "40px 56px",
          borderRadius: "24px",
          maxWidth: "860px",
          width: "90%",
          boxShadow: "0 24px 60px -12px rgba(0, 0, 0, 0.8)",
          zIndex: 10
        }}>
          <FadeInScroll distance={20} duration={0.8} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "32px", width: "100%" }}>
            <p style={{
              fontSize: "clamp(18px, 2.2vw, 26px)",
              color: "#f4f4f5",
              lineHeight: 1.6,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              textShadow: "0 2px 12px rgba(0,0,0,1)"
            }}>
              A place where video editors and creators team up easily. Work together in real-time, find jobs, hire talent securely, and use AI to speed up your editing—all in one place without the usual headaches.
            </p>
            
            <div style={{ pointerEvents: "auto" }}>
              <StatsBar />
            </div>
          </FadeInScroll>
        </div>
    </section>
  );
};

export default SectionGallery;