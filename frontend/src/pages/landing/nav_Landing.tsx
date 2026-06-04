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
}

const NavDropdown: FC<DropdownProps> = ({ label, items, isOpen, onToggle, onItemClick }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // Changed 'mousedown' to 'click' to let internal items finish their onClick sequences first
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
          e.stopPropagation(); // Prevents immediate close trigger via global listener
          onToggle(!isOpen);
        }}
        style={{
          background: "none",
          border: "none",
          color: isOpen ? "#fff" : T_NAV.dim,
          fontSize: 13,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "5px 9px",
          borderRadius: 6,
          fontFamily: T_NAV.fontBody,
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
          minWidth: 200,
          boxShadow: "0 18px 44px rgba(0,0,0,.72)",
          zIndex: 9999, // Raised to ensure it hovers over the hero video elements
        }}>
          {items.map((item, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation(); // Stop routing conflicts
                onItemClick(item);
                onToggle(false);
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

// ─── Main Isolated Navbar ────────────────────────────────────────────────────
interface NavLandingProps {
  onLogin: () => void;
  onSignup: () => void;
}

const NavLanding: FC<NavLandingProps> = ({ onLogin, onSignup }) => {
  const navigate = useNavigate();
  const [openDD, setOpenDD] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
      zIndex: 5000, // Keeps global navbar stack securely over section layers
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "13px 40px",
      background: scrolled ? "rgba(8,10,18,.96)" : T_NAV.bgNav,
      backdropFilter: "blur(16px)",
      borderBottom: `1px solid ${scrolled ? "rgba(255,255,255,.09)" : "rgba(255,255,255,.05)"}`,
      transition: "background .3s, border-color .3s",
    }}>
      <div onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
        <Logo />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <NavDropdown
          label="About"
          items={["How to Hire", "How to Work", "About Us", "Terms of Service", "Privacy Policy"]}
          isOpen={openDD === "about"}
          onToggle={toggle("about")}
          onItemClick={handleDropdownItemAction}
        />

        <NavDropdown
          label="Support"
          items={["FAQ", "Ask our Chatbot", "Submit a Ticket", "Support Us", "Send a Feedback"]}
          isOpen={openDD === "support"}
          onToggle={toggle("support")}
          onItemClick={handleDropdownItemAction}
        />

        <button
          onClick={() => navigate("/landing/Pricing")}
          style={{
            background: "none",
            border: "none",
            color: T_NAV.dim,
            fontSize: 13,
            cursor: "pointer",
            padding: "5px 9px",
            borderRadius: 6,
            fontFamily: T_NAV.fontBody,
            transition: "color .15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = T_NAV.dim)}
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
            color: T_NAV.dim,
            fontSize: 13,
            cursor: "pointer",
            padding: "7px 14px",
            borderRadius: 20,
            fontFamily: T_NAV.fontBody,
            transition: "color .15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = T_NAV.dim)}
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
            fontFamily: T_NAV.fontBody,
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

export default NavLanding;