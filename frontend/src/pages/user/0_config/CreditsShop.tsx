import { useState, useEffect } from "react";
import {
  Crown,
  Gift,
  Check,
  Wallet,
  Coins,
  Gem,
  Shield,
  ArrowRight,
  Plus,
  Minus,
  Edit,
} from "lucide-react";
import UserHeader from "@/components/nav/user_header";
import { useNavigate } from "react-router-dom";

interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: string;
  priceValue: number;
  originalPrice?: string;
  savings?: string;
  icon: React.ReactNode;
  color: string;
  popular?: boolean;
}

interface Membership {
  id: string;
  name: string;
  price: string;
  priceValue: number;
  originalPrice: string | null;
  color: string;
  badgeColor: string;
  icon: React.ReactNode;
  features: string[];
  buttonText: string;
  isPrimary: boolean;
  popular?: boolean;
}

interface CheckoutItem {
  id: string;
  name: string;
  type: "topup" | "subscription" | "custom";
  credits?: number;
  price: string;
  priceValue: number;
  originalPrice?: string;
  savings?: string;
  features?: string[];
  isCustom?: boolean;
}

const creditPacks: CreditPack[] = [
  {
    id: "pocket",
    name: "Pocket of Credits",
    credits: 80,
    price: "₱99",
    priceValue: 99,
    icon: <Wallet className="h-5 w-5" />,
    color: "from-cyan-500 to-blue-500"
  },
  {
    id: "bundle",
    name: "Bundle of Credits",
    credits: 250,
    price: "₱299",
    priceValue: 299,
    originalPrice: "₱340",
    savings: "Save 12%",
    icon: <Coins className="h-5 w-5" />,
    color: "from-green-500 to-emerald-500",
    popular: true
  },
  {
    id: "box",
    name: "Box of Credits",
    credits: 750,
    price: "₱849",
    priceValue: 849,
    originalPrice: "₱1,060",
    savings: "Save 20%",
    icon: <Gift className="h-5 w-5" />,
    color: "from-purple-500 to-pink-500"
  },
  {
    id: "vault",
    name: "Vault of Credits",
    credits: 1600,
    price: "₱1,599",
    priceValue: 1599,
    originalPrice: "₱2,280",
    savings: "Save 30%",
    icon: <Gem className="h-5 w-5" />,
    color: "from-yellow-500 to-orange-500"
  }
];

const memberships: Membership[] = [
  {
    id: "free",
    name: "FREE",
    price: "₱0",
    priceValue: 0,
    originalPrice: null,
    color: "#ffffff",
    badgeColor: "rgba(255, 255, 255, 0.05)",
    icon: null,
    features: [
      "720p Export",
      "Standard Export Speed",
      "Low Render Queue",
      "Watermarked Export",
      "Basic Tools",
      "3 Collaborators",
      "3 Collaborative Projects",
      "1 Asset Post"
    ],
    buttonText: "Get Started",
    isPrimary: false
  },
  {
    id: "premium",
    name: "PREMIUM",
    price: "₱599",
    priceValue: 599,
    originalPrice: "₱899",
    color: "#eab308",
    badgeColor: "rgba(234, 179, 8, 0.1)",
    icon: <Crown size={16} fill="#eab308" color="#eab308" />,
    features: [
      "1080p Export",
      "Accelerated Export Speed",
      "Priority Render Queue",
      "No Watermark",
      "Premium Tools + AI",
      "10 Collaborators",
      "10 Collaborative Projects",
      "20 Asset Posts",
      "Profile Visibility +30%",
      "Badge Display"
    ],
    buttonText: "Upgrade to Premium",
    isPrimary: true,
    popular: true
  },
  {
    id: "business",
    name: "BUSINESS",
    price: "₱3,500",
    priceValue: 3500,
    originalPrice: "₱3,999",
    color: "#2dd4bf",
    badgeColor: "rgba(45, 212, 191, 0.1)",
    icon: <Crown size={16} fill="#2dd4bf" color="#2dd4bf" />,
    features: [
      "2K - 4K Export",
      "Maximum Export Speed",
      "Absolute Render Queue",
      "No Watermark",
      "Premium Tools + AI",
      "20 Collaborators",
      "20 Collaborative Projects",
      "Unlimited Asset Posts",
      "Profile Visibility +90%",
      "Badge Display and More"
    ],
    buttonText: "Upgrade to Business",
    isPrimary: true
  }
];

const CreditShop: React.FC = () => {
  const navigate = useNavigate();
  const userCurrentCredits = 1250;

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"topup" | "membership">("topup");
  const [tabTriggerAnim, setTabTriggerAnim] = useState(false);
  
  // Custom top-up states
  const [customCredits, setCustomCredits] = useState<number>(100);
  const [isCustomMode, setIsCustomMode] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      setTimeout(() => setTabTriggerAnim(true), 50);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleTabChange = (tab: "topup" | "membership") => {
    setTabTriggerAnim(false);
    setTimeout(() => {
      setActiveTab(tab);
      setTabTriggerAnim(true);
    }, 180);
  };

  const navigateToCheckout = (item: CheckoutItem) => {
    navigate('/credits/checkout', { state: { item } });
  };

  const handlePackCheckout = (pack: CreditPack) => {
    const checkoutItem: CheckoutItem = {
      id: pack.id,
      name: pack.name,
      type: "topup",
      credits: pack.credits,
      price: pack.price,
      priceValue: pack.priceValue,
      originalPrice: pack.originalPrice,
      savings: pack.savings,
    };
    navigateToCheckout(checkoutItem);
  };

  const handleCustomCheckout = () => {
    if (customCredits < 10) {
      alert("Minimum custom top-up is 10 credits.");
      return;
    }
    
    const priceValue = customCredits * 1.25; // ₱1.25 per credit
    const checkoutItem: CheckoutItem = {
      id: "custom",
      name: `Custom Top-up (${customCredits} Credits)`,
      type: "custom",
      credits: customCredits,
      price: `₱${priceValue.toFixed(2)}`,
      priceValue: priceValue,
      isCustom: true,
    };
    navigateToCheckout(checkoutItem);
  };

  const handleMembershipCheckout = (membership: Membership) => {
    if (membership.id === "free") return;
    
    const checkoutItem: CheckoutItem = {
      id: membership.id,
      name: membership.name,
      type: "subscription",
      price: membership.price,
      priceValue: membership.priceValue,
      features: membership.features,
      originalPrice: membership.originalPrice || undefined,
    };
    navigateToCheckout(checkoutItem);
  };

  const incrementCredits = () => {
    setCustomCredits(prev => Math.min(prev + 10, 10000));
  };

  const decrementCredits = () => {
    setCustomCredits(prev => Math.max(prev - 10, 10));
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0) {
      setCustomCredits(Math.min(value, 10000));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080a12]">
        <UserHeader pageTitle="Credit Shop" credits={userCurrentCredits} />
        <div className="mx-auto max-w-7xl p-6 md:p-8 flex flex-col items-center justify-center min-h-[60vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080a12] text-white selection:bg-blue-500/30 relative overflow-x-hidden">
      <style>{`
        .pricing-card {
          background: rgba(13, 15, 26, 0.45);
          backdrop-filter: blur(16px);
          border: 1px solid #1e2130;
          border-radius: 24px;
          padding: 40px 32px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .pricing-card:hover {
          transform: translateY(-8px);
          background: rgba(17, 20, 34, 0.7);
          box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.8);
        }
        .custom-card {
          background: rgba(13, 15, 26, 0.45);
          backdrop-filter: blur(16px);
          border: 2px dashed #1e2130;
          border-radius: 24px;
          padding: 32px;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .custom-card:hover {
          border-color: rgba(59, 130, 246, 0.5);
          background: rgba(17, 20, 34, 0.7);
        }
      `}</style>

      <div className="absolute top-[10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/5 filter blur-[140px] pointer-events-none z-0" />
      <div className="absolute bottom-[10%] right-[-10%] w-[500px] h-[500px] bg-teal-500/5 filter blur-[140px] pointer-events-none z-0" />

      <UserHeader pageTitle="Credit Shop" credits={userCurrentCredits} />

      <div className="mx-auto max-w-7xl p-6 md:p-8 relative z-10">
        {/* Header Section */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Web Shop Tiers
          </h1>
          <p className="text-zinc-400 text-sm max-w-md mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Manage ecosystem capital. Recharge assets or upgrade parameters instantly.
          </p>
        </div>

        {/* Tab Switcher Layout */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex rounded-xl p-1.5 bg-[#0d0f1a] border border-[#1e2130]">
            <button
              onClick={() => handleTabChange("topup")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
                activeTab === "topup" ? "bg-white text-[#080a12] shadow-lg" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Coins className="h-4 w-4" />
              Top Up
            </button>
            <button
              onClick={() => handleTabChange("membership")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
                activeTab === "membership" ? "bg-white text-[#080a12] shadow-lg" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Crown className="h-4 w-4" />
              Memberships
            </button>
          </div>
        </div>

        {/* DYNAMIC VIEW SHELF W/ SLIDE UP ANIMATIONS */}
        <div
          className={`transition-all duration-500 ease-out transformation transform ${
            tabTriggerAnim ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          {/* TOP UP CONTAINER */}
          {activeTab === "topup" && (
            <div className="space-y-10">
              {/* Credit Packs Grid */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold">Choose Credit Package</h2>
                  <button
                    onClick={() => setIsCustomMode(!isCustomMode)}
                    className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                    {isCustomMode ? "View Packages" : "Custom Amount"}
                  </button>
                </div>

                {!isCustomMode ? (
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {creditPacks.map((pack) => (
                      <div key={pack.id} className={`group relative overflow-hidden rounded-2xl border border-[#1e2130] bg-[#0d0f1a]/40 p-6 transition-all duration-300 hover:border-blue-500/50 hover:bg-[#111422]/70 ${pack.popular ? "ring-1 ring-emerald-500/40 border-emerald-500/30" : ""}`}>
                        {pack.popular && <div className="absolute -right-8 top-4 rotate-45 bg-emerald-500 px-8 py-0.5 text-[9px] font-bold text-white tracking-widest">POPULAR</div>}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`rounded-xl bg-gradient-to-br ${pack.color} p-2.5 text-white shadow-md`}>{pack.icon}</div>
                            <div>
                              <h3 className="text-sm font-bold tracking-tight text-white">{pack.name}</h3>
                              <p className="text-xs text-zinc-500">{pack.credits} Credits</p>
                            </div>
                          </div>
                          {pack.savings && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">{pack.savings}</span>}
                        </div>
                        <div className="mt-6">
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-extrabold text-white tracking-tight">{pack.price}</span>
                            {pack.originalPrice && <span className="text-sm text-zinc-600 line-through font-medium">{pack.originalPrice}</span>}
                          </div>
                        </div>
                        <button onClick={() => handlePackCheckout(pack)} className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl bg-white py-3 text-xs font-bold text-[#080a12] transition-all duration-300 hover:bg-zinc-200">
                          Purchase Bundle
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Custom Top-up Card */
                  <div className="custom-card">
                    <div className="text-center mb-6">
                      <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 rounded-full mb-3">
                        <Edit className="h-6 w-6 text-blue-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white">Custom Top-up</h3>
                      <p className="text-sm text-zinc-400">Choose any amount of credits to add</p>
                    </div>

                    <div className="max-w-md mx-auto space-y-6">
                      {/* Credit Amount Selector */}
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-zinc-300 block">
                          Number of Credits
                        </label>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={decrementCredits}
                            className="p-2 rounded-xl bg-white/5 border border-[#1e2130] hover:border-white/30 transition-colors"
                          >
                            <Minus className="h-5 w-5" />
                          </button>
                          <input
                            type="number"
                            value={customCredits}
                            onChange={handleCustomInputChange}
                            min="10"
                            max="10000"
                            className="flex-1 bg-black/40 border border-[#1e2130] rounded-xl px-4 py-3 text-center text-xl font-bold focus:outline-none focus:border-blue-500 text-white"
                          />
                          <button
                            onClick={incrementCredits}
                            className="p-2 rounded-xl bg-white/5 border border-[#1e2130] hover:border-white/30 transition-colors"
                          >
                            <Plus className="h-5 w-5" />
                          </button>
                        </div>
                        <div className="flex justify-between text-xs text-zinc-500">
                          <span>Min: 10 credits</span>
                          <span>Max: 10,000 credits</span>
                        </div>
                      </div>

                      {/* Quick Select Buttons */}
                      <div className="flex flex-wrap gap-2 justify-center">
                        {[50, 100, 250, 500, 1000].map((amount) => (
                          <button
                            key={amount}
                            onClick={() => setCustomCredits(amount)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              customCredits === amount
                                ? "bg-blue-500 text-white"
                                : "bg-white/5 text-zinc-400 hover:bg-white/10 border border-[#1e2130]"
                            }`}
                          >
                            {amount}
                          </button>
                        ))}
                      </div>

                      {/* Price Preview */}
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-zinc-400">Total Credits</span>
                          <span className="text-lg font-bold text-emerald-400">
                            +{customCredits.toLocaleString()} Credits
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/5">
                          <span className="text-sm text-zinc-400">Amount Due</span>
                          <span className="text-2xl font-extrabold text-white">
                            ₱{(customCredits * 1.25).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 text-center mt-2">
                          Rate: ₱1.25 per credit
                        </p>
                      </div>

                      <button
                        onClick={handleCustomCheckout}
                        disabled={customCredits < 10}
                        className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-sm font-bold text-white rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Proceed to Checkout
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MEMBERSHIPS CONTAINER */}
          {activeTab === "membership" && (
            <div className="grid gap-7 md:grid-cols-3 items-stretch">
              {memberships.map((tier, idx) => (
                <div key={idx} className="pricing-card" style={{ borderColor: tier.isPrimary ? "rgba(255, 255, 255, 0.08)" : "#1e2130" }} onMouseEnter={(e) => (e.currentTarget.style.borderColor = tier.color)} onMouseLeave={(e) => (e.currentTarget.style.borderColor = tier.isPrimary ? "rgba(255, 255, 255, 0.08)" : "#1e2130")}>
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <span style={{ color: tier.color, fontSize: "11px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", background: tier.badgeColor, padding: "4px 10px", borderRadius: "6px" }}>{tier.name}</span>
                      {tier.icon}
                    </div>
                    <div className="flex items-baseline gap-2.5 mb-8">
                      <h2 className="text-4xl font-extrabold tracking-tight text-white m-0">{tier.price}</h2>
                      {tier.originalPrice && <span className="text-zinc-600 text-base line-through font-medium">{tier.originalPrice}</span>}
                    </div>
                    <div className="h-[1px] bg-gradient-to-r from-[#1e2130] to-transparent mb-7" />
                    <div className="flex flex-col gap-3.5 mb-10">
                      {tier.features.map((feat, fidx) => (
                        <div key={fidx} className="text-sm text-zinc-300 flex items-start gap-3 leading-relaxed">
                          <span className="flex items-center justify-center rounded-full p-0.5 mt-0.5 flex-shrink-0" style={{ color: tier.color, background: tier.badgeColor }}><Check size={11} strokeWidth={3} /></span>
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => handleMembershipCheckout(tier)} className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02]" style={{ background: tier.isPrimary ? "#ffffff" : "transparent", color: tier.isPrimary ? "#080a12" : "#ffffff", border: tier.isPrimary ? "none" : "1px solid #1e2130" }} onMouseEnter={(e) => { if (!tier.isPrimary) { e.currentTarget.style.borderColor = "#ffffff"; e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)"; } else { e.currentTarget.style.background = "#dde3ed"; } }} onMouseLeave={(e) => { if (!tier.isPrimary) { e.currentTarget.style.borderColor = "#1e2130"; e.currentTarget.style.background = "transparent"; } else { e.currentTarget.style.background = "#ffffff"; } }}>
                    {tier.buttonText}
                    {tier.isPrimary && <div className="w-4 h-4 rounded-full bg-[#080a12] text-white flex items-center justify-center"><ArrowRight size={10} strokeWidth={3} /></div>}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security Trust Footer */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 border border-white/5">
            <Shield className="h-4 w-4 text-emerald-400" />
            <span className="text-xs text-zinc-400" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Secure checkout environment powered by Xendit
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditShop;