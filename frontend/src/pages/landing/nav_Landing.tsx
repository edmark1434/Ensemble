import { useState, useEffect, useRef } from "react";
import type { FC } from "react";
import { useNavigate } from "react-router-dom";

const T_NAV = {
  bgNav:     "rgba(8,10,18,.88)",
  dim:       "#999",
  text:      "#ffffff",
  fontDisplay: "'Plus Jakarta Sans', sans-serif",
  fontBody:    "'Plus Jakarta Sans', sans-serif",
} as const;

// ─── Logo Sub-Component ───────────────────────────────────────────────────────
const Logo: FC<{ size?: number }> = ({ size = 22 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
    <img src="/ensemble_lg.svg" alt="Ensemble Logo" style={{ width: size + 6, height: size + 6, display: "block" }} />
    <span style={{ fontSize: size, fontWeight: 700, fontFamily: T_NAV.fontDisplay, letterSpacing: .5, color: "#fff" }}>
      Ensemble
    </span>
  </div>
);

// ─── Dropdown Menu Sub-Component ──────────────────────────────────────────────
interface DropdownProps {
  label: string;
  items: string[];
  isOpen: boolean;
  onToggle: (val: boolean) => void;
  onItemClick: (item: string) => void;
  onParentHover: () => void;
  onChildHover: () => void;
  onActionClick: () => void;
}

const NavDropdown: FC<DropdownProps> = ({
  label,
  items,
  isOpen,
  onToggle,
  onItemClick,
  onParentHover,
  onChildHover,
  onActionClick
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false); // Track visual feedback manually

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onToggle(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [onToggle]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onActionClick();
          onToggle(!isOpen);
        }}
        onMouseEnter={() => {
          setIsHovered(true);
          onParentHover();
        }}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          background: "none",
          border: "none",
          // Highlight text instantly to white when dropdown is open OR hovered
          color: (isOpen || isHovered) ? "#fff" : T_NAV.dim,
          fontSize: 13,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "5px 9px",
          borderRadius: 6,
          fontFamily: T_NAV.fontBody,
          transition: "color .15s ease",
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
          minWidth: 200,
          boxShadow: "0 18px 44px rgba(0,0,0,.72)",
          zIndex: 9999,
        }}>
          {items.map((item, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                onActionClick();
                onItemClick(item);
                onToggle(false);
              }}
              onMouseEnter={(e) => {
                onChildHover();
                e.currentTarget.style.background = "#1a2436";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#bbb";
              }}
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
                fontFamily: T_NAV.fontBody,
                transition: "all .12s",
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

// ─── Main Isolated Navbar ────────────────────────────────────────────────────
interface NavLandingProps {
  onLogin: () => void;
  onSignup: () => void;
  isMuted: boolean;
  onToggleAudio: () => void;
}

const NavLanding: FC<NavLandingProps> = ({ onLogin, onSignup, isMuted, onToggleAudio }) => {
  const navigate = useNavigate();
  const [openDD, setOpenDD] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState<boolean>(false);

  // Sound element refs
  const hoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const minimalHoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const softClickAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handleScroll);

    hoverAudioRef.current = new Audio("/sounds/hover.mp3");
    minimalHoverAudioRef.current = new Audio("/sounds/minimalhover.mp3");
    softClickAudioRef.current = new Audio("/sounds/softclick.mp3");

    hoverAudioRef.current.volume = 0.25;
    minimalHoverAudioRef.current.volume = 0.25;
    softClickAudioRef.current.volume = 0.4;

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const playHover = () => {
    if (isMuted || !hoverAudioRef.current) return;
    hoverAudioRef.current.currentTime = 0;
    hoverAudioRef.current.play().catch(() => {});
  };

  const playMinimalHover = () => {
    if (isMuted || !minimalHoverAudioRef.current) return;
    minimalHoverAudioRef.current.currentTime = 0;
    minimalHoverAudioRef.current.play().catch(() => {});
  };

  const playSoftClick = () => {
    if (isMuted || !softClickAudioRef.current) return;
    softClickAudioRef.current.currentTime = 0;
    softClickAudioRef.current.play().catch(() => {});
  };

  const toggle = (name: string) => (val: boolean) => setOpenDD(val ? name : null);

  const handleDropdownItemAction = (item: string) => {
    const routeMap: Record<string, string> = {
      "How to Hire": "/landing/HowToHire",
      "How to Work": "/landing/HowToWork",
      "Terms of Service": "/landing/TermsOfService",
      "Privacy Policy": "/landing/PrivacyPolicy",
      "About Us": "/landing/AboutUs",
      "FAQ": "/landing/FAQ",
      "Ask our Chatbot": "/landing/AskOurChatbot",
      "Submit a Ticket": "/landing/SubmitATicket",
      "Support Us": "/landing/SupportUs",
      "Send a Feedback": "/landing/SendAFeedback"
    };

    const target = routeMap[item];
    if (target) {
      navigate(target);
    }
  };

  return (
    <nav style={{
      position: "fixed",
      top: 0, left: 0, right: 0,
      zIndex: 5000,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "13px 40px",
      background: scrolled ? "rgba(8,10,18,.96)" : T_NAV.bgNav,
      backdropFilter: "blur(16px)",
      borderBottom: `1px solid ${scrolled ? "rgba(255,255,255,.09)" : "rgba(255,255,255,.05)"}`,
      transition: "background .3s, border-color .3s",
    }}>
      <div
        onClick={() => {
          playSoftClick();
          navigate("/");
        }}
        onMouseEnter={playHover}
        style={{ cursor: "pointer" }}
      >
        <Logo />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <NavDropdown
          label="About"
          items={["How to Hire", "How to Work", "About Us", "Terms of Service", "Privacy Policy"]}
          isOpen={openDD === "about"}
          onToggle={toggle("about")}
          onItemClick={handleDropdownItemAction}
          onParentHover={playHover}
          onChildHover={playMinimalHover}
          onActionClick={playSoftClick}
        />

        <NavDropdown
          label="Support"
          items={["FAQ", "Ask our Chatbot", "Submit a Ticket", "Support Us", "Send a Feedback"]}
          isOpen={openDD === "support"}
          onToggle={toggle("support")}
          onItemClick={handleDropdownItemAction}
          onParentHover={playHover}
          onChildHover={playMinimalHover}
          onActionClick={playSoftClick}
        />

        <button
          onClick={() => {
            playSoftClick();
            navigate("/landing/Pricing");
          }}
          onMouseEnter={(e) => {
            playHover();
            e.currentTarget.style.color = "#fff"; // Toggle parent highlight manually on standard links
          }}
          onMouseLeave={(e) => (e.currentTarget.style.color = T_NAV.dim)}
          style={{
            background: "none",
            border: "none",
            color: T_NAV.dim,
            fontSize: 13,
            cursor: "pointer",
            padding: "5px 9px",
            borderRadius: 6,
            fontFamily: T_NAV.fontBody,
            transition: "color .15s ease",
          }}
        >
          Pricing
        </button>
      </div>

      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>

        {/* Audio Toggle Switch Controller */}
        <button
          onClick={() => {
            if (!softClickAudioRef.current) return;
            softClickAudioRef.current.currentTime = 0;
            softClickAudioRef.current.play().catch(() => {});
            onToggleAudio();
          }}
          onMouseEnter={playHover}
          title={isMuted ? "Play ambient music" : "Mute ambient music"}
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: isMuted ? T_NAV.dim : "#3b82f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            cursor: "pointer",
            transition: "all .2s ease",
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            e.currentTarget.style.color = isMuted ? T_NAV.dim : "#3b82f6";
          }}
        >
          {isMuted ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
          )}
        </button>

        <button
          onClick={() => {
            playSoftClick();
            onLogin();
          }}
          onMouseEnter={(e) => {
            playHover();
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={(e) => (e.currentTarget.style.color = T_NAV.dim)}
          style={{
            background: "none",
            border: "none",
            color: T_NAV.dim,
            fontSize: 13,
            cursor: "pointer",
            padding: "7px 14px",
            borderRadius: 20,
            fontFamily: T_NAV.fontBody,
            transition: "color .15s ease",
          }}
        >
          Log in
        </button>
        <button
          onClick={() => {
            playSoftClick();
            onSignup();
          }}
          onMouseEnter={(e) => {
            playHover();
            e.currentTarget.style.background = "#dde3ed";
            e.currentTarget.style.transform = "scale(1.02)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#fff";
            e.currentTarget.style.transform = "scale(1)";
          }}
          style={{
            background: "#fff",
            border: "none",
            color: "#080a12",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            padding: "8px 20px",
            borderRadius: 20,
            fontFamily: T_NAV.fontBody,
            transition: "background .15s, transform .1s",
          }}
        >
          Sign up
        </button>
      </div>
    </nav>
  );
};

export default NavLanding;