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
  const [hasXenditPlan, setHasXenditPlan] = useState(false);
  const [isOnFreePlan, setIsOnFreePlan] = useState(true); // Track if user is on free plan

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
          
          // Check if user has xendit_plan_id
          const hasValidPlan = sub.xendit_plan_id !== null && sub.xendit_plan_id !== "";
          setHasXenditPlan(hasValidPlan);
          
          // Check if user is on free plan
          const isFreePlan = sub.plan_id === "75e5c586-eab8-4954-ac14-9874d5429b68";
          setIsOnFreePlan(isFreePlan);
          
          // Check status case-insensitively
          const status = sub.status?.toUpperCase() || "";
          const isActiveOrTrialing = status === "ACTIVE" || status === "TRIALING" || status === "TRIAL";
          
          // User is subscribed if they have a valid plan and status is active/trialing
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

  // Helper function to calculate remaining days
  const calculateRemainingDays = (subscription: SubscriptionData): number => {
    if (!subscription || !subscription.current_period_end) return 0;
    
    const now = new Date();
    const periodEnd = new Date(subscription.current_period_end);
    const remainingMs = periodEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
  };

  // Helper function to calculate prorated amount
  const calculateProratedAmount = (upgradePrice: number, currentPlanPrice: number, subscription: SubscriptionData): number => {
    if (!subscription || !subscription.current_period_start || !subscription.current_period_end) {
      console.log("No subscription period data, using full price");
      return upgradePrice;
    }

    const now = new Date();
    const periodStart = new Date(subscription.current_period_start);
    const periodEnd = new Date(subscription.current_period_end);
    
    const totalPeriod = periodEnd.getTime() - periodStart.getTime();
    const elapsedTime = now.getTime() - periodStart.getTime();
    const remainingPercent = Math.max(0, Math.min(1, 1 - (elapsedTime / totalPeriod)));
    
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
    
    // User is eligible for trial ONLY if they have NO xendit_plan_id AND on free plan
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
    
    // ONLY apply upgrade/downgrade logic if user:
    // 1. Has xendit_plan_id AND
    // 2. Is NOT on free plan
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
          priceDifference: membership.price - currentPlan.price
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
    const current = memberships.find(m => m.plan_id === userSubscription.plan_id) || null;
    console.log(`Current plan found:`, current?.name || 'None');
    return current;
  };

  // Determine button text and state for membership
  const getMembershipButtonState = (tier: Membership) => {
    const isFree = tier.price === 0;
    const currentPlan = isCurrentPlan(tier.plan_id);
    const hasFreeTrial = tier.days_of_trials > 0;
    
    // User is eligible for trial ONLY if:
    // 1. Has NO xendit_plan_id AND
    // 2. Is on free plan
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
        isCurrent: true
      };
    }
    
    if (isFree) {
      console.log(`This is the free plan`);
      return {
        buttonText: "Free",
        isDisabled: true,
        isUpgrade: false,
        isDowngrade: false,
        proratedPrice: null,
        isCurrent: false
      };
    }
    
    // ONLY apply upgrade/downgrade logic if user:
    // 1. Has xendit_plan_id AND
    // 2. Is NOT on free plan
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
            isCurrent: false
          };
        } 
        else if (tier.price < currentPlanDetails.price) {
          console.log(`⬇️ DOWNGRADE to ${tier.name}`);
          return {
            buttonText: `Downgrade to ${tier.name}`,
            isDisabled: false,
            isUpgrade: false,
            isDowngrade: true,
            proratedPrice: null,
            isCurrent: false
          };
        }
      }
    }
    
    // User is on free plan - show subscribe or trial
    if (isEligibleForTrial) {
      console.log(`🎯 Free trial available: ${tier.days_of_trials} days`);
      return {
        buttonText: `Start Free Trial (${tier.days_of_trials} days)`,
        isDisabled: false,
        isUpgrade: false,
        isDowngrade: false,
        proratedPrice: null,
        isCurrent: false
      };
    }
    
    console.log(`📝 Default Subscribe button`);
    return {
      buttonText: "Subscribe",
      isDisabled: false,
      isUpgrade: false,
      isDowngrade: false,
      proratedPrice: null,
      isCurrent: false
    };
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
              const currentPlan = isCurrentPlan(tier.plan_id);
              
              const { buttonText, isDisabled, isUpgrade, isDowngrade, proratedPrice, isCurrent } = getMembershipButtonState(tier);
              
              // User eligible for trial ONLY if:
              // 1. Has NO xendit_plan_id AND
              // 2. Is on free plan
              const isEligibleForTrial = !hasXenditPlan && isOnFreePlan && tier.days_of_trials > 0 && !isFree;
              const showTrialBadge = isEligibleForTrial;
              const currentPlanDetails = getCurrentPlan();

              return (
                <div
                  key={tier.plan_id}
                  className={`flex flex-col justify-between rounded-lg border p-6 relative ${
                    isCurrent
                      ? "border-emerald-500/40 bg-zinc-900/30"
                      : isPopular && !isCurrent
                      ? "border-white/40 bg-zinc-900/50"
                      : "border-zinc-800 bg-zinc-900/30"
                  }`}
                >
                  {/* Badges */}
                  {isCurrent && (
                    <div className="absolute -top-2.5 left-4">
                      <span className="bg-emerald-500 text-white text-[10px] font-medium px-3 py-0.5 rounded-full">
                        CURRENT PLAN
                      </span>
                    </div>
                  )}

                  {/* ONLY show upgrade/downgrade badges if user has xendit_plan_id AND is NOT on free plan */}
                  {isUpgrade && !isCurrent && hasXenditPlan && !isOnFreePlan && (
                    <div className="absolute -top-2.5 left-4">
                      <span className="bg-blue-500 text-white text-[10px] font-medium px-3 py-0.5 rounded-full">
                        UPGRADE
                      </span>
                    </div>
                  )}

                  {isDowngrade && !isCurrent && hasXenditPlan && !isOnFreePlan && (
                    <div className="absolute -top-2.5 left-4">
                      <span className="bg-amber-500 text-white text-[10px] font-medium px-3 py-0.5 rounded-full">
                        DOWNGRADE
                      </span>
                    </div>
                  )}

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
                      {isPopular && !isCurrent && (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white">
                          Most popular
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-400 mb-4">{tier.description}</p>
                    
                    <p className="text-3xl font-semibold text-white mb-1">
                      {isFree ? "Free" : (
                        <>
                          {/* ONLY show prorated pricing if user has xendit_plan_id AND is NOT on free plan */}
                          {isUpgrade && proratedPrice !== null && proratedPrice > 0 && hasXenditPlan && !isOnFreePlan && (
                            <>
                              <span className="line-through text-zinc-500 text-xl mr-2">{formatPHP(tier.price)}</span>
                              <span className="text-emerald-400">{formatPHP(proratedPrice)}</span>
                              <span className="text-sm font-normal text-emerald-400 ml-1">(prorated)</span>
                            </>
                          )}
                          {isUpgrade && proratedPrice !== null && proratedPrice === 0 && hasXenditPlan && !isOnFreePlan && (
                            <>
                              <span className="line-through text-zinc-500 text-xl mr-2">{formatPHP(tier.price)}</span>
                              <span className="text-emerald-400">Free</span>
                              <span className="text-sm font-normal text-emerald-400 ml-1">(prorated)</span>
                            </>
                          )}
                          {(!isUpgrade || proratedPrice === null || !hasXenditPlan || isOnFreePlan) && (
                            formatPHP(tier.price)
                          )}
                        </>
                      )}
                      {tier.billing_period === "MONTH" && !isFree && (
                        <span className="text-sm font-normal text-zinc-500"> /mo</span>
                      )}
                    </p>

                    {/* ONLY show prorated explanation if user has xendit_plan_id AND is NOT on free plan */}
                    {isUpgrade && proratedPrice !== null && !isCurrent && isUserSubscribed && hasXenditPlan && !isOnFreePlan && currentPlanDetails && (
                      <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                        <span>⏱️</span>
                        <span>
                          Prorated charge of {formatPHP(proratedPrice)} (based on remaining period of your {currentPlanDetails.name} plan)
                        </span>
                      </p>
                    )}

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
                        : isUpgrade && hasXenditPlan && !isOnFreePlan
                        ? "bg-emerald-500 text-white hover:bg-emerald-600"
                        : isDowngrade && hasXenditPlan && !isOnFreePlan
                        ? "bg-amber-500 text-white hover:bg-amber-600"
                        : isPopular
                        ? "bg-white text-zinc-950 hover:bg-zinc-200"
                        : "border border-zinc-700 text-white hover:bg-zinc-800"
                    }`}
                  >
                    {buttonText}
                    {isUpgrade && !isDisabled && hasXenditPlan && !isOnFreePlan && (
                      <span className="ml-2 text-xs opacity-80">↑</span>
                    )}
                    {isDowngrade && !isDisabled && hasXenditPlan && !isOnFreePlan && (
                      <span className="ml-2 text-xs opacity-80">↓</span>
                    )}
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