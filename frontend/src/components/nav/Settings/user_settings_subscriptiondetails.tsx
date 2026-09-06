import React from "react";
import { useNavigate } from "react-router-dom";
import { XCircle, Check, Crown, Loader2, Zap, Flame } from "lucide-react";

interface SubscriptionDetailsProps {
  subscription: {
    plan_name: string;
    status: string;
    renews_at?: string;
    cancel_at_period_end?: boolean;
  };
  onCancelSubscription: () => void;
  isCancelling?: boolean;
}

export const UserSettingsSubscriptionDetails: React.FC<SubscriptionDetailsProps> = ({
  subscription,
  onCancelSubscription,
  isCancelling = false,
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
      icon: "/icons/subscription/freemium.png",
      popular: false,
      current: isFreePlan,
      features: [
        { label: "Maximum asset posts", val: "1" },
        { label: "Maximum export quality", val: "720p" },
        { label: "Rendering/export speed", val: "Standard" },
        { label: "Maximum collaborators", val: "3" },
        { label: "Watermark on exported files", val: "Enabled" },
        { label: "Maximum collaborative projects", val: "3" },
        { label: "Available editing tools", val: "Basic" },
        { label: "Priority in render queue", val: "Low" }
      ]
    },
    {
      name: "Premium",
      tagline: "Premium monthly membership",
      price: "₱59,900",
      suffix: "/mo",
      icon: "/icons/subscription/premium.png",
      popular: true,
      current: subscription.plan_name?.toLowerCase().includes("premium"),
      features: [
        { label: "Maximum asset posts", val: "20" },
        { label: "Maximum export quality", val: "1080p" },
        { label: "Rendering/export speed", val: "Accelerated" },
        { label: "Maximum collaborators", val: "10" },
        { label: "Watermark on exported files", val: "Disabled" },
        { label: "Maximum collaborative projects", val: "10" },
        { label: "Available editing tools", val: "Premium + AI" },
        { label: "Displayed membership badge", val: "Premium" },
        { label: "Priority in render queue", val: "Priority" },
        { label: "Additional profile visibility", val: "30" }
      ]
    },
    {
      name: "Business",
      tagline: "Business monthly membership",
      price: "₱350,000",
      suffix: "/mo",
      icon: "/icons/subscription/studio.png",
      popular: false,
      current: subscription.plan_name?.toLowerCase().includes("business"),
      features: [
        { label: "Maximum asset posts", val: "Unlimited" },
        { label: "Maximum export quality", val: "2K-4K" },
        { label: "Rendering/export speed", val: "Maximum" },
        { label: "Maximum collaborators", val: "20" },
        { label: "Watermark on exported files", val: "Disabled" },
        { label: "Maximum collaborative projects", val: "20" },
        { label: "Available editing tools", val: "Premium + AI" },
        { label: "Displayed membership badge", val: "Business" },
        { label: "Priority in render queue", val: "Top" },
        { label: "Additional profile visibility", val: "90" }
      ]
    }
  ];

  const activePlanDetails = plans.find(p => p.current) || plans[0];

  return (
    <div className="space-y-8 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Current Subscription Status Header */}
      <div className="p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#18181b] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
              {subscription.status || "Active"}
            </span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <img src={activePlanDetails.icon} alt={activePlanDetails.name} className="w-6 h-6 object-contain" />
            {subscription.plan_name || "Free Tier"}
          </h3>
          <p className="text-xs text-gray-600 dark:text-zinc-400">
            {subscription.renews_at
              ? `Renews automatically on ${new Date(subscription.renews_at).toLocaleDateString()}`
              : "Standard tier with default access limits."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/credits-subscriptions")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md"
          >
            <Zap className="h-4 w-4" /> Upgrade / Change Plan
          </button>

          {/* Cancel button is hidden if user is on Free Plan */}
          {!isFreePlan && !subscription.cancel_at_period_end && subscription.status.toLowerCase() === "active" && (
            <button
              type="button"
              onClick={onCancelSubscription}
              disabled={isCancelling}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} {isCancelling ? "Cancelling..." : "Cancel Subscription"}
            </button>
          )}
        </div>
      </div>

      {/* Subscription Tier Cards Showcase */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-zinc-300 mb-4">Available Membership Plans</h3>
        <div className="grid grid-cols-1 gap-6 w-full">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`relative rounded-2xl p-8 border transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${
                plan.current
                  ? "border-[#10b981] bg-white dark:bg-[#18181b]"
                  : "border-gray-200 dark:border-white/10 bg-white dark:bg-[#18181b] hover:border-blue-500/50"
              }`}
            >
              {/* Badges */}
              {plan.current && (
                <div className="absolute -top-3 left-4 bg-[#10b981] text-white text-[10px] font-extrabold tracking-wider uppercase px-3 py-1 rounded-full shadow-md z-10">
                  DEFAULT PLAN
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
                {/* Left Side: Info & Button */}
                <div className="flex flex-col h-full justify-center">
                  <div className="flex items-center gap-3 mb-2">
                    <img src={plan.icon} alt={plan.name} className="w-7 h-7 object-contain" />
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</h4>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">{plan.tagline}</p>
                  
                  <div className="flex items-baseline gap-1 mb-8">
                    <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                      {plan.price}
                    </h2>
                    {plan.suffix && (
                      <span className="text-sm font-medium text-gray-500 dark:text-zinc-400">
                        {plan.suffix}
                      </span>
                    )}
                    {plan.popular && (
                      <div className="group relative flex items-center w-fit ml-2 self-center">
                        <Flame className="h-6 w-6 text-amber-500 cursor-pointer drop-shadow-md" />
                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-black text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20 shadow-lg border border-white/10">
                          Most Popular
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  {plan.current ? (
                    <button
                      disabled
                      className="w-full py-3.5 rounded-lg border border-gray-200 dark:border-white/10 bg-transparent text-gray-400 dark:text-zinc-500 text-sm font-semibold cursor-not-allowed flex items-center justify-center mt-auto"
                    >
                      Your Current Plan
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate("/credits-subscriptions")}
                      className="w-full py-3.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center bg-[#2563eb] text-white hover:bg-[#1d4ed8] mt-auto"
                    >
                      Subscribe Plan
                    </button>
                  )}
                </div>

                {/* Right Side: Features */}
                <div className="flex flex-col justify-center h-full">
                  <div className="h-px w-full bg-gray-200 dark:bg-white/10 mb-6 md:hidden" />
                  
                  {/* Custom thin scrollbar styles */}
                  <style>{`
                    .features-scrollbar::-webkit-scrollbar {
                      width: 4px;
                    }
                    .features-scrollbar::-webkit-scrollbar-track {
                      background: transparent;
                    }
                    .features-scrollbar::-webkit-scrollbar-thumb {
                      background: rgba(156, 163, 175, 0.3);
                      border-radius: 10px;
                    }
                    .features-scrollbar::-webkit-scrollbar-thumb:hover {
                      background: rgba(156, 163, 175, 0.5);
                    }
                  `}</style>
                  
                  <div className="space-y-4 max-h-[220px] overflow-y-auto pr-2 features-scrollbar">
                    {plan.features.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-center justify-between text-[13px]">
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-[#10b981] shrink-0" strokeWidth={3} />
                          <span className="text-gray-700 dark:text-zinc-300">{feat.label}</span>
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded text-xs ml-4 text-right">
                          {feat.val}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
