// CheckoutPage.tsx - Modern Order Summary Layout
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
} from "lucide-react";
import UserHeader from "@/components/nav/user_header";
import api from "@/lib/axios";

// Interfaces
interface CheckoutItem {
  id: string;
  name: string;
  type: "topup" | "subscription" | "custom";
  credits?: number;
  price: string;
  priceValue: number;
  icon?: React.ReactNode;
  features?: string[];
  planName?: string;
  originalPrice?: string;
  savings?: string;
  isCustom?: boolean;
}

const CheckoutPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [checkoutItem, setCheckoutItem] = useState<CheckoutItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);

  const userCurrentCredits = 1250;

  useEffect(() => {
    const state = location.state as { item: CheckoutItem };
    if (state?.item) {
      setCheckoutItem(state.item);
    } else {
      navigate("/credits");
    }
  }, [location, navigate]);

  const handlePayment = async () => {
    if (!checkoutItem) return;

    setIsProcessing(true);
    setError(null);

    try {
      const payload = {
        paymentMethod: "GCASH",
        paymentType: "EWALLET",
        channelCode: "GCASH",
        amount: checkoutItem.priceValue,
        currency: "PHP",
        itemName: checkoutItem.name,
        itemType: checkoutItem.type,
        credits: checkoutItem.credits || 0,
        customer: {
          mobileNumber: "",
          fullName: "",
        },
        savePaymentMethod: false,
        timestamp: new Date().toISOString(),
      };

      let endpoint = "api/payment/topup";
      if (checkoutItem.type === "subscription") {
        endpoint = "api/payment/subscription";
      }

      const response = await api.post(endpoint, JSON.stringify(payload), {
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = response.data;

      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      } else if (data.reference_id) {
        setReferenceNumber(data.reference_id);
        setIsSuccess(true);
      } else {
        setError("Payment initiation failed. Please try again.");
      }
    } catch (error: any) {
      console.error("❌ Payment Error:", error);
      if (error.response?.data?.error?.message) {
        setError(error.response.data.error.message);
      } else if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError(error.message || "Payment failed. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const getItemIcon = () => {
    if (!checkoutItem) return null;
    if (checkoutItem.type === "custom") return <Wallet className="h-6 w-6 text-blue-400" />;
    if (checkoutItem.type === "topup") {
      switch (checkoutItem.id) {
        case "pocket": return <Wallet className="h-6 w-6 text-blue-400" />;
        case "bundle": return <Coins className="h-6 w-6 text-emerald-400" />;
        case "box": return <Gift className="h-6 w-6 text-purple-400" />;
        case "vault": return <Gem className="h-6 w-6 text-yellow-400" />;
        default: return <Coins className="h-6 w-6 text-blue-400" />;
      }
    }
    return <Crown className="h-6 w-6 text-yellow-400" />;
  };

  const getItemAccent = () => {
    if (!checkoutItem) return "from-blue-500/20 to-blue-500/5";
    if (checkoutItem.type === "subscription") return "from-yellow-500/20 to-yellow-500/5";
    switch (checkoutItem.id) {
      case "bundle": return "from-emerald-500/20 to-emerald-500/5";
      case "box": return "from-purple-500/20 to-purple-500/5";
      case "vault": return "from-yellow-500/20 to-yellow-500/5";
      default: return "from-blue-500/20 to-blue-500/5";
    }
  };

  const getItemTypeLabel = () => {
    if (!checkoutItem) return "";
    if (checkoutItem.type === "custom") return "Custom Top-up";
    if (checkoutItem.type === "topup") return "Credit Pack";
    return "Subscription";
  };

  if (!checkoutItem) {
    return (
      <div className="h-screen bg-[#080a12] flex items-center justify-center">
        <div className="text-zinc-400">Loading checkout...</div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="h-screen bg-[#080a12] flex flex-col overflow-hidden">
        <UserHeader pageTitle="Checkout" credits={userCurrentCredits} />
        <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
          <div className="bg-[#0d0f1a] border border-emerald-500/30 rounded-2xl p-8 max-w-md w-full text-center">
            <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Payment Initiated!</h2>
            <p className="text-zinc-400 mb-4">
              {checkoutItem.type === "topup" || checkoutItem.type === "custom"
                ? `+${checkoutItem.credits} credits will be added to your account.`
                : `Your account will be upgraded to ${checkoutItem.name}.`}
            </p>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
              <p className="text-sm text-zinc-400">Order Summary</p>
              <p className="text-lg font-bold text-white">{checkoutItem.name}</p>
              <p className="text-emerald-400 font-bold">{checkoutItem.price}</p>
              {referenceNumber && (
                <p className="text-xs text-zinc-400 mt-2">Ref: {referenceNumber}</p>
              )}
            </div>
            <button
              onClick={() => navigate("/credits")}
              className="w-full py-3 bg-white text-[#080a12] font-bold rounded-xl hover:bg-zinc-200 transition-colors"
            >
              Return to Shop
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isOneTime = checkoutItem.type === "topup" || checkoutItem.type === "custom";

  return (
    <div className="h-screen bg-[#080a12] text-white flex flex-col overflow-hidden relative">
      <UserHeader pageTitle="Checkout" credits={userCurrentCredits} />

      <div className="absolute top-[10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/5 filter blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-10%] w-[500px] h-[500px] bg-teal-500/5 filter blur-[140px] pointer-events-none" />

      <div className="flex-1 relative z-10 p-4 md:p-6 overflow-hidden">
        <div className="w-full max-w-4xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => navigate("/credits")}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-4 group text-sm"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Shop
          </button>

          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-400 font-medium">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <h1 className="text-xl md:text-2xl font-bold mb-5">Checkout</h1>

          {/* Two-column layout: item detail (left) + sticky summary (right) */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 items-start">
            {/* LEFT: Item detail card */}
            <div className="space-y-4">
              <div
                className={`relative overflow-hidden bg-[#0d0f1a]/80 backdrop-blur-md border border-[#1e2130] rounded-2xl p-5 bg-gradient-to-br ${getItemAccent()}`}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex-shrink-0">
                    {getItemIcon()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                        {getItemTypeLabel()}
                      </span>
                      {checkoutItem.isCustom && (
                        <span className="text-xs font-semibold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
                          Custom
                        </span>
                      )}
                      {checkoutItem.savings && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          <Sparkles className="h-3 w-3" />
                          {checkoutItem.savings}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-white leading-tight">{checkoutItem.name}</h3>
                    {checkoutItem.credits && (
                      <p className="text-emerald-400 font-medium text-sm mt-0.5">
                        +{checkoutItem.credits.toLocaleString()} Credits
                      </p>
                    )}
                    {checkoutItem.type === "subscription" && (
                      <p className="text-xs text-zinc-400 mt-0.5">Billed monthly</p>
                    )}
                    {checkoutItem.originalPrice && (
                      <p className="text-sm text-zinc-500 line-through mt-1">
                        {checkoutItem.originalPrice}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Plan Features */}
              {checkoutItem.type === "subscription" && checkoutItem.features && (
                <div className="bg-[#0d0f1a]/80 backdrop-blur-md border border-[#1e2130] rounded-2xl p-5">
                  <p className="text-sm font-semibold text-white mb-3">What's included</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {checkoutItem.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-zinc-300">
                        <div className="h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                          <Check className="h-3 w-3 text-emerald-400" />
                        </div>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Security Note */}
              <div className="flex items-start gap-3 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4">
                <Shield className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-emerald-300">Secure payment</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Your payment is encrypted end-to-end. We never store your GCash credentials.
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT: Sticky order summary */}
            <div className="lg:sticky lg:top-4 bg-[#0d0f1a]/80 backdrop-blur-md border border-[#1e2130] rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-white/5 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-zinc-400" />
                <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wide">Order Summary</h2>
              </div>

              <div className="p-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">{checkoutItem.name}</span>
                  <span className="text-white font-medium">{checkoutItem.price}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Transaction fee</span>
                  <span className="text-emerald-400 font-medium">Free</span>
                </div>
                {checkoutItem.type === "subscription" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Billing cycle</span>
                    <span className="text-white font-medium">Monthly</span>
                  </div>
                )}

                <div className="border-t border-dashed border-white/10 pt-3 mt-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-semibold text-zinc-300">Total due today</span>
                    <span className="text-2xl font-extrabold text-white">{checkoutItem.price}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 text-right mt-0.5">
                    {isOneTime ? "One-time charge" : "Then monthly, cancel anytime"}
                  </p>
                </div>
              </div>

              <div className="p-5 pt-0 space-y-2.5">
                <button
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-purple-600 text-sm font-bold text-white rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Pay {checkoutItem.price} with GCash
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <button
                  onClick={() => navigate("/credits")}
                  disabled={isProcessing}
                  className="w-full py-3 bg-transparent border border-[#1e2130] text-sm font-semibold text-zinc-400 rounded-xl hover:text-white hover:border-zinc-600 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;