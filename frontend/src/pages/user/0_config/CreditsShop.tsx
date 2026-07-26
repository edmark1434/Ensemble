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
import { useNavigate, useLocation } from "react-router-dom";
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
  proratedDetails?: {
    originalPrice: number;
    currentPlanPrice: number;
    proratedAmount: number;
    remainingDays: number;
    priceDifference: number;
  };
  isUpgrade?: boolean;
  isDowngrade?: boolean;
  currentPlanPrice?: number;
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
  const location = useLocation();
  const userCurrentCredits = 1250;

  const [loading, setLoading] = useState(true);

  // Tab state synced with URL pathname
  const [activeTab, setActiveTab] = useState<"topup" | "membership">(
    location.pathname.includes("/credits-subscriptions") ? "membership" : "topup"
  );

  const [showCustom, setShowCustom] = useState(false);
  const [customCredits, setCustomCredits] = useState<number>(100);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [currentBalance, setCurrentBalance] = useState<number>(0);

  // Track user's current subscription
  const [userSubscription, setUserSubscription] = useState<SubscriptionData | null>(null);
  const [isUserSubscribed, setIsUserSubscribed] = useState(false);
  const [hasXenditPlan, setHasXenditPlan] = useState(false);
  const [isOnFreePlan, setIsOnFreePlan] = useState(true);

  // Sync tab state when URL route changes
  useEffect(() => {
    if (location.pathname.includes("/credits-subscriptions")) {
      setActiveTab("membership");
    } else {
      setActiveTab("topup");
    }
  }, [location.pathname]);

  const handleTabChange = (tab: "topup" | "membership") => {
    setActiveTab(tab);
    if (tab === "membership") {
      navigate("/credits-subscriptions");
    } else {
      navigate("/credits");
    }
  };

  useEffect(() => {
    const fetchMemberships = async () => {
      try {
        const [planResponse, userSubscriptionResponse, getWalletResponse] = await Promise.all([
          api.get("api/subscription/plans"),
          api.get("api/subscription"),
          api.get("/api/accounts/wallet", {
            params: { type: "account_wallets" },
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

          const hasValidPlan = sub.xendit_plan_id !== null && sub.xendit_plan_id !== "";
          setHasXenditPlan(hasValidPlan);

          const isFreePlan = sub.plan_id === "75e5c586-eab8-4954-ac14-9874d5429b68";
          setIsOnFreePlan(isFreePlan);

          const status = sub.status?.toUpperCase() || "";
          const isActiveOrTrialing = status === "ACTIVE" || status === "TRIALING" || status === "TRIAL";

          const subscribed = hasValidPlan && isActiveOrTrialing;

          setIsUserSubscribed(subscribed);
          console.log(`===== SUBSCRIPTION STATUS =====`);
          console.log(`Plan ID: ${sub.plan_id}`);
          console.log(`Has xendit_plan_id: ${hasValidPlan}`);
          console.log(`Is free plan: ${isFreePlan}`);
          console.log(`Status: ${sub.status}`);
          console.log(`Is active or trialing: ${isActiveOrTrialing}`);
          console.log(`User has real subscription: ${subscribed}`);
          console.log(`Has xendit_plan_id: ${hasValidPlan}`);
          console.log(`Is on free plan: ${isFreePlan}`);
          console.log(`===============================`);
        } else {
          setUserSubscription(null);
          setIsUserSubscribed(false);
          setHasXenditPlan(false);
          setIsOnFreePlan(true);
          console.log("User has NO subscription");
        }

        setMemberships(plansData);
      } catch (error) {
        console.error("Error fetching memberships:", error);
        setMemberships([]);
        setUserSubscription(null);
        setIsUserSubscribed(false);
        setHasXenditPlan(false);
        setIsOnFreePlan(true);
      } finally {
        setLoading(false);
      }
    };
    fetchMemberships();
  }, []);

  const calculateRemainingDays = (subscription: SubscriptionData): number => {
    if (!subscription || !subscription.current_period_end) return 0;
    const now = new Date();
    const periodEnd = new Date(subscription.current_period_end);
    const remainingMs = periodEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
  };

  const calculateProratedAmount = (
    upgradePrice: number,
    currentPlanPrice: number,
    subscription: SubscriptionData
  ): number => {
    if (!subscription || !subscription.current_period_start || !subscription.current_period_end) {
      console.log("No subscription period data, using full price");
      return upgradePrice;
    }

    const now = new Date();
    const periodStart = new Date(subscription.current_period_start);
    const periodEnd = new Date(subscription.current_period_end);

    const totalPeriod = periodEnd.getTime() - periodStart.getTime();
    const elapsedTime = now.getTime() - periodStart.getTime();
    const remainingPercent = Math.max(0, Math.min(1, 1 - elapsedTime / totalPeriod));

    const priceDifference = upgradePrice - currentPlanPrice;
    const proratedAmount = priceDifference * remainingPercent;

    console.log(`Prorated calculation:
      - Remaining percent: ${remainingPercent}
      - Price difference: ${priceDifference}
      - Prorated amount: ${proratedAmount}
    `);

    return Math.round(proratedAmount * 100) / 100;
  };

  const navigateToCheckout = (item: CheckoutItem) => {
    if (item.isUpgrade && item.proratedDetails) {
      console.log(`💳 Prorated upgrade checkout: ${item.name}`);
      console.log(`   Original price: ₱${item.proratedDetails.originalPrice}`);
      console.log(`   Current plan: ₱${item.proratedDetails.currentPlanPrice}`);
      console.log(`   Prorated amount: ₱${item.proratedDetails.proratedAmount}`);
      console.log(`   Remaining days: ${item.proratedDetails.remainingDays}`);
    }

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

    const isEligibleForTrial = !hasXenditPlan && isOnFreePlan && membership.days_of_trials > 0;
    const currentPlan = getCurrentPlan();

    let finalPrice = membership.price;
    let isUpgrade = false;
    let isDowngrade = false;
    let proratedDetails = null;

    console.log(`\n===== CHECKOUT: ${membership.name} =====`);
    console.log(`isUserSubscribed: ${isUserSubscribed}`);
    console.log(`hasXenditPlan: ${hasXenditPlan}`);
    console.log(`isOnFreePlan: ${isOnFreePlan}`);
    console.log(`Current plan:`, currentPlan);

    if (isUserSubscribed && hasXenditPlan && !isOnFreePlan && currentPlan && userSubscription) {
      if (membership.price > currentPlan.price) {
        isUpgrade = true;
        const proratedAmount = calculateProratedAmount(
          membership.price,
          currentPlan.price,
          userSubscription
        );
        finalPrice = Math.max(0, proratedAmount);

        proratedDetails = {
          originalPrice: membership.price,
          currentPlanPrice: currentPlan.price,
          proratedAmount: proratedAmount,
          remainingDays: calculateRemainingDays(userSubscription),
          priceDifference: membership.price - currentPlan.price,
        };

        console.log(`✅ UPGRADE! Prorated: ₱${proratedAmount}`);
      } else if (membership.price < currentPlan.price) {
        isDowngrade = true;
        finalPrice = membership.price;
        console.log(`⬇️ DOWNGRADE! New price: ₱${membership.price}`);
      }
    } else {
      console.log(`User is on free plan or no xendit_plan_id - using full price`);
    }

    navigateToCheckout({
      id: membership.plan_id,
      name: membership.name,
      type: "subscription",
      price: formatPHP(finalPrice),
      priceValue: finalPrice,
      features: membership.features || [],
      trialDays: membership.days_of_trials || 0,
      isUserEligibleForTrial: isEligibleForTrial,
      proratedDetails: proratedDetails,
      isUpgrade: isUpgrade,
      isDowngrade: isDowngrade,
      currentPlanPrice: currentPlan?.price || 0,
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

  const getCurrentPlan = (): Membership | null => {
    if (!userSubscription) return null;
    const current = memberships.find((m) => m.plan_id === userSubscription.plan_id) || null;
    console.log(`Current plan found:`, current?.name || "None");
    return current;
  };

  const getMembershipButtonState = (tier: Membership) => {
    const isFree = tier.price === 0;
    const currentPlan = isCurrentPlan(tier.plan_id);
    const hasFreeTrial = tier.days_of_trials > 0;

    const isEligibleForTrial = !hasXenditPlan && isOnFreePlan && hasFreeTrial && !isFree;

    console.log(`\n===== BUTTON STATE: ${tier.name} =====`);
    console.log(`isUserSubscribed: ${isUserSubscribed}`);
    console.log(`hasXenditPlan: ${hasXenditPlan}`);
    console.log(`isOnFreePlan: ${isOnFreePlan}`);
    console.log(`isCurrentPlan: ${currentPlan}`);
    console.log(`tier price: ${tier.price}`);
    console.log(`isEligibleForTrial: ${isEligibleForTrial}`);

    if (currentPlan) {
      console.log(`This is the current plan`);
      return {
        buttonText: "Current Plan",
        isDisabled: true,
        isUpgrade: false,
        isDowngrade: false,
        proratedPrice: null,
        isCurrent: true,
      };
    }

    if (isFree) {
      console.log(`This is the free plan`);
      return {
        buttonText: "Free Tier",
        isDisabled: true,
        isUpgrade: false,
        isDowngrade: false,
        proratedPrice: null,
        isCurrent: false,
      };
    }

    if (isUserSubscribed && hasXenditPlan && !isOnFreePlan) {
      const currentPlanDetails = getCurrentPlan();
      console.log(`currentPlanDetails:`, currentPlanDetails);

      if (currentPlanDetails) {
        console.log(`Comparing: ${tier.price} vs ${currentPlanDetails.price}`);

        if (tier.price > currentPlanDetails.price) {
          const proratedPrice = calculateProratedAmount(
            tier.price,
            currentPlanDetails.price,
            userSubscription!
          );
          console.log(`✅ UPGRADE to ${tier.name}! Prorated: ${proratedPrice}`);
          return {
            buttonText: `Upgrade to ${tier.name}`,
            isDisabled: false,
            isUpgrade: true,
            isDowngrade: false,
            proratedPrice: proratedPrice,
            isCurrent: false,
          };
        } else if (tier.price < currentPlanDetails.price) {
          console.log(`⬇️ DOWNGRADE to ${tier.name}`);
          return {
            buttonText: `Downgrade to ${tier.name}`,
            isDisabled: false,
            isUpgrade: false,
            isDowngrade: true,
            proratedPrice: null,
            isCurrent: false,
          };
        }
      }
    }

    if (isEligibleForTrial) {
      console.log(`🎯 Free trial available: ${tier.days_of_trials} days`);
      return {
        buttonText: `Start Free Trial (${tier.days_of_trials} days)`,
        isDisabled: false,
        isUpgrade: false,
        isDowngrade: false,
        proratedPrice: null,
        isCurrent: false,
      };
    }

    console.log(`📝 Default Subscribe button`);
    return {
      buttonText: "Subscribe Plan",
      isDisabled: false,
      isUpgrade: false,
      isDowngrade: false,
      proratedPrice: null,
      isCurrent: false,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080a12] text-zinc-300 font-['Plus_Jakarta_Sans',sans-serif]">
        <UserHeader pageTitle="Credit Shop" credits={userCurrentCredits} />
        <div className="mx-auto max-w-6xl px-6 py-24 flex items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080a12] text-zinc-200 font-['Plus_Jakarta_Sans',sans-serif] selection:bg-blue-500/30">
      <UserHeader pageTitle="Credit Shop" credits={userCurrentCredits} />

      <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Billing & Credits</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Top up your credit balance or upgrade your account membership subscription.
          </p>
        </div>

        {/* Current Balance Card - Ensemble Glassmorphic Styled */}
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-gradient-to-r from-blue-900/20 via-[#0d0f1a] to-[#0d0f1a] p-5 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Current Balance</p>
              <p className="text-xl font-bold text-white">
                {currentBalance.toLocaleString()}{" "}
                <span className="text-xs font-normal text-zinc-400">Credits</span>
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400 bg-white/5 border border-white/5 px-3 py-1.5 rounded-xl">
            <Shield className="h-3.5 w-3.5 text-blue-400" />
            <span>Encrypted checkout via Xendit</span>
          </div>
        </div>

        {/* Tabs - Ensemble Theme */}
        <div className="border-b border-white/10">
          <nav className="flex gap-8" aria-label="Tabs">
            <button
              onClick={() => handleTabChange("topup")}
              className={`relative pb-3 text-sm font-semibold transition-all ${
                activeTab === "topup" ? "text-blue-400" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Top up Credits
              {activeTab === "topup" && (
                <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              )}
            </button>
            <button
              onClick={() => handleTabChange("membership")}
              className={`relative pb-3 text-sm font-semibold transition-all ${
                activeTab === "membership" ? "text-blue-400" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Subscription Plans
              {activeTab === "membership" && (
                <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              )}
            </button>
          </nav>
        </div>

        {/* TOP UP SECTION */}
        {activeTab === "topup" && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {creditPacks.map((pack) => {
                const isBestValue = pack.id === "vault";
                return (
                  <div
                    key={pack.id}
                    className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0d0f1a] p-5 shadow-xl hover:border-blue-500/30 transition-all duration-300 group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-white">{pack.name}</h3>
                        {isBestValue && (
                          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                            Best Value
                          </span>
                        )}
                      </div>
                      <p className="text-2xl font-extrabold text-white">
                        {pack.credits.toLocaleString()}
                        <span className="text-xs font-normal text-zinc-400 ml-1">Credits</span>
                      </p>
                      <p className="text-sm text-zinc-400 mt-1 font-medium">{formatPHP(pack.price)}</p>
                    </div>
                    <button
                      onClick={() => handlePackCheckout(pack)}
                      className="mt-6 w-full rounded-xl bg-blue-600 hover:bg-blue-500 py-2.5 text-xs font-bold text-white transition-all shadow-lg hover:shadow-blue-500/20"
                    >
                      Buy Pack
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Custom Amount Toggle */}
            <div className="rounded-2xl border border-white/10 bg-[#0d0f1a] overflow-hidden shadow-xl">
              <button
                onClick={() => setShowCustom(!showCustom)}
                className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-white">Enter a Custom Credit Amount</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {formatPHP(CREDIT_RATE)} per credit • Minimum 10 credits
                  </p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-zinc-400 transition-transform duration-300 ${
                    showCustom ? "rotate-180 text-blue-400" : ""
                  }`}
                />
              </button>

              {showCustom && (
                <div className="border-t border-white/5 px-6 py-6 space-y-4">
                  <label className="text-xs font-medium text-zinc-400 block">
                    Number of Credits
                  </label>
                  <div className="flex items-center gap-2 max-w-xs">
                    <button
                      onClick={decrementCredits}
                      aria-label="Decrease amount"
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      value={customCredits}
                      onChange={handleCustomInputChange}
                      min={10}
                      max={10000}
                      className="h-10 flex-1 rounded-xl border border-white/10 bg-white/5 text-center text-sm font-bold text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <button
                      onClick={incrementCredits}
                      aria-label="Increase amount"
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {[50, 100, 250, 500, 1000].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setCustomCredits(amount)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-medium border transition-all ${
                          customCredits === amount
                            ? "border-blue-500/50 bg-blue-500/20 text-blue-300"
                            : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {amount}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/5 px-4 py-3">
                    <span className="text-xs text-zinc-400">Total Due</span>
                    <span className="text-base font-bold text-white">
                      {formatPHP(Math.round(customCredits * CREDIT_RATE * 100) / 100)}
                    </span>
                  </div>

                  <button
                    onClick={handleCustomCheckout}
                    disabled={customCredits < 10}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 py-2.5 text-xs font-bold text-white transition-all shadow-lg hover:shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Continue to Checkout
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MEMBERSHIP SECTION */}
        {activeTab === "membership" && (
          <div className="grid gap-6 md:grid-cols-3 items-stretch">
            {memberships.map((tier) => {
              const isFree = tier.price === 0;
              const isPopular = tier.name === "Premium";
              const currentPlan = isCurrentPlan(tier.plan_id);

              const { buttonText, isDisabled, isUpgrade, isDowngrade, proratedPrice, isCurrent } =
                getMembershipButtonState(tier);
              const isEligibleForTrial = !hasXenditPlan && isOnFreePlan && tier.days_of_trials > 0 && !isFree;
              const showTrialBadge = isEligibleForTrial;
              const currentPlanDetails = getCurrentPlan();

              return (
                <div
                  key={tier.plan_id}
                  className={`flex flex-col justify-between rounded-2xl border p-6 relative transition-all duration-300 ${
                    isCurrent
                      ? "border-emerald-500/60 bg-[#0d131f] shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                      : isPopular && !isCurrent
                      ? "border-blue-500/40 bg-[#0d0f1a] shadow-xl"
                      : "border-white/10 bg-[#0d0f1a] hover:border-white/20"
                  }`}
                >
                  {/* Badges */}
                  {isCurrent && (
                    <div className="absolute -top-3 left-4 bg-emerald-500 text-[#080a12] text-[10px] font-extrabold tracking-wider uppercase px-3 py-0.5 rounded-full shadow-md">
                      Current Plan
                    </div>
                  )}

                  {isUpgrade && !isCurrent && hasXenditPlan && !isOnFreePlan && (
                    <div className="absolute -top-3 left-4 bg-blue-600 text-white text-[10px] font-extrabold tracking-wider uppercase px-3 py-0.5 rounded-full shadow-md">
                      Upgrade
                    </div>
                  )}

                  {isDowngrade && !isCurrent && hasXenditPlan && !isOnFreePlan && (
                    <div className="absolute -top-3 left-4 bg-amber-500 text-[#080a12] text-[10px] font-extrabold tracking-wider uppercase px-3 py-0.5 rounded-full shadow-md">
                      Downgrade
                    </div>
                  )}

                  {showTrialBadge && (
                    <div className="absolute -top-3 left-4 bg-blue-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow-md">
                      {tier.days_of_trials}-Day Free Trial
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        {!isFree && <Crown className="h-4 w-4 text-amber-400" />}
                        {tier.name}
                      </h3>
                      {isPopular && !isCurrent && (
                        <span className="rounded-full bg-white/10 border border-white/10 px-2.5 py-0.5 text-[10px] font-medium text-white">
                          Most popular
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 mb-5">{tier.description}</p>

                    <div className="text-3xl font-extrabold text-white mb-2">
                      {isFree ? (
                        "Free"
                      ) : (
                        <>
                          {isUpgrade && proratedPrice !== null && proratedPrice > 0 && hasXenditPlan && !isOnFreePlan && (
                            <>
                              <span className="line-through text-zinc-500 text-xl mr-2">{formatPHP(tier.price)}</span>
                              <span className="text-emerald-400">{formatPHP(proratedPrice)}</span>
                              <span className="text-xs font-normal text-emerald-400 ml-1">(prorated)</span>
                            </>
                          )}
                          {isUpgrade && proratedPrice !== null && proratedPrice === 0 && hasXenditPlan && !isOnFreePlan && (
                            <>
                              <span className="line-through text-zinc-500 text-xl mr-2">{formatPHP(tier.price)}</span>
                              <span className="text-emerald-400">Free</span>
                              <span className="text-xs font-normal text-emerald-400 ml-1">(prorated)</span>
                            </>
                          )}
                          {(!isUpgrade || proratedPrice === null || !hasXenditPlan || isOnFreePlan) &&
                            formatPHP(tier.price)}
                        </>
                      )}
                      {tier.billing_period === "MONTH" && !isFree && (
                        <span className="text-xs font-normal text-zinc-400"> /mo</span>
                      )}
                    </div>

                    {isUpgrade &&
                      proratedPrice !== null &&
                      !isCurrent &&
                      isUserSubscribed &&
                      hasXenditPlan &&
                      !isOnFreePlan &&
                      currentPlanDetails && (
                        <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1.5">
                          <span>⏱️</span>
                          <span>
                            Prorated charge of {formatPHP(proratedPrice)} (based on remaining period of {currentPlanDetails.name} plan)
                          </span>
                        </p>
                      )}

                    {isEligibleForTrial && (
                      <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1.5">
                        <span>✦</span>
                        <span>Try free for {tier.days_of_trials} days, then {formatPHP(tier.price)}/mo</span>
                      </p>
                    )}

                    <div className="h-px bg-white/10 my-6" />

                    <ul className="space-y-3 mb-8">
                      {tier.features && tier.features.length > 0 ? (
                        tier.features.map((feature) => (
                          <li key={feature.feature_id} className="flex items-start gap-2 text-xs">
                            <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                            <span className="text-zinc-300">
                              {feature.description}{" "}
                              <span className="font-semibold text-white bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[11px] ml-1 inline-block">
                                {feature.value}
                              </span>
                            </span>
                          </li>
                        ))
                      ) : (
                        <li className="text-xs text-zinc-500">No features available</li>
                      )}
                    </ul>
                  </div>

                  <button
                    onClick={() => handleMembershipCheckout(tier)}
                    disabled={isDisabled}
                    className={`w-full rounded-xl py-2.5 text-xs font-bold transition-all shadow-md ${
                      isDisabled
                        ? "border border-white/10 bg-white/5 text-zinc-500 cursor-not-allowed"
                        : isUpgrade && hasXenditPlan && !isOnFreePlan
                        ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20"
                        : isDowngrade && hasXenditPlan && !isOnFreePlan
                        ? "bg-amber-500 text-black hover:bg-amber-400 shadow-amber-500/20"
                        : isPopular
                        ? "bg-white text-black hover:bg-zinc-200"
                        : "bg-white/10 border border-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    {buttonText}
                    {isUpgrade && !isDisabled && hasXenditPlan && !isOnFreePlan && (
                      <span className="ml-1.5 text-xs">↑</span>
                    )}
                    {isDowngrade && !isDisabled && hasXenditPlan && !isOnFreePlan && (
                      <span className="ml-1.5 text-xs">↓</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Note */}
        <p className="mt-10 text-center text-xs text-zinc-500">
          Payments are processed securely via Xendit. Prices shown in Philippine Pesos (PHP).
        </p>
      </div>
    </div>
  );
};

export default CreditShop;