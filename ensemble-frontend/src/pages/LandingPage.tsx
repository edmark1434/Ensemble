// LandingPage.tsx
// Ensemble — Film production platform landing page
// Stack: React 18 + TypeScript, no external dependencies (Google Fonts via <link> in index.html)
//
// To use:
//   1. Add to index.html <head>:
//      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
//   2. Import and render: <LandingPage />

import { useState, useEffect, useRef } from "react";
import type { CSSProperties, FC } from "react";
import { useNavigate } from "react-router-dom";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:          "#080a12",
  bgCard:      "#0d0f1a",
  bgNav:       "rgba(8,10,18,.88)",
  border:      "#1e2130",
  borderHov:   "#2a3a5e",
  accent:      "#4a6fa5",
  text:        "#ffffff",
  muted:       "#7a8499",
  dim:         "#999",
  fontDisplay: "'Syne', sans-serif",
  fontBody:    "'DM Sans', sans-serif",
} as const;

// ─── Inline global styles (injected once) ────────────────────────────────────
const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { background: ${T.bg}; color: ${T.text}; font-family: ${T.fontBody}; -webkit-font-smoothing: antialiased; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-thumb { background: #2a2d3e; border-radius: 3px; }

  @keyframes ens-fadeUp {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes ens-ddIn {
    from { opacity: 0; transform: translateY(-5px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes ens-pulse {
    0%, 100% { opacity: .18; }
    50%       { opacity: .32; }
  }
`;

function useGlobalStyle(css: string): void {
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = css;
    document.head.appendChild(el);
    return () => { document.head.removeChild(el); };
  }, []);
}

// ─── Logo ─────────────────────────────────────────────────────────────────────
interface LogoProps {
  size?: number;
}

const Logo: FC<LogoProps> = ({ size = 22 }) => {
  const spokes: number[] = [0, 60, 120, 180, 240, 300];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
      <svg width={size + 6} height={size + 6} viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="15.5" stroke="#fff" strokeWidth="1.8" />
        <circle cx="18" cy="18" r="8.5"  stroke="#fff" strokeWidth="1.4" />
        <circle cx="18" cy="18" r="2.8"  fill="#fff" />
        {spokes.map((deg, i) => (
          <line
            key={i}
            x1="18" y1="18"
            x2={18 + 14 * Math.cos((deg * Math.PI) / 180)}
            y2={18 + 14 * Math.sin((deg * Math.PI) / 180)}
            stroke="#fff" strokeWidth=".9" opacity=".55"
          />
        ))}
      </svg>
      <span style={{
        fontSize: size,
        fontWeight: 700,
        fontFamily: T.fontDisplay,
        letterSpacing: .5,
      }}>
        Ensemble
      </span>
    </div>
  );
};

// ─── Dropdown ─────────────────────────────────────────────────────────────────
interface DropdownProps {
  label: string;
  items: string[];
  isOpen: boolean;
  onToggle: (val: boolean) => void;
}

const Dropdown: FC<DropdownProps> = ({ label, items, isOpen, onToggle }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onToggle(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onToggle]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => onToggle(!isOpen)}
        style={{
          background: "none",
          border: "none",
          color: isOpen ? "#fff" : T.dim,
          fontSize: 13,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "5px 9px",
          borderRadius: 6,
          fontFamily: T.fontBody,
          transition: "color .15s",
        }}
      >
        {label}
        <svg
          width="10" height="10" viewBox="0 0 12 12"
          style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .18s" }}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.6"
            fill="none" strokeLinecap="round" />
        </svg>
      </button>

      {isOpen && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          left: 0,
          background: "#111827",
          border: "1px solid #252a3a",
          borderRadius: 10,
          padding: "6px 0",
          minWidth: 195,
          boxShadow: "0 18px 44px rgba(0,0,0,.72)",
          zIndex: 200,
          animation: "ens-ddIn .13s ease",
        }}>
          {items.map((item, i) => (
            <button
              key={i}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                background: "none",
                border: "none",
                padding: "9px 16px",
                color: "#bbb",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: T.fontBody,
                transition: "background .12s, color .12s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#1a2436";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#bbb";
              }}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Navbar ───────────────────────────────────────────────────────────────────
const NAV_FEATURES: string[]  = ["Parallel Workflow", "Real-time Collaboration", "Story Structuring", "Frame Management", "Version History"];
const NAV_USECASES: string[]  = ["Film Production", "Documentary", "Short Films", "TV Series", "Student Projects"];

interface NavbarProps {
  onLogin: () => void;
  onSignup: () => void;
}

const Navbar: FC<NavbarProps> = ({ onLogin, onSignup }) => {
  const [openDD, setOpenDD] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState<boolean>(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const toggle = (name: string) => (val: boolean) => setOpenDD(val ? name : null);

  return (
    <nav style={{
      position: "fixed",
      top: 0, left: 0, right: 0,
      zIndex: 100,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "13px 40px",
      background: scrolled ? "rgba(8,10,18,.96)" : T.bgNav,
      backdropFilter: "blur(16px)",
      borderBottom: `1px solid ${scrolled ? "rgba(255,255,255,.09)" : "rgba(255,255,255,.05)"}`,
      transition: "background .3s, border-color .3s",
    }}>
      {/* Logo */}
      <Logo />

      {/* Centre links */}
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Dropdown
          label="Features"
          items={NAV_FEATURES}
          isOpen={openDD === "features"}
          onToggle={toggle("features")}
        />
        <Dropdown
          label="Use Cases"
          items={NAV_USECASES}
          isOpen={openDD === "usecases"}
          onToggle={toggle("usecases")}
        />
        {["Pricing", "Learn", "About"].map((lbl) => (
          <button
            key={lbl}
            style={{
              background: "none",
              border: "none",
              color: T.dim,
              fontSize: 13,
              cursor: "pointer",
              padding: "5px 9px",
              borderRadius: 6,
              fontFamily: T.fontBody,
              transition: "color .15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = T.dim)}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* Auth */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button
          onClick={onLogin}
          style={{
            background: "none",
            border: "none",
            color: T.dim,
            fontSize: 13,
            cursor: "pointer",
            padding: "7px 14px",
            borderRadius: 20,
            fontFamily: T.fontBody,
            transition: "color .15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = T.dim)}
        >
          Log in
        </button>
        <button
          onClick={onSignup}
          style={{
            background: "#fff",
            border: "none",
            color: "#080a12",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            padding: "8px 20px",
            borderRadius: 20,
            fontFamily: T.fontBody,
            transition: "background .15s, transform .1s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#dde3ed";
            e.currentTarget.style.transform = "scale(1.02)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#fff";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          Sign up
        </button>
      </div>
    </nav>
  );
};

// ─── Hero ─────────────────────────────────────────────────────────────────────
interface HeroProps {
  onStart: () => void;
}

const Hero: FC<HeroProps> = ({ onStart }) => {
  const [mounted, setMounted] = useState<boolean>(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

  const anim = (delay = 0): CSSProperties => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(28px)",
    transition: `opacity .85s ${delay}s cubic-bezier(.16,1,.3,1), transform .85s ${delay}s cubic-bezier(.16,1,.3,1)`,
  });

  return (
    <section style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: "120px 40px 70px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Ambient glow */}
      <div style={{
        position: "absolute",
        top: "32%", left: "50%",
        transform: "translate(-50%,-50%)",
        width: 680, height: 440,
        background: `radial-gradient(ellipse, rgba(74,111,165,.22) 0%, transparent 68%)`,
        pointerEvents: "none",
        animation: "ens-pulse 5s ease-in-out infinite",
      }} />

      {/* Subtle grid */}
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(74,111,165,.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(74,111,165,.04) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
        pointerEvents: "none",
      }} />

      {/* Badge */}
      <div style={{
        ...anim(0),
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        background: "rgba(74,111,165,.12)",
        border: "1px solid rgba(74,111,165,.3)",
        borderRadius: 20,
        padding: "5px 14px",
        fontSize: 12,
        color: "#7aadde",
        marginBottom: 28,
        fontWeight: 600,
        letterSpacing: .4,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: "50%",
          background: "#4a6fa5",
          display: "inline-block",
          boxShadow: "0 0 6px #4a6fa5",
        }} />
        Now in open beta — join 2,400+ filmmakers
      </div>

      {/* Headline */}
      <h1 style={{
        ...anim(.08),
        fontSize: "clamp(44px, 7vw, 88px)",
        fontFamily: T.fontDisplay,
        fontWeight: 800,
        lineHeight: 1.06,
        letterSpacing: -2,
        maxWidth: 820,
      }}>
        Build the{" "}
        <span style={{ color: T.accent }}>blueprint.</span>
        <br />
        Then fill the{" "}
        <span style={{ color: T.accent }}>frames.</span>
      </h1>

      {/* Sub */}
      <p style={{
        ...anim(.18),
        marginTop: 22,
        color: T.muted,
        fontSize: 16,
        maxWidth: 460,
        lineHeight: 1.74,
      }}>
        Move from a linear "waiting game" to a Parallel Workflow. Structure
        your story in real-time while the cameras are still rolling.
      </p>

      {/* CTA buttons */}
      <div style={{
        ...anim(.28),
        display: "flex",
        gap: 12,
        marginTop: 38,
        flexWrap: "wrap",
        justifyContent: "center",
      }}>
        <button
          onClick={onStart}
          style={{
            background: "#fff",
            color: "#080a12",
            border: "none",
            padding: "13px 30px",
            borderRadius: 28,
            fontWeight: 700,
            fontSize: 15,
            cursor: "pointer",
            fontFamily: T.fontBody,
            transition: "background .15s, transform .12s, box-shadow .15s",
            boxShadow: "0 0 0 0 rgba(255,255,255,0)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#e8edf5";
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 8px 24px rgba(255,255,255,.12)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#fff";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 0 0 0 rgba(255,255,255,0)";
          }}
        >
          Start Project
        </button>
        <button
          style={{
            background: "transparent",
            color: "#fff",
            border: "1.5px solid rgba(255,255,255,.2)",
            padding: "13px 30px",
            borderRadius: 28,
            fontWeight: 600,
            fontSize: 15,
            cursor: "pointer",
            fontFamily: T.fontBody,
            transition: "border-color .15s, transform .12s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,.55)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,.2)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          Explore Site
        </button>
      </div>

      {/* Scroll hint */}
      <div style={{
        ...anim(.4),
        position: "absolute",
        bottom: 36,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        opacity: .4,
      }}>
        <span style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: T.muted }}>Scroll</span>
        <svg width="14" height="14" viewBox="0 0 14 14">
          <path d="M3 5l4 4 4-4" stroke="#fff" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </svg>
      </div>
    </section>
  );
};

// ─── Feature card ─────────────────────────────────────────────────────────────
interface FeatureCardProps {
  icon: string;
  title: string;
  desc: string;
}

const FeatureCard: FC<FeatureCardProps> = ({ icon, title, desc }) => {
  const [hov, setHov] = useState<boolean>(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: "26px 24px",
        background: hov ? "#111524" : T.bgCard,
        borderRadius: 14,
        border: `1px solid ${hov ? T.borderHov : T.border}`,
        transition: "background .2s, border-color .2s, transform .2s",
        transform: hov ? "translateY(-5px)" : "translateY(0)",
        cursor: "default",
      }}
    >
      <div style={{ fontSize: 26, marginBottom: 14 }}>{icon}</div>
      <div style={{
        fontFamily: T.fontDisplay,
        fontWeight: 700,
        fontSize: 16,
        marginBottom: 8,
        color: "#fff",
      }}>
        {title}
      </div>
      <div style={{ color: T.muted, fontSize: 13, lineHeight: 1.68 }}>{desc}</div>
    </div>
  );
};

// ─── Features section ─────────────────────────────────────────────────────────
interface Feature {
  icon: string;
  title: string;
  desc: string;
}

const FEATURES: Feature[] = [
  { icon: "⚡", title: "Parallel Workflow",   desc: "Work on multiple scenes simultaneously without blocking your team. No more waiting." },
  { icon: "🎬", title: "Real-time Structure", desc: "Story scaffolding updates live as your shoot evolves on set." },
  { icon: "🔗", title: "Team Sync",           desc: "Directors, editors, and writers share one unified source of truth." },
  { icon: "🗂️", title: "Frame Management",   desc: "Organise, tag, and retrieve frames instantly. Your entire visual library." },
  { icon: "🕓", title: "Version History",     desc: "Every edit is saved. Roll back to any point in your project's timeline." },
  { icon: "☁️", title: "Cloud-native",        desc: "Access your project from any device, anywhere. Zero install. Always fast." },
];

const FeaturesSection: FC = () => {
  return (
    <section style={{ padding: "80px 40px", maxWidth: 1080, margin: "0 auto" }}>
      {/* Label */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <p style={{
          color: T.accent,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 2.5,
          textTransform: "uppercase",
          marginBottom: 10,
        }}>
          What we offer
        </p>
        <h2 style={{
          fontFamily: T.fontDisplay,
          fontWeight: 800,
          fontSize: "clamp(26px, 4vw, 38px)",
          letterSpacing: -.5,
        }}>
          Built for filmmakers,<br />by filmmakers
        </h2>
      </div>

      {/* Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 20,
      }}>
        {FEATURES.map((f) => <FeatureCard key={f.title} {...f} />)}
      </div>
    </section>
  );
};

// ─── Stats bar ────────────────────────────────────────────────────────────────
interface Stat {
  value: string;
  label: string;
}

const STATS: Stat[] = [
  { value: "2,400+", label: "Filmmakers" },
  { value: "18k+",   label: "Projects created" },
  { value: "99.9%",  label: "Uptime" },
  { value: "4.9★",   label: "Average rating" },
];

const StatsBar: FC = () => {
  return (
    <div style={{
      borderTop: `1px solid ${T.border}`,
      borderBottom: `1px solid ${T.border}`,
      background: T.bgCard,
      padding: "36px 40px",
    }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 20,
        maxWidth: 960,
        margin: "0 auto",
        textAlign: "center",
      }}>
        {STATS.map((s) => (
          <div key={s.label}>
            <div style={{
              fontFamily: T.fontDisplay,
              fontSize: 32,
              fontWeight: 800,
              color: "#fff",
              letterSpacing: -1,
            }}>
              {s.value}
            </div>
            <div style={{ color: T.muted, fontSize: 13, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Testimonials ─────────────────────────────────────────────────────────────
interface Testimonial {
  quote: string;
  name: string;
  role: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote: "Ensemble completely changed how our production team operates. We shaved weeks off post.",
    name: "Maya R.", role: "Director, Sundance '24",
  },
  {
    quote: "Finally — a tool that understands that real filmmaking is non-linear and chaotic.",
    name: "Jordan K.", role: "Documentary filmmaker",
  },
  {
    quote: "The parallel workflow feature alone is worth every penny. Our editors are unblocked.",
    name: "Sam T.", role: "EP, Netflix Original",
  },
];

const TestimonialsSection: FC = () => {
  return (
    <section style={{ padding: "80px 40px", maxWidth: 1080, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <p style={{ color: T.accent, fontSize: 11, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 10 }}>
          Testimonials
        </p>
        <h2 style={{ fontFamily: T.fontDisplay, fontWeight: 800, fontSize: "clamp(24px,4vw,34px)", letterSpacing: -.5 }}>
          Trusted on set and in the edit bay
        </h2>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 20,
      }}>
        {TESTIMONIALS.map((t) => (
          <div
            key={t.name}
            style={{
              padding: "28px 24px",
              background: T.bgCard,
              borderRadius: 14,
              border: `1px solid ${T.border}`,
            }}
          >
            <div style={{ color: T.accent, fontSize: 28, lineHeight: 1, marginBottom: 14 }}>"</div>
            <p style={{ color: "#d0d6e0", fontSize: 14, lineHeight: 1.72, marginBottom: 20 }}>{t.quote}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: `rgba(74,111,165,.25)`,
                border: `1px solid rgba(74,111,165,.4)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, color: "#7aadde",
              }}>
                {t.name[0]}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{t.name}</div>
                <div style={{ fontSize: 11, color: T.muted }}>{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

// ─── CTA Strip ────────────────────────────────────────────────────────────────
interface CtaStripProps {
  onStart: () => void;
}

const CtaStrip: FC<CtaStripProps> = ({ onStart }) => {
  return (
    <section style={{
      padding: "80px 40px",
      textAlign: "center",
      position: "relative",
      overflow: "hidden",
      background: T.bgCard,
      borderTop: `1px solid ${T.border}`,
    }}>
      <div style={{
        position: "absolute",
        top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        width: 500, height: 300,
        background: "radial-gradient(ellipse, rgba(74,111,165,.18) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <h2 style={{
        fontFamily: T.fontDisplay,
        fontWeight: 800,
        fontSize: "clamp(26px,4vw,40px)",
        letterSpacing: -.5,
        position: "relative",
        marginBottom: 14,
      }}>
        Ready to build your blueprint?
      </h2>
      <p style={{ color: T.muted, fontSize: 15, maxWidth: 440, margin: "0 auto 32px", lineHeight: 1.7, position: "relative" }}>
        Join thousands of filmmakers already using Ensemble to ship better stories, faster.
      </p>
      <button
        onClick={onStart}
        style={{
          background: "#fff",
          color: "#080a12",
          border: "none",
          padding: "14px 34px",
          borderRadius: 28,
          fontWeight: 700,
          fontSize: 15,
          cursor: "pointer",
          fontFamily: T.fontBody,
          position: "relative",
          transition: "background .15s, transform .12s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#e8edf5";
          e.currentTarget.style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#fff";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        Start for free →
      </button>
    </section>
  );
};

// ─── Footer ───────────────────────────────────────────────────────────────────
type FooterLinks = Record<string, string[]>;

const FOOTER_LINKS: FooterLinks = {
  Product:   ["Features", "Use Cases", "Pricing", "Changelog"],
  Company:   ["About", "Blog", "Careers", "Press"],
  Resources: ["Docs", "API", "Community", "Support"],
  Legal:     ["Privacy", "Terms", "Cookies"],
};

const Footer: FC = () => {
  return (
    <footer style={{
      borderTop: `1px solid ${T.border}`,
      padding: "56px 40px 36px",
      background: "#06080f",
    }}>
      <div style={{
        maxWidth: 1080,
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "1.6fr repeat(4, 1fr)",
        gap: 40,
        marginBottom: 48,
      }}>
        {/* Brand */}
        <div>
          <Logo size={20} />
          <p style={{ color: T.muted, fontSize: 13, lineHeight: 1.7, marginTop: 14, maxWidth: 220 }}>
            The parallel workflow platform for modern film production teams.
          </p>
        </div>
        {/* Link columns */}
        {Object.entries(FOOTER_LINKS).map(([col, links]) => (
          <div key={col}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 16 }}>
              {col}
            </div>
            {links.map((l) => (
              <div
                key={l}
                style={{
                  color: T.muted,
                  fontSize: 13,
                  marginBottom: 10,
                  cursor: "pointer",
                  transition: "color .15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                onMouseLeave={(e) => (e.currentTarget.style.color = T.muted)}
              >
                {l}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div style={{
        borderTop: `1px solid ${T.border}`,
        paddingTop: 24,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        maxWidth: 1080,
        margin: "0 auto",
        flexWrap: "wrap",
        gap: 12,
      }}>
        <span style={{ color: T.muted, fontSize: 12 }}>© 2025 Ensemble, Inc. All rights reserved.</span>
        <span style={{ color: "#3a4050", fontSize: 12 }}>Built for storytellers.</span>
      </div>
    </footer>
  );
};

// ─── Main export ──────────────────────────────────────────────────────────────
interface LandingPageProps {
  onLogin?: () => void;
  onSignup?: () => void;
}

const LandingPage: FC<LandingPageProps> = ({ onLogin, onSignup }) => {
  useGlobalStyle(GLOBAL_CSS);
  const navigate = useNavigate();
  // Default no-ops if props not provided (standalone use)
  const handleLogin  = onLogin  ?? (() => navigate("/login"));
  const handleSignup = onSignup ?? (() => navigate("/signup"));

  return (
    <div style={{ background: T.bg, minHeight: "100vh" }}>
      <Navbar onLogin={handleLogin} onSignup={handleSignup} />
      <Hero onStart={handleSignup} />
      <StatsBar />
      <FeaturesSection />
      <TestimonialsSection />
      <CtaStrip onStart={handleSignup} />
      <Footer />
    </div>
  );
};

export default LandingPage;