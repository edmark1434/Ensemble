// GCashForm.tsx
import { useState } from 'react';
import { Phone, User, Mail, Loader2, Check, AlertCircle, Shield, Smartphone } from 'lucide-react';

interface GCashFormProps {
  amount: string;
  itemName: string;
  onSubmit: (data: GCashFormData) => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export interface GCashFormData {
  mobileNumber: string;
  fullName: string;
  email: string;
  amount: number;
  itemName: string;
  paymentMethod: 'GCASH';
}

const GCashForm: React.FC<GCashFormProps> = ({
  amount,
  itemName,
  onSubmit,
  onCancel,
  isProcessing = false,
}) => {
  const [formData, setFormData] = useState({
    mobileNumber: '',
    fullName: '',
    email: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({});
  const [isValidating, setIsValidating] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof typeof formData, string>> = {};

    // Validate mobile number (Philippine format)
    const cleanNumber = formData.mobileNumber.replace(/\s/g, '');
    if (!cleanNumber) {
      newErrors.mobileNumber = 'Mobile number is required';
    } else if (!/^(09|\+639|9)\d{9}$/.test(cleanNumber)) {
      newErrors.mobileNumber = 'Please enter a valid Philippine mobile number (e.g., 09123456789)';
    }

    // Validate full name
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 3) {
      newErrors.fullName = 'Please enter your full name';
    }

    // Validate email
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsValidating(true);
    try {
      // Simulate validation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onSubmit({
        mobileNumber: formData.mobileNumber.replace(/\s/g, ''),
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        amount: parseFloat(amount.replace(/[₱,]/g, '')),
        itemName,
        paymentMethod: 'GCASH',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleMobileChange = (value: string) => {
    // Format mobile number
    const cleaned = value.replace(/\D/g, '');
    let formatted = cleaned;
    
    if (cleaned.length >= 4 && cleaned.length <= 7) {
      formatted = `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
    } else if (cleaned.length > 7) {
      formatted = `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    }
    
    setFormData({ ...formData, mobileNumber: formatted });
    if (errors.mobileNumber) {
      setErrors({ ...errors, mobileNumber: undefined });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Order Summary */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs text-zinc-400">Payment Method</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="p-1.5 bg-blue-500/10 rounded-lg">
                <Smartphone className="h-4 w-4 text-blue-400" />
              </div>
              <p className="text-sm font-semibold text-white">GCash</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-400">Amount</p>
            <p className="text-2xl font-extrabold text-white">{amount}</p>
          </div>
        </div>
        <p className="text-xs text-zinc-500 mt-2">Item: {itemName}</p>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        {/* Mobile Number */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            Mobile Number <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <Phone className="h-5 w-5 text-zinc-500" />
            </div>
            <input
              type="tel"
              placeholder="0912 345 6789"
              value={formData.mobileNumber}
              onChange={(e) => handleMobileChange(e.target.value)}
              className={`w-full bg-white/5 border ${errors.mobileNumber ? 'border-red-500' : 'border-[#1e2130]'} rounded-xl pl-10 pr-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all`}
              disabled={isProcessing || isValidating}
            />
          </div>
          {errors.mobileNumber && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.mobileNumber}
            </p>
          )}
          <p className="text-xs text-zinc-500 mt-1">
            Enter your GCash-registered mobile number
          </p>
        </div>

        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            Full Name <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <User className="h-5 w-5 text-zinc-500" />
            </div>
            <input
              type="text"
              placeholder="Juan Dela Cruz"
              value={formData.fullName}
              onChange={(e) => {
                setFormData({ ...formData, fullName: e.target.value });
                if (errors.fullName) {
                  setErrors({ ...errors, fullName: undefined });
                }
              }}
              className={`w-full bg-white/5 border ${errors.fullName ? 'border-red-500' : 'border-[#1e2130]'} rounded-xl pl-10 pr-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all`}
              disabled={isProcessing || isValidating}
            />
          </div>
          {errors.fullName && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.fullName}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            Email Address <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <Mail className="h-5 w-5 text-zinc-500" />
            </div>
            <input
              type="email"
              placeholder="juan@example.com"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (errors.email) {
                  setErrors({ ...errors, email: undefined });
                }
              }}
              className={`w-full bg-white/5 border ${errors.email ? 'border-red-500' : 'border-[#1e2130]'} rounded-xl pl-10 pr-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all`}
              disabled={isProcessing || isValidating}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.email}
            </p>
          )}
        </div>
      </div>

      {/* Security Note */}
      <div className="flex items-start gap-2 bg-blue-500/5 border border-blue-500/10 rounded-xl p-3">
        <Shield className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs text-zinc-400 font-medium">Secure Payment</p>
          <p className="text-[10px] text-zinc-500">
            Your information is encrypted and secure. You will receive a confirmation email.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl transition-colors border border-[#1e2130]"
          disabled={isProcessing || isValidating}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isProcessing || isValidating}
          className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isProcessing || isValidating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              {isValidating ? 'Validating...' : 'Processing...'}
            </>
          ) : (
            <>
              <Check className="h-5 w-5" />
              Pay with GCash
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default GCashForm;