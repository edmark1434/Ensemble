import { useState, useEffect, useRef } from "react";
import type { CSSProperties, FC } from "react";
import { useNavigate } from "react-router-dom";
import ScrollToTop from "@/components/scroll_to_top.tsx";

// ─── Design tokens (Plus Jakarta Sans) ────────────────────────────────────────
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
  fontDisplay: "'Plus Jakarta Sans', sans-serif",
  fontBody:    "'Plus Jakarta Sans', sans-serif",
  gold: "#eab308",
  teal: "#2dd4bf",
  cardBg: "rgba(13, 15, 26, 0.6)",
} as const;

// ─── Inline global styles ─────────────────────────────────────────────────────
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
  
/* Sidebar Dot Navigation */
.feature-nav {
  position: fixed;
  right: 40px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 1000;
  transition: opacity 0.5s ease;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  cursor: pointer;
}

.dot.active {
  background: #3b82f6;
  transform: scale(1.8);
  box-shadow: 0 0 15px rgba(59, 130, 246, 0.6);
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
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
      <img
        src="/ensemble_lg.svg"
        alt="Ensemble Logo"
        style={{
          width: size + 6,
          height: size + 6,
          display: "block"
        }}
      />
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

// ─── Feature Data with IDs ─────────────────────────────────────────────────────────────
const FEATURES_LEFT = [
  { id: "01", title: "Seamless Collaboration", desc: "Collaborate without friction through real-time team editing. No more wasting time on rendering or sending over large files.", img: "/features/m1.png", sectionId: "seamless_collab" },
  { id: "02", title: "A.I. Caption Navigation", desc: "Type any word or phrase and our AI will pinpoint the clip. Instantly navigate to exactly where it was spoken in your video.", img: "/features/m2.png", sectionId: "caption_nav" },
  { id: "03", title: "Auto Dead-Air Clean Up", desc: "Remove silence with a single click to streamline your edit. Keep your viewers engaged and get your content ready for export.", img: "/features/m3.png", sectionId: "dead_air" },
];

const FEATURES_RIGHT = [
  { id: "04", title: "Creative Marketplace", desc: "Buy or sell premium audio, templates, and assets to fuel any production. Browse our job board to hire top talent or apply for your next gig.", img: "/features/m4.png", sectionId: "creative_market" },
  { id: "05", title: "Integrated Chat & Video Call", desc: "Conduct interviews or team meetings with high-quality video. Streamline your hiring and feedback without leaving the app.", img: "/features/m5.png", sectionId: "integrated_chatvc" },
  { id: "06", title: "Project Progress Tracking", desc: "Monitor every milestone with an intuitive, live visual dashboard. Track task completion and ensure your content is ready for final delivery.", img: "/features/m6.png", sectionId: "progress_tracking" },
];

const ALL_FEATURES = [...FEATURES_LEFT, ...FEATURES_RIGHT];

interface DropdownProps {
  label: string;
  items: string[];
  isOpen: boolean;
  onToggle: (val: boolean) => void;
  onItemClick?: (index: number) => void;
  scrollTargets?: string[];
}

const Dropdown: FC<DropdownProps> = ({ label, items, isOpen, onToggle, onItemClick, scrollTargets }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onToggle(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onToggle]);

  const handleItemClick = (index: number) => {
    if (scrollTargets && scrollTargets[index]) {
      const targetId = scrollTargets[index];
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else if (onItemClick) {
      onItemClick(index);
    }
    onToggle(false);
  };

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
        <svg width="10" height="10" viewBox="0 0 12 12" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .18s" }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
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
          minWidth: 220,
          boxShadow: "0 18px 44px rgba(0,0,0,.72)",
          zIndex: 200,
          animation: "ens-ddIn .13s ease",
        }}>
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => handleItemClick(i)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                background: "none",
                border: "none",
                padding: "10px 16px",
                color: "#bbb",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: T.fontBody,
                transition: "all .12s",
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
const NAV_USECASES: string[] = ["Casual User", "Freelancer", "Client", "Asset Creator"];

// Map use cases to their scroll targets
const USECASE_SCROLL_TARGETS: string[] = ["pricing", "pricing", "pricing", "pricing"];

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

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Create scroll targets for features using their section IDs
  const featureScrollTargets = ALL_FEATURES.map(f => f.sectionId);

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
      <div onClick={() => scrollToId("hero")} style={{ cursor: "pointer" }}>
        <Logo />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        {/* Features: Clicks scroll to specific feature sections */}
        <Dropdown
          label="Features"
          items={ALL_FEATURES.map(f => f.title)}
          isOpen={openDD === "features"}
          onToggle={toggle("features")}
          scrollTargets={featureScrollTargets}
        />

        {/* Use Cases - Scrolls to pricing section */}
        <Dropdown
          label="Use Cases"
          items={NAV_USECASES}
          isOpen={openDD === "usecases"}
          onToggle={toggle("usecases")}
          scrollTargets={USECASE_SCROLL_TARGETS}
        />

        {/* Pricing: Scrolls to the pricing section */}
        <button
          onClick={() => scrollToId("pricing")}
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
          Pricing
        </button>
      </div>

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

// ─── HeroProps interface ────────────────────────────────────────────────────────
interface HeroProps {
  onStart: () => void;
  editorCount?: string;
  avatars?: string[];
}

// ─── Hero Component with Multi-Color Blurs ────────────────────────────
const Hero: FC<HeroProps> = ({
  onStart,
  editorCount = "300+",
  avatars = [
    "https://i.pravatar.cc/100?u=1",
    "https://i.pravatar.cc/100?u=2",
    "https://i.pravatar.cc/100?u=3"
  ]
}) => {
  const [mounted, setMounted] = useState<boolean>(false);
  useEffect(() => { setMounted(true); }, []);

  const anim = (delay = 0): CSSProperties => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(24px)",
    transition: `all .9s ${delay}s cubic-bezier(.16,1,.3,1)`,
  });

  return (
    <section id="hero" style={{
      height: "100vh",
      minHeight: "700px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "0 60px",
      position: "relative",
      overflow: "hidden",
      background: T.bg,
    }}>

      {/* ─── Abstract Color Blurs ─── */}
      <div style={{
        position: "absolute",
        width: "600px",
        height: "600px",
        background: "rgba(34, 211, 238, 0.07)",
        filter: "blur(120px)",
        borderRadius: "50%",
        top: "10%",
        left: "-5%",
        zIndex: 1,
        pointerEvents: "none"
      }} />

      <div style={{
        position: "absolute",
        width: "700px",
        height: "700px",
        background: "rgba(168, 85, 247, 0.08)",
        filter: "blur(140px)",
        borderRadius: "50%",
        bottom: "5%",
        right: "-10%",
        zIndex: 1,
        pointerEvents: "none"
      }} />

      <div style={{
        position: "absolute",
        width: "400px",
        height: "400px",
        background: "rgba(234, 179, 8, 0.04)",
        filter: "blur(100px)",
        borderRadius: "50%",
        bottom: "-10%",
        left: "30%",
        zIndex: 1,
        pointerEvents: "none"
      }} />

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1.15fr",
        gap: "60px",
        maxWidth: "1400px",
        width: "100%",
        alignItems: "center",
        zIndex: 2,
      }}>

        <div>
          <h1 style={{
            ...anim(0),
            fontSize: "clamp(48px, 5.5vw, 60px)",
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: "-0.04em",
            marginBottom: "36px",
            color: "#fff"
          }}>
            Collaborative Video Editing & Creative Marketplace
          </h1>

          <div style={{
            ...anim(0.1),
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "48px"
          }}>
            <div style={{ display: "flex" }}>
              {avatars.map((url, i) => (
                <div key={i} style={{
                  width: 46,
                  height: 46,
                  borderRadius: "50%",
                  border: `3px solid #080a12`,
                  marginLeft: i === 0 ? 0 : -14,
                  overflow: "hidden",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
                }}>
                  <img src={url} alt="user" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}
            </div>
            <p style={{ color: "#a1a1aa", fontSize: 16, lineHeight: 1.4, maxWidth: 280 }}>
              Join with <span style={{ color: "#fff", fontWeight: 700 }}>{editorCount} Video Editors</span> and start collaborating in your work today!
            </p>
          </div>

          <button
            onClick={onStart}
            style={{
              ...anim(0.2),
              background: "#fff",
              color: "#080a12",
              border: "none",
              padding: "20px 42px",
              borderRadius: "14px",
              fontWeight: 700,
              fontSize: 17,
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: "0 10px 30px -10px rgba(255,255,255,0.2)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 15px 40px -10px rgba(255,255,255,0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 10px 30px -10px rgba(255,255,255,0.2)";
            }}
          >
            Get Started
          </button>
        </div>

        <div style={{
          ...anim(0.3),
          position: "relative",
        }}>
          <div style={{
            background: "#000",
            borderRadius: "20px",
            border: "1px solid rgba(255,255,255,0.08)",
            overflow: "hidden",
            boxShadow: "0 60px 120px -20px rgba(0,0,0,0.8)",
            lineHeight: 0,
            position: "relative",
            zIndex: 3
          }}>
            <video
              autoPlay
              muted
              loop
              playsInline
              style={{
                width: "100%",
                height: "auto",
                display: "block",
              }}
            >
              <source src="/clip/side_video.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </div>

      <div style={{
        position: "absolute",
        bottom: "30px",
        left: "50%",
        transform: "translateX(-50%)",
        opacity: 0.4,
        animation: "ens-pulse 2s infinite",
        zIndex: 5
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
          <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
        </svg>
      </div>
    </section>
  );
};

// ─── Stats ────────────────────────────────────────────────────────────────────
const STATS = [
  { value: "2,400+", label: "Users" },
  { value: "18k+",   label: "Projects created" },
  { value: "99.9%",  label: "Uptime" },
  { value: "4.9★",   label: "Average rating" },
];

const StatsBar: FC = () => (
  <div style={{ borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, background: T.bgCard, padding: "36px 40px" }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 20, maxWidth: 960, margin: "0 auto", textAlign: "center" }}>
      {STATS.map((s) => (
        <div key={s.label}>
          <div style={{ fontFamily: T.fontDisplay, fontSize: 32, fontWeight: 800, color: "#fff", letterSpacing: -1 }}>{s.value}</div>
          <div style={{ color: T.muted, fontSize: 13, marginTop: 4 }}>{s.label}</div>
        </div>
      ))}
    </div>
  </div>
);

// ─── Features Section with Custom IDs ────────────────────────────────────────
const FeaturesSection: FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sectionObserver = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    if (sectionRef.current) sectionObserver.observe(sectionRef.current);

    const blockObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute("data-index"));
            setActiveIndex(index);
            entry.target.classList.add("appeared");
          }
        });
      },
      { threshold: 0.5 }
    );

    const blocks = document.querySelectorAll(".feature-block");
    blocks.forEach((b) => blockObserver.observe(b));

    return () => {
      sectionObserver.disconnect();
      blockObserver.disconnect();
    };
  }, []);

  return (
    <section id="features" ref={sectionRef} style={{ background: T.bg, position: "relative", overflow: "hidden" }}>
      <div className="feature-nav" style={{ opacity: isVisible ? 1 : 0, pointerEvents: isVisible ? "auto" : "none" }}>
        {ALL_FEATURES.map((_, i) => (
          <div
            key={i}
            className={`dot ${activeIndex === i ? "active" : ""}`}
            onClick={() => {
              const targetId = ALL_FEATURES[i].sectionId;
              document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
            }}
          />
        ))}
      </div>

      <div style={{ textAlign: "center", paddingTop: "100px", position: "relative", zIndex: 2 }}>
         <h2 style={{ fontSize: 14, color: "#3b82f6", fontWeight: 700, textTransform: "uppercase", letterSpacing: 4 }}>
           Features
         </h2>
      </div>

      {ALL_FEATURES.map((f, i) => (
        <div
          key={f.id}
          id={f.sectionId}
          data-index={i}
          className="feature-block"
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: i % 2 !== 0 ? "row-reverse" : "row",
            gap: "100px",
            maxWidth: "1300px",
            margin: "0 auto",
            padding: "0 40px",
            position: "relative",
            opacity: 0,
            transform: "translateY(40px)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <div style={{
            position: "absolute",
            width: "500px",
            height: "500px",
            background: i % 2 === 0 ? "rgba(59, 130, 246, 0.08)" : "rgba(168, 85, 247, 0.08)",
            filter: "blur(120px)",
            borderRadius: "50%",
            zIndex: 0,
            top: "50%",
            left: i % 2 === 0 ? "10%" : "60%",
            transform: "translateY(-50%)",
            pointerEvents: "none"
          }} />

          <style>{`.appeared { opacity: 1 !important; transform: translateY(0) !important; }`}</style>

          <div style={{ flex: 1.2, zIndex: 2 }}>
            <div style={{
              width: "100%",
              aspectRatio: "16 / 9",
              borderRadius: 30,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 50px 100px -20px rgba(0,0,0,0.7)",
              background: "#000"
            }}>
              <img src={f.img} alt={f.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          </div>

          <div style={{ flex: 1, zIndex: 2 }}>
            <div style={{ color: "#3b82f6", fontWeight: 800, fontSize: 16, marginBottom: 12 }}>{f.id}</div>
            <h3 style={{ fontSize: "clamp(32px, 4vw, 56px)", fontWeight: 800, color: "#fff", marginBottom: "28px", lineHeight: 1 }}>
              {f.title}
            </h3>
            <p style={{ color: "#94a3b8", fontSize: 19, lineHeight: 1.6, maxWidth: "500px" }}>
              {f.desc}
            </p>
          </div>
        </div>
      ))}
    </section>
  );
};

const PLANS = [
  {
    name: "Default",
    price: "FREE",
    originalPrice: null,
    color: "#fff",
    features: ["720p Export", "Watermarked Export", "Basic Tools", "3 Collaborators", "3 Collaborative Projects", "1 Asset Post"],
    buttonText: "Get Started",
    isPrimary: false,
  },
  {
    name: "PREMIUM",
    price: "₱350",
    originalPrice: "₱499",
    color: T.gold,
    features: ["1080p Export", "No Watermark", "Premium Tools + AI", "10 Collaborators", "10 Collaborative Projects", "20 Asset Posts", "Profile Visibility +30%", "Badge Display"],
    buttonText: "Upgrade to Premium",
    isPrimary: true,
    icon: "",
  },
  {
    name: "BUSINESS",
    price: "₱950",
    originalPrice: "₱1,299",
    color: T.teal,
    features: ["2K - 4K Export", "No Watermark", "Premium Tools + AI", "20 Collaborators", "20 Collaborative Projects", "Unlimited Asset Posts", "Profile Visibility +90%", "Badge Display and More"],
    buttonText: "Upgrade to Business",
    isPrimary: true,
    icon: "",
  }
];

// ─── Pricing Section ────────────────────────────────────────────
const PricingSection: FC = () => {
  return (
    <section id="pricing" style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "60px 20px",
      background: T.bg,
      position: "relative",
      overflow: "hidden"
    }}>

      <div style={{
        position: "absolute",
        width: "600px",
        height: "600px",
        background: "rgba(34, 211, 238, 0.05)",
        filter: "blur(120px)",
        borderRadius: "50%",
        bottom: "-10%",
        right: "5%",
        zIndex: 1,
        pointerEvents: "none"
      }} />

      <div style={{
        position: "absolute",
        width: "450px",
        height: "450px",
        background: "rgba(234, 179, 8, 0.05)",
        filter: "blur(90px)",
        borderRadius: "50%",
        top: "40%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 1,
        pointerEvents: "none"
      }} />

      <div style={{ textAlign: "center", marginBottom: "40px", position: "relative", zIndex: 2 }}>
        <h2 style={{
          fontSize: "clamp(28px, 4vw, 38px)",
          fontWeight: 800,
          fontFamily: T.fontDisplay,
          letterSpacing: "-0.03em",
          color: "#fff",
          marginBottom: "12px"
        }}>
          Simple, Transparent Pricing
        </h2>
        <p style={{ color: T.muted, fontSize: "16px", maxWidth: "500px", margin: "0 auto" }}>
          Choose the plan that fits your production scale.
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "20px",
        maxWidth: "1100px",
        width: "100%",
        alignItems: "stretch",
        position: "relative",
        zIndex: 2
      }}>
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            style={{
              background: "rgba(13, 15, 26, 0.6)",
              backdropFilter: "blur(12px)",
              borderRadius: "24px",
              border: `1px solid ${plan.isPrimary ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)"}`,
              padding: "32px 28px",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
              overflow: "hidden"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-5px)";
              e.currentTarget.style.borderColor = plan.color;
              e.currentTarget.style.background = "rgba(13, 15, 26, 0.9)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.borderColor = plan.isPrimary ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)";
              e.currentTarget.style.background = "rgba(13, 15, 26, 0.6)";
            }}
          >
            <div style={{ marginBottom: "24px" }}>
              <div style={{ color: plan.color, fontWeight: 700, fontSize: "12px", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "8px" }}>
                {plan.name} {plan.icon}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                <span style={{ fontSize: "36px", fontWeight: 800, color: "#fff" }}>{plan.price}</span>
                {plan.originalPrice && (
                  <span style={{ fontSize: "16px", color: "rgba(255,255,255,0.25)", textDecoration: "line-through" }}>{plan.originalPrice}</span>
                )}
              </div>
            </div>

            <div style={{ flex: 1 }}>
              {plan.features.map((feat, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px", color: "rgba(255,255,255,0.7)", fontSize: "13.5px" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={plan.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  {feat}
                </div>
              ))}
            </div>

            <button style={{
              marginTop: "32px",
              background: plan.isPrimary ? "#fff" : "transparent",
              color: plan.isPrimary ? "#000" : "#fff",
              border: plan.isPrimary ? "none" : "1px solid rgba(255,255,255,0.15)",
              padding: "14px",
              borderRadius: "12px",
              fontWeight: 700,
              fontSize: "14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "all 0.2s ease"
            }}>
              {plan.buttonText}
              <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: plan.isPrimary ? "#000" : "rgba(255,255,255,0.1)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

// ─── CTA & Footer ─────────────────────────────────────────────────────────────
const CtaStrip: FC<{ onStart: () => void }> = ({ onStart }) => (
  <section id="cta" style={{ padding: "80px 40px", textAlign: "center", background: T.bgCard, borderTop: `1px solid ${T.border}` }}>
    <h2 style={{ fontFamily: T.fontDisplay, fontWeight: 800, fontSize: "clamp(26px,4vw,40px)", marginBottom: 14 }}>Ready to build your blueprint?</h2>
    <p style={{ color: T.muted, fontSize: 15, maxWidth: 440, margin: "0 auto 32px" }}>Join thousands of filmmakers already using Ensemble to ship better stories, faster.</p>
    <button onClick={onStart} style={{ background: "#fff", color: "#080a12", border: "none", padding: "14px 34px", borderRadius: 28, fontWeight: 700, cursor: "pointer", fontFamily: T.fontBody }}>Start for free →</button>
  </section>
);

// ─── Footer ───────────────────────────────────────────────────────────────────
type FooterLinks = Record<string, string[]>;

const FOOTER_LINKS: FooterLinks = {
  Product:   ["Features", "Use Cases", "Pricing", "Changelog"],
  Company:   ["About", "Blog", "Careers", "Press"],
  Resources: ["Docs", "API", "Community", "Support"],
  Legal:     ["Privacy", "Terms", "Cookies"],
};

const Footer: FC = () => {
  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <footer style={{
      borderTop: `1px solid ${T.border}`,
      padding: "80px 60px 40px",
      background: "#06080f",
      position: "relative",
      overflow: "hidden"
    }}>
      <div style={{
        position: "absolute",
        bottom: "-10%",
        right: "5%",
        width: "400px",
        height: "400px",
        background: "rgba(74, 111, 165, 0.05)",
        filter: "blur(100px)",
        borderRadius: "50%",
        pointerEvents: "none"
      }} />

      <div style={{
        maxWidth: 1400,
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "2fr repeat(4, 1fr)",
        gap: 60,
        marginBottom: 64,
        position: "relative",
        zIndex: 2
      }}>
        <div>
          <Logo size={22} />
          <p style={{
            color: T.muted,
            fontSize: 14,
            lineHeight: 1.7,
            marginTop: 20,
            maxWidth: 280,
            fontFamily: T.fontBody
          }}>
            The parallel workflow platform for modern film production teams and creative professionals.
          </p>
        </div>

        {Object.entries(FOOTER_LINKS).map(([col, links]) => (
          <div key={col}>
            <div style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#fff",
              letterSpacing: 1.5,
              textTransform: "uppercase",
              marginBottom: 24,
              fontFamily: T.fontDisplay
            }}>
              {col}
            </div>
            {links.map((l) => (
              <div
                key={l}
                onClick={() => {
                  if (l === "Features") scrollToId("features");
                  else if (l === "Pricing") scrollToId("pricing");
                  else if (l === "Use Cases") scrollToId("pricing");
                }}
                style={{
                  color: T.muted,
                  fontSize: 14,
                  marginBottom: 12,
                  cursor: "pointer",
                  transition: "color .15s",
                  fontFamily: T.fontBody
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

      <div style={{
        borderTop: `1px solid rgba(255,255,255,0.06)`,
        paddingTop: 32,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        maxWidth: 1400,
        margin: "0 auto",
        flexWrap: "wrap",
        gap: 12,
        position: "relative",
        zIndex: 2
      }}>
        <span style={{ color: T.muted, fontSize: 13 }}>
          © 2026 Ensemble, RavenLabs Dev. All rights reserved.
        </span>
        <div style={{ display: "flex", gap: 24 }}>
          <span style={{ color: "#3a4050", fontSize: 13, cursor: "pointer" }}>Twitter</span>
          <span style={{ color: "#3a4050", fontSize: 13, cursor: "pointer" }}>GitHub</span>
          <span style={{ color: "#3a4050", fontSize: 13, cursor: "pointer" }}>Discord</span>
        </div>
      </div>
    </footer>
  );
};

const LandingPage: FC = () => {
  useGlobalStyle(GLOBAL_CSS);
  const navigate = useNavigate();
  return (
    <div style={{ background: T.bg, minHeight: "100vh" }}>
      <Navbar onLogin={() => navigate("/login")} onSignup={() => navigate("/signup")} />
      <Hero onStart={() => navigate("/signup")} />
      <StatsBar />
      <FeaturesSection />
      <PricingSection />
      <CtaStrip onStart={() => navigate("/signup")} />
      <Footer />
      <ScrollToTop />
    </div>
  );
};

export default LandingPage;