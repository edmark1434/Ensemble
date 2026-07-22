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
  CreditCard,
  Plus,
} from "lucide-react";
import UserHeader from "@/components/nav/user_header";
import api from "@/lib/axios";
import toast from "react-hot-toast";
// Interfaces
interface Feature {
  feature_id: number;
  feature_key: string;
  name: string;
  description: string;
  value: string;
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

const CheckoutPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
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

  const userCurrentCredits = 1250;

  useEffect(() => {
    const state = location.state as { item: CheckoutItem };
    if (state?.item) {
      setCheckoutItem(state.item);
    } else {
      navigate("/credits");
    }
  }, [location, navigate]);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    setLoadingPaymentMethods(true);
    try {
      const response = await api.get("api/payment/payment-methods");
      console.log("📥 Fetched Payment Methods:", response.data);
      setPaymentMethods(response.data.paymentMethods || []);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  const handleAddPaymentMethod = async () => {
    setShowAddPayment(true);
    // Simulate redirect to add payment method
    try{
      const result = await api.post("api/payment/create-payment-token");
      if(result.data && result.status === 200 && result.data.paymentLink){
        window.location.href = result.data.paymentLink;
      }
    }catch(err){
      toast.error("Failed to add payment method. Please try again.");
    }finally{
      fetchPaymentMethods();
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
        setIsSuccess(true);
      } else {
        setError("Payment initiation failed. Please try again.");
      }
    } catch (error: any) {
      console.error("❌ Saved Payment Error:", error);
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
      };
      
      console.log("📤 Subscription Payload:", payload);
      
      const response = await api.post("api/payment/subscription", payload, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = response.data;
      console.log("✅ Subscription Response:", data);
       if (response.status === 200 && data?.subscriptionUpdate?.reference_id) {
        setReferenceNumber(data?.subscriptionUpdate?.reference_id);
        setIsSuccess(true);
      } else {
        setError("Subscription initiation failed. Please try again.");
      }
    } catch (error: any) {
      console.error("❌ Subscription Error:", error);
      if (error.response?.data?.error?.message) {
        setError(error.response.data.error.message);
      } else if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError(error.message || "Subscription failed. Please try again.");
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

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    if (method.type === "ewallet") {
      if (method.channel_code === "gcash") return "📱";
      return "💳";
    }
    if (method.card_brand) {
      const brand = method.card_brand.toLowerCase();
      if (brand.includes("visa")) return "💳";
      if (brand.includes("mastercard")) return "💳";
      if (brand.includes("amex")) return "💳";
      return "💳";
    }
    return "💳";
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
  const isSubscription = checkoutItem.type === "subscription";
  const hasSavedPaymentMethods = paymentMethods.length > 0;

  return (
    <div className="h-screen bg-[#080a12] text-white flex flex-col overflow-hidden relative">
      <UserHeader pageTitle="Checkout" credits={userCurrentCredits} />

      <div className="absolute top-[10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/5 filter blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-10%] w-[500px] h-[500px] bg-teal-500/5 filter blur-[140px] pointer-events-none" />

      <div className="flex-1 relative z-10 p-4 md:p-6 overflow-y-auto">
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

          {/* Two-column layout */}
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

              {/* Payment Methods Section - For Top-up */}
              {isOneTime && (
                <div className="bg-[#0d0f1a]/80 backdrop-blur-md border border-[#1e2130] rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-3">Choose payment option</h3>
                  
                  <div className="space-y-2">
                    {/* Pay with Checkout - Always visible */}
                    <label className="flex items-center gap-3 p-3 rounded-xl border border-[#1e2130] hover:border-zinc-600 cursor-pointer transition-all">
                      <input
                        type="radio"
                        name="paymentOption"
                        value="checkout"
                        checked={selectedPaymentOption === "checkout"}
                        onChange={() => {
                          setSelectedPaymentOption("checkout");
                          setSelectedPaymentMethod(null);
                        }}
                        className="h-4 w-4 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 bg-transparent border-zinc-600"
                      />
                      <span className="text-sm text-white">Pay with Checkout</span>
                    </label>
                    
                    {/* Pay with saved payment method - Always show this option */}
                    <label className="flex items-center gap-3 p-3 rounded-xl border border-[#1e2130] hover:border-zinc-600 cursor-pointer transition-all">
                      <input
                        type="radio"
                        name="paymentOption"
                        value="saved_payment"
                        checked={selectedPaymentOption === "saved_payment"}
                        onChange={() => setSelectedPaymentOption("saved_payment")}
                        className="h-4 w-4 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 bg-transparent border-zinc-600"
                      />
                      <span className="text-sm text-white">Pay with saved payment method</span>
                    </label>
                  </div>

                  {/* Show saved payment methods section when "saved_payment" is selected */}
                  {selectedPaymentOption === "saved_payment" && (
                    <div className="mt-3">
                      {loadingPaymentMethods ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                        </div>
                      ) : paymentMethods.length > 0 ? (
                        <div className="space-y-2">
                          {paymentMethods.map((method) => (
                            <label
                              key={method.payment_token_id}
                              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                selectedPaymentMethod === method.payment_token_id
                                  ? "border-blue-500/50 bg-blue-500/10"
                                  : "border-[#1e2130] hover:border-zinc-600"
                              }`}
                            >
                              <input
                                type="radio"
                                name="paymentMethod"
                                value={method.payment_token_id}
                                checked={selectedPaymentMethod === method.payment_token_id}
                                onChange={() => setSelectedPaymentMethod(method.payment_token_id)}
                                className="h-4 w-4 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 bg-transparent border-zinc-600"
                              />
                              <div className="flex-1 flex items-center gap-3">
                                <span className="text-xl">{getPaymentMethodIcon(method)}</span>
                                <div>
                              <p className="text-sm font-medium text-white">{method.masked_card_number && method.card_brand ? method.card_brand + " " + method.masked_card_number : method.display_name}</p>
                              {method.masked_card_number && (
                                <p className="text-xs text-zinc-400">
                                  Expires {method.card_exp_month}/{method.card_exp_year}
                                </p>
                              )}
                                  <p className="text-xs text-zinc-400">
                                    {method.display_name !== method.channel_code && method.display_name}
                                    {method.masked_card_number && ` • ${method.masked_card_number}`}
                                  </p>
                                  {method.is_default && (
                                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                      Default
                                    </span>
                                  )}
                                </div>
                              </div>
                            </label>
                          ))}
                          
                          {/* Add new payment method */}
                          <button
                            onClick={handleAddPaymentMethod}
                            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-[#1e2130] hover:border-zinc-600 transition-colors text-sm text-zinc-400 hover:text-white"
                          >
                            {showAddPayment ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Plus className="h-4 w-4" />
                                Add new payment method
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-sm text-zinc-400 mb-3">No saved payment methods</p>
                          <button
                            onClick={handleAddPaymentMethod}
                            className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-[#1e2130] hover:border-zinc-600 transition-colors text-sm text-zinc-400 hover:text-white w-full"
                          >
                            {showAddPayment ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Plus className="h-4 w-4" />
                                Add your first payment method
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* For Subscription - Always show payment methods */}
              {isSubscription && (
                <div className="bg-[#0d0f1a]/80 backdrop-blur-md border border-[#1e2130] rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-3">Choose payment method</h3>
                  
                  {loadingPaymentMethods ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                    </div>
                  ) : paymentMethods.length > 0 ? (
                    <div className="space-y-2">
                      {paymentMethods.map((method) => (
                        <label
                          key={method.payment_token_id}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            selectedPaymentMethod === method.payment_token_id
                              ? "border-blue-500/50 bg-blue-500/10"
                              : "border-[#1e2130] hover:border-zinc-600"
                          }`}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            value={method.payment_token_id}
                            checked={selectedPaymentMethod === method.payment_token_id}
                            onChange={() => setSelectedPaymentMethod(method.payment_token_id)}
                            className="h-4 w-4 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 bg-transparent border-zinc-600"
                          />
                          <div className="flex-1 flex items-center gap-3">
                            <span className="text-xl">{getPaymentMethodIcon(method)}</span>
                            <div>
                              <p className="text-sm font-medium text-white">{method.masked_card_number && method.card_brand ? method.card_brand + " " + method.masked_card_number : method.display_name}</p>
                              {method.masked_card_number && (
                                <p className="text-xs text-zinc-400">
                                  Expires {method.card_exp_month}/{method.card_exp_year}
                                </p>
                              )}
                              {method.is_default && (
                                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                  Default
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                      ))}
                      
                      {/* Add new payment method */}
                      <button
                        onClick={handleAddPaymentMethod}
                        className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-[#1e2130] hover:border-zinc-600 transition-colors text-sm text-zinc-400 hover:text-white"
                      >
                        {showAddPayment ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Plus className="h-4 w-4" />
                            Add new payment method
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-zinc-400 mb-3">No saved payment methods</p>
                      <button
                        onClick={handleAddPaymentMethod}
                        className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-[#1e2130] hover:border-zinc-600 transition-colors text-sm text-zinc-400 hover:text-white w-full"
                      >
                        {showAddPayment ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Plus className="h-4 w-4" />
                            Add your first payment method
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Security Note */}
              <div className="flex items-start gap-3 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4">
                <Shield className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-emerald-300">Secure payment</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Your payment is encrypted end-to-end. We never store your payment credentials.
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
                {checkoutItem.type === "subscription" && checkoutItem.isUserEligibleForTrial && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Billing Starts at</span>
                    <span className="text-white font-medium">
                      {(() => {
                        const date = new Date();
                        date.setDate(date.getDate() + checkoutItem?.trialDays);
                        return date.toLocaleDateString();
                      })()}
                    </span>
                  </div>
                )}
                <div className="border-t border-dashed border-white/10 pt-3 mt-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-semibold text-zinc-300">Total due today</span>
                    <span className="text-2xl font-extrabold text-white">{checkoutItem.isUserEligibleForTrial ? "Free" : checkoutItem.price}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 text-right mt-0.5">
                    {isOneTime ? "One-time charge" : "Then monthly, cancel anytime"}
                  </p>
                </div>
              </div>

              <div className="p-5 pt-0 space-y-2.5">
                {/* Pay button - Top-up */}
                {isOneTime && (
                  <button
                    onClick={() => {
                      if (selectedPaymentOption === "saved_payment" && hasSavedPaymentMethods) {
                        handlePayWithSavedPayment();
                      } else {
                        handlePayWithCheckout();
                      }
                    }}
                    disabled={isProcessing || (selectedPaymentOption === "saved_payment" && hasSavedPaymentMethods && !selectedPaymentMethod)}
                    className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-purple-600 text-sm font-bold text-white rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Pay {checkoutItem.price}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                )}

                {/* Subscribe button - Subscription */}
                {isSubscription && (
                  <button
                    onClick={handleSubscribe}
                    disabled={isProcessing || !selectedPaymentMethod}
                    className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-purple-600 text-sm font-bold text-white rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Subscribe Now
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                )}

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