import React from "react";
import { useNavigate } from "react-router-dom";
import { XCircle, Check, Crown, Zap } from "lucide-react";

interface SubscriptionDetailsProps {
  subscription: {
    plan_name: string;
    status: string;
    renews_at?: string;
  };
  onCancelSubscription: () => void;
}

export const UserSettingsSubscriptionDetails: React.FC<SubscriptionDetailsProps> = ({
  subscription,
  onCancelSubscription,
}) => {
  const navigate = useNavigate();

  const isFreePlan =
    !subscription.plan_name ||
    subscription.plan_name.toLowerCase().includes("free");

  const plans = [
    {
      name: "Free",
      tagline: "Free membership",
      price: "Free",
      current: isFreePlan,
      features: [
        { label: "Maximum export quality", val: "720p" },
        { label: "Rendering/export speed", val: "Standard" },
        { label: "Available editing tools", val: "Basic" },
        { label: "Priority in render queue", val: "Low" },
        { label: "Watermark on exported files", val: "Enabled" },
        { label: "Maximum asset posts", val: "1" },
        { label: "Maximum collaborative projects", val: "3" },
        { label: "Maximum collaborators", val: "3" },
      ],
    },
    {
      name: "Business",
      tagline: "Business monthly membership",
      price: "₱350,000 /mo",
      current: subscription.plan_name?.toLowerCase().includes("business"),
      features: [
        { label: "Maximum export quality", val: "2K-4K" },
        { label: "Rendering/export speed", val: "Maximum" },
        { label: "Available editing tools", val: "Premium + AI" },
        { label: "Priority in render queue", val: "Top" },
        { label: "Watermark on exported files", val: "Disabled" },
        { label: "Displayed membership badge", val: "Business" },
        { label: "Maximum asset posts", val: "Unlimited" },
        { label: "Maximum collaborative projects", val: "20" },
        { label: "Additional profile visibility", val: "90" },
        { label: "Maximum collaborators", val: "20" },
      ],
    },
    {
      name: "Premium",
      tagline: "Premium monthly membership",
      price: "₱59,900 /mo",
      popular: true,
      current: subscription.plan_name?.toLowerCase().includes("premium"),
      features: [
        { label: "Maximum export quality", val: "1080p" },
        { label: "Rendering/export speed", val: "Accelerated" },
        { label: "Available editing tools", val: "Premium + AI" },
        { label: "Priority in render queue", val: "Priority" },
        { label: "Watermark on exported files", val: "Disabled" },
        { label: "Displayed membership badge", val: "Premium" },
        { label: "Maximum asset posts", val: "20" },
        { label: "Maximum collaborative projects", val: "10" },
        { label: "Additional profile visibility", val: "30" },
        { label: "Maximum collaborators", val: "10" },
      ],
    },
  ];

  return (
    <div className="space-y-8 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Current Subscription Status Header */}
      <div className="p-6 rounded-2xl border border-white/10 bg-gradient-to-r from-blue-900/20 via-indigo-900/10 to-transparent flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              {subscription.status || "Active"}
            </span>
          </div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            {subscription.plan_name || "Free Tier"}
          </h3>
          <p className="text-xs text-zinc-400">
            {subscription.renews_at
              ? `Renews automatically on ${new Date(subscription.renews_at).toLocaleDateString()}`
              : "Standard tier with default access limits."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/credits-subscriptions")}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md"
          >
            <Zap className="h-4 w-4" /> Upgrade / Change Plan
          </button>

          {/* Cancel button is hidden if user is on Free Plan */}
          {!isFreePlan && subscription.status === "Active" && (
            <button
              type="button"
              onClick={onCancelSubscription}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
            >
              <XCircle className="h-4 w-4" /> Cancel Subscription
            </button>
          )}
        </div>
      </div>

      {/* Subscription Tier Cards Showcase */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-300 mb-4">Available Membership Plans</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`relative rounded-2xl p-6 border flex flex-col justify-between transition-all ${
                plan.current
                  ? "border-emerald-500/60 bg-[#0d131f] shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                  : "border-white/10 bg-[#0d0f1a] hover:border-white/20"
              }`}
            >
              {/* Badges */}
              {plan.current && (
                <div className="absolute -top-3 left-4 bg-emerald-500 text-[#080a12] text-[10px] font-extrabold tracking-wider uppercase px-2.5 py-0.5 rounded-full shadow-md">
                  Current Plan
                </div>
              )}
              {plan.popular && !plan.current && (
                <div className="absolute -top-3 right-4 bg-white/10 border border-white/20 text-white text-[10px] font-medium px-2.5 py-0.5 rounded-full backdrop-blur-md">
                  Most popular
                </div>
              )}

              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  {!isFreePlan && <Crown className="h-4 w-4 text-amber-400" />}
                  <h4 className="text-lg font-bold text-white">{plan.name}</h4>
                </div>
                <p className="text-xs text-zinc-400 mb-4">{plan.tagline}</p>
                <div className="text-2xl font-extrabold text-white mb-6">
                  {plan.price}
                </div>

                {/* Features List */}
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2 text-xs">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-zinc-300">
                        {feat.label}{" "}
                        <span className="font-semibold text-white bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[11px] ml-1 inline-block">
                          {feat.val}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              {plan.current ? (
                <button
                  disabled
                  className="w-full py-2.5 rounded-xl border border-white/10 bg-white/5 text-zinc-500 text-xs font-semibold cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate("/credits-subscriptions")}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                    plan.popular
                      ? "bg-white text-black hover:bg-zinc-200"
                      : "bg-white/10 border border-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  Subscribe / Upgrade
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};