import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Code } from "lucide-react";

const TEAM_MEMBERS = [
  {
    name: "Edmark Talingting",
    role: "Project Manager",
    img: "/team/edmark.png"
  },
  {
    name: "John Paul Mahilom",
    role: "UI/UX & Architect",
    img: "/team/johnpaul.png"
  },
  {
    name: "Jodeci Pacibe",
    role: "Full Stack Dev / AI Specialist",
    img: "/team/jodeci.png"
  },
  {
    name: "Joehanes Lauglaug",
    role: "Hacker / Backend / Server",
    img: "/team/joehanes.png"
  }
];

const PageAboutUs: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ background: "#080a12", minHeight: "100vh", color: "#fff", padding: "80px 24px", position: "relative", overflowX: "hidden" }}>

      <style>{`
        .member-card {
          background: rgba(13, 15, 26, 0.45);
          border: 1px solid #1e2130;
          border-radius: 24px;
          overflow: hidden;
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          flex-direction: column;
        }
        .member-card:hover {
          transform: translateY(-8px);
          border-color: #3b82f6;
          background: rgba(17, 20, 34, 0.7);
          box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.5);
        }
        .banner-container {
          width: 100%;
          height: 320px; /* Increased height for vertical look */
          background: #0d0f1a;
          overflow: hidden;
          border-bottom: 1px solid #1e2130;
          position: relative;
        }
        .banner-zoom {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top; /* Focus on the face/top of the image */
          transition: transform 0.6s ease;
        }
        .member-card:hover .banner-zoom {
          transform: scale(1.08);
        }
        @media (max-width: 1024px) {
          .team-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .banner-container { height: 280px; }
        }
        @media (max-width: 640px) {
          .team-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ position: "absolute", width: "600px", height: "600px", background: "rgba(59, 130, 246, 0.03)", filter: "blur(140px)", top: "20%", right: "-10%", pointerEvents: "none" }} />

      <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 2 }}>
        <button
          onClick={() => navigate(-1)}
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

        <div style={{ borderTop: "1px solid #1e2130", paddingTop: 48, marginBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 12, color: "#3b82f6", fontWeight: 700, textTransform: "uppercase", letterSpacing: 3, marginBottom: 6 }}>
                Engineered By
              </h2>
              <p style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "#fff" }}>
                RavenLabs Dev Group
              </p>
            </div>
          </div>

          <div className="team-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
            {TEAM_MEMBERS.map((member, idx) => (
              <div key={idx} className="member-card">
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
                  <p style={{ color: "#3b82f6", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 20px 0" }}>
                    {member.role}
                  </p>

                  <div style={{ display: "flex", gap: 14, color: "rgba(255,255,255,0.25)", alignItems: "center" }}>
                    <Code
                      size={16}
                      style={{ cursor: "pointer", transition: "color 0.2s" }}
                      onMouseEnter={(e: React.MouseEvent<SVGSVGElement>) => { e.currentTarget.style.color = "#3b82f6"; }}
                      onMouseLeave={(e: React.MouseEvent<SVGSVGElement>) => { e.currentTarget.style.color = "inherit"; }}
                    />

                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: "pointer", transition: "color 0.2s" }} onMouseEnter={(e: React.MouseEvent<SVGSVGElement>) => { e.currentTarget.style.color = "#fff"; }} onMouseLeave={(e: React.MouseEvent<SVGSVGElement>) => { e.currentTarget.style.color = "inherit"; }}>
                      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                      <path d="M9 18c-4.51 2-5-2-7-2" />
                    </svg>

                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: "pointer", transition: "color 0.2s" }} onMouseEnter={(e: React.MouseEvent<SVGSVGElement>) => { e.currentTarget.style.color = "#0a66c2"; }} onMouseLeave={(e: React.MouseEvent<SVGSVGElement>) => { e.currentTarget.style.color = "inherit"; }}>
                      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                      <rect width="4" height="12" x="2" y="9" />
                      <circle cx="4" cy="4" r="2" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageAboutUs;