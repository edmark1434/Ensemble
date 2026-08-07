import { useEffect, useState } from "react";
import type { FC } from "react";
import { useNavigate } from "react-router-dom";

const T = {
  bgCard: "#0d0f1a",
  fontDisplay: "'Plus Jakarta Sans', sans-serif",
} as const;

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

const AvatarGroup = () => (
  <div style={{ display: "flex", alignItems: "center" }}>
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} style={{
        width: 36, height: 36, borderRadius: "50%",
        border: `2px solid #080a12`, // matching the DriftWall overlay background to blend perfectly
        marginLeft: i === 1 ? 0 : -14,
        background: i === 4 
          ? "#0284c7" // The blue "M" avatar from screenshot
          : `url('https://i.pravatar.cc/100?img=${i * 12 + 10}') center/cover`,
        zIndex: 10 - i,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: "bold",
        fontSize: "16px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
      }}>
        {i === 4 ? "M" : ""}
      </div>
    ))}
  </div>
);

const StatsBar: FC = () => {
  const navigate = useNavigate();

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

  return (
    <div style={{ padding: "10px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "20px", maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
        
        {/* Users Stat (External Avatars + Pill) */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <AvatarGroup />
          <div style={{
            background: "rgba(255,255,255,0.03)", 
            padding: "8px 8px 8px 16px", 
            borderRadius: "100px", 
            border: "1px solid rgba(255,255,255,0.05)", 
            backdropFilter: "blur(12px)",
            color: "#fff",
            fontFamily: T.fontDisplay, 
            fontSize: 15, 
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            gap: "12px"
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
                background: "#fff",
                color: "#000",
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
                e.currentTarget.style.background = "#e2e8f0";
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#fff";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              Join
            </button>
          </div>
        </div>

        {/* Satisfaction Stat */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.03)", padding: "8px 16px", borderRadius: "100px", border: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(12px)" }}>
          <div style={{ color: "#fff", display: "flex", alignItems: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontFamily: T.fontDisplay, fontSize: 14, fontWeight: 700, color: "#fff", lineHeight: 1 }}>
              4.8 Stars <span style={{ fontSize: 12, color: "#a1a1aa", fontWeight: 500 }}>(897)</span>
            </div>
            <div style={{ color: "#a1a1aa", fontSize: 10, fontWeight: 600, textTransform: "uppercase", marginTop: 2, letterSpacing: 0.5 }}>Satisfaction</div>
          </div>
        </div>

        {/* Videos Edited Stat */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.03)", padding: "8px 16px", borderRadius: "100px", border: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(12px)" }}>
          <div style={{ color: "#fff", display: "flex", alignItems: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontFamily: T.fontDisplay, fontSize: 14, fontWeight: 700, color: "#fff", lineHeight: 1 }}>
              <AnimatedCounter targetValue="1.2k+" duration={2000} />
            </div>
            <div style={{ color: "#a1a1aa", fontSize: 10, fontWeight: 600, textTransform: "uppercase", marginTop: 2, letterSpacing: 0.5 }}>Videos Edited</div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StatsBar;
