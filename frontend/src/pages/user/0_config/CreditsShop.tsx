import { useState, useEffect } from "react";
import {
  Crown,
  Check,
  Wallet,
  Shield,
  ArrowRight,
  Plus,
  Minus,
  ChevronDown,
} from "lucide-react";
import UserHeader from "@/components/nav/user_header";
import { useNavigate } from "react-router-dom";
import api from "@/lib/axios";

// ---- Data models ----
interface CreditPack {
  id: string;
  name: string;
  price: number;
  credits: number;
}

interface Feature {
  feature_id: string;
  feature_key: string;
  name: string;
  description: string;
  value: string;
}

interface Membership {
  plan_id: string;
  name: string;
  description: string;
  price: number;
  billing_period: string;
  days_of_trials: number;
  features: Feature[];
}

interface CheckoutItem {
  id: string;
  name: string;
  type: "topup" | "subscription" | "custom";
  credits?: number;
  price: string;
  priceValue: number;
  features?: Feature[];
  isCustom?: boolean;
  trialDays?: number;
  isUserEligibleForTrial?: boolean;
}

interface SubscriptionData {
  subscription_id: string;
  plan_id: string;
  status: string;
  trial_ends_at: string | null;
  trial_starts_at: string | null;
  current_period_end: string;
  current_period_start: string;
  cancel_at_period_end: boolean;
  xendit_plan_id: string | null;
}

const creditPacks: CreditPack[] = [
  { id: "pocket", name: "Pocket", price: 99, credits: 80 },
  { id: "bundle", name: "Bundle", price: 299, credits: 250 },
  { id: "box", name: "Box", price: 849, credits: 750 },
  { id: "vault", name: "Vault", price: 1599, credits: 1600 },
];

const formatPHP = (value: number) =>
  `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const CREDIT_RATE = 1.25;

const CreditShop: React.FC = () => {
  const navigate = useNavigate();
  const userCurrentCredits = 1250;

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"topup" | "membership">("topup");
  const [showCustom, setShowCustom] = useState(false);
  const [customCredits, setCustomCredits] = useState<number>(100);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  
  // Track user's current subscription
  const [userSubscription, setUserSubscription] = useState<SubscriptionData | null>(null);
  const [isUserSubscribed, setIsUserSubscribed] = useState(false);

  useEffect(() => {
    const fetchMemberships = async () => {
      try {
        const [planResponse, userSubscriptionResponse, getWalletResponse] = await Promise.all([
          api.get("api/subscription/plans"),
          api.get("api/subscription"),
          api.get("/api/accounts/wallet", {
            params: { type: 'account_wallets' },
          }),
        ]);
        
        console.log("Fetch wallet response:", getWalletResponse.data);
        setCurrentBalance(getWalletResponse.data?.wallet?.balance_credits || 0);
        
        const plansData = planResponse.data.plans || [];
        console.log("Fetched memberships:", plansData);
        
        const subscriptionData = userSubscriptionResponse.data.subscription;
        console.log("Fetched user subscription:", subscriptionData);
        
        if (subscriptionData && subscriptionData.length > 0) {
          const sub = subscriptionData[0];
          setUserSubscription(sub);
          
          // Check if user has a REAL subscription (not free plan)
          // User is considered "subscribed" if they have xendit_plan_id and trial data
          const hasRealSubscription = sub.xendit_plan_id !== null && 
                                      sub.trial_starts_at !== null && 
                                      sub.trial_ends_at !== null;
          
          // User is eligible for trial if:
          // 1. No subscription at all OR
          // 2. Has subscription but it's the FREE plan (plan_id matches Free plan)
          const isFreePlan = sub.plan_id === "75e5c586-eab8-4954-ac14-9874d5429b68";
          
          setIsUserSubscribed(!isFreePlan && hasRealSubscription);
          console.log(`User has real subscription: ${!isFreePlan && hasRealSubscription}`);
          console.log(`Is free plan: ${isFreePlan}`);
          console.log(`Has xendit_plan_id: ${sub.xendit_plan_id !== null}`);
        } else {
          setUserSubscription(null);
          setIsUserSubscribed(false);
          console.log("User has NO subscription");
        }
        
        setMemberships(plansData);
      } catch (error) {
        console.error("Error fetching memberships:", error);
        setMemberships([]);
        setUserSubscription(null);
        setIsUserSubscribed(false);
      } finally {
        setLoading(false);
      }
    };
    fetchMemberships();
  }, []);

  const navigateToCheckout = (item: CheckoutItem) => {
    navigate("/credits/checkout", { state: { item } });
  };

  const handlePackCheckout = (pack: CreditPack) => {
    navigateToCheckout({
      id: pack.id,
      name: `${pack.name} (${pack.credits.toLocaleString()} Credits)`,
      type: "topup",
      credits: pack.credits,
      price: formatPHP(pack.price),
      priceValue: pack.price,
    });
  };

  const handleCustomCheckout = () => {
    if (customCredits < 10) return;
    const priceValue = Math.round(customCredits * CREDIT_RATE * 100) / 100;
    navigateToCheckout({
      id: "custom",
      name: `Custom Top-up (${customCredits.toLocaleString()} Credits)`,
      type: "custom",
      credits: customCredits,
      price: formatPHP(priceValue),
      priceValue,
      isCustom: true,
    });
  };

  const handleMembershipCheckout = (membership: Membership) => {
    if (membership.price === 0) return;
    
    const isEligibleForTrial = !isUserSubscribed && membership.days_of_trials > 0;
    console.log(`Checking out: ${membership.name}, eligible for trial: ${isEligibleForTrial}`);
    
    navigateToCheckout({
      id: membership.plan_id,
      name: membership.name,
      type: "subscription",
      price: formatPHP(membership.price),
      priceValue: membership.price,
      features: membership.features || [],
      trialDays: membership.days_of_trials || 0,
      isUserEligibleForTrial: isEligibleForTrial,
    });
  };

  const incrementCredits = () => setCustomCredits((prev) => Math.min(prev + 10, 10000));
  const decrementCredits = () => setCustomCredits((prev) => Math.max(prev - 10, 10));
  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 0) setCustomCredits(Math.min(value, 10000));
  };

  const isCurrentPlan = (planId: string): boolean => {
    if (!userSubscription) return false;
    return planId === userSubscription.plan_id;
  };

  // Check if user is on Free plan
  const isOnFreePlan = (): boolean => {
    if (!userSubscription) return false;
    return userSubscription.plan_id === "75e5c586-eab8-4954-ac14-9874d5429b68";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0d12]">
        <UserHeader pageTitle="Credit Shop" credits={userCurrentCredits} />
        <div className="mx-auto max-w-6xl px-6 py-24 flex items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0d12] text-white">
      <UserHeader pageTitle="Credit Shop" credits={userCurrentCredits} />

      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Top up your credit balance or manage your subscription plan.
          </p>
        </div>

        {/* Current balance strip */}
        <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-5 py-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-800">
              <Wallet className="h-4 w-4 text-zinc-300" />
            </div>
            <div>
              <p className="text-xs text-zinc-400">Current balance</p>
              <p className="text-sm font-semibold text-white">
                {currentBalance.toLocaleString()} credits
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500">
            <Shield className="h-3.5 w-3.5" />
            Secure checkout via Xendit
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-zinc-800 mb-8">
          <nav className="flex gap-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("topup")}
              className={`relative pb-3 text-sm font-medium transition-colors ${
                activeTab === "topup" ? "text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Top up credits
              {activeTab === "topup" && (
                <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-white rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("membership")}
              className={`relative pb-3 text-sm font-medium transition-colors ${
                activeTab === "membership" ? "text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Subscription plans
              {activeTab === "membership" && (
                <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-white rounded-full" />
              )}
            </button>
          </nav>
        </div>

        {/* TOP UP */}
        {activeTab === "topup" && (
          <div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
              {creditPacks.map((pack) => {
                const isBestValue = pack.id === "vault";
                return (
                  <div
                    key={pack.id}
                    className="flex flex-col justify-between rounded-lg border border-zinc-800 bg-zinc-900/30 p-5 hover:border-zinc-700 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-white">{pack.name}</h3>
                        {isBestValue && (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                            Best value
                          </span>
                        )}
                      </div>
                      <p className="text-2xl font-semibold text-white">
                        {pack.credits.toLocaleString()}
                        <span className="text-sm font-normal text-zinc-500"> credits</span>
                      </p>
                      <p className="text-sm text-zinc-400 mt-1">{formatPHP(pack.price)}</p>
                    </div>
                    <button
                      onClick={() => handlePackCheckout(pack)}
                      className="mt-5 w-full rounded-md bg-white py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-200 transition-colors"
                    >
                      Buy now
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Custom amount toggle */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30">
              <button
                onClick={() => setShowCustom(!showCustom)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <div>
                  <p className="text-sm font-medium text-white">Enter a custom amount</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {formatPHP(CREDIT_RATE)} per credit · minimum 10 credits
                  </p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-zinc-400 transition-transform ${
                    showCustom ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showCustom && (
                <div className="border-t border-zinc-800 px-5 py-5">
                  <label className="text-xs font-medium text-zinc-400 block mb-2">
                    Number of credits
                  </label>
                  <div className="flex items-center gap-2 max-w-xs">
                    <button
                      onClick={decrementCredits}
                      aria-label="Decrease amount"
                      className="flex h-10 w-10 items-center justify-center rounded-md border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      value={customCredits}
                      onChange={handleCustomInputChange}
                      min={10}
                      max={10000}
                      className="h-10 flex-1 rounded-md border border-zinc-700 bg-zinc-950 text-center text-base font-semibold text-white focus:outline-none focus:border-zinc-500"
                    />
                    <button
                      onClick={incrementCredits}
                      aria-label="Increase amount"
                      className="flex h-10 w-10 items-center justify-center rounded-md border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    {[50, 100, 250, 500, 1000].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setCustomCredits(amount)}
                        className={`rounded-md px-3 py-1 text-xs font-medium border transition-colors ${
                          customCredits === amount
                            ? "border-white bg-white text-zinc-950"
                            : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                        }`}
                      >
                        {amount}
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center justify-between rounded-md bg-zinc-950 border border-zinc-800 px-4 py-3">
                    <span className="text-sm text-zinc-400">Total due</span>
                    <span className="text-lg font-semibold text-white">
                      {formatPHP(Math.round(customCredits * CREDIT_RATE * 100) / 100)}
                    </span>
                  </div>

                  <button
                    onClick={handleCustomCheckout}
                    disabled={customCredits < 10}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-white py-2.5 text-sm font-medium text-zinc-950 hover:bg-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Continue to checkout
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MEMBERSHIP */}
        {activeTab === "membership" && (
          <div className="grid gap-4 md:grid-cols-3 items-stretch">
            {memberships.map((tier) => {
              const isFree = tier.price === 0;
              const isPopular = tier.name === "Premium";
              const hasFreeTrial = tier.days_of_trials > 0;
              const currentPlan = isCurrentPlan(tier.plan_id);
              
              // Determine if user is eligible for trial
              // User is eligible if: NOT subscribed to a paid plan AND has free trial days
              const isEligibleForTrial = !isUserSubscribed && hasFreeTrial && !isFree;
              
              console.log(`=== ${tier.name} ===`);
              console.log(`isFree: ${isFree}`);
              console.log(`hasFreeTrial: ${hasFreeTrial} (days: ${tier.days_of_trials})`);
              console.log(`currentPlan: ${currentPlan}`);
              console.log(`isUserSubscribed: ${isUserSubscribed}`);
              console.log(`isEligibleForTrial: ${isEligibleForTrial}`);
              
              // Determine button text and state
              let buttonText = "Subscribe";
              let isDisabled = false;
              
              if (isFree) {
                buttonText = currentPlan ? "Current Plan" : "Free";
                isDisabled = true;
              } else if (currentPlan) {
                buttonText = "Current Plan";
                isDisabled = true;
              } else if (isEligibleForTrial) {
                // User on Free plan or no subscription - show trial
                buttonText = `Start Free Trial (${tier.days_of_trials} days)`;
                isDisabled = false;
                console.log(`✅ Button text set to: ${buttonText}`);
              } else {
                buttonText = "Subscribe";
                isDisabled = false;
              }

              const showTrialBadge = isEligibleForTrial;

              return (
                <div
                  key={tier.plan_id}
                  className={`flex flex-col justify-between rounded-lg border p-6 relative ${
                    isPopular && !currentPlan
                      ? "border-white/40 bg-zinc-900/50"
                      : currentPlan
                      ? "border-emerald-500/40 bg-zinc-900/30"
                      : "border-zinc-800 bg-zinc-900/30"
                  }`}
                >
                  {/* Current Plan Badge */}
                  {currentPlan && (
                    <div className="absolute -top-2.5 left-4">
                      <span className="bg-emerald-500 text-white text-[10px] font-medium px-3 py-0.5 rounded-full">
                        CURRENT PLAN
                      </span>
                    </div>
                  )}

                  {/* Trial Badge */}
                  {showTrialBadge && (
                    <div className="absolute -top-2.5 left-4">
                      <span className="bg-blue-500 text-white text-[10px] font-medium px-3 py-0.5 rounded-full">
                        {tier.days_of_trials}-DAY FREE TRIAL
                      </span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                        {!isFree && <Crown className="h-3.5 w-3.5 text-zinc-400" />}
                        {tier.name}
                      </h3>
                      {isPopular && !currentPlan && (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white">
                          Most popular
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-400 mb-4">{tier.description}</p>
                    <p className="text-3xl font-semibold text-white mb-1">
                      {isFree ? "Free" : formatPHP(tier.price)}
                      {tier.billing_period === "MONTH" && !isFree && (
                        <span className="text-sm font-normal text-zinc-500"> /mo</span>
                      )}
                    </p>

                    {/* Show trial info for eligible users */}
                    {isEligibleForTrial && (
                      <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                        <span>✦</span>
                        <span>Try free for {tier.days_of_trials} days, then {formatPHP(tier.price)}/mo</span>
                      </p>
                    )}

                    <div className="h-px bg-zinc-800 my-5" />
                    <ul className="space-y-2.5 mb-6">
                      {tier.features && tier.features.length > 0 ? (
                        tier.features.map((feature) => (
                          <li key={feature.feature_id} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span className="text-zinc-300">
                              {feature.description}{" "}
                              <span className="font-semibold text-white/90 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
                                {feature.value}
                              </span>
                            </span>
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-zinc-500">No features available</li>
                      )}
                    </ul>
                  </div>

                  <button
                    onClick={() => handleMembershipCheckout(tier)}
                    disabled={isDisabled}
                    className={`w-full rounded-md py-2.5 text-sm font-medium transition-colors ${
                      isDisabled
                        ? "border border-zinc-800 text-zinc-500 cursor-default bg-zinc-800/20"
                        : isPopular
                        ? "bg-white text-zinc-950 hover:bg-zinc-200"
                        : "border border-zinc-700 text-white hover:bg-zinc-800"
                    }`}
                  >
                    {buttonText}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer note */}
        <p className="mt-10 text-center text-xs text-zinc-600">
          Payments are processed securely by Xendit. Prices shown in Philippine pesos (PHP).
        </p>
      </div>
    </div>
  );
};

export default CreditShop;