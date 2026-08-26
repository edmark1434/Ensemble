import React, { useEffect, useRef } from "react";
import DriftWall from "@/components/ui/DriftWall";
import StatsBar from "@/components/ui/StatsBar";
import FadeInScroll from "@/components/ui/FadeInScroll";
import useGlobalState from "@/lib/global_state";

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
  const containerRef = useRef<HTMLElement>(null);
  const swooshAudioRef = useRef<HTMLAudioElement | null>(null);
  const theme = useGlobalState((state) => state.theme);

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

  // Map to DriftWall format
  const driftWallItems = ENSEMBLE_ECOSYSTEM.map(item => ({
    image: item.image,
    title: item.text,
  }));

  return (
    <section
      ref={containerRef}
      id="gallery-showcase"
      className="bg-white dark:bg-[#121214]"
      style={{
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        minHeight: "100vh",
        gap: "0px", // Removed gap since heading moved
        transition: "background 0.3s ease"
      }}
    >
      <div
        style={{ 
          width: "100%", 
          height: "100vh", 
          position: "relative", 
          pointerEvents: "none",
          overflow: "hidden", // Ensure shifted images do not break page width
          transform: "translateZ(0)", // Force GPU composite layer
          willChange: "transform" // Prevent Chrome from destroying layer when off-screen
        }}
      >
        <div style={{ position: "absolute", inset: 0, transform: "translateX(20%)" }}>
          <DriftWall
            items={driftWallItems}
            columns={3}
            tileWidth={360}
            tileHeight={240}
            gap={24}
            speed={30}
            parallax={0.6}
            pauseOnHover={false}
            overlayColor={theme === 'dark' ? '#121214' : '#ffffff'}
            grayscale={false}
          />
        </div>

        {/* Left Side Gradient Overlay */}
        <div style={{
          position: "absolute",
          top: 0, left: 0, bottom: 0,
          width: "70%",
          background: theme === 'dark' ? "linear-gradient(to right, #121214 20%, rgba(18,18,20,0.85) 60%, transparent 100%)" : "linear-gradient(to right, #ffffff 20%, rgba(255,255,255,0.85) 60%, transparent 100%)",
          zIndex: 5,
          transition: "background 0.3s ease"
        }} />

        {/* Top Gradient Overlay (To blend seamlessly from the Hero section above) */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0,
        height: "15%",
        background: theme === 'dark' ? "linear-gradient(to bottom, #121214 0%, transparent 100%)" : "linear-gradient(to bottom, #ffffff 0%, transparent 100%)",
        zIndex: 10,
        transition: "background 0.3s ease",
        pointerEvents: "none"
      }} />

      {/* Right Side Gradient Overlay (To blend seamlessly into the horizontal adjacent section) */}
        <div style={{
          position: "absolute",
          top: 0, right: 0, bottom: 0,
          width: "20%",
          background: theme === 'dark' ? "linear-gradient(to left, #121214 0%, transparent 100%)" : "linear-gradient(to left, #ffffff 0%, transparent 100%)",
          zIndex: 5,
          transition: "background 0.3s ease",
          pointerEvents: "none"
        }} />

        {/* Text Overlay */}
        <div style={{
          position: "absolute",
          top: "50%",
          left: "8%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          textAlign: "left",
          maxWidth: "640px",
          width: "90%",
          zIndex: 10,
        }}>
          <FadeInScroll distance={20} duration={0.8} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "24px", width: "100%" }}>
            <h3 className="text-gray-900 dark:text-white" style={{ fontSize: "clamp(28px, 3.5vw, 42px)", fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
              Ensemble is...
            </h3>
            <p className="text-gray-900 dark:text-[#f4f4f5]" style={{
              fontSize: "clamp(18px, 2.2vw, 26px)",
              lineHeight: 1.5,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              textShadow: theme === 'dark' ? "0 2px 24px rgba(0,0,0,0.8)" : "0 2px 24px rgba(255,255,255,0.8)",
              transition: "color 0.3s ease, text-shadow 0.3s ease"
            }}>
              A place where video editors and creators team up easily. Work together in real-time, find jobs, hire talent securely, and use AI to speed up your editing—all in one place without the usual headaches.
            </p>
            
            <div style={{ pointerEvents: "auto" }}>
              <StatsBar />
            </div>
          </FadeInScroll>
        </div>
      </div>
    </section>
  );
};

export default SectionGallery;