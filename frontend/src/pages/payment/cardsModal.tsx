// CardModal.tsx
import { useState } from 'react';
import { X, Loader2, Check, AlertCircle, CreditCard, Lock, Calendar, User, ArrowRight, Shield } from 'lucide-react';

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: string;
  amountValue: number;
  itemName: string;
  onSuccess?: () => void;
}

interface CardDetails {
  cardNumber: string;
  cardHolder: string;
  expiryDate: string;
  cvv: string;
}

const CardModal: React.FC<CardModalProps> = ({
  isOpen,
  onClose,
  amount,
  amountValue,
  itemName,
  onSuccess,
}) => {
  const [step, setStep] = useState<'form' | 'processing' | 'success' | 'error'>('form');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);
  const [cardDetails, setCardDetails] = useState<CardDetails>({
    cardNumber: '',
    cardHolder: '',
    expiryDate: '',
    cvv: '',
  });

  const [errors, setErrors] = useState<Partial<CardDetails>>({});

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: Partial<CardDetails> = {};

    // Validate card number (16 digits)
    const cleanCardNumber = cardDetails.cardNumber.replace(/\s/g, '');
    if (!/^\d{16}$/.test(cleanCardNumber)) {
      newErrors.cardNumber = 'Please enter a valid 16-digit card number';
    }

    // Validate card holder
    if (!cardDetails.cardHolder.trim() || cardDetails.cardHolder.trim().length < 3) {
      newErrors.cardHolder = 'Please enter the card holder name';
    }

    // Validate expiry date (MM/YY)
    const expiryRegex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
    if (!expiryRegex.test(cardDetails.expiryDate)) {
      newErrors.expiryDate = 'Please enter a valid expiry date (MM/YY)';
    } else {
      const [month, year] = cardDetails.expiryDate.split('/').map(Number);
      const currentYear = new Date().getFullYear() % 100;
      const currentMonth = new Date().getMonth() + 1;
      
      if (year < currentYear || (year === currentYear && month < currentMonth)) {
        newErrors.expiryDate = 'Card has expired';
      }
    }

    // Validate CVV (3-4 digits)
    if (!/^\d{3,4}$/.test(cardDetails.cvv)) {
      newErrors.cvv = 'Please enter a valid CVV (3-4 digits)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCardNumberChange = (value: string) => {
    // Format card number with spaces
    const cleaned = value.replace(/\D/g, '');
    const formatted = cleaned.replace(/(.{4})/g, '$1 ').trim();
    setCardDetails({ ...cardDetails, cardNumber: formatted });
    
    if (errors.cardNumber) {
      setErrors({ ...errors, cardNumber: undefined });
    }
  };

  const handleExpiryChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 4) {
      let formatted = cleaned;
      if (cleaned.length > 2) {
        formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
      }
      setCardDetails({ ...cardDetails, expiryDate: formatted });
      
      if (errors.expiryDate) {
        setErrors({ ...errors, expiryDate: undefined });
      }
    }
  };

  const handleCvvChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 4);
    setCardDetails({ ...cardDetails, cvv: cleaned });
    
    if (errors.cvv) {
      setErrors({ ...errors, cvv: undefined });
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setStep('processing');
    setErrorMessage(null);

    try {
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2500));

      // Generate random reference number
      const ref = `CARD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      setReferenceNumber(ref);

      // Simulate success (85% chance)
      if (Math.random() > 0.15) {
        setStep('success');
        if (onSuccess) setTimeout(onSuccess, 1500);
      } else {
        throw new Error('Payment failed. Please check your card details and try again.');
      }
    } catch (error: any) {
      setStep('error');
      setErrorMessage(error.message || 'An error occurred during payment.');
    }
  };

  const handleClose = () => {
    setStep('form');
    setErrorMessage(null);
    setReferenceNumber(null);
    setCardDetails({
      cardNumber: '',
      cardHolder: '',
      expiryDate: '',
      cvv: '',
    });
    setErrors({});
    onClose();
  };

  const getCardType = (number: string) => {
    const clean = number.replace(/\s/g, '');
    if (clean.startsWith('4')) return 'Visa';
    if (clean.startsWith('5')) return 'Mastercard';
    if (clean.startsWith('3')) return 'American Express';
    if (clean.startsWith('6')) return 'Discover';
    return 'Card';
  };

  const getCardBrandColor = (number: string) => {
    const clean = number.replace(/\s/g, '');
    if (clean.startsWith('4')) return 'text-blue-400';
    if (clean.startsWith('5')) return 'text-red-400';
    if (clean.startsWith('3')) return 'text-teal-400';
    if (clean.startsWith('6')) return 'text-orange-400';
    return 'text-white';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#0d0f1a] border border-[#1e2130] rounded-2xl shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors z-10"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="p-6 border-b border-[#1e2130]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <CreditCard className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Card Payment</h2>
              <p className="text-sm text-zinc-400">Pay with credit or debit card</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'form' && (
            <>
              {/* Order Summary */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-zinc-400">Item</p>
                    <p className="text-sm font-semibold text-white">{itemName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-400">Total</p>
                    <p className="text-xl font-extrabold text-white">{amount}</p>
                  </div>
                </div>
              </div>

              {/* Card Form */}
              <div className="space-y-4">
                {/* Card Number */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    Card Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      value={cardDetails.cardNumber}
                      onChange={(e) => handleCardNumberChange(e.target.value)}
                      className={`w-full bg-white/5 border ${errors.cardNumber ? 'border-red-500' : 'border-[#1e2130]'} rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all`}
                      maxLength={19}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {cardDetails.cardNumber.replace(/\s/g, '').length > 0 && (
                        <span className={`text-xs font-semibold ${getCardBrandColor(cardDetails.cardNumber)}`}>
                          {getCardType(cardDetails.cardNumber)}
                        </span>
                      )}
                    </div>
                  </div>
                  {errors.cardNumber && (
                    <p className="text-xs text-red-400 mt-1">{errors.cardNumber}</p>
                  )}
                </div>

                {/* Card Holder */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    Card Holder Name
                  </label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={cardDetails.cardHolder}
                    onChange={(e) => {
                      setCardDetails({ ...cardDetails, cardHolder: e.target.value });
                      if (errors.cardHolder) {
                        setErrors({ ...errors, cardHolder: undefined });
                      }
                    }}
                    className={`w-full bg-white/5 border ${errors.cardHolder ? 'border-red-500' : 'border-[#1e2130]'} rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all`}
                  />
                  {errors.cardHolder && (
                    <p className="text-xs text-red-400 mt-1">{errors.cardHolder}</p>
                  )}
                </div>

                {/* Expiry & CVV */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      value={cardDetails.expiryDate}
                      onChange={(e) => handleExpiryChange(e.target.value)}
                      className={`w-full bg-white/5 border ${errors.expiryDate ? 'border-red-500' : 'border-[#1e2130]'} rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all`}
                      maxLength={5}
                    />
                    {errors.expiryDate && (
                      <p className="text-xs text-red-400 mt-1">{errors.expiryDate}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                      CVV
                    </label>
                    <input
                      type="password"
                      placeholder="***"
                      value={cardDetails.cvv}
                      onChange={(e) => handleCvvChange(e.target.value)}
                      className={`w-full bg-white/5 border ${errors.cvv ? 'border-red-500' : 'border-[#1e2130]'} rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all`}
                      maxLength={4}
                    />
                    {errors.cvv && (
                      <p className="text-xs text-red-400 mt-1">{errors.cvv}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Security Note */}
              <div className="mt-6 flex items-start gap-2 bg-blue-500/5 border border-blue-500/10 rounded-xl p-3">
                <Lock className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-zinc-400 font-medium">Secure Payment</p>
                  <p className="text-[10px] text-zinc-500">Your card details are encrypted and secure</p>
                </div>
              </div>

              {/* Pay Button */}
              <button
                onClick={handleSubmit}
                className="w-full mt-6 py-3.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 group"
              >
                Pay {amount}
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </>
          )}

          {step === 'processing' && (
            <div className="text-center py-8">
              <div className="relative">
                <div className="h-16 w-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-blue-400 animate-spin" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mt-4">Processing Payment</h3>
              <p className="text-sm text-zinc-400 mt-1">
                Please wait while we process your card payment...
              </p>
              <div className="mt-4 bg-white/5 border border-white/10 rounded-lg p-3">
                <p className="text-xs text-zinc-400">Card</p>
                <p className="text-sm font-mono text-white">
                  {getCardType(cardDetails.cardNumber)} •••• {cardDetails.cardNumber.slice(-4)}
                </p>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white mt-4">Payment Successful!</h3>
              <p className="text-sm text-zinc-400 mt-1">
                Your card payment has been processed successfully
              </p>
              <div className="mt-4 bg-white/5 border border-white/10 rounded-lg p-3">
                <p className="text-xs text-zinc-400">Reference Number</p>
                <p className="text-sm font-mono text-white font-bold">{referenceNumber}</p>
              </div>
              <div className="mt-4 bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3">
                <p className="text-xs text-emerald-400">✓ Payment confirmed</p>
                <p className="text-xs text-zinc-400">
                  Credits will be added to your account shortly
                </p>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center py-8">
              <div className="h-16 w-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="h-8 w-8 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white mt-4">Payment Failed</h3>
              <p className="text-sm text-zinc-400 mt-1">{errorMessage}</p>
              <button
                onClick={() => {
                  setStep('form');
                  setErrorMessage(null);
                }}
                className="mt-6 px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === 'form' || step === 'error') && (
          <div className="p-6 border-t border-[#1e2130] bg-white/5">
            <button
              onClick={handleClose}
              className="w-full py-2.5 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Cancel Payment
            </button>
          </div>
        )}

        {(step === 'success') && (
          <div className="p-6 border-t border-emerald-500/20 bg-emerald-500/5">
            <button
              onClick={handleClose}
              className="w-full py-2.5 text-sm text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CardModal;