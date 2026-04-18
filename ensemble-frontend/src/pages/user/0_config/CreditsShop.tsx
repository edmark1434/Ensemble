import { useState, useEffect } from "react";
import {
  Sparkles,
  Crown,
  Gift,
  Star,
  Shield,
  Check,
  Wallet,
  Coins,
  Gem
} from "lucide-react";
import UserHeader from "@/components/nav/user_header";
import { useNavigate } from "react-router-dom";

interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: string;
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
  originalPrice?: string;
  features: string[];
  color: string;
  icon: React.ReactNode;
  popular?: boolean;
}

const creditPacks: CreditPack[] = [
  {
    id: "pocket",
    name: "Pocket of Credits",
    credits: 80,
    price: "₱99",
    icon: <Wallet className="h-5 w-5" />,
    color: "from-cyan-500 to-blue-500"
  },
  {
    id: "bundle",
    name: "Bundle of Credits",
    credits: 250,
    price: "₱299",
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
    features: ["720p Export", "Watermarked Export", "Basic Tools", "3 Collaborators", "3 Collaborative Projects", "1 Asset Post"],
    color: "from-gray-500 to-gray-600",
    icon: <Shield className="h-5 w-5" />
  },
  {
    id: "premium",
    name: "PREMIUM",
    price: "₱350",
    originalPrice: "₱499",
    features: ["1080p Export", "No Watermark", "Premium Tools + AI", "10 Collaborators", "10 Collaborative Projects", "20 Asset Posts", "Profile Visibility +30%", "Badge Display"],
    color: "from-yellow-500 to-amber-500",
    icon: <Crown className="h-5 w-5" />,
    popular: true
  },
  {
    id: "business",
    name: "BUSINESS",
    price: "₱950",
    originalPrice: "₱1,299",
    features: ["2K - 4K Export", "No Watermark", "Premium Tools + AI", "20 Collaborators", "20 Collaborative Projects", "Unlimited Asset Posts", "Profile Visibility +90%", "Badge Display and More"],
    color: "from-purple-500 to-indigo-500",
    icon: <Star className="h-5 w-5" />
  }
];

// Skeleton Components
const CreditPackSkeleton = () => (
  <div className="rounded-xl border border-white/10 bg-white/5 p-6">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-xl bg-white/10" />
        <div>
          <div className="h-5 w-24 animate-pulse rounded bg-white/10" />
          <div className="mt-1 h-3 w-16 animate-pulse rounded bg-white/5" />
        </div>
      </div>
      <div className="h-6 w-16 animate-pulse rounded-full bg-white/10" />
    </div>
    <div className="mt-4">
      <div className="h-8 w-32 animate-pulse rounded bg-white/10" />
      <div className="mt-2 h-4 w-40 animate-pulse rounded bg-white/5" />
    </div>
    <div className="mt-6 h-10 w-full animate-pulse rounded-full bg-white/10" />
  </div>
);

const MembershipSkeleton = () => (
  <div className="rounded-xl border border-white/10 bg-white/5 p-6">
    <div className="flex items-center gap-3 mb-4">
      <div className="h-10 w-10 animate-pulse rounded-xl bg-white/10" />
      <div className="h-6 w-24 animate-pulse rounded bg-white/10" />
    </div>
    <div className="mb-4">
      <div className="h-8 w-32 animate-pulse rounded bg-white/10" />
      <div className="mt-1 h-4 w-24 animate-pulse rounded bg-white/5" />
    </div>
    <div className="space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-4 w-full animate-pulse rounded bg-white/5" />
      ))}
    </div>
    <div className="mt-6 h-10 w-full animate-pulse rounded-full bg-white/10" />
  </div>
);

const CreditShop: React.FC = () => {
    useNavigate();
    const [loading, setLoading] = useState(true);
    const [, setSelectedPack] = useState<string | null>(null);
  const [, setSelectedMembership] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleBuyCredits = (packId: string) => {
    setSelectedPack(packId);
    // Navigate to checkout or open modal
    console.log(`Buying pack: ${packId}`);
  };

  const handleSubscribe = (membershipId: string) => {
    setSelectedMembership(membershipId);
    // Navigate to checkout or open modal
    console.log(`Subscribing to: ${membershipId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080a12]">
        <UserHeader pageTitle="Credit Shop" credits={1250} />
        <div className="mx-auto max-w-7xl p-6 md:p-8">
          <div className="mb-8 text-center">
            <div className="h-10 w-48 mx-auto animate-pulse rounded-lg bg-white/10" />
            <div className="mt-2 h-4 w-64 mx-auto animate-pulse rounded-lg bg-white/5" />
          </div>

          {/* Credit Packs Skeletons */}
          <div className="mb-12">
            <div className="mb-4 flex items-center justify-between">
              <div className="h-6 w-32 animate-pulse rounded bg-white/10" />
              <div className="h-5 w-24 animate-pulse rounded bg-white/5" />
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <CreditPackSkeleton key={i} />
              ))}
            </div>
          </div>

          {/* Memberships Skeletons */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="h-6 w-32 animate-pulse rounded bg-white/10" />
              <div className="h-5 w-24 animate-pulse rounded bg-white/5" />
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <MembershipSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080a12]">
      {/* Top Header */}
      <UserHeader pageTitle="Credit Shop" credits={1250} />

      {/* Main Content */}
      <div className="mx-auto max-w-7xl p-6 md:p-8">

        {/* Header Section */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Top-up Credits!
          </h1>
          <p className="mt-2 text-sm text-zinc-400" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Purchase credits or subscribe to unlock premium features
          </p>
        </div>

        {/* Credit Packs Section */}
        <div className="mb-12">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Top Up Options
              </h2>
              <p className="text-xs text-zinc-500" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                One-time credit purchases
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-blue-500/20 px-3 py-1">
              <Sparkles className="h-3 w-3 text-blue-400" />
              <span className="text-xs text-blue-400" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Best Value</span>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {creditPacks.map((pack) => (
              <div
                key={pack.id}
                className={`group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6 transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:scale-[1.02] ${
                  pack.popular ? "ring-2 ring-green-500/50" : ""
                }`}
              >
                {pack.popular && (
                  <div className="absolute -right-8 top-4 rotate-45 bg-green-500 px-8 py-0.5 text-[10px] font-semibold text-white">
                    POPULAR
                  </div>
                )}

                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-xl bg-gradient-to-br ${pack.color} p-2.5 text-white shadow-lg`}>
                      {pack.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {pack.name}
                      </h3>
                      <p className="text-xs text-zinc-500">{pack.credits} Credits</p>
                    </div>
                  </div>
                  {pack.savings && (
                    <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-medium text-green-400">
                      {pack.savings}
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-white">{pack.price}</span>
                    {pack.originalPrice && (
                      <span className="text-sm text-zinc-500 line-through">{pack.originalPrice}</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {pack.credits} credits · {(pack.credits / parseInt(pack.price.replace("₱", ""))).toFixed(2)} credits/₱
                  </p>
                </div>

                <button
                  onClick={() => handleBuyCredits(pack.id)}
                  className="mt-6 w-full rounded-full bg-gradient-to-r from-blue-500 to-purple-600 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-lg"
                >
                  Buy Now
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Memberships Section */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Memberships
              </h2>
              <p className="text-xs text-zinc-500" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Subscribe for monthly benefits
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-purple-500/20 px-3 py-1">
              <Crown className="h-3 w-3 text-purple-400" />
              <span className="text-xs text-purple-400" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Best Deal</span>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {memberships.map((membership) => (
              <div
                key={membership.id}
                className={`group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6 transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:scale-[1.02] ${
                  membership.popular ? "ring-2 ring-yellow-500/50" : ""
                }`}
              >
                {membership.popular && (
                  <div className="absolute -right-8 top-4 rotate-45 bg-yellow-500 px-8 py-0.5 text-[10px] font-semibold text-black">
                    POPULAR
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className={`rounded-xl bg-gradient-to-br ${membership.color} p-2.5 text-white shadow-lg`}>
                    {membership.icon}
                  </div>
                  <h3 className="text-lg font-bold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {membership.name}
                  </h3>
                </div>

                <div className="mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-white">{membership.price}</span>
                    {membership.originalPrice && (
                      <span className="text-sm text-zinc-500 line-through">{membership.originalPrice}</span>
                    )}
                  </div>
                  {membership.originalPrice && (
                    <p className="text-xs text-green-400 mt-1">
                      Save {Math.round((1 - parseInt(membership.price.replace("₱", "")) / parseInt(membership.originalPrice.replace("₱", ""))) * 100)}%
                    </p>
                  )}
                </div>

                <ul className="space-y-2">
                  {membership.features.slice(0, 6).map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-zinc-400">
                      <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-400" />
                      <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{feature}</span>
                    </li>
                  ))}
                  {membership.features.length > 6 && (
                    <li className="text-xs text-blue-400 cursor-pointer hover:text-blue-300">
                      +{membership.features.length - 6} more features
                    </li>
                  )}
                </ul>

                <button
                  onClick={() => handleSubscribe(membership.id)}
                  className={`mt-6 w-full rounded-full py-2.5 text-sm font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                    membership.name === "PREMIUM"
                      ? "bg-gradient-to-r from-yellow-500 to-amber-500 text-black"
                      : membership.name === "BUSINESS"
                      ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white"
                      : "border border-white/20 bg-white/5 text-white hover:bg-white/10"
                  }`}
                >
                  {membership.name === "FREE" ? "Get Started" : "Subscribe Now"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Badge */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2">
            <Shield className="h-4 w-4 text-green-400" />
            <span className="text-xs text-zinc-400" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Secure payment powered by Stripe
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditShop;