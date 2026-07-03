// EWalletModal.tsx (Updated with type-only imports)
import { useState } from 'react';
import { X, Loader2, Check, AlertCircle, Smartphone, Shield, Clock, CreditCard, QrCode } from 'lucide-react';
import GCashForm from './Ewallet-Forms/gcashForm';
import type { GCashFormData } from './Ewallet-Forms/gcashForm';
import MayaForm from './Ewallet-Forms/mayaForm';
import type { MayaFormData } from './Ewallet-Forms/mayaForm';

interface EWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: string;
  amountValue: number;
  itemName: string;
  paymentMethod: {
    id: string;
    name: string;
    channelCode: string;
  };
  onSuccess?: (data: any) => void;
}

const EWalletModal: React.FC<EWalletModalProps> = ({
  isOpen,
  onClose,
  amount,
  amountValue,
  itemName,
  paymentMethod,
  onSuccess,
}) => {
  const [step, setStep] = useState<'form' | 'processing' | 'success' | 'error'>('form');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleFormSubmit = async (data: GCashFormData | MayaFormData) => {
    setStep('processing');
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Log the payment data
      console.log('Payment Data:', {
        ...data,
        paymentMethod: paymentMethod.id,
        channelCode: paymentMethod.channelCode,
      });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Generate reference number
      const ref = `${paymentMethod.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      setReferenceNumber(ref);

      // Simulate success (90% chance)
      if (Math.random() > 0.1) {
        setStep('success');
        if (onSuccess) {
          setTimeout(() => {
            onSuccess({ ...data, referenceNumber: ref });
          }, 1500);
        }
      } else {
        throw new Error('Payment failed. Please try again.');
      }
    } catch (error: any) {
      setStep('error');
      setErrorMessage(error.message || 'An error occurred during payment.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    setErrorMessage(null);
    setReferenceNumber(null);
    setIsProcessing(false);
    onClose();
  };

  const getMethodDetails = () => {
    switch (paymentMethod.id) {
      case 'GCASH':
        return {
          icon: <Smartphone className="h-6 w-6" />,
          color: 'text-blue-400',
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/20',
          gradient: 'from-blue-500 to-purple-600',
        };
      case 'MAYA':
        return {
          icon: <Smartphone className="h-6 w-6" />,
          color: 'text-green-400',
          bg: 'bg-green-500/10',
          border: 'border-green-500/20',
          gradient: 'from-green-500 to-teal-500',
        };
      default:
        return {
          icon: <CreditCard className="h-6 w-6" />,
          color: 'text-purple-400',
          bg: 'bg-purple-500/10',
          border: 'border-purple-500/20',
          gradient: 'from-purple-500 to-blue-500',
        };
    }
  };

  const methodDetails = getMethodDetails();

  const renderForm = () => {
    switch (paymentMethod.id) {
      case 'GCASH':
        return (
          <GCashForm
            amount={amount}
            itemName={itemName}
            onSubmit={handleFormSubmit}
            onCancel={handleClose}
            isProcessing={isProcessing}
          />
        );
      case 'MAYA':
        return (
          <MayaForm
            amount={amount}
            itemName={itemName}
            onSubmit={handleFormSubmit}
            onCancel={handleClose}
            isProcessing={isProcessing}
          />
        );
      default:
        return (
          <div className="text-center py-8 text-zinc-400">
            Payment method not supported
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#0d0f1a] border border-[#1e2130] rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors z-10"
          disabled={step === 'processing'}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="p-6 border-b border-[#1e2130]">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${methodDetails.bg} ${methodDetails.border}`}>
              {methodDetails.icon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Pay with {paymentMethod.name}
              </h2>
              <p className="text-sm text-zinc-400">{paymentMethod.channelCode}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'form' && renderForm()}

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
                Please wait while we process your {paymentMethod.name} payment...
              </p>
              <div className="mt-4 bg-white/5 border border-white/10 rounded-lg p-3">
                <p className="text-xs text-zinc-400">Payment Method</p>
                <p className="text-sm font-medium text-white">{paymentMethod.name}</p>
                <p className="text-xs text-zinc-400 mt-1">Amount</p>
                <p className="text-lg font-bold text-white">{amount}</p>
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
                Your {paymentMethod.name} payment has been processed successfully
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
                  setIsProcessing(false);
                }}
                className="mt-6 px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'success' && (
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

export default EWalletModal;