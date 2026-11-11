import useGlobalState from "@/lib/global_state";
import api from "@/lib/axios";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Crown, X } from "lucide-react";

interface Feature {
  feature_id?: string;
  feature_key?: string;
  name?: string;
  description: string;
  value: string;
}

interface MembershipPlan {
  plan_id: string;
  name: string;
  description: string;
  price: number;
  billing_period: string;
  days_of_trials: number;
  features: Feature[];
}

const planOrderMap: Record<string, number> = {
  free: 1,
  freemium: 1,
  basic: 1,
  premium: 2,
  pro: 2,
  business: 3,
  studio: 3,
  enterprise: 4,
};

const formatPHP = (value: number) =>
  `₱${Number(value).toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const getSubscriptionIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case "premium":
      return "/icons/subscription/premium.png";
    case "business":
    case "studio":
      return "/icons/subscription/studio.png";
    default:
      return "/icons/subscription/freemium.png";
  }
};

const FALLBACK_PLANS: MembershipPlan[] = [
  {
    plan_id: "fallback-free",
    name: "Free",
    description: "Free membership",
    price: 0,
    billing_period: "MONTH",
    days_of_trials: 0,
    features: [
      { description: "Watermark on exported files", value: "Enabled" },
      { description: "Maximum export quality", value: "720p" },
      { description: "Rendering/export speed", value: "Standard" },
      { description: "Priority in render queue", value: "Low" },
      { description: "Available editing tools", value: "Basic" },
      { description: "Maximum teams allowed to create", value: "1" },
      { description: "Maximum collaborative projects", value: "3" },
      { description: "Maximum members allowed per team (e.g. up to 3 members on Free)", value: "3" },
      { description: "Maximum asset posts", value: "1" },
    ],
  },
  {
    plan_id: "fallback-premium",
    name: "Premium",
    description: "Premium monthly membership",
    price: 599,
    billing_period: "MONTH",
    days_of_trials: 7,
    features: [
      { description: "Watermark on exported files", value: "Disabled" },
      { description: "Maximum export quality", value: "1080p" },
      { description: "Rendering/export speed", value: "Accelerated" },
      { description: "Priority in render queue", value: "Priority" },
      { description: "Available editing tools", value: "Premium + AI" },
      { description: "Maximum teams allowed to create", value: "5" },
      { description: "Displayed membership badge", value: "Premium" },
      { description: "Maximum collaborative projects", value: "10" },
      { description: "Maximum members allowed per team (e.g. up to 3 members on Free)", value: "10" },
      { description: "Maximum asset posts", value: "20" },
      { description: "Additional profile visibility", value: "30" },
    ],
  },
  {
    plan_id: "fallback-business",
    name: "Business",
    description: "Business monthly membership",
    price: 3500,
    billing_period: "MONTH",
    days_of_trials: 0,
    features: [
      { description: "Watermark on exported files", value: "Disabled" },
      { description: "Maximum export quality", value: "2K-4K" },
      { description: "Rendering/export speed", value: "Maximum" },
      { description: "Priority in render queue", value: "Top" },
      { description: "Available editing tools", value: "Premium + AI" },
      { description: "Maximum teams allowed to create", value: "Unlimited" },
      { description: "Displayed membership badge", value: "Business" },
      { description: "Maximum collaborative projects", value: "20" },
      { description: "Maximum members allowed per team (e.g. up to 3 members on Free)", value: "20" },
      { description: "Maximum asset posts", value: "Unlimited" },
      { description: "Additional profile visibility", value: "90" },
    ],
  },
];

const PagePricing: React.FC = () => {
  const theme = useGlobalState((state) => state.theme);
  const isAuthenticated = useGlobalState((state) => state.isAuthenticated);
  const navigate = useNavigate();

  const hoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const softClickAudioRef = useRef<HTMLAudioElement | null>(null);

  const initAudio = () => {
    if (!hoverAudioRef.current) {
      hoverAudioRef.current = new Audio("/sounds/minimalhover.mp3");
      hoverAudioRef.current.volume = 0.15;
    }
    if (!softClickAudioRef.current) {
      softClickAudioRef.current = new Audio("/sounds/softclick.mp3");
      softClickAudioRef.current.volume = 0.4;
    }
  };

  const playHover = useCallback(() => {
    initAudio();
    if (hoverAudioRef.current) {
      hoverAudioRef.current.currentTime = 0;
      hoverAudioRef.current.play().catch(() => {});
    }
  }, []);

  const playSoftClick = useCallback(() => {
    initAudio();
    if (softClickAudioRef.current) {
      softClickAudioRef.current.currentTime = 0;
      softClickAudioRef.current.play().catch(() => {});
    }
  }, []);

  const [memberships, setMemberships] = useState<MembershipPlan[]>(FALLBACK_PLANS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchPlans = async () => {
      try {
        const res = await api.get("/api/subscription/plans");
        const plansData: MembershipPlan[] = res.data?.plans || [];
        if (isMounted && plansData.length > 0) {
          const sortedPlans = [...plansData].sort((a, b) => {
            const rankA = planOrderMap[a.name.toLowerCase()] ?? (Number(a.price) === 0 ? 0 : Number(a.price));
            const rankB = planOrderMap[b.name.toLowerCase()] ?? (Number(b.price) === 0 ? 0 : Number(b.price));
            return rankA - rankB;
          });
          setMemberships(sortedPlans);
        }
      } catch (err) {
        console.error("Failed to fetch subscription plans for landing pricing:", err);
      }
    };
    fetchPlans();
    return () => {
      isMounted = false;
    };
  }, []);

  const handlePlanClick = (tier: MembershipPlan) => {
    playSoftClick();
    const isFree = Number(tier.price) === 0 || tier.name.toLowerCase() === "free";
    if (isAuthenticated) {
      navigate("/credits-subscriptions");
      return;
    }
    if (isFree) {
      navigate("/signup");
    } else {
      setSelectedPlan(tier.name);
      setIsModalOpen(true);
    }
  };

  return (
    <div style={{ background: theme === "dark" ? "#121214" : "#f9fafb", minHeight: "100vh", color: theme === "dark" ? "#ffffff" : "#111827", padding: "80px 24px", position: "relative", overflowX: "hidden", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      <style>{`
        .pricing-card {
          background: ${theme === 'dark' ? '#18181b' : '#ffffff'};
          border: 1px solid ${theme === 'dark' ? '#27272a' : '#e5e7eb'};
          border-radius: 16px;
          padding: 32px 24px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
        }
        .pricing-card:hover {
          border-color: ${theme === 'dark' ? '#3f3f46' : '#d1d5db'};
        }
        .btn-subscribe {
          width: 100%;
          padding: 14px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #2563eb;
          color: white;
          border: none;
        }
        .btn-subscribe:hover {
          background: #1d4ed8;
        }
        .btn-current {
          width: 100%;
          padding: 14px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: not-allowed;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          color: ${theme === 'dark' ? '#525c73' : '#9ca3af'};
          border: 1px solid ${theme === 'dark' ? '#27272a' : '#e5e7eb'};
        }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 2 }}>

        {/* Back Navigation */}
        <button
          onClick={() => { playSoftClick(); navigate(-1); }}
          style={{ background: "none", border: "none", color: theme === "dark" ? "#7a8499" : "#6b7280", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 48, fontSize: 14, fontWeight: 600, transition: "color 0.2s" }}
          onMouseEnter={(e: any) => { playHover(); e.currentTarget.style.color = theme === "dark" ? "#ffffff" : "#111827"; }}
          onMouseLeave={(e: any) => { e.currentTarget.style.color = theme === "dark" ? "#7a8499" : "#6b7280"; }}
        >
          <ArrowLeft size={16} /> Back
        </button>

        {/* Header Section */}
        <div style={{ marginBottom: 48 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 8px 0", color: theme === "dark" ? "#ffffff" : "#111827" }}>
            Pricing / Subscriptions
          </h1>
          <p style={{ color: theme === "dark" ? "#94a3b8" : "#4b5563", fontSize: 14, margin: 0 }}>
            Top up your credit balance or upgrade your account membership subscription.
          </p>
        </div>
        
        {/* Pricing Cards Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
          {memberships.map((tier) => {
            const isFree = Number(tier.price) === 0 || tier.name.toLowerCase() === "free";
            const isPremium = tier.name.toLowerCase() === "premium";
            const trialDays = Number(tier.days_of_trials) || 0;
            const hasTrial = !isFree && trialDays > 0;
            const formattedPrice = isFree ? "Free" : formatPHP(Number(tier.price));
            const suffix =
              !isFree && tier.billing_period === "MONTH"
                ? "/mo"
                : !isFree && tier.billing_period
                ? `/${tier.billing_period.toLowerCase()}`
                : undefined;

            return (
              <div key={tier.plan_id || tier.name} className="pricing-card">
                {/* Badges */}
                {isFree && (
                  <div style={{ position: "absolute", top: -12, left: 16, background: "#10b981", color: "white", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, padding: "4px 10px", borderRadius: 20 }}>
                    DEFAULT PLAN
                  </div>
                )}
                {hasTrial && (
                  <div style={{ position: "absolute", top: -12, left: 16, background: "#2563eb", color: "white", fontSize: 10, fontWeight: 700, letterSpacing: 0.3, padding: "4px 10px", borderRadius: 20 }}>
                    {trialDays}-Day Free Trial
                  </div>
                )}

                <div>
                  {/* Title Row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <img src={getSubscriptionIcon(tier.name)} alt={tier.name} style={{ width: 28, height: 28, objectFit: "contain" }} />
                      <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{tier.name}</h3>
                    </div>
                    {isPremium && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#d97706", background: "rgba(217, 119, 6, 0.1)", border: "1px solid rgba(217, 119, 6, 0.2)", padding: "4px 8px", borderRadius: 12 }}>
                        Most popular
                      </span>
                    )}
                  </div>

                  {/* Tagline */}
                  <p style={{ color: theme === "dark" ? "#a1a1aa" : "#6b7280", fontSize: 13, marginBottom: 24 }}>
                    {tier.description}
                  </p>

                  {/* Price */}
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: hasTrial ? 8 : 24 }}>
                    <h2 style={{ fontSize: isFree ? 32 : 36, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
                      {formattedPrice}
                    </h2>
                    {suffix && (
                      <span style={{ color: theme === "dark" ? "#a1a1aa" : "#6b7280", fontSize: 14, fontWeight: 500 }}>
                        {suffix}
                      </span>
                    )}
                  </div>

                  {hasTrial && (
                    <p style={{ color: theme === "dark" ? "#34d399" : "#059669", fontSize: 12, margin: "0 0 24px 0", display: "flex", alignItems: "center", gap: 6 }}>
                      <span>✦</span>
                      <span>Try free for {trialDays} days, then {formattedPrice}{suffix || "/mo"}</span>
                    </p>
                  )}

                  {/* Separation Line */}
                  <div style={{ height: 1, background: theme === "dark" ? "#27272a" : "#e5e7eb", marginBottom: 24 }} />

                  {/* Features List */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
                    {tier.features && tier.features.length > 0 ? (
                      tier.features.map((feat, fidx) => (
                        <div key={feat.feature_id || fidx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 13, color: theme === "dark" ? "#e4e4e7" : "#374151" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Check size={14} color="#10b981" strokeWidth={3} style={{ flexShrink: 0 }} />
                            <span>{feat.description || feat.name}</span>
                          </div>
                          <span style={{ background: theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                            {feat.value}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: 12, color: theme === "dark" ? "#71717a" : "#9ca3af" }}>
                        No features available
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                {isFree ? (
                  <button className="btn-current">Default Plan</button>
                ) : (
                  <button
                    className="btn-subscribe"
                    onClick={() => handlePlanClick(tier)}
                    onMouseEnter={playHover}
                  >
                    {hasTrial ? "Start Free Trial" : "Subscribe Plan"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Authentication Gateway Modal */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(4, 5, 9, 0.8)", backdropFilter: "blur(12px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 100, padding: 20
          }}
          onClick={() => { playSoftClick(); setIsModalOpen(false); }}
        >
          <div
            style={{
              background: theme === "dark" ? "#18181b" : "#ffffff",
              border: `1px solid ${theme === 'dark' ? '#27272a' : '#e5e7eb'}`,
              borderRadius: "20px", padding: "32px", maxWidth: "400px", width: "100%",
              position: "relative",
              boxShadow: theme === "dark" ? "0 40px 80px -15px rgba(0,0,0,0.9)" : "0 20px 40px rgba(0,0,0,0.1)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { playSoftClick(); setIsModalOpen(false); }}
              style={{ position: "absolute", top: 20, right: 20, background: "none", border: "none", color: "#525c73", cursor: "pointer" }}
              onMouseEnter={(e: any) => { playHover(); e.currentTarget.style.color = theme === "dark" ? "#ffffff" : "#111827"; }}
              onMouseLeave={(e: any) => { e.currentTarget.style.color = "#525c73"; }}
            >
              <X size={20} />
            </button>

            <div style={{ textAlign: "center", marginBottom: 24, marginTop: 8 }}>
              <div style={{ display: "inline-flex", padding: 12, borderRadius: "50%", background: "rgba(59, 130, 246, 0.05)", border: "1px solid rgba(59, 130, 246, 0.15)", marginBottom: 16 }}>
                <Crown size={28} color={selectedPlan === "Business" ? "#2dd4bf" : "#eab308"} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: theme === "dark" ? "#ffffff" : "#111827" }}>Account Required</h3>
              <p style={{ color: theme === "dark" ? "#a1a1aa" : "#6b7280", fontSize: 14, lineHeight: 1.4 }}>
                To subscribe to the <span style={{ color: selectedPlan === "Business" ? "#2dd4bf" : "#eab308", fontWeight: 600 }}>{selectedPlan}</span> plan, please sign in or create a new account.
              </p>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                style={{ flex: 1, padding: 14, borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: "pointer", background: "transparent", border: `1px solid ${theme === 'dark' ? '#27272a' : '#e5e7eb'}`, color: theme === "dark" ? "#ffffff" : "#111827" }}
                onClick={() => { playSoftClick(); navigate("/login"); }}
                onMouseEnter={(e: any) => { playHover(); e.currentTarget.style.background = theme === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)"; }}
                onMouseLeave={(e: any) => { e.currentTarget.style.background = "transparent"; }}
              >
                Log In
              </button>
              <button
                style={{ flex: 1, padding: 14, borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: "pointer", background: theme === "dark" ? "#ffffff" : "#111827", border: "none", color: theme === "dark" ? "#121214" : "#ffffff" }}
                onClick={() => { playSoftClick(); navigate("/signup"); }}
                onMouseEnter={(e: any) => { playHover(); e.currentTarget.style.background = theme === "dark" ? "#e4e4e7" : "#374151"; }}
                onMouseLeave={(e: any) => { e.currentTarget.style.background = theme === "dark" ? "#ffffff" : "#111827"; }}
              >
                Sign Up Free
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PagePricing;
