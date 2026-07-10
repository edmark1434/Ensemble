import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Code, X, Briefcase, Cpu, Layers, ExternalLink, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import LightPillar from "@/components/ui/LightPillar"; // Adjust this path if needed
import TargetCursor from "@/components/ui/TargetCursor"; // Adjust this path if needed

// Expanded mock data featuring updated universal socials (GitHub, LinkedIn, Instagram)
const TEAM_MEMBERS = [
  {
    name: "Edmark Talingting",
    role: "Project Manager",
    img: "/team/eds.jpg",
    bio: "Edmark coordinates cross-functional delivery streams and maps product milestones to keep Ensemble moving on schedule.",
    skills: ["Agile Management", "Product Strategy", "Risk Mitigation"],
    focus: "Timeline Architecture",
    socials: [
      { name: "GitHub", url: "https://github.com", type: "github" },
      { name: "LinkedIn", url: "https://linkedin.com", type: "linkedin" },
      { name: "Instagram", url: "https://instagram.com", type: "instagram" }
    ],
    projects: [
      { name: "Ensemble Core", url: "#", img: "/features/clip/thumb1.jpg" },
      { name: "Milestone App", url: "#", img: "/features/clip/thumb2.jpg" },
      { name: "Agile Board", url: "#", img: "/features/clip/thumb3.jpg" },
      { name: "Risk Tracker", url: "#", img: "/features/clip/thumb4.jpg" }
    ]
  },
  {
    name: "John Paul Mahilom",
    role: "UI/UX & Architect",
    img: "/team/rex.jpg",
    bio: "John Paul designs intuitive layout systems and constructs the component architecture that guarantees lightning-fast user interactions.",
    skills: ["Design Systems", "React Architecture", "Interaction Design"],
    focus: "User Interface Topology",
    socials: [
      { name: "GitHub", url: "https://github.com", type: "github" },
      { name: "LinkedIn", url: "https://linkedin.com", type: "linkedin" },
      { name: "Instagram", url: "https://instagram.com", type: "instagram" }
    ],
    projects: [
      { name: "UI Design Kit", url: "#", img: "/features/clip/thumb1.jpg" },
      { name: "Framer Layouts", url: "#", img: "/features/clip/thumb2.jpg" },
      { name: "Design Token", url: "#", img: "/features/clip/thumb3.jpg" },
      { name: "Topology Map", url: "#", img: "/features/clip/thumb4.jpg" }
    ]
  },
  {
    name: "Jodeci Pacibe",
    role: "Full Stack Dev / AI Specialist",
    img: "/team/joed.jpg",
    bio: "Jodeci bridges modern data intelligence pipelines with deep-stack application patterns to drive fluid real-time collaborative tasks.",
    skills: ["Neural Integrations", "Node.js", "State Management"],
    focus: "AI Agents & Real-Time Engine",
    socials: [
      { name: "GitHub", url: "https://github.com", type: "github" },
      { name: "LinkedIn", url: "https://linkedin.com", type: "linkedin" },
      { name: "Instagram", url: "https://instagram.com", type: "instagram" }
    ],
    projects: [
      { name: "AI Sync Engine", url: "#", img: "/features/clip/thumb1.jpg" },
      { name: "Neural Pipeline", url: "#", img: "/features/clip/thumb2.jpg" },
      { name: "Real-time State", url: "#", img: "/features/clip/thumb3.jpg" },
      { name: "Agent Gateway", url: "#", img: "/features/clip/thumb4.jpg" }
    ]
  },
  {
    name: "Joehanes Lauglaug",
    role: "Hacker / Backend / Server",
    img: "/team/jojo.jpg",
    bio: "Joehanes optimizes server configurations, hardened security footprints, and architected WebSocket infrastructure for zero-lag streaming.",
    skills: ["Linux Systems", "WebSocket Security", "Docker Orchestration"],
    focus: "Infrastructure Security & Transport",
    socials: [
      { name: "GitHub", url: "https://github.com", type: "github" },
      { name: "LinkedIn", url: "https://linkedin.com", type: "linkedin" },
      { name: "Instagram", url: "https://instagram.com", type: "instagram" }
    ],
    projects: [
      { name: "WS Gateway", url: "#", img: "/features/clip/thumb1.jpg" },
      { name: "Secure Vault", url: "#", img: "/features/clip/thumb2.jpg" },
      { name: "Docker Orchestrator", url: "#", img: "/features/clip/thumb3.jpg" },
      { name: "Linux Monitor", url: "#", img: "/features/clip/thumb4.jpg" }
    ]
  }
];

const PageAboutUs: React.FC = () => {
  const navigate = useNavigate();
  const [selectedMember, setSelectedMember] = useState<typeof TEAM_MEMBERS[0] | null>(null);

  // Audio elements refs to keep overlap fluid
  const hoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);

  const initAudio = () => {
    if (!hoverAudioRef.current) {
      hoverAudioRef.current = new Audio("/sounds/hover.mp3");
      hoverAudioRef.current.volume = 0.2; // Soft subtle target lock blip
    }
    if (!clickAudioRef.current) {
      clickAudioRef.current = new Audio("/sounds/click.mp3");
      clickAudioRef.current.volume = 0.35; // Crisp snap selection tick
    }
  };

  const playHover = useCallback(() => {
    initAudio();
    if (hoverAudioRef.current) {
      hoverAudioRef.current.currentTime = 0;
      hoverAudioRef.current.play().catch(() => {});
    }
  }, []);

  const playClick = useCallback(() => {
    initAudio();
    if (clickAudioRef.current) {
      clickAudioRef.current.currentTime = 0;
      clickAudioRef.current.play().catch(() => {});
    }
  }, []);

  const renderSocialIcon = (type: string) => {
    switch (type) {
      case "github":
        return <Code size={14} />;
      case "linkedin":
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
            <rect width="4" height="12" x="2" y="9" />
            <circle cx="4" cy="4" r="2" />
          </svg>
        );
      default:
        return <Globe size={14} />;
    }
  };

  return (
    <div style={{ background: "#080a12", minHeight: "100vh", color: "#fff", padding: "80px 24px", position: "relative", overflowX: "hidden" }}>

      {/* ─── Premium Target Cursor System ─── */}
      <TargetCursor
        targetSelector=".cursor-target"
        spinDuration={2.5}
        hideDefaultCursor={true}
        parallaxOn={true}
        cursorColor="rgba(255, 255, 255, 0.4)"
        cursorColorOnTarget="#8b0000" // Turns into crimson red upon targeting components
      />

      {/* ─── LightPillar Ambient Dark Background Layer ─── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
          opacity: 0.75,
          pointerEvents: "none"
        }}
      >
        <LightPillar
          topColor="#8b0000"      // Moody Crimson Red
          bottomColor="#4a0005"   // Dark Ruby Sub backdrop
          intensity={0.6}         // Dimmed for sleek contrast atmosphere
          rotationSpeed={0.15}
          glowAmount={0.003}      // Narrow spotlight concentration beam
          pillarWidth={4.5}
          pillarHeight={0.3}
          noiseIntensity={0.06}
          pillarRotation={90}     // Lay horizontally across layout axis
          mixBlendMode="screen"
          quality="high"
        />
      </div>

      <style>{`
        .member-card {
          background: rgba(13, 15, 26, 0.8); 
          border: 1px solid #1e2130;
          border-radius: 24px;
          overflow: hidden;
          transition: border-color 0.3s, background-color 0.3s, box-shadow 0.3s;
          display: flex;
          flex-direction: column;
          cursor: pointer;
        }
        .member-card:hover {
          border-color: #8b0000; 
          background: rgba(17, 20, 34, 0.9);
          box-shadow: 0 30px 60px -12px rgba(139, 0, 0, 0.15); 
        }
        .banner-container {
          width: 100%;
          height: 320px;
          background: #0d0f1a;
          overflow: hidden;
          border-bottom: 1px solid #1e2130;
          position: relative;
        }
        .banner-zoom {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
          filter: grayscale(100%);
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), filter 0.5s ease;
        }
        .member-card:hover .banner-zoom {
          transform: scale(1.05);
          filter: grayscale(0%);
        }
        .config-link {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #94a3b8;
          text-decoration: none;
          transition: color 0.2s;
        }
        .config-link:hover {
          color: #ef4444; 
        }
        .project-cube {
          position: relative;
          aspect-ratio: 1 / 1;
          background: rgba(30, 33, 48, 0.3);
          border: 1px solid #1e2130;
          border-radius: 12px;
          overflow: hidden;
          text-decoration: none;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 12px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .project-cube:hover {
          border-color: #8b0000;
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
        }
        .project-cube-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.4;
          transition: transform 0.3s ease, opacity 0.3s ease;
        }
        .project-cube:hover .project-cube-img {
          transform: scale(1.05);
          opacity: 0.6;
        }
        .project-cube-title {
          position: relative;
          z-index: 2;
          font-size: 12px;
          font-weight: 700;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          gap: 4px;
        }
        @media (max-width: 1024px) {
          .team-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .banner-container { height: 280px; }
        }
        @media (max-width: 640px) {
          .team-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Decorative ambient background blur */}
      <div style={{ position: "absolute", width: "600px", height: "600px", background: "rgba(139, 0, 0, 0.02)", filter: "blur(140px)", top: "20%", right: "-10%", pointerEvents: "none" }} />

      <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 2 }}>

        {/* Header layout */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <button
            onClick={() => { playClick(); navigate(-1); }}
            onMouseEnter={playHover}
            className="cursor-target"
            style={{ background: "none", border: "none", color: "#7a8499", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 40, fontSize: 14, fontWeight: 600, transition: "color 0.2s" }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.color = "#7a8499"; }}
          >
            <ArrowLeft size={16} /> Back
          </button>

          <h1 style={{ fontSize: "clamp(32px, 5vw, 44px)", fontWeight: 800, marginBottom: 24, letterSpacing: "-0.02em" }}>About Ensemble</h1>
          <p style={{ color: "#7a8499", fontSize: 18, marginBottom: 24, lineHeight: 1.6 }}>
            Ensemble is a structure-first real-time video collaboration application designed to eliminate friction in film production pipelines.
          </p>
        </motion.div>

        {/* Section divider & Team grid wrapper */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          style={{ borderTop: "1px solid #1e2130", paddingTop: 48, marginBottom: 40 }}
        >
          {/* Identity block displaying public png asset cleanly matched to left line */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
            <img
              src="/logo/ravenlabs.png"
              alt="RavenLabs Logo"
              style={{ width: 44, height: 44, objectFit: "contain", borderRadius: 8 }}
            />
            <div>
              <h2 style={{ fontSize: 12, color: "#f15c5c", fontWeight: 700, textTransform: "uppercase", letterSpacing: 3, marginBottom: 6 }}>
                Engineered By
              </h2>
              <p style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "#fff" }}>
                RavenLabs Development
              </p>
            </div>
          </div>

          {/* Staggered Grid Presentation */}
          <div className="team-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
            {TEAM_MEMBERS.map((member, idx) => (
              <motion.div
                key={idx}
                className="member-card cursor-target"
                onMouseEnter={playHover}
                onClick={() => { playClick(); setSelectedMember(member); }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -8 }}
                transition={{
                  opacity: { duration: 0.4, delay: idx * 0.1 },
                  y: { type: "spring", stiffness: 300, damping: 20 }
                }}
              >
                <div className="banner-container">
                  <img
                    src={member.img}
                    alt={member.name}
                    className="banner-zoom"
                    onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                      e.currentTarget.style.display = "none";
                      const parent = e.currentTarget.parentElement;
                      if (parent) parent.style.background = `linear-gradient(to bottom, #1e293b, #0d0f1a)`;
                    }}
                  />
                </div>

                <div style={{ padding: "24px 20px" }}>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 6, marginTop: 0 }}>
                    {member.name}
                  </h3>
                  <p style={{ color: "#ef4444", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 20px 0" }}>
                    {member.role}
                  </p>

                  <div style={{ display: "flex", gap: 14, color: "rgba(255,255,255,0.25)", alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                    <Code size={16} className="cursor-target" onMouseEnter={playHover} onClick={playClick} style={{ cursor: "pointer", transition: "color 0.2s" }} />
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cursor-target" onMouseEnter={playHover} onClick={playClick} style={{ cursor: "pointer", transition: "color 0.2s" }}><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cursor-target" onMouseEnter={playHover} onClick={playClick} style={{ cursor: "pointer", transition: "color 0.2s" }}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect width="4" height="12" x="2" y="9" /><circle cx="4" cy="4" r="2" /></svg>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Side Panel / Sliding Details Component */}
      <AnimatePresence>
        {selectedMember && (
          <>
            {/* Dark Background Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => { playClick(); setSelectedMember(null); }}
              style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "#000", zIndex: 100, cursor: "pointer" }}
            />

            {/* Sliding Panel Container fixed strictly to right */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              style={{
                position: "fixed",
                top: 0,
                right: 0,
                bottom: 0,
                height: "100vh",
                width: "100%",
                maxWidth: "460px",
                background: "#0b0e17",
                borderLeft: "1px solid #1e2130",
                boxShadow: "-10px 0 40px rgba(0,0,0,0.7)",
                zIndex: 101,
                display: "flex",
                flexDirection: "column",
                overflowY: "auto"
              }}
            >

              {/* Drawer Content Area */}
              <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
                <img
                  src={selectedMember.img}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", opacity: 0.08, filter: "grayscale(100%)" }}
                />
                <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at top right, transparent 20%, #0b0e17 80%)" }} />
              </div>

              {/* Close Drawer Button */}
              <button
                onClick={() => { playClick(); setSelectedMember(null); }}
                onMouseEnter={playHover}
                className="cursor-target"
                style={{ position: "absolute", top: 24, right: 24, width: 36, height: 36, borderRadius: "50%", background: "rgba(30, 33, 48, 0.4)", border: "1px solid rgba(255,255,255,0.08)", color: "#7a8499", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(4px)", zIndex: 10, transition: "color 0.2s" }}
                onMouseEnter={(e) => e.currentTarget.style.color = "#fff"}
                onMouseLeave={(e) => e.currentTarget.style.color = "#7a8499"}
              >
                <X size={18} />
              </button>

              <div style={{ padding: "48px 32px", flex: 1, position: "relative", zIndex: 1 }}>
                <h2 style={{ fontSize: 26, fontWeight: 800, color: "#fff", marginBottom: 4, marginTop: 0 }}>{selectedMember.name}</h2>
                <p style={{ color: "#ef4444", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 36, marginTop: 0 }}>{selectedMember.role}</p>

                <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#7a8499", marginBottom: 8 }}>
                      <Briefcase size={16} />
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Core Focus</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 15, color: "#e2e8f0", fontWeight: 500 }}>{selectedMember.focus}</p>
                  </div>

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#7a8499", marginBottom: 8 }}>
                      <Layers size={16} />
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Biography</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 14, color: "#94a3b8", lineHeight: 1.6 }}>{selectedMember.bio}</p>
                  </div>

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#7a8499", marginBottom: 12 }}>
                      <Cpu size={16} />
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Expertise Stack</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {selectedMember.skills.map((skill, i) => (
                        <span key={i} style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.15)", color: "#f87171", padding: "6px 12px", borderRadius: "12px", fontSize: 12, fontWeight: 600 }}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid #1e2130", paddingTop: 28, display: "flex", flexDirection: "column", gap: 28 }}>
                    {/* Social links */}
                    <div>
                      <div style={{ color: "#7a8499", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>
                        Socials
                      </div>
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                        {selectedMember.socials?.map((social, i) => (
                          <a key={i} href={social.url} target="_blank" rel="noreferrer" onMouseEnter={playHover} onClick={playClick} className="config-link cursor-target">
                            {renderSocialIcon(social.type)}
                            <span>{social.name}</span>
                          </a>
                        ))}
                      </div>
                    </div>

                    {/* Projects portfolio cubes */}
                    <div>
                      <div style={{ color: "#7a8499", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>
                        Projects
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        {selectedMember.projects?.map((project, i) => (
                          <a key={i} href={project.url} onMouseEnter={playHover} onClick={playClick} className="project-cube cursor-target">
                            <img
                              src={project.img}
                              alt=""
                              className="project-cube-img"
                              onError={(e) => { e.currentTarget.style.display = "none"; }}
                            />
                            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(11,14,23,0.95) 0%, rgba(11,14,23,0.2) 100%)", zIndex: 1 }} />
                            <div className="project-cube-title">
                              <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{project.name}</span>
                              <ExternalLink size={11} style={{ flexShrink: 0, opacity: 0.6 }} />
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PageAboutUs;