import { useState, useEffect, useRef } from "react";
import type { FC } from "react";
import { useNavigate } from "react-router-dom";
import useGlobalState from "@/lib/global_state";

const T_NAV = {
  fontDisplay: "'Plus Jakarta Sans', sans-serif",
  fontBody: "'Plus Jakarta Sans', sans-serif",
} as const;

// ─── Logo Sub-Component ───────────────────────────────────────────────────────
const Logo: FC<{ size?: number }> = ({ size = 24 }) => (
  <div
    style={{ display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
    title="Ensemble"
    aria-label="Ensemble"
  >
    <img
      src="/ensemble_lg.svg"
      alt="Ensemble Logo"
      style={{ width: size, height: size, display: "block" }}
      className="invert dark:invert-0 transition-transform duration-200 hover:scale-105"
    />
  </div>
);

// ─── Dropdown Menu Sub-Component ──────────────────────────────────────────────
interface DropdownProps {
  label: string;
  items: string[];
  isOpen: boolean;
  isDark: boolean;
  borderLine: string;
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
  isDark,
  borderLine,
  onToggle,
  onItemClick,
  onParentHover,
  onChildHover,
  onActionClick,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

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
    <div ref={ref} style={{ position: "relative", height: "100%", display: "flex", alignItems: "center" }}>
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
          background: isOpen || isHovered ? (isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)") : "transparent",
          border: "none",
          height: "100%",
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "0 16px",
          borderRadius: 0,
          fontFamily: T_NAV.fontBody,
          color:
            isOpen || isHovered
              ? isDark
                ? "#ffffff"
                : "#0f172a"
              : isDark
              ? "rgba(255,255,255,0.65)"
              : "rgba(15,23,42,0.65)",
          transition: "all .15s ease",
        }}
      >
        {label}
        <svg
          width="10"
          height="10"
          viewBox="0 0 12 12"
          style={{
            transform: isOpen ? "rotate(180deg)" : "none",
            transition: "transform .18s",
          }}
        >
          <path
            d="M2 4l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 1px)",
            left: 0,
            background: isDark ? "#121214" : "#ffffff",
            border: `1px solid ${borderLine}`,
            borderRadius: 0,
            padding: "4px 0",
            minWidth: 210,
            boxShadow: isDark
              ? "0 18px 44px rgba(0,0,0,0.8)"
              : "0 18px 44px rgba(15,23,42,0.12)",
            zIndex: 9999,
          }}
        >
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
                e.currentTarget.style.background = isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(15,23,42,0.05)";
                e.currentTarget.style.color = isDark ? "#ffffff" : "#0f172a";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = isDark
                  ? "rgba(255,255,255,0.72)"
                  : "rgba(15,23,42,0.72)";
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                textAlign: "left",
                background: "transparent",
                border: "none",
                borderBottom:
                  i < items.length - 1 ? `1px solid ${borderLine}` : "none",
                padding: "11px 16px",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.04em",
                color: isDark ? "rgba(255,255,255,0.72)" : "rgba(15,23,42,0.72)",
                cursor: "pointer",
                fontFamily: T_NAV.fontBody,
                transition: "all .12s",
              }}
            >
              <span>{item}</span>
              <span style={{ fontSize: 10, opacity: 0.45 }}>↗</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface NavLandingProps {
  onLogin: () => void;
  onSignup: () => void;
  isBgmMuted: boolean;
  isSfxMuted: boolean;
  bgmVolume: number;
  onToggleBgm: () => void;
  onToggleSfx: () => void;
  onSetBgmVolume: (vol: number) => void;
}

const NavLanding: FC<NavLandingProps> = ({
  onLogin,
  onSignup,
  isBgmMuted,
  isSfxMuted,
  bgmVolume,
  onToggleBgm,
  onToggleSfx,
  onSetBgmVolume,
}) => {
  const navigate = useNavigate();
  const theme = useGlobalState((state) => state.theme);
  const setTheme = useGlobalState((state) => state.setTheme);
  const isDark = theme === "dark";

  const [openDD, setOpenDD] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Audio Menu State
  const [openAudioMenu, setOpenAudioMenu] = useState(false);
  const audioMenuRef = useRef<HTMLDivElement>(null);

  const hoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const minimalHoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const softClickAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setIsMobile(window.innerWidth < 860);
    const handleResize = () => setIsMobile(window.innerWidth < 860);
    window.addEventListener("resize", handleResize);

    const closeAudioMenu = (e: MouseEvent) => {
      if (audioMenuRef.current && !audioMenuRef.current.contains(e.target as Node)) {
        setOpenAudioMenu(false);
      }
    };
    document.addEventListener("click", closeAudioMenu);

    hoverAudioRef.current = new Audio("/sounds/hover.mp3");
    minimalHoverAudioRef.current = new Audio("/sounds/minimalhover.mp3");
    softClickAudioRef.current = new Audio("/sounds/softclick.mp3");

    hoverAudioRef.current.volume = 0.25;
    minimalHoverAudioRef.current.volume = 0.25;
    softClickAudioRef.current.volume = 0.4;

    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("click", closeAudioMenu);
    };
  }, []);

  const playHover = () => {
    if (isSfxMuted || !hoverAudioRef.current) return;
    hoverAudioRef.current.currentTime = 0;
    hoverAudioRef.current.play().catch(() => {});
  };

  const playMinimalHover = () => {
    if (isSfxMuted || !minimalHoverAudioRef.current) return;
    minimalHoverAudioRef.current.currentTime = 0;
    minimalHoverAudioRef.current.play().catch(() => {});
  };

  const playSoftClick = () => {
    if (isSfxMuted || !softClickAudioRef.current) return;
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
      FAQ: "/landing/FAQ",
      "Ask our Chatbot": "/landing/AskOurChatbot",
      "Submit a Ticket": "/support/ticket",
      "Support Us": "/landing/SupportUs",
      "Submit a Feedback": "/landing/SendAFeedback",
      Client: "/landing/usecase/client",
      Freelancer: "/landing/usecase/freelancer",
      "Asset Creator": "/landing/usecase/asset-creator",
      Enthusiast: "/landing/usecase/enthusiast",
    };

    const target = routeMap[item];
    if (target) {
      navigate(target);
    }
  };

  const borderLine = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";
  const navBg = isDark ? "rgba(18, 18, 20, 0.94)" : "rgba(255, 255, 255, 0.94)";
  const textPrimary = isDark ? "#ffffff" : "#111827";
  const textMuted = isDark ? "rgba(255,255,255,0.65)" : "rgba(17,24,39,0.65)";

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 56,
        zIndex: 5000,
        display: "flex",
        alignItems: "stretch",
        justifyContent: "space-between",
        background: navBg,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: `1px solid ${borderLine}`,
        transition: "background 0.3s ease, border-color 0.3s ease",
        fontFamily: T_NAV.fontDisplay,
      }}
    >
      {/* ─── Left: Logo Block + Navigation Links ─── */}
      <div style={{ display: "flex", alignItems: "stretch" }}>
        {/* Framed Logo Cell */}
        <div
          onClick={() => {
            playSoftClick();
            navigate("/");
          }}
          onMouseEnter={playHover}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 20px",
            borderRight: `1px solid ${borderLine}`,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <Logo />
        </div>

        {/* Desktop Nav Links */}
        {!isMobile && (
          <div style={{ display: "flex", alignItems: "stretch" }}>
            <button
              onClick={() => {
                playSoftClick();
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
              }}
              onMouseEnter={(e) => {
                playHover();
                e.currentTarget.style.color = textPrimary;
                e.currentTarget.style.background = isDark
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(15,23,42,0.04)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = textMuted;
                e.currentTarget.style.background = "transparent";
              }}
              style={{
                background: "transparent",
                border: "none",
                height: "100%",
                padding: "0 16px",
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: textMuted,
                cursor: "pointer",
                fontFamily: T_NAV.fontBody,
                transition: "all 0.15s ease",
              }}
            >
              Highlights
            </button>

            <button
              onClick={() => {
                playSoftClick();
                document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
              }}
              onMouseEnter={(e) => {
                playHover();
                e.currentTarget.style.color = textPrimary;
                e.currentTarget.style.background = isDark
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(15,23,42,0.04)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = textMuted;
                e.currentTarget.style.background = "transparent";
              }}
              style={{
                background: "transparent",
                border: "none",
                height: "100%",
                padding: "0 16px",
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: textMuted,
                cursor: "pointer",
                fontFamily: T_NAV.fontBody,
                transition: "all 0.15s ease",
              }}
            >
              Workflow
            </button>

            <NavDropdown
              label="Usecases"
              items={["Client", "Freelancer", "Asset Creator", "Enthusiast"]}
              isOpen={openDD === "usecases"}
              isDark={isDark}
              borderLine={borderLine}
              onToggle={toggle("usecases")}
              onItemClick={handleDropdownItemAction}
              onParentHover={playHover}
              onChildHover={playMinimalHover}
              onActionClick={playSoftClick}
            />

            <NavDropdown
              label="About"
              items={[
                "How to Hire",
                "How to Work",
                "About Us",
                "Terms of Service",
                "Privacy Policy",
              ]}
              isOpen={openDD === "about"}
              isDark={isDark}
              borderLine={borderLine}
              onToggle={toggle("about")}
              onItemClick={handleDropdownItemAction}
              onParentHover={playHover}
              onChildHover={playMinimalHover}
              onActionClick={playSoftClick}
            />

            <NavDropdown
              label="Support"
              items={[
                "FAQ",
                "Ask our Chatbot",
                "Submit a Ticket",
                "Support Us",
                "Submit a Feedback",
              ]}
              isOpen={openDD === "support"}
              isDark={isDark}
              borderLine={borderLine}
              onToggle={toggle("support")}
              onItemClick={handleDropdownItemAction}
              onParentHover={playHover}
              onChildHover={playMinimalHover}
              onActionClick={playSoftClick}
            />
          </div>
        )}
      </div>

      {/* ─── Right: Divided Architectural Action Cells (Pricing | Audio | Theme | Log in | Sign up) ─── */}
      <div style={{ display: "flex", alignItems: "stretch", flexShrink: 0 }}>
        {/* Pricing Cell */}
        {!isMobile && (
          <button
            onClick={() => {
              playSoftClick();
              navigate("/landing/Pricing");
            }}
            onMouseEnter={(e) => {
              playHover();
              e.currentTarget.style.color = textPrimary;
              e.currentTarget.style.background = isDark
                ? "rgba(255,255,255,0.04)"
                : "rgba(15,23,42,0.04)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = textMuted;
              e.currentTarget.style.background = "transparent";
            }}
            style={{
              background: "transparent",
              border: "none",
              borderLeft: `1px solid ${borderLine}`,
              padding: "0 20px",
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: textMuted,
              cursor: "pointer",
              fontFamily: T_NAV.fontBody,
              transition: "all 0.15s ease",
              whiteSpace: "nowrap",
            }}
          >
            Pricing
          </button>
        )}

        {/* Audio Settings Cell */}
        {!isMobile && (
          <div
            ref={audioMenuRef}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "stretch",
              borderLeft: `1px solid ${borderLine}`,
            }}
          >
            <button
              onClick={() => {
                playSoftClick();
                setOpenAudioMenu(!openAudioMenu);
              }}
              onMouseEnter={(e) => {
                playHover();
                e.currentTarget.style.background = isDark
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(15,23,42,0.04)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
              title="Audio Settings"
              style={{
                background: "transparent",
                border: "none",
                width: 52,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: isBgmMuted && isSfxMuted ? textMuted : "#3b82f6",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {isBgmMuted && isSfxMuted ? (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              )}
            </button>

            {openAudioMenu && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 1px)",
                  right: 0,
                  background: isDark ? "#121214" : "#ffffff",
                  border: `1px solid ${borderLine}`,
                  borderRadius: 0,
                  padding: "10px",
                  minWidth: 185,
                  boxShadow: isDark
                    ? "0 18px 44px rgba(0,0,0,0.8)"
                    : "0 18px 44px rgba(15,23,42,0.12)",
                  zIndex: 9999,
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    padding: "8px 10px",
                    fontFamily: T_NAV.fontBody,
                    fontSize: 12,
                    fontWeight: 600,
                    color: textPrimary,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      playSoftClick();
                      onToggleBgm();
                    }}
                  >
                    <span>Music (BGM)</span>
                    <input
                      type="checkbox"
                      checked={!isBgmMuted}
                      onChange={() => {}}
                      style={{ cursor: "pointer", pointerEvents: "none" }}
                    />
                  </div>

                  {!isBgmMuted && (
                    <div
                      style={{
                        display: "flex",
                        gap: "4px",
                        alignItems: "center",
                        marginTop: "2px",
                      }}
                    >
                      {[0.02, 0.05, 0.1].map((vol) => (
                        <button
                          key={vol}
                          onClick={(e) => {
                            e.stopPropagation();
                            playSoftClick();
                            onSetBgmVolume(vol);
                          }}
                          style={{
                            flex: 1,
                            border: `1px solid ${borderLine}`,
                            padding: "4px 0",
                            borderRadius: 0,
                            fontSize: 10.5,
                            fontWeight: 700,
                            cursor: "pointer",
                            background:
                              bgmVolume === vol
                                ? isDark
                                  ? "#ffffff"
                                  : "#0f172a"
                                : "transparent",
                            color:
                              bgmVolume === vol
                                ? isDark
                                  ? "#0b0c10"
                                  : "#ffffff"
                                : textMuted,
                          }}
                        >
                          {vol * 100}%
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    borderTop: `1px solid ${borderLine}`,
                    cursor: "pointer",
                    fontFamily: T_NAV.fontBody,
                    fontSize: 12,
                    fontWeight: 600,
                    color: textPrimary,
                  }}
                >
                  <span>Sound FX</span>
                  <input
                    type="checkbox"
                    checked={!isSfxMuted}
                    onChange={() => {
                      playSoftClick();
                      onToggleSfx();
                    }}
                    style={{ cursor: "pointer" }}
                  />
                </label>
              </div>
            )}
          </div>
        )}

        {/* Theme Switcher Cell (Alt + P) */}
        <button
          onClick={() => {
            playSoftClick();
            setTheme(isDark ? "light" : "dark");
          }}
          onMouseEnter={(e) => {
            playHover();
            e.currentTarget.style.color = textPrimary;
            e.currentTarget.style.background = isDark
              ? "rgba(255,255,255,0.05)"
              : "rgba(15,23,42,0.04)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = textMuted;
            e.currentTarget.style.background = "transparent";
          }}
          title={`Switch to ${isDark ? "Light" : "Dark"} Mode (Alt+P)`}
          aria-label="Toggle Theme"
          style={{
            background: "transparent",
            border: "none",
            borderLeft: `1px solid ${borderLine}`,
            width: isMobile ? 44 : 52,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: textMuted,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          {isDark ? (
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        {/* Log in Cell */}
        <button
          onClick={() => {
            playSoftClick();
            onLogin();
          }}
          onMouseEnter={(e) => {
            playHover();
            e.currentTarget.style.color = textPrimary;
            e.currentTarget.style.background = isDark
              ? "rgba(255,255,255,0.05)"
              : "rgba(15,23,42,0.04)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = textMuted;
            e.currentTarget.style.background = "transparent";
          }}
          style={{
            background: "transparent",
            border: "none",
            borderLeft: `1px solid ${borderLine}`,
            padding: isMobile ? "0 13px" : "0 22px",
            fontSize: 11.5,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: textMuted,
            cursor: "pointer",
            fontFamily: T_NAV.fontBody,
            transition: "all 0.15s ease",
            whiteSpace: "nowrap",
          }}
        >
          Log in
        </button>

        {/* Full-Height Contrast Sign Up / Launch Cell */}
        <button
          onClick={() => {
            playSoftClick();
            onSignup();
          }}
          onMouseEnter={(e) => {
            playHover();
            e.currentTarget.style.background = "#3b82f6";
            e.currentTarget.style.color = "#ffffff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = isDark ? "#ffffff" : "#0f172a";
            e.currentTarget.style.color = isDark ? "#0b0c10" : "#ffffff";
          }}
          style={{
            border: "none",
            borderLeft: `1px solid ${borderLine}`,
            borderRadius: 0,
            padding: isMobile ? "0 14px" : "0 28px",
            fontSize: 11.5,
            fontWeight: 800,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            background: isDark ? "#ffffff" : "#0f172a",
            color: isDark ? "#0b0c10" : "#ffffff",
            cursor: "pointer",
            fontFamily: T_NAV.fontBody,
            transition: "all 0.18s ease",
            whiteSpace: "nowrap",
          }}
        >
          Sign up
        </button>

        {/* Mobile Menu Toggle Cell */}
        {isMobile && (
          <button
            onClick={() => {
              playSoftClick();
              setMobileMenuOpen((v) => !v);
            }}
            aria-label="Toggle Menu"
            style={{
              background: mobileMenuOpen
                ? isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(15,23,42,0.08)"
                : "transparent",
              border: "none",
              borderLeft: `1px solid ${borderLine}`,
              width: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: textPrimary,
              cursor: "pointer",
            }}
          >
            {mobileMenuOpen ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Mobile Blueprint Navigation Drawer */}
      {isMobile && mobileMenuOpen && (
        <div
          style={{
            position: "fixed",
            top: 56,
            left: 0,
            right: 0,
            maxHeight: "calc(100vh - 56px)",
            overflowY: "auto",
            background: isDark ? "#121214" : "#ffffff",
            borderBottom: `1px solid ${borderLine}`,
            boxShadow: isDark ? "0 20px 44px rgba(0,0,0,0.85)" : "0 20px 44px rgba(0,0,0,0.14)",
            zIndex: 4999,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              borderBottom: `1px solid ${borderLine}`,
            }}
          >
            <button
              onClick={() => {
                playSoftClick();
                setMobileMenuOpen(false);
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
              }}
              style={{
                background: "transparent",
                border: "none",
                borderRight: `1px solid ${borderLine}`,
                padding: "14px 16px",
                textAlign: "left",
                fontFamily: T_NAV.fontBody,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: textPrimary,
                cursor: "pointer",
              }}
            >
              02 / Highlights
            </button>
            <button
              onClick={() => {
                playSoftClick();
                setMobileMenuOpen(false);
                document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
              }}
              style={{
                background: "transparent",
                border: "none",
                padding: "14px 16px",
                textAlign: "left",
                fontFamily: T_NAV.fontBody,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: textPrimary,
                cursor: "pointer",
              }}
            >
              03 / Workflow
            </button>
          </div>

          {[
            {
              group: "Usecases",
              items: ["Client", "Freelancer", "Asset Creator", "Enthusiast"],
            },
            {
              group: "About & Legal",
              items: ["How to Hire", "How to Work", "About Us", "Terms of Service", "Privacy Policy"],
            },
            {
              group: "Support",
              items: ["FAQ", "Ask our Chatbot", "Submit a Ticket", "Support Us", "Submit a Feedback"],
            },
          ].map((sec) => (
            <div key={sec.group} style={{ borderBottom: `1px solid ${borderLine}` }}>
              <div
                style={{
                  padding: "8px 16px",
                  background: isDark ? "#151518" : "#f8fafc",
                  borderBottom: `1px solid ${borderLine}`,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#3b82f6",
                }}
              >
                {sec.group}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                {sec.items.map((item, idx) => (
                  <button
                    key={item}
                    onClick={() => {
                      playSoftClick();
                      setMobileMenuOpen(false);
                      handleDropdownItemAction(item);
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      borderRight: idx % 2 === 0 ? `1px solid ${borderLine}` : "none",
                      borderBottom: `1px solid ${borderLine}`,
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: textPrimary,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>{item}</span>
                    <span style={{ fontSize: 10, opacity: 0.5 }}>↗</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
            }}
          >
            <button
              onClick={() => {
                playSoftClick();
                setMobileMenuOpen(false);
                navigate("/landing/Pricing");
              }}
              style={{
                background: "#3b82f6",
                color: "#ffffff",
                border: "none",
                padding: "9px 16px",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              View Pricing →
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={() => {
                  playSoftClick();
                  onToggleBgm();
                }}
                style={{
                  background: "transparent",
                  border: `1px solid ${borderLine}`,
                  padding: "7px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: textPrimary,
                  cursor: "pointer",
                }}
              >
                BGM: {isBgmMuted ? "OFF" : "ON"}
              </button>
              <button
                onClick={() => {
                  playSoftClick();
                  onToggleSfx();
                }}
                style={{
                  background: "transparent",
                  border: `1px solid ${borderLine}`,
                  padding: "7px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: textPrimary,
                  cursor: "pointer",
                }}
              >
                SFX: {isSfxMuted ? "OFF" : "ON"}
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default NavLanding;
