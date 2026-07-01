// CheckoutPage.tsx
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  CreditCard,
  QrCode,
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
  Phone,
  User,
  Mail,
  Lock,
  Calendar,
  Smartphone,
  Download,
  Copy,
  Clock,
  Save,
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

interface PaymentMethod {
  id: string;
  name: string;
  type: "EWALLET" | "CARD" | "QR_CODE";
  channelCode: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

// Payment Methods Definition
const paymentMethods: PaymentMethod[] = [
  { 
    id: "GCASH", 
    name: "GCash", 
    type: "EWALLET",
    channelCode: "GCASH",
    icon: <Smartphone className="h-5 w-5" />, 
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30"
  },
  { 
    id: "MAYA", 
    name: "Maya", 
    type: "EWALLET",
    channelCode: "PAYMAYA",
    icon: <Smartphone className="h-5 w-5" />, 
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30"
  },
  { 
    id: "CARD", 
    name: "Credit/Debit Card", 
    type: "CARD",
    channelCode: "CARD",
    icon: <CreditCard className="h-5 w-5" />, 
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30"
  },
  { 
    id: "QRPH", 
    name: "QR Code (QRPH)", 
    type: "QR_CODE",
    channelCode: "QRPH",
    icon: <QrCode className="h-5 w-5" />, 
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30"
  },
];

// Card channel codes for different card types
const CARD_CHANNEL_CODES = {
  VISA: "VISA",
  MASTERCARD: "MASTERCARD",
  AMEX: "AMEX",
  DISCOVER: "DISCOVER",
  DEFAULT: "CARD",
};

const CheckoutPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedPayment, setSelectedPayment] = useState<string>("GCASH");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [checkoutItem, setCheckoutItem] = useState<CheckoutItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    mobileNumber: '',
    fullName: '',
    cardNumber: '',
    givenName: '',
    surname: '',
    expiryDate: '',
    cvv: '',
    savePaymentMethod: false,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);

  // QRPH specific state - moved to top level
  const [qrphCopied, setQrphCopied] = useState(false);
  const [qrphRefId] = useState(() => 
    `QRPH-${Date.now()}-${Math.floor(Math.random() * 10000)}`
  );

  const userCurrentCredits = 1250;

  useEffect(() => {
    const state = location.state as { item: CheckoutItem };
    if (state?.item) {
      setCheckoutItem(state.item);
    } else {
      navigate("/credits");
    }
  }, [location, navigate]);

  // Helper function to detect card type
  const detectCardType = (cardNumber: string): string => {
    const clean = cardNumber.replace(/\s/g, '');
    if (clean.startsWith('4')) return CARD_CHANNEL_CODES.VISA;
    if (/^5[1-5]/.test(clean)) return CARD_CHANNEL_CODES.MASTERCARD;
    if (/^3[47]/.test(clean)) return CARD_CHANNEL_CODES.AMEX;
    if (/^6(?:011|5)/.test(clean)) return CARD_CHANNEL_CODES.DISCOVER;
    return CARD_CHANNEL_CODES.DEFAULT;
  };

  // Validation functions
  const validateEWallet = () => {
    const errors: Record<string, string> = {};
    const cleanNumber = formData.mobileNumber.replace(/\s/g, '');
    
    if (!cleanNumber) {
      errors.mobileNumber = 'Mobile number is required';
    } else if (!/^(09|\+639|9)\d{9}$/.test(cleanNumber)) {
      errors.mobileNumber = 'Invalid Philippine mobile number';
    }
    
    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 3) {
      errors.fullName = 'Enter your full name';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateCard = () => {
    const errors: Record<string, string> = {};
    const cleanCard = formData.cardNumber.replace(/\s/g, '');
    
    if (!/^\d{16}$/.test(cleanCard)) {
      errors.cardNumber = 'Invalid card number (16 digits)';
    }
    
    if (!formData.givenName.trim()) {
      errors.givenName = 'Given name is required';
    } else if (formData.givenName.trim().length < 2) {
      errors.givenName = 'Enter a valid given name';
    }
    
    if (!formData.surname.trim()) {
      errors.surname = 'Surname is required';
    } else if (formData.surname.trim().length < 2) {
      errors.surname = 'Enter a valid surname';
    }
    
    const expiryRegex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
    if (!expiryRegex.test(formData.expiryDate)) {
      errors.expiryDate = 'Invalid expiry (MM/YY)';
    } else {
      const [month, year] = formData.expiryDate.split('/').map(Number);
      const currentYear = new Date().getFullYear() % 100;
      const currentMonth = new Date().getMonth() + 1;
      if (year < currentYear || (year === currentYear && month < currentMonth)) {
        errors.expiryDate = 'Card expired';
      }
    }
    
    if (!/^\d{3,4}$/.test(formData.cvv)) {
      errors.cvv = 'Invalid CVV';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateQRPH = () => {
    const errors: Record<string, string> = {};
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle E-Wallet Payment
  const handlePayEWallet = async () => {
    if (!checkoutItem) return;

    const selectedMethod = paymentMethods.find(p => p.id === selectedPayment);
    if (!selectedMethod) return;

    if (!validateEWallet()) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Prepare payload
      const payload = {
        paymentMethod: selectedMethod.id,
        paymentType: selectedMethod.type,
        channelCode: selectedMethod.channelCode,
        amount: checkoutItem.priceValue,
        currency: "PHP",
        itemName: checkoutItem.name,
        itemType: checkoutItem.type,
        credits: checkoutItem.credits || 0,
        customer: {
          mobileNumber: formData.mobileNumber.replace(/\s/g, ''),
          fullName: formData.fullName.trim(),
        },
        savePaymentMethod: formData.savePaymentMethod,
        timestamp: new Date().toISOString(),
      };

      console.log("💰 E-Wallet Payment Payload:", JSON.stringify(payload, null, 2));
      console.log("📱 Payment Method:", selectedMethod.name);
      console.log("💳 Amount:", checkoutItem.price);
      console.log("👤 Customer:", payload.customer);

      const response = await api.post("api/payment/topup", JSON.stringify(payload), {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = response.data;
      
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      } else {
        setReferenceNumber(data.reference_id);
        setIsSuccess(true);
      }
    } catch (error: any) {
      console.error("❌ E-Wallet Payment Error:", error);
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

  // Handle Card Payment - Dynamic with same structure as E-Wallet
  const handlePayCard = async () => {
    if (!checkoutItem) return;

    const selectedMethod = paymentMethods.find(p => p.id === selectedPayment);
    if (!selectedMethod) return;

    if (!validateCard()) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Mask card number for logging
      const cleanCard = formData.cardNumber.replace(/\s/g, '');
      const maskedCard = `**** **** **** ${cleanCard.slice(-4)}`;
      
      // Detect card type
      const cardType = detectCardType(cleanCard);

      // Prepare payload - matching the E-Wallet structure
      const payload = {
        paymentMethod: selectedMethod.id,
        paymentType: selectedMethod.type,
        channelCode: cardType, // Use card-specific channel code
        amount: checkoutItem.priceValue,
        currency: "PHP",
        itemName: checkoutItem.name,
        itemType: checkoutItem.type,
        credits: checkoutItem.credits || 0,
        customer: {
          givenName: formData.givenName.trim(),
          surname: formData.surname.trim(),
          email: '', // Optional - can be added later
        },
        cardDetails: {
          clean_account: cleanCard,
          lastFourDigits: cleanCard.slice(-4),
          expiry_month: formData.expiryDate.split('/')[0],
          expiry_year: 20 + formData.expiryDate.split('/')[1],
          cvv: formData.cvv,
        },
        savePaymentMethod: formData.savePaymentMethod,
        timestamp: new Date().toISOString(),
      };

      console.log("💳 Card Payment Payload:", JSON.stringify(payload, null, 2));
      console.log("💳 Payment Method:", selectedMethod.name);
      console.log("💳 Card Type:", cardType);
      console.log("💰 Amount:", checkoutItem.price);

      // Use the same endpoint as E-Wallet
      const response = await api.post("api/payment/topup/cards", JSON.stringify(payload), {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = response.data;
      
      console.log("✅ Card Payment Response:", JSON.stringify(data, null, 2));
      
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      } else {
        setReferenceNumber(data.reference_id);
        setIsSuccess(true);
      }
    } catch (error: any) {
      console.error("❌ Card Payment Error:", error);
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

  // Handle QRPH Payment
  const handlePayQRPH = async () => {
    if (!checkoutItem) return;

    const selectedMethod = paymentMethods.find(p => p.id === selectedPayment);
    if (!selectedMethod) return;

    if (!validateQRPH()) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Prepare payload
      const payload = {
        paymentMethod: selectedMethod.id,
        paymentType: selectedMethod.type,
        channelCode: selectedMethod.channelCode,
        amount: checkoutItem.priceValue,
        currency: "PHP",
        itemName: checkoutItem.name,
        itemType: checkoutItem.type,
        credits: checkoutItem.credits || 0,
        qrphReference: qrphRefId,
        savePaymentMethod: formData.savePaymentMethod,
        timestamp: new Date().toISOString(),
      };

      console.log("📱 QRPH Payment Payload:", JSON.stringify(payload, null, 2));
      console.log("📱 Payment Method:", selectedMethod.name);
      console.log("💰 Amount:", checkoutItem.price);
      console.log("🔑 QRPH Reference:", qrphRefId);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const ref = `${selectedMethod.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      setReferenceNumber(ref);
      setIsSuccess(true);
    } catch (error: any) {
      console.error("❌ QRPH Payment Error:", error);
      setError(error.message || "Payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getItemIcon = () => {
    if (!checkoutItem) return null;
    if (checkoutItem.type === "custom") return <Wallet className="h-10 w-10 text-blue-400" />;
    if (checkoutItem.type === "topup") {
      switch (checkoutItem.id) {
        case "pocket": return <Wallet className="h-10 w-10 text-blue-400" />;
        case "bundle": return <Coins className="h-10 w-10 text-emerald-400" />;
        case "box": return <Gift className="h-10 w-10 text-purple-400" />;
        case "vault": return <Gem className="h-10 w-10 text-yellow-400" />;
        default: return <Coins className="h-10 w-10 text-blue-400" />;
      }
    }
    return <Crown className="h-10 w-10 text-yellow-400" />;
  };

  const getItemTypeLabel = () => {
    if (!checkoutItem) return "";
    if (checkoutItem.type === "custom") return "Custom Top-up";
    if (checkoutItem.type === "topup") return "Credit Pack";
    return "Subscription";
  };

  // Render Save Payment Method Checkbox - Only for Card payments
  const renderSavePaymentCheckbox = () => {
    // Only show for card payments
    if (selectedPayment !== "CARD") return null;
    
    return (
      <div className="flex items-center gap-2 mt-2">
        <input
          type="checkbox"
          id="savePaymentMethod"
          checked={formData.savePaymentMethod}
          onChange={(e) => {
            setFormData({ ...formData, savePaymentMethod: e.target.checked });
          }}
          className="w-4 h-4 rounded border-[#1e2130] bg-white/5 text-blue-500 focus:ring-blue-500 focus:ring-2 transition-all"
          disabled={isProcessing}
        />
        <label htmlFor="savePaymentMethod" className="text-xs text-zinc-400 cursor-pointer flex items-center gap-1.5">
          <Save className="h-3 w-3" />
          Save this card for future purchases
        </label>
      </div>
    );
  };

  // Render E-Wallet Form
  const renderEWalletForm = () => (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">
          Mobile Number <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="tel"
            placeholder="0912 345 6789"
            value={formData.mobileNumber}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/\D/g, '');
              let formatted = cleaned;
              if (cleaned.length >= 4 && cleaned.length <= 7) {
                formatted = `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
              } else if (cleaned.length > 7) {
                formatted = `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
              }
              setFormData({ ...formData, mobileNumber: formatted });
              if (formErrors.mobileNumber) {
                const { mobileNumber, ...rest } = formErrors;
                setFormErrors(rest);
              }
            }}
            className={`w-full bg-white/5 border ${formErrors.mobileNumber ? 'border-red-500' : 'border-[#1e2130]'} rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all`}
            disabled={isProcessing}
          />
        </div>
        {formErrors.mobileNumber && (
          <p className="text-xs text-red-400 mt-0.5">{formErrors.mobileNumber}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">
          Full Name <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Juan Dela Cruz"
            value={formData.fullName}
            onChange={(e) => {
              setFormData({ ...formData, fullName: e.target.value });
              if (formErrors.fullName) {
                const { fullName, ...rest } = formErrors;
                setFormErrors(rest);
              }
            }}
            className={`w-full bg-white/5 border ${formErrors.fullName ? 'border-red-500' : 'border-[#1e2130]'} rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all`}
            disabled={isProcessing}
          />
        </div>
        {formErrors.fullName && (
          <p className="text-xs text-red-400 mt-0.5">{formErrors.fullName}</p>
        )}
      </div>

      <button
        onClick={handlePayEWallet}
        disabled={isProcessing}
        className="w-full mt-2 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-sm font-bold text-white rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
    </div>
  );

  // Render Card Form - With Given Name and Surname fields
  const renderCardForm = () => (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">
          Card Number <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="1234 5678 9012 3456"
            value={formData.cardNumber}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/\D/g, '');
              const formatted = cleaned.replace(/(.{4})/g, '$1 ').trim();
              setFormData({ ...formData, cardNumber: formatted });
              if (formErrors.cardNumber) {
                const { cardNumber, ...rest } = formErrors;
                setFormErrors(rest);
              }
            }}
            maxLength={19}
            className={`w-full bg-white/5 border ${formErrors.cardNumber ? 'border-red-500' : 'border-[#1e2130]'} rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all`}
            disabled={isProcessing}
          />
        </div>
        {formErrors.cardNumber && (
          <p className="text-xs text-red-400 mt-0.5">{formErrors.cardNumber}</p>
        )}
        {formData.cardNumber.replace(/\s/g, '').length > 0 && (
          <div className="mt-1">
            <span className="text-[10px] text-zinc-400">
              Card Type: <span className="text-white font-medium">{detectCardType(formData.cardNumber)}</span>
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            Given Name <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="John"
              value={formData.givenName}
              onChange={(e) => {
                setFormData({ ...formData, givenName: e.target.value });
                if (formErrors.givenName) {
                  const { givenName, ...rest } = formErrors;
                  setFormErrors(rest);
                }
              }}
              className={`w-full bg-white/5 border ${formErrors.givenName ? 'border-red-500' : 'border-[#1e2130]'} rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all`}
              disabled={isProcessing}
            />
          </div>
          {formErrors.givenName && (
            <p className="text-xs text-red-400 mt-0.5">{formErrors.givenName}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            Surname <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Doe"
              value={formData.surname}
              onChange={(e) => {
                setFormData({ ...formData, surname: e.target.value });
                if (formErrors.surname) {
                  const { surname, ...rest } = formErrors;
                  setFormErrors(rest);
                }
              }}
              className={`w-full bg-white/5 border ${formErrors.surname ? 'border-red-500' : 'border-[#1e2130]'} rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all`}
              disabled={isProcessing}
            />
          </div>
          {formErrors.surname && (
            <p className="text-xs text-red-400 mt-0.5">{formErrors.surname}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            Expiry Date <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="MM/YY"
              value={formData.expiryDate}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/\D/g, '');
                if (cleaned.length <= 4) {
                  let formatted = cleaned;
                  if (cleaned.length > 2) {
                    formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
                  }
                  setFormData({ ...formData, expiryDate: formatted });
                  if (formErrors.expiryDate) {
                    const { expiryDate, ...rest } = formErrors;
                    setFormErrors(rest);
                  }
                }
              }}
              maxLength={5}
              className={`w-full bg-white/5 border ${formErrors.expiryDate ? 'border-red-500' : 'border-[#1e2130]'} rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all`}
              disabled={isProcessing}
            />
          </div>
          {formErrors.expiryDate && (
            <p className="text-xs text-red-400 mt-0.5">{formErrors.expiryDate}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            CVV <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="password"
              placeholder="***"
              value={formData.cvv}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/\D/g, '').slice(0, 4);
                setFormData({ ...formData, cvv: cleaned });
                if (formErrors.cvv) {
                  const { cvv, ...rest } = formErrors;
                  setFormErrors(rest);
                }
              }}
              maxLength={4}
              className={`w-full bg-white/5 border ${formErrors.cvv ? 'border-red-500' : 'border-[#1e2130]'} rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all`}
              disabled={isProcessing}
            />
          </div>
          {formErrors.cvv && (
            <p className="text-xs text-red-400 mt-0.5">{formErrors.cvv}</p>
          )}
        </div>
      </div>

      {renderSavePaymentCheckbox()}

      <button
        onClick={handlePayCard}
        disabled={isProcessing}
        className="w-full mt-2 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-sm font-bold text-white rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
    </div>
  );

  // Render QRPH Form
  const renderQRPHForm = () => {
    const handleCopy = () => {
      navigator.clipboard.writeText(qrphRefId);
      setQrphCopied(true);
      setTimeout(() => setQrphCopied(false), 2000);
    };

    return (
      <div className="space-y-3">
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <div className="bg-white rounded-lg p-2 inline-block mx-auto">
            <QrCode className="h-24 w-24 text-black" />
          </div>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="text-xs text-zinc-400">Reference:</span>
            <span className="text-xs font-mono text-white font-bold">{qrphRefId}</span>
            <button
              onClick={handleCopy}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              {qrphCopied ? (
                <Check className="h-3 w-3 text-emerald-400" />
              ) : (
                <Copy className="h-3 w-3 text-zinc-400" />
              )}
            </button>
          </div>
          <div className="flex items-center justify-center gap-2 mt-1 text-xs text-zinc-400">
            <Clock className="h-3 w-3 text-yellow-400" />
            <span>Expires in 15:00</span>
          </div>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex items-start gap-2 bg-white/5 border border-white/5 rounded-lg p-2">
            <Smartphone className="h-3.5 w-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-medium text-xs">Step 1</p>
              <p className="text-zinc-400 text-[10px]">Open your banking or e-wallet app</p>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-white/5 border border-white/5 rounded-lg p-2">
            <QrCode className="h-3.5 w-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-medium text-xs">Step 2</p>
              <p className="text-zinc-400 text-[10px]">Scan the QR code or enter the reference ID</p>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-white/5 border border-white/5 rounded-lg p-2">
            <Shield className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-medium text-xs">Step 3</p>
              <p className="text-zinc-400 text-[10px]">Confirm payment and click "I've Paid"</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handlePayQRPH}
          disabled={isProcessing}
          className="w-full mt-2 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              I've Paid
            </>
          )}
        </button>
      </div>
    );
  };

  if (!checkoutItem) {
    return (
      <div className="min-h-screen bg-[#080a12] flex items-center justify-center">
        <div className="text-zinc-400">Loading checkout...</div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#080a12]">
        <UserHeader pageTitle="Checkout" credits={userCurrentCredits} />
        <div className="mx-auto max-w-2xl p-6 md:p-8">
          <div className="bg-[#0d0f1a] border border-emerald-500/30 rounded-2xl p-8 text-center">
            <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Payment Successful!</h2>
            <p className="text-zinc-400 mb-4">
              {checkoutItem.type === "topup" || checkoutItem.type === "custom"
                ? `+${checkoutItem.credits} credits have been added to your account.` 
                : `Your account has been upgraded to ${checkoutItem.name}.`}
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
              onClick={() => navigate("/credit-shop")}
              className="px-6 py-3 bg-white text-[#080a12] font-bold rounded-xl hover:bg-zinc-200 transition-colors"
            >
              Return to Shop
            </button>
          </div>
        </div>
      </div>
    );
  }

  const selectedMethod = paymentMethods.find(p => p.id === selectedPayment);

  return (
    <div className="min-h-screen bg-[#080a12] text-white">
      <UserHeader pageTitle="Checkout" credits={userCurrentCredits} />
      
      <div className="absolute top-[10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/5 filter blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-10%] w-[500px] h-[500px] bg-teal-500/5 filter blur-[140px] pointer-events-none" />

      <div className="mx-auto max-w-4xl p-6 md:p-8 relative z-10">
        {/* Back Button */}
        <button
          onClick={() => navigate("/credit-shop")}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-4 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Shop
        </button>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-400 font-medium">Payment Error</p>
              <p className="text-xs text-red-400/70">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-5 gap-6">
          {/* Left Column - Payment Forms */}
          <div className="md:col-span-3 space-y-4">
            <div className="bg-[#0d0f1a]/80 backdrop-blur-md border border-[#1e2130] rounded-2xl p-5">
              <h2 className="text-lg font-bold mb-3">Payment Method</h2>

              {/* Payment Method Tabs */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => {
                      setSelectedPayment(method.id);
                      setFormErrors({});
                      // Reset savePaymentMethod when switching away from card
                      if (method.id !== "CARD") {
                        setFormData(prev => ({ ...prev, savePaymentMethod: false }));
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all duration-200 text-xs font-medium ${
                      selectedPayment === method.id
                        ? `${method.bgColor} ${method.borderColor} ring-1 ring-blue-500/30 text-white`
                        : "border-[#1e2130] hover:border-zinc-700 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <span className={method.color}>{method.icon}</span>
                    <span>{method.name}</span>
                    {selectedPayment === method.id && (
                      <Check className="h-2.5 w-2.5 text-blue-400" />
                    )}
                  </button>
                ))}
              </div>

              {/* Payment Form */}
              <div>
                {selectedMethod?.type === "EWALLET" && (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <Smartphone className="h-4 w-4 text-blue-400" />
                      <span className="text-sm font-medium text-white">
                        Pay with {selectedMethod.name}
                      </span>
                    </div>
                    {renderEWalletForm()}
                  </>
                )}

                {selectedMethod?.type === "CARD" && (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <CreditCard className="h-4 w-4 text-purple-400" />
                      <span className="text-sm font-medium text-white">
                        Pay with Credit/Debit Card
                      </span>
                    </div>
                    {renderCardForm()}
                  </>
                )}

                {selectedMethod?.type === "QR_CODE" && (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <QrCode className="h-4 w-4 text-orange-400" />
                      <span className="text-sm font-medium text-white">
                        Pay with QRPH
                      </span>
                    </div>
                    {renderQRPHForm()}
                  </>
                )}
              </div>

              {/* Security Note */}
              <div className="mt-3 flex items-start gap-2 bg-blue-500/5 border border-blue-500/10 rounded-xl p-2.5">
                <Shield className="h-3.5 w-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-zinc-400">
                  Your payment is secured and encrypted. All information is protected.
                </p>
              </div>

              <button
                onClick={() => navigate("/credits")}
                disabled={isProcessing}
                className="w-full mt-3 py-2.5 bg-transparent border border-[#1e2130] text-xs font-semibold text-zinc-400 rounded-xl hover:text-white hover:border-zinc-600 transition-all disabled:opacity-50"
              >
                Cancel Order
              </button>
            </div>
          </div>

          {/* Right Column - Review Order (Compact) */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-[#0d0f1a]/80 backdrop-blur-md border border-[#1e2130] rounded-2xl p-5 sticky top-20">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                Review Order
              </h3>

              {/* Compact Item Card */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white/5 rounded-lg flex-shrink-0">
                    {getItemIcon()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-medium text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                        {getItemTypeLabel()}
                      </span>
                      {checkoutItem.isCustom && (
                        <span className="text-[10px] font-medium text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                          Custom
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-white mt-0.5 truncate">{checkoutItem.name}</h4>
                    {checkoutItem.credits && (
                      <p className="text-emerald-400 font-medium text-xs">
                        +{checkoutItem.credits.toLocaleString()} Credits
                      </p>
                    )}
                    {checkoutItem.type === "subscription" && (
                      <p className="text-[10px] text-zinc-400">Monthly subscription</p>
                    )}
                    {checkoutItem.originalPrice && (
                      <p className="text-[10px] text-zinc-500 line-through">
                        {checkoutItem.originalPrice}
                      </p>
                    )}
                    {checkoutItem.savings && (
                      <span className="inline-block mt-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 border border-emerald-500/20">
                        {checkoutItem.savings}
                      </span>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-extrabold text-white">{checkoutItem.price}</p>
                    <p className="text-[9px] text-zinc-500">
                      {checkoutItem.type === "topup" || checkoutItem.type === "custom" ? "One-time" : "Monthly"}
                    </p>
                  </div>
                </div>

                {checkoutItem.type === "subscription" && checkoutItem.features && (
                  <div className="mt-2 pt-2 border-t border-white/5">
                    <p className="text-[10px] font-semibold text-zinc-400 mb-1.5">Plan Features:</p>
                    <div className="grid grid-cols-2 gap-1">
                      {checkoutItem.features.slice(0, 4).map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-1 text-[10px] text-zinc-300">
                          <Check className="h-2.5 w-2.5 text-emerald-400 flex-shrink-0" />
                          <span className="truncate">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Order Summary - Compact */}
              <div className="mt-3 bg-white/5 border border-white/10 rounded-xl p-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Subtotal</span>
                  <span className="text-white font-medium">{checkoutItem.price}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Transaction Fee</span>
                  <span className="text-white font-medium">₱0.00</span>
                </div>
                {checkoutItem.type === "subscription" && (
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">Billing Cycle</span>
                    <span className="text-white font-medium">Monthly</span>
                  </div>
                )}
                <div className="border-t border-white/5 pt-1.5 mt-0.5">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-semibold text-zinc-300">Total</span>
                    <span className="text-xl font-extrabold text-white">{checkoutItem.price}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method Selected */}
              <div className="mt-3 p-2 bg-white/5 border border-white/5 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400">Paying with</span>
                  <span className="text-xs font-medium text-white flex items-center gap-1.5">
                    <span className={selectedMethod?.color}>{selectedMethod?.icon}</span>
                    {selectedMethod?.name}
                  </span>
                </div>
                {selectedMethod?.type === "CARD" && formData.cardNumber.replace(/\s/g, '').length > 0 && (
                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-white/5">
                    <span className="text-[10px] text-zinc-400">Card Type</span>
                    <span className="text-[10px] font-medium text-white">
                      {detectCardType(formData.cardNumber)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;