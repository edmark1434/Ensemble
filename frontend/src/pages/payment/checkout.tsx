// CheckoutPage.tsx - Modern Order Summary Layout (Light & Dark Mode)
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  AlertCircle,
  Loader2,
  Wallet,
  Crown,
  Coins,
  Gift,
  Gem,
  Shield,
  ArrowRight,
  X,
  Receipt,
  Sparkles,
  CreditCard,
  Plus,
  Lock,
  Smartphone,
  ExternalLink,
  CheckCircle2,
  Clock,
} from "lucide-react";
import UserHeader from "@/components/nav/user_header";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import ShapeGrid from "@/components/ui/ShapeGrid";
import useGlobalState from "@/lib/global_state";
import { CreditIcon } from "@/components/ui/credit-icon";

// Interfaces
interface Feature {
  feature_id: number | string;
  feature_key: string;
  name: string;
  description: string;
  value: string;
}

interface ProratedDetails {
  originalPrice: number;
  currentPlanPrice: number;
  proratedAmount: number;
  remainingDays: number;
  priceDifference: number;
}

interface CheckoutItem {
  id: string;
  name: string;
  type: "topup" | "subscription" | "custom";
  credits?: number;
  price: string;
  priceValue: number;
  icon?: React.ReactNode;
  features?: Feature[];
  planName?: string;
  originalPrice?: string;
  trialDays?: number;
  isUserEligibleForTrial?: boolean;
  savings?: string;
  isCustom?: boolean;
  isUpgrade?: boolean;
  isDowngrade?: boolean;
  currentPlanPrice?: number;
  proratedDetails?: ProratedDetails | null;
}

interface PaymentMethod {
  payment_token_id: string;
  channel_code: string;
  type: string;
  status: string;
  is_default: boolean;
  display_name: string;
  card_brand: string | null;
  masked_card_number: string | null;
  card_exp_month: string | null;
  card_exp_year: string | null;
  customer_reference_id: string;
}

type PaymentOption = "checkout" | "saved_payment";

const formatPHP = (value: number) =>
  `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const getSubscriptionIconPath = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes("premium") || lower.includes("pro")) {
    return "/icons/subscription/premium.png";
  }
  if (lower.includes("business") || lower.includes("studio") || lower.includes("enterprise")) {
    return "/icons/subscription/studio.png";
  }
  return "/icons/subscription/freemium.png";
};

const CheckoutPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useGlobalState((state) => state.theme);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [checkoutItem, setCheckoutItem] = useState<CheckoutItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [selectedPaymentOption, setSelectedPaymentOption] = useState<PaymentOption>("checkout");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const state = location.state as { item: CheckoutItem } | null;
    if (state?.item) {
      setCheckoutItem(state.item);
      try {
        sessionStorage.setItem("ensemble_checkout_item", JSON.stringify(state.item));
      } catch (e) {
        console.warn("Failed to store checkout item in sessionStorage", e);
      }
    } else {
      const stored = sessionStorage.getItem("ensemble_checkout_item");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setCheckoutItem(parsed);
        } catch (e) {
          navigate("/credits");
        }
      } else {
        navigate("/credits");
      }
    }
  }, [location, navigate]);

  const fetchPaymentMethods = async (autoSelectLatest = false) => {
    setLoadingPaymentMethods(true);
    try {
      const response = await api.get("api/payment/payment-methods");
      console.log("📥 Fetched Payment Methods:", response.data);
      const methods: PaymentMethod[] = response.data.paymentMethods || [];
      setPaymentMethods(methods);
      if (methods.length > 0) {
        if (autoSelectLatest) {
          setSelectedPaymentMethod(methods[methods.length - 1].payment_token_id);
          setSelectedPaymentOption("saved_payment");
        } else if (!selectedPaymentMethod) {
          const defaultMethod = methods.find((m) => m.is_default) || methods[0];
          setSelectedPaymentMethod(defaultMethod.payment_token_id);
        }
      }
    } catch (error) {
      console.error("Error fetching payment methods:", error);
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const saveStatus = searchParams.get("save_payment");
    if (saveStatus === "success") {
      toast.success("Payment method added successfully!");
      setSelectedPaymentOption("saved_payment");
      fetchPaymentMethods(true);
      navigate(location.pathname, { replace: true, state: location.state });
    } else if (saveStatus === "cancel") {
      toast.error("Adding payment method was cancelled.");
      fetchPaymentMethods(false);
      navigate(location.pathname, { replace: true, state: location.state });
    } else {
      fetchPaymentMethods(false);
    }
  }, [location.search]);

  const handleAddPaymentMethod = async () => {
    setShowAddPayment(true);
    try {
      const returnUrl = window.location.origin + "/credits/checkout?save_payment=success";
      const cancelUrl = window.location.origin + "/credits/checkout?save_payment=cancel";
      const result = await api.post("api/payment/create-payment-token", { returnUrl, cancelUrl });
      if (result.data && result.status === 200 && result.data.paymentLink) {
        window.location.href = result.data.paymentLink;
      }
    } catch (err) {
      toast.error("Failed to add payment method. Please try again.");
    } finally {
      setShowAddPayment(false);
    }
  };

  const handlePayWithCheckout = async () => {
    if (!checkoutItem) return;

    console.log("🔵 [TOPUP] Paying with Checkout");
    console.log("📦 Item:", checkoutItem);

    setIsProcessing(true);
    setError(null);

    try {
      const payload = {
        amount: checkoutItem.priceValue,
        currency: "PHP",
        itemName: checkoutItem.name,
        itemType: checkoutItem.type,
        credits: checkoutItem.credits || 0,
      };

      console.log("📤 Checkout Payload:", payload);

      const response = await api.post("api/payment/topup", payload, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = response.data;
      console.log("✅ Checkout Response:", data);

      if (data.paymentLink) {
        window.location.href = data.paymentLink;
      } else if (data.reference_id) {
        setReferenceNumber(data.reference_id);
        sessionStorage.removeItem("ensemble_checkout_item");
        setIsSuccess(true);
      } else {
        setError("Payment initiation failed. Please try again.");
      }
    } catch (error: any) {
      console.error("❌ Checkout Payment Error:", error);
      setError(error.message || "Payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayWithSavedPayment = async () => {
    if (!checkoutItem) return;

    if (!selectedPaymentMethod) {
      setError("Please select a payment method");
      return;
    }

    console.log("💳 [TOPUP] Paying with Saved Payment Method");
    console.log("📦 Item:", checkoutItem);
    console.log("💳 Payment Method ID:", selectedPaymentMethod);

    setIsProcessing(true);
    setError(null);

    try {
      const payload = {
        amount: checkoutItem.priceValue,
        currency: "PHP",
        itemName: checkoutItem.name,
        itemType: checkoutItem.type,
        credits: checkoutItem.credits || 0,
        paymentMethodId: selectedPaymentMethod,
      };

      console.log("📤 Saved Payment Payload:", payload);

      const response = await api.post("api/payment/topup-by-payment-method", payload, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = response.data;
      console.log("✅ Saved Payment Response:", data);

      if (data.paymentLink) {
        window.location.href = data.paymentLink;
      } else if (data.reference_id) {
        setReferenceNumber(data.reference_id);
        sessionStorage.removeItem("ensemble_checkout_item");
        setIsSuccess(true);
      } else {
        setError("Payment initiation failed. Please try again.");
      }
    } catch (error: any) {
      console.error("❌ Saved Payment Error:", error);
      const errMsg =
        error.response?.data?.message ||
        (typeof error.response?.data?.error === "string"
          ? error.response.data.error
          : error.response?.data?.error?.message) ||
        error.message ||
        "Payment failed. Please try again.";
      setError(errMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubscribe = async () => {
    if (!checkoutItem) return;

    if (!selectedPaymentMethod) {
      setError("Please select a payment method");
      return;
    }

    console.log("🔄 [SUBSCRIPTION] Subscribing to plan");
    console.log("📦 Plan:", checkoutItem);
    console.log("💳 Payment Method ID:", selectedPaymentMethod);

    setIsProcessing(true);
    setError(null);

    try {
      const payload = {
        planId: checkoutItem.id,
        paymentMethodId: selectedPaymentMethod,
        amount: checkoutItem.priceValue,
      };

      console.log("📤 Subscription Payload:", payload);

      const response = await api.post("api/payment/subscription", payload, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = response.data;
      console.log("✅ Subscription Response:", data);
      if (response.status === 200 && data?.payment_link) {
        window.location.href = data.payment_link;
      } else if (
        response.status === 200 &&
        (data?.subscriptionUpdate?.reference_id || data.reference_id)
      ) {
        setReferenceNumber(data?.subscriptionUpdate?.reference_id || data.reference_id);
        setSuccessMessage(data?.message || "Subscription payment processed successfully");
        sessionStorage.removeItem("ensemble_checkout_item");
        setIsSuccess(true);
      } else {
        setError("Subscription initiation failed. Please try again.");
      }
    } catch (error: any) {
      console.error("❌ Subscription Error:", error);
      const errMsg =
        error.response?.data?.message ||
        (typeof error.response?.data?.error === "string"
          ? error.response.data.error
          : error.response?.data?.error?.message) ||
        error.message ||
        "Subscription failed. Please try again.";
      setError(errMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const getItemIcon = () => {
    if (!checkoutItem) return null;
    if (checkoutItem.type === "subscription") {
      return (
        <img
          src={getSubscriptionIconPath(checkoutItem.name)}
          alt={checkoutItem.name}
          className="h-7 w-7 object-contain"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      );
    }
    if (checkoutItem.type === "custom") {
      return <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />;
    }
    switch (checkoutItem.id) {
      case "pocket":
        return <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />;
      case "bundle":
        return <Coins className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />;
      case "box":
        return <Gift className="h-6 w-6 text-purple-600 dark:text-purple-400" />;
      case "vault":
        return <Gem className="h-6 w-6 text-amber-500 dark:text-yellow-400" />;
      default:
        return <CreditIcon className="h-6 w-6 text-yellow-500" />;
    }
  };

  const getItemIconContainerStyle = () => {
    if (!checkoutItem) return "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20";
    if (checkoutItem.type === "subscription") {
      return "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20";
    }
    switch (checkoutItem.id) {
      case "bundle":
        return "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20";
      case "box":
        return "bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20";
      case "vault":
        return "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20";
      default:
        return "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20";
    }
  };

  const getItemTypeLabel = () => {
    if (!checkoutItem) return "";
    if (checkoutItem.type === "custom") return "Custom Top-up";
    if (checkoutItem.type === "topup") return "Credit Pack";
    return "Subscription Plan";
  };

  const renderPaymentMethodIcon = (method: PaymentMethod) => {
    const isEwallet =
      method.type?.toLowerCase() === "ewallet" ||
      ["gcash", "paymaya", "maya", "grabpay"].includes(method.channel_code?.toLowerCase() || "");

    if (isEwallet) {
      return (
        <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center shrink-0">
          <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
      );
    }

    return (
      <div className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center shrink-0">
        <CreditCard className="h-5 w-5 text-gray-700 dark:text-zinc-300" />
      </div>
    );
  };

  const getMethodPrimaryLabel = (method: PaymentMethod) => {
    if (method.masked_card_number && method.card_brand) {
      return `${method.card_brand.toUpperCase()} •••• ${method.masked_card_number.slice(-4)}`;
    }
    if (method.masked_card_number) {
      return `Card •••• ${method.masked_card_number.slice(-4)}`;
    }
    return method.display_name || method.channel_code?.toUpperCase() || "Saved Payment Method";
  };

  const getMethodSecondaryLabel = (method: PaymentMethod) => {
    const parts: string[] = [];
    if (method.card_exp_month && method.card_exp_year) {
      parts.push(`Expires ${method.card_exp_month}/${method.card_exp_year}`);
    } else if (method.channel_code && method.display_name !== method.channel_code) {
      parts.push(method.channel_code.toUpperCase());
    } else if (method.type) {
      parts.push(method.type === "ewallet" ? "E-Wallet" : "Linked Account");
    }
    return parts.join(" • ");
  };

  const backRoute =
    checkoutItem?.type === "subscription" ? "/credits-subscriptions" : "/credits";

  if (!checkoutItem) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-base text-gray-700 dark:text-zinc-300 font-inter">
        <div className="sticky top-0 z-30 bg-white dark:bg-[#0a0a0a] border-b border-gray-200 dark:border-white/10 shadow-sm">
          <UserHeader pageTitle="Checkout" />
        </div>
        <div className="mx-auto max-w-5xl px-6 py-24 flex flex-col items-center justify-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-500" />
          <p className="text-xs text-gray-500 dark:text-zinc-400">Loading checkout details...</p>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="relative min-h-screen bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-zinc-200 font-inter selection:bg-blue-500/30 transition-colors duration-300 flex flex-col">
        <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
          <ShapeGrid
            shape="square"
            squareSize={48}
            direction="diagonal"
            speed={0.4}
            borderColor={theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.06)"}
            hoverFillColor={theme === "dark" ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)"}
            hoverTrailAmount={3}
          />
        </div>

        <div className="sticky top-0 z-30 bg-white dark:bg-[#0a0a0a] border-b border-gray-200 dark:border-white/10 shadow-sm">
          <UserHeader pageTitle="Checkout" />
        </div>

        <div className="relative z-10 flex-1 flex items-center justify-center p-6">
          <div className="bg-white dark:bg-dark-surface/90 border border-gray-200 dark:border-white/10 rounded-2xl p-8 max-w-md w-full text-center shadow-lg dark:shadow-2xl backdrop-blur-xl">
            <div className="h-16 w-16 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">
              Payment Initiated!
            </h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">
              {checkoutItem.type === "topup" || checkoutItem.type === "custom"
                ? `+${checkoutItem.credits?.toLocaleString()} credits will be added to your wallet.`
                : successMessage || `Your account membership is being updated to ${checkoutItem.name}.`}
            </p>

            <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-xl p-4 mb-6 text-left space-y-2.5">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-zinc-400 border-b border-gray-200 dark:border-white/5 pb-2">
                <span className="font-semibold uppercase tracking-wider">Order Summary</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Confirmed</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {checkoutItem.name}
                </span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {checkoutItem.price}
                </span>
              </div>
              {checkoutItem.credits && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-zinc-400">Credits Added</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-gray-900 dark:text-white">
                    <CreditIcon className="h-3.5 w-3.5 text-yellow-500" />
                    +{checkoutItem.credits.toLocaleString()} Credits
                  </span>
                </div>
              )}
              {referenceNumber && (
                <div className="pt-2 border-t border-gray-200 dark:border-white/5 flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-zinc-400">Reference ID</span>
                  <span className="font-mono text-gray-700 dark:text-zinc-300">{referenceNumber}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => navigate(backRoute)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/20"
            >
              Return to Credit Shop
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isOneTime = checkoutItem.type === "topup" || checkoutItem.type === "custom";
  const isSubscription = checkoutItem.type === "subscription";
  const hasSavedPaymentMethods = paymentMethods.length > 0;

  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-zinc-200 font-inter selection:bg-blue-500/30 transition-colors duration-300">
      {/* Background ShapeGrid matching CreditsShop */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
        <ShapeGrid
          shape="square"
          squareSize={48}
          direction="diagonal"
          speed={0.4}
          borderColor={theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.06)"}
          hoverFillColor={theme === "dark" ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)"}
          hoverTrailAmount={3}
        />
      </div>

      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white dark:bg-[#0a0a0a] border-b border-gray-200 dark:border-white/10 shadow-sm">
        <UserHeader pageTitle="Checkout" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-8 md:py-10 space-y-6">
        {/* Top Bar: Back Button & Security Pill */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <button
              onClick={() => navigate(backRoute)}
              className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors group mb-2"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>
                {isSubscription ? "Back to Subscription Plans" : "Back to Credit Shop"}
              </span>
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              Complete Your Order
            </h1>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
              Review your selected item and choose a preferred payment method below.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-zinc-400 bg-white dark:bg-dark-surface/80 border border-gray-200 dark:border-white/10 px-3.5 py-2 rounded-xl shadow-sm self-start sm:self-center">
            <Lock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>256-bit SSL Encrypted Checkout</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl flex items-start gap-3 shadow-sm">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-red-700 dark:text-red-300">
                Payment Issue
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              aria-label="Dismiss error"
              className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-200 p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          {/* LEFT COLUMN: Item Details + Payment Method Selection */}
          <div className="space-y-6">
            {/* 1. Selected Item Card */}
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/80 p-6 shadow-sm dark:shadow-xl backdrop-blur-xl">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <div
                    className={`h-14 w-14 rounded-2xl border flex items-center justify-center shrink-0 ${getItemIconContainerStyle()}`}
                  >
                    {getItemIcon() || <Crown className="h-6 w-6 text-amber-500" />}
                  </div>

                  <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 px-2.5 py-0.5 rounded-full">
                        {getItemTypeLabel()}
                      </span>

                      {checkoutItem.isCustom && (
                        <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 px-2.5 py-0.5 rounded-full">
                          Flexible Amount
                        </span>
                      )}

                      {checkoutItem.isUpgrade && (
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                          Plan Upgrade
                        </span>
                      )}

                      {checkoutItem.isDowngrade && (
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-2.5 py-0.5 rounded-full">
                          Plan Downgrade
                        </span>
                      )}

                      {checkoutItem.isUserEligibleForTrial && (
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                          {checkoutItem.trialDays || 7}-Day Free Trial
                        </span>
                      )}

                      {checkoutItem.savings && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                          <Sparkles className="h-3 w-3" />
                          {checkoutItem.savings}
                        </span>
                      )}
                    </div>

                    <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">
                      {checkoutItem.name}
                    </h2>

                    {checkoutItem.credits ? (
                      <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-800 dark:text-zinc-200">
                        <CreditIcon className="h-4 w-4 text-yellow-500 shrink-0" />
                        <span>+{checkoutItem.credits.toLocaleString()} Platform Credits</span>
                        <span className="text-xs font-normal text-gray-500 dark:text-zinc-400">
                          • Instant delivery
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 dark:text-zinc-400">
                        Recurring monthly membership • Cancel or switch plans anytime
                      </p>
                    )}
                  </div>
                </div>

                {/* Right-side price display */}
                <div className="text-right shrink-0">
                  {checkoutItem.originalPrice && (
                    <p className="text-xs text-gray-400 dark:text-zinc-500 line-through">
                      {checkoutItem.originalPrice}
                    </p>
                  )}
                  {checkoutItem.proratedDetails && (
                    <p className="text-xs text-gray-400 dark:text-zinc-500 line-through">
                      {formatPHP(checkoutItem.proratedDetails.originalPrice)}
                    </p>
                  )}
                  <p className="text-xl font-extrabold text-gray-900 dark:text-white">
                    {checkoutItem.price}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                    {isSubscription ? "per month" : "one-time"}
                  </p>
                </div>
              </div>

              {/* Prorated Upgrade Callout (if applicable) */}
              {checkoutItem.isUpgrade && checkoutItem.proratedDetails && (
                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-white/10">
                  <div className="rounded-xl bg-emerald-50/70 dark:bg-emerald-500/[0.06] border border-emerald-200 dark:border-emerald-500/20 p-3.5 flex items-start gap-3">
                    <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                        Prorated Upgrade Applied
                      </p>
                      <p className="text-emerald-700 dark:text-emerald-400/90">
                        You are only charged the prorated difference of{" "}
                        <span className="font-bold">
                          {formatPHP(checkoutItem.proratedDetails.proratedAmount)}
                        </span>{" "}
                        for the remaining{" "}
                        <span className="font-bold">
                          {checkoutItem.proratedDetails.remainingDays} days
                        </span>{" "}
                        of your current billing cycle.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Included Plan Features (for Subscriptions) */}
              {isSubscription && checkoutItem.features && checkoutItem.features.length > 0 && (
                <div className="mt-5 pt-5 border-t border-gray-100 dark:border-white/10">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-3">
                    Included in {checkoutItem.name}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {checkoutItem.features.map((feature) => (
                      <div
                        key={feature.feature_id}
                        className="flex items-start gap-2 text-xs bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-xl p-2.5"
                      >
                        <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span className="text-gray-700 dark:text-zinc-300 leading-snug">
                          {feature.description}{" "}
                          <span className="font-semibold text-gray-900 dark:text-white bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 px-1.5 py-0.5 rounded text-[11px] ml-1 inline-block">
                            {feature.value}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Payment Method Section - For One-Time Top-up */}
            {isOneTime && (
              <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/80 p-6 shadow-sm dark:shadow-xl backdrop-blur-xl space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Payment Method
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                    Choose how you would like to complete this top-up.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: Pay with Xendit Checkout */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPaymentOption("checkout");
                      setSelectedPaymentMethod(null);
                    }}
                    className={`flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all ${
                      selectedPaymentOption === "checkout"
                        ? "border-blue-600 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 ring-1 ring-blue-600/20 dark:ring-blue-500/30"
                        : "border-gray-200 dark:border-white/10 bg-gray-50/60 dark:bg-white/[0.02] hover:border-gray-300 dark:hover:border-white/20"
                    }`}
                  >
                    <div
                      className={`mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                        selectedPaymentOption === "checkout"
                          ? "border-blue-600 dark:border-blue-400 bg-blue-600 dark:bg-blue-500"
                          : "border-gray-300 dark:border-zinc-600 bg-white dark:bg-transparent"
                      }`}
                    >
                      {selectedPaymentOption === "checkout" && (
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                          Xendit Checkout Portal
                        </span>
                        <ExternalLink className="h-3.5 w-3.5 text-gray-400 dark:text-zinc-500 shrink-0" />
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">
                        GCash, Maya, GrabPay, Cards, or Online Banking
                      </p>
                    </div>
                  </button>

                  {/* Option 2: Pay with Saved Payment Method */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPaymentOption("saved_payment");
                      if (!selectedPaymentMethod && paymentMethods.length > 0) {
                        const defaultMethod =
                          paymentMethods.find((m) => m.is_default) || paymentMethods[0];
                        setSelectedPaymentMethod(defaultMethod.payment_token_id);
                      }
                    }}
                    className={`flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all ${
                      selectedPaymentOption === "saved_payment"
                        ? "border-blue-600 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 ring-1 ring-blue-600/20 dark:ring-blue-500/30"
                        : "border-gray-200 dark:border-white/10 bg-gray-50/60 dark:bg-white/[0.02] hover:border-gray-300 dark:hover:border-white/20"
                    }`}
                  >
                    <div
                      className={`mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                        selectedPaymentOption === "saved_payment"
                          ? "border-blue-600 dark:border-blue-400 bg-blue-600 dark:bg-blue-500"
                          : "border-gray-300 dark:border-zinc-600 bg-white dark:bg-transparent"
                      }`}
                    >
                      {selectedPaymentOption === "saved_payment" && (
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                          Saved Payment Method
                        </span>
                        {paymentMethods.length > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-gray-200/80 dark:bg-white/10 text-gray-700 dark:text-zinc-300">
                            {paymentMethods.length}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">
                        Instant charge using a linked card or e-wallet
                      </p>
                    </div>
                  </button>
                </div>

                {/* Saved Payment Methods List when "saved_payment" is selected */}
                {selectedPaymentOption === "saved_payment" && (
                  <div className="pt-3 border-t border-gray-100 dark:border-white/5 space-y-2.5">
                    {loadingPaymentMethods ? (
                      <div className="flex items-center justify-center gap-2 py-6 text-xs text-gray-500 dark:text-zinc-400">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                        <span>Loading saved payment methods...</span>
                      </div>
                    ) : paymentMethods.length > 0 ? (
                      <div className="space-y-2.5">
                        {paymentMethods.map((method) => {
                          const isSelected = selectedPaymentMethod === method.payment_token_id;
                          const secondaryLabel = getMethodSecondaryLabel(method);
                          return (
                            <label
                              key={method.payment_token_id}
                              onClick={() => setSelectedPaymentMethod(method.payment_token_id)}
                              className={`flex items-center gap-3.5 p-3.5 rounded-xl border cursor-pointer transition-all ${
                                isSelected
                                  ? "border-blue-600 dark:border-blue-500/60 bg-blue-50/40 dark:bg-blue-500/10"
                                  : "border-gray-200 dark:border-white/10 bg-gray-50/40 dark:bg-white/[0.01] hover:border-gray-300 dark:hover:border-white/20"
                              }`}
                            >
                              <input
                                type="radio"
                                name="paymentMethod"
                                value={method.payment_token_id}
                                checked={isSelected}
                                onChange={() => setSelectedPaymentMethod(method.payment_token_id)}
                                className="sr-only"
                              />
                              {renderPaymentMethodIcon(method)}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                    {getMethodPrimaryLabel(method)}
                                  </p>
                                  {method.is_default && (
                                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2 py-0.5 rounded-full">
                                      Default
                                    </span>
                                  )}
                                </div>
                                {secondaryLabel && (
                                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                                    {secondaryLabel}
                                  </p>
                                )}
                              </div>
                              <div
                                className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? "text-blue-600 dark:text-blue-400"
                                    : "text-transparent border border-gray-300 dark:border-zinc-700"
                                }`}
                              >
                                <CheckCircle2 className="h-5 w-5" />
                              </div>
                            </label>
                          );
                        })}

                        <button
                          type="button"
                          onClick={handleAddPaymentMethod}
                          disabled={showAddPayment}
                          className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-gray-300 dark:border-white/15 hover:border-blue-500 dark:hover:border-blue-400 bg-gray-50/50 dark:bg-white/[0.01] transition-colors text-xs font-semibold text-gray-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {showAddPayment ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Plus className="h-4 w-4" />
                              <span>Link a new payment method</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-6 px-4 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                        <CreditCard className="h-7 w-7 text-gray-400 dark:text-zinc-500 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                          No saved payment methods yet
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 mb-4">
                          Link a card or e-wallet for faster future checkouts.
                        </p>
                        <button
                          type="button"
                          onClick={handleAddPaymentMethod}
                          disabled={showAddPayment}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm"
                        >
                          {showAddPayment ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Plus className="h-4 w-4" />
                              <span>Add Your First Payment Method</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 2b. Payment Method Section - For Subscription */}
            {isSubscription && (
              <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/80 p-6 shadow-sm dark:shadow-xl backdrop-blur-xl space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                      Recurring Payment Method
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                      Select or link a payment method for your monthly subscription.
                    </p>
                  </div>
                </div>

                {loadingPaymentMethods ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-xs text-gray-500 dark:text-zinc-400">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                    <span>Loading saved payment methods...</span>
                  </div>
                ) : paymentMethods.length > 0 ? (
                  <div className="space-y-2.5">
                    {paymentMethods.map((method) => {
                      const isSelected = selectedPaymentMethod === method.payment_token_id;
                      const secondaryLabel = getMethodSecondaryLabel(method);
                      return (
                        <label
                          key={method.payment_token_id}
                          onClick={() => setSelectedPaymentMethod(method.payment_token_id)}
                          className={`flex items-center gap-3.5 p-3.5 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? "border-blue-600 dark:border-blue-500/60 bg-blue-50/40 dark:bg-blue-500/10"
                              : "border-gray-200 dark:border-white/10 bg-gray-50/40 dark:bg-white/[0.01] hover:border-gray-300 dark:hover:border-white/20"
                          }`}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            value={method.payment_token_id}
                            checked={isSelected}
                            onChange={() => setSelectedPaymentMethod(method.payment_token_id)}
                            className="sr-only"
                          />
                          {renderPaymentMethodIcon(method)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                {getMethodPrimaryLabel(method)}
                              </p>
                              {method.is_default && (
                                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2 py-0.5 rounded-full">
                                  Default
                                </span>
                              )}
                            </div>
                            {secondaryLabel && (
                              <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                                {secondaryLabel}
                              </p>
                            )}
                          </div>
                          <div
                            className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-transparent border border-gray-300 dark:border-zinc-700"
                            }`}
                          >
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                        </label>
                      );
                    })}

                    <button
                      type="button"
                      onClick={handleAddPaymentMethod}
                      disabled={showAddPayment}
                      className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-gray-300 dark:border-white/15 hover:border-blue-500 dark:hover:border-blue-400 bg-gray-50/50 dark:bg-white/[0.01] transition-colors text-xs font-semibold text-gray-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {showAddPayment ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          <span>Link a new payment method</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-6 px-4 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                    <CreditCard className="h-7 w-7 text-gray-400 dark:text-zinc-500 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                      Payment method required for subscriptions
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 mb-4">
                      Link a credit/debit card or e-wallet to activate your membership plan.
                    </p>
                    <button
                      type="button"
                      onClick={handleAddPaymentMethod}
                      disabled={showAddPayment}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm"
                    >
                      {showAddPayment ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          <span>Add Your First Payment Method</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 3. Security Assurance Card */}
            <div className="flex items-start gap-3.5 rounded-2xl border border-emerald-200/80 dark:border-emerald-500/20 bg-emerald-50/60 dark:bg-emerald-500/[0.04] p-4">
              <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center shrink-0">
                <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  Protected by Xendit Security
                </p>
                <p className="text-xs text-emerald-700 dark:text-zinc-400 mt-0.5 leading-relaxed">
                  Your payment is encrypted end-to-end. Ensemble never stores raw card credentials on our servers.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Sticky Order Summary */}
          <div className="lg:sticky lg:top-20 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/80 shadow-sm dark:shadow-xl backdrop-blur-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h2 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Order Summary
                </h2>
              </div>
              <span className="text-[11px] font-medium text-gray-400 dark:text-zinc-500">
                PHP (₱)
              </span>
            </div>

            <div className="p-6 space-y-3.5">
              <div className="flex items-start justify-between gap-3 text-xs">
                <span className="text-gray-500 dark:text-zinc-400">{checkoutItem.name}</span>
                <span className="text-gray-900 dark:text-white font-semibold text-right shrink-0">
                  {checkoutItem.proratedDetails
                    ? formatPHP(checkoutItem.proratedDetails.originalPrice)
                    : checkoutItem.originalPrice || checkoutItem.price}
                </span>
              </div>

              {checkoutItem.credits && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-zinc-400">Credits Included</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-gray-900 dark:text-white">
                    <CreditIcon className="h-3.5 w-3.5 text-yellow-500" />
                    +{checkoutItem.credits.toLocaleString()}
                  </span>
                </div>
              )}

              {checkoutItem.proratedDetails && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-zinc-400">
                    Prorated adjustment ({checkoutItem.proratedDetails.remainingDays}d left)
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    {checkoutItem.price}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-zinc-400">Platform processing fee</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Free</span>
              </div>

              {isSubscription && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-zinc-400">Billing cycle</span>
                  <span className="text-gray-900 dark:text-white font-semibold">Monthly</span>
                </div>
              )}

              {isSubscription && checkoutItem.isUpgrade && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-zinc-400">Plan change</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    Immediate Upgrade
                  </span>
                </div>
              )}

              {isSubscription && checkoutItem.isDowngrade && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-zinc-400">Plan change</span>
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    Downgrade
                  </span>
                </div>
              )}

              {isSubscription && checkoutItem.isUserEligibleForTrial && (
                <>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-zinc-400">Trial period</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      {checkoutItem.trialDays || 7} days free
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-zinc-400">First billing date</span>
                    <span className="text-gray-900 dark:text-white font-semibold">
                      {(() => {
                        const date = new Date();
                        date.setDate(date.getDate() + (checkoutItem?.trialDays || 7));
                        return date.toLocaleDateString();
                      })()}
                    </span>
                  </div>
                </>
              )}

              <div className="border-t border-dashed border-gray-200 dark:border-white/10 pt-4 mt-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-300">
                    Total Due Today
                  </span>
                  <span className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                    {checkoutItem.isUserEligibleForTrial ? "Free" : checkoutItem.price}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 text-right mt-1">
                  {isOneTime
                    ? "One-time payment • No recurring charges"
                    : checkoutItem.isUserEligibleForTrial
                    ? `₱0 today, then ${checkoutItem.originalPrice || checkoutItem.price}/mo after trial`
                    : checkoutItem.isUpgrade
                    ? "Prorated upgrade charge applied immediately"
                    : checkoutItem.isDowngrade
                    ? "Plan updated, billed monthly"
                    : "Billed monthly • Cancel anytime"}
                </p>
              </div>
            </div>

            <div className="px-6 pb-6 space-y-2.5">
              {/* Primary Action Button - Top-up */}
              {isOneTime && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedPaymentOption === "saved_payment") {
                      handlePayWithSavedPayment();
                    } else {
                      handlePayWithCheckout();
                    }
                  }}
                  disabled={
                    isProcessing ||
                    (selectedPaymentOption === "saved_payment" &&
                      (!hasSavedPaymentMethods || !selectedPaymentMethod))
                  }
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Processing Payment...</span>
                    </>
                  ) : (
                    <>
                      <span>Pay {checkoutItem.price}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}

              {/* Primary Action Button - Subscription */}
              {isSubscription && (
                <button
                  type="button"
                  onClick={handleSubscribe}
                  disabled={isProcessing || !selectedPaymentMethod}
                  className={`w-full py-3 text-xs font-bold text-white rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    checkoutItem.isUpgrade
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                      : checkoutItem.isDowngrade
                      ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20"
                      : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Processing Subscription...</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {checkoutItem.isUserEligibleForTrial
                          ? `Start ${checkoutItem.trialDays || 7}-Day Free Trial`
                          : checkoutItem.isUpgrade
                          ? `Upgrade Now (${checkoutItem.price})`
                          : checkoutItem.isDowngrade
                          ? "Confirm Plan Downgrade"
                          : `Subscribe (${checkoutItem.price}/mo)`}
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => navigate(backRoute)}
                disabled={isProcessing}
                className="w-full py-2.5 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-600 dark:text-zinc-400 rounded-xl hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="pt-4 text-center text-xs text-gray-500 dark:text-zinc-500">
          Payments are processed securely via Xendit. Prices shown in Philippine Pesos (PHP).
        </p>
      </div>
    </div>
  );
};

export default CheckoutPage;
