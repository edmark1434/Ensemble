import { useEffect, useState } from "react";
import type { FC } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import useGlobalState from "@/lib/global_state";

const T = {
  bgCard: "#0d0f1a",
  fontDisplay: "'Plus Jakarta Sans', sans-serif",
} as const;

type AvatarData = { type: 'image', url: string } | { type: 'initial', letter: string };

let avatarRequest: Promise<AvatarData[]> | null = null;
let avatarCache: AvatarData[] | null = null;

function loadRecentAvatars() {
  if (avatarCache) return Promise.resolve(avatarCache);
  if (!avatarRequest) {
    avatarRequest = api.get("/api/accounts/recent-avatars").then((response) => {
      const rows = response.data?.success && Array.isArray(response.data.data) ? response.data.data : [];
      avatarCache = rows.map((item: { avatar_path?: string | null, handle?: string, display_name?: string, first_name?: string }) => {
        if (item.avatar_path && item.avatar_path.trim() !== '') {
          return { type: 'image', url: `${import.meta.env.VITE_CLOUDFRONT_URL}${item.avatar_path.startsWith('/') ? '' : '/'}${item.avatar_path}` };
        } else {
          const nameToUse = item.display_name || item.first_name || item.handle || '?';
          return { type: 'initial', letter: nameToUse.charAt(0).toUpperCase() };
        }
      });
      return avatarCache;
    }).finally(() => {
      avatarRequest = null;
    });
  }
  return avatarRequest;
}

interface CounterProps {
  targetValue: string;
  duration?: number;
}

const AnimatedCounter: FC<CounterProps> = ({ targetValue, duration = 2000 }) => {
  const [count, setCount] = useState<string>("0");

  useEffect(() => {
    const numericPart = parseFloat(targetValue.replace(/[^0-9.]/g, ""));
    const suffix = targetValue.replace(/[0-9.,]/g, "");
    const hasComma = targetValue.includes(",");

    if (isNaN(numericPart)) {
      setCount(targetValue);
      return;
    }

    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const currentCount = progress * numericPart;

      let formattedCount = "";
      if (targetValue.includes(".")) {
        formattedCount = currentCount.toFixed(1);
      } else {
        formattedCount = Math.floor(currentCount).toString();
      }

      if (hasComma) {
        formattedCount = Math.floor(currentCount).toLocaleString();
      }

      setCount(`${formattedCount}${suffix}`);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [targetValue, duration]);

  return <>{count}</>;
};

const AvatarGroup = () => {
  const [avatars, setAvatars] = useState<AvatarData[]>([]);
  const theme = useGlobalState((state) => state.theme);
  
  useEffect(() => {
    let active = true;
    const fetchAvatars = async () => {
      try {
        const fetched = await loadRecentAvatars();
        if (active) setAvatars(fetched);
      } catch (err) {
        console.error("Failed to fetch recent avatars", err);
      }
    };
    fetchAvatars();
    return () => { active = false; };
  }, []);

  const defaultAvatars: AvatarData[] = [
    { type: 'initial', letter: 'A' },
    { type: 'initial', letter: 'M' },
    { type: 'initial', letter: 'K' },
    { type: 'initial', letter: 'J' },
    { type: 'initial', letter: 'R' }
  ];

  const displayAvatars = avatars.length > 0 ? avatars : defaultAvatars;
  const borderColor = theme === 'dark' ? '#121214' : '#ffffff';
  const initialBg = theme === 'dark' ? '#27272a' : '#f1f5f9';
  const initialText = theme === 'dark' ? '#ffffff' : '#0f172a';

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {displayAvatars.slice(0, 5).map((item, i) => (
        <div key={i} style={{
          width: 36, height: 36, borderRadius: "50%",
          border: `2px solid ${borderColor}`, 
          marginLeft: i === 0 ? 0 : -14,
          background: item.type === 'image' ? `url('${item.url}') center/cover` : initialBg,
          color: initialText,
          zIndex: 10 - i,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          transition: "border-color 0.3s ease, background 0.3s ease",
          fontFamily: T.fontDisplay,
          fontWeight: 700,
          fontSize: 14
        }}>
          {item.type === 'initial' ? item.letter : null}
        </div>
      ))}
    </div>
  );
};

const StatsBar: FC = () => {
  const navigate = useNavigate();
  const theme = useGlobalState((state) => state.theme);

  const playHoverSound = () => {
    const audio = new Audio("/sounds/minimalhover.mp3");
    audio.volume = 0.2;
    audio.play().catch(() => {});
  };

  const playClickSound = () => {
    const audio = new Audio("/sounds/popclick.mp3");
    audio.volume = 0.3;
    audio.play().catch(() => {});
  };

  const isDark = theme === 'dark';
  const pillBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)";
  const pillBorder = isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.05)";
  const primaryText = isDark ? "#fff" : "#111827";
  const secondaryText = isDark ? "#a1a1aa" : "#6b7280";
  const joinBtnBg = isDark ? "#fff" : "#111827";
  const joinBtnText = isDark ? "#000" : "#fff";
  const joinBtnHover = isDark ? "#e2e8f0" : "#374151";

  return (
    <div style={{ padding: "10px 0" }}>
      <div style={{ display: "flex", flexWrap: "nowrap", justifyContent: "flex-start", alignItems: "center", gap: "20px", width: "100%", textAlign: "left" }}>
        
        {/* Users Stat (External Avatars + Pill) */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
          <AvatarGroup />
          <div style={{
            background: pillBg, 
            padding: "8px 8px 8px 16px", 
            borderRadius: "100px", 
            border: pillBorder, 
            backdropFilter: "blur(12px)",
            color: primaryText,
            fontFamily: T.fontDisplay, 
            fontSize: 15, 
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            transition: "all 0.3s ease"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              +<AnimatedCounter targetValue="4,824" duration={2000} /> <span style={{ fontWeight: 600 }}>users</span>
            </div>
            <button
              onClick={() => {
                playClickSound();
                navigate("/login");
              }}
              style={{
                background: joinBtnBg,
                color: joinBtnText,
                border: "none",
                borderRadius: "100px",
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                playHoverSound();
                e.currentTarget.style.background = joinBtnHover;
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = joinBtnBg;
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              Join
            </button>
          </div>
        </div>

        {/* Satisfaction Stat */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: pillBg, padding: "8px 16px", borderRadius: "100px", border: pillBorder, backdropFilter: "blur(12px)", transition: "all 0.3s ease", flexShrink: 0 }}>
          <div style={{ color: primaryText, display: "flex", alignItems: "center", transition: "color 0.3s ease" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontFamily: T.fontDisplay, fontSize: 14, fontWeight: 700, color: primaryText, lineHeight: 1, transition: "color 0.3s ease" }}>
              4.8 Stars <span style={{ fontSize: 12, color: secondaryText, fontWeight: 500 }}>(897)</span>
            </div>
            <div style={{ color: secondaryText, fontSize: 10, fontWeight: 600, textTransform: "uppercase", marginTop: 2, letterSpacing: 0.5, transition: "color 0.3s ease" }}>Satisfaction</div>
          </div>
        </div>

        {/* Videos Edited Stat */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: pillBg, padding: "8px 16px", borderRadius: "100px", border: pillBorder, backdropFilter: "blur(12px)", transition: "all 0.3s ease", flexShrink: 0 }}>
          <div style={{ color: primaryText, display: "flex", alignItems: "center", transition: "color 0.3s ease" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontFamily: T.fontDisplay, fontSize: 14, fontWeight: 700, color: primaryText, lineHeight: 1, transition: "color 0.3s ease" }}>
              <AnimatedCounter targetValue="1.2k+" duration={2000} />
            </div>
            <div style={{ color: secondaryText, fontSize: 10, fontWeight: 600, textTransform: "uppercase", marginTop: 2, letterSpacing: 0.5, transition: "color 0.3s ease" }}>Videos Edited</div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StatsBar;
