import { useState, useEffect, useRef } from "react";
import type { FC } from "react";
import { useNavigate } from "react-router-dom";

const T_NAV = {
  fontDisplay: "'Plus Jakarta Sans', sans-serif",
  fontBody:    "'Plus Jakarta Sans', sans-serif",
} as const;

// ─── Logo Sub-Component ───────────────────────────────────────────────────────
const Logo: FC<{ size?: number }> = ({ size = 22 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
    <img 
      src="/ensemble_lg.svg" 
      alt="Ensemble Logo" 
      style={{ width: size + 6, height: size + 6, display: "block" }} 
      className="invert dark:invert-0" 
    />
    <span 
      className="text-gray-900 dark:text-white"
      style={{ fontSize: size, fontWeight: 700, fontFamily: T_NAV.fontDisplay, letterSpacing: .5 }}
    >
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
        className={isOpen || isHovered ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-[#999]'}
        style={{
          background: "none",
          border: "none",
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
        <div 
          className="bg-white dark:bg-[#121214] border-gray-200 dark:border-white/10"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            borderWidth: "1px",
            borderStyle: "solid",
            borderRadius: 10,
            padding: "6px 0",
            minWidth: 200,
            boxShadow: "0 18px 44px rgba(0,0,0,.72)",
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
                e.currentTarget.classList.add('bg-gray-100', 'dark:bg-white/[0.08]', 'text-gray-900', 'dark:text-white');
                e.currentTarget.classList.remove('text-gray-600', 'dark:text-[#bbb]');
              }}
              onMouseLeave={(e) => {
                e.currentTarget.classList.remove('bg-gray-100', 'dark:bg-white/[0.08]', 'text-gray-900', 'dark:text-white');
                e.currentTarget.classList.add('text-gray-600', 'dark:text-[#bbb]');
              }}
              className="text-gray-600 dark:text-[#bbb]"
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                background: "transparent",
                border: "none",
                padding: "10px 16px",
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

const NavLanding: FC<NavLandingProps> = ({ onLogin, onSignup, isBgmMuted, isSfxMuted, bgmVolume, onToggleBgm, onToggleSfx, onSetBgmVolume }) => {
  const navigate = useNavigate();
  const [openDD, setOpenDD] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Audio Menu State
  const [openAudioMenu, setOpenAudioMenu] = useState(false);
  const audioMenuRef = useRef<HTMLDivElement>(null);

  const hoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const minimalHoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const softClickAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Check initial width
    setIsMobile(window.innerWidth < 768);
    
    const handleScroll = () => setScrolled(window.scrollY > 12);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    
    window.addEventListener("scroll", handleScroll);
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
      window.removeEventListener("scroll", handleScroll);
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
    <nav 
      className={scrolled 
        ? 'bg-white dark:bg-[#121214] border-gray-200 dark:border-white/10' 
        : 'bg-white dark:bg-[#121214] border-gray-100 dark:border-white/[.05]'}
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        zIndex: 5000,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: isMobile ? "13px 20px" : "13px 40px",
        backdropFilter: "blur(16px)",
        borderBottomWidth: "1px",
        borderBottomStyle: "solid",
        transition: "background .3s, border-color .3s, padding .3s",
      }}
    >
      <div
        onClick={() => {
          playSoftClick();
          navigate("/");
        }}
        onMouseEnter={playHover}
        style={{ cursor: "pointer", flexShrink: 0 }}
      >
        <Logo />
      </div>

      <div style={{ display: isMobile ? "none" : "flex", alignItems: "center", gap: 12 }}>
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
            e.currentTarget.classList.add('text-gray-900', 'dark:text-white');
            e.currentTarget.classList.remove('text-gray-500', 'dark:text-[#999]');
          }}
          onMouseLeave={(e) => {
            e.currentTarget.classList.remove('text-gray-900', 'dark:text-white');
            e.currentTarget.classList.add('text-gray-500', 'dark:text-[#999]');
          }}
          className="text-gray-500 dark:text-[#999]"
          style={{
            background: "none",
            border: "none",
            fontSize: 13,
            cursor: "pointer",
            padding: "5px 9px",
            borderRadius: 6,
            fontFamily: T_NAV.fontBody,
            transition: "color .15s ease",
            whiteSpace: "nowrap",
          }}
        >
          Pricing
        </button>
      </div>

      <div style={{ display: "flex", gap: 14, alignItems: "center", flexShrink: 0 }}>
        {/* Audio Settings Menu Controller */}
        <div ref={audioMenuRef} style={{ position: "relative" }}>
          <button
            onClick={() => {
              playSoftClick();
              setOpenAudioMenu(!openAudioMenu);
            }}
            onMouseEnter={(e) => {
              playHover();
              e.currentTarget.classList.add('bg-gray-200', 'dark:bg-white/10');
              e.currentTarget.classList.remove('bg-gray-100', 'dark:bg-white/5');
            }}
            onMouseLeave={(e) => {
              e.currentTarget.classList.remove('bg-gray-200', 'dark:bg-white/10');
              e.currentTarget.classList.add('bg-gray-100', 'dark:bg-white/5');
            }}
            title="Audio Settings"
            className={`bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 ${isBgmMuted && isSfxMuted ? 'text-gray-500 dark:text-zinc-400' : 'text-[#3b82f6]'}`}
            style={{
              borderWidth: "1px",
              borderStyle: "solid",
              display: isMobile ? "none" : "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              cursor: "pointer",
              transition: "all .2s ease",
              flexShrink: 0,
            }}
          >
            {isBgmMuted && isSfxMuted ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
            )}
          </button>

          {openAudioMenu && (
            <div 
              className="bg-white dark:bg-[#121214] border-gray-200 dark:border-white/10"
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                borderWidth: "1px",
                borderStyle: "solid",
                borderRadius: 10,
                padding: "8px",
                minWidth: 160,
                boxShadow: "0 18px 44px rgba(0,0,0,.72)",
                zIndex: 9999,
                display: "flex",
                flexDirection: "column",
                gap: "4px"
              }}
            >
              <div
                className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/[0.08]"
                style={{
                  display: "flex", flexDirection: "column", gap: "8px",
                  padding: "8px 12px", borderRadius: "6px",
                  fontFamily: T_NAV.fontBody, fontSize: 13,
                  transition: "background .12s"
                }}
              >
                <div 
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
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
                    onChange={() => {}} // Handled by parent div
                    style={{ cursor: "pointer", pointerEvents: "none" }}
                  />
                </div>
                
                {/* Volume Controls */}
                {!isBgmMuted && (
                  <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "2px" }}>
                    {[0.02, 0.05, 0.1].map(vol => (
                      <button
                        key={vol}
                        onClick={(e) => {
                          e.stopPropagation();
                          playSoftClick();
                          onSetBgmVolume(vol);
                        }}
                        className={bgmVolume === vol ? "bg-gray-900 dark:bg-white text-white dark:text-[#121214]" : "bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300"}
                        style={{
                          flex: 1,
                          border: "none",
                          padding: "4px 0",
                          borderRadius: "4px",
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.15s"
                        }}
                      >
                        {vol * 100}%
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <label 
                className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/[0.08]"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 12px", borderRadius: "6px", cursor: "pointer",
                  fontFamily: T_NAV.fontBody, fontSize: 13,
                  transition: "background .12s"
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

        <button
          onClick={() => {
            playSoftClick();
            onLogin();
          }}
          onMouseEnter={(e) => {
            playHover();
            e.currentTarget.classList.add('text-gray-900', 'dark:text-white');
            e.currentTarget.classList.remove('text-gray-500', 'dark:text-[#999]');
          }}
          onMouseLeave={(e) => {
            e.currentTarget.classList.remove('text-gray-900', 'dark:text-white');
            e.currentTarget.classList.add('text-gray-500', 'dark:text-[#999]');
          }}
          className="text-gray-500 dark:text-[#999]"
          style={{
            background: "none",
            border: "none",
            fontSize: 13,
            cursor: "pointer",
            padding: "7px 14px",
            borderRadius: 20,
            fontFamily: T_NAV.fontBody,
            transition: "color .15s ease",
            whiteSpace: "nowrap",
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
            e.currentTarget.classList.add('bg-gray-800', 'dark:bg-[#f3f4f6]');
            e.currentTarget.classList.remove('bg-gray-900', 'dark:bg-white');
            e.currentTarget.style.transform = "scale(1.02)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.classList.remove('bg-gray-800', 'dark:bg-[#f3f4f6]');
            e.currentTarget.classList.add('bg-gray-900', 'dark:bg-white');
            e.currentTarget.style.transform = "scale(1)";
          }}
          className="text-white dark:text-[#121214] bg-gray-900 dark:bg-white"
          style={{
            border: "none",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            padding: "8px 20px",
            borderRadius: 20,
            fontFamily: T_NAV.fontBody,
            transition: "background .15s, transform .1s",
            whiteSpace: "nowrap",
          }}
        >
          Sign up
        </button>
      </div>
    </nav>
  );
};

export default NavLanding;