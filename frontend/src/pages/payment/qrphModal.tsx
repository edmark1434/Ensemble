// QRPHModal.tsx
import { useState, useEffect } from 'react';
import { X, Loader2, Check, AlertCircle, QrCode, Download, Copy, ExternalLink, Clock, Shield, Smartphone } from 'lucide-react';

interface QRPHModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: string;
  amountValue: number;
  itemName: string;
  qrCodeData?: string;
  referenceId?: string;
  expiry?: string;
  onSuccess?: () => void;
}

const QRPHModal: React.FC<QRPHModalProps> = ({
  isOpen,
  onClose,
  amount,
  amountValue,
  itemName,
  qrCodeData,
  referenceId,
  expiry = '15 minutes',
  onSuccess,
}) => {
  const [step, setStep] = useState<'qr' | 'processing' | 'success' | 'error'>('qr');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(15 * 60); // 15 minutes in seconds
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen && step === 'qr' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setStep('error');
            setErrorMessage('QR Code has expired. Please request a new one.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, step, timeLeft]);

  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyReference = () => {
    if (referenceId) {
      navigator.clipboard.writeText(referenceId);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleDownloadQR = () => {
    // Simulate QR code download
    const qrCanvas = document.getElementById('qr-canvas') as HTMLCanvasElement;
    if (qrCanvas) {
      const link = document.createElement('a');
      link.download = `qrph-payment-${referenceId}.png`;
      link.href = qrCanvas.toDataURL('image/png');
      link.click();
    } else {
      // Fallback: create a mock download
      const link = document.createElement('a');
      link.download = `qrph-payment-${referenceId}.png`;
      link.href = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      link.click();
    }
  };

  const handlePaymentComplete = () => {
    setStep('processing');
    setTimeout(() => {
      setStep('success');
      if (onSuccess) setTimeout(onSuccess, 1500);
    }, 2000);
  };

  const handleClose = () => {
    setStep('qr');
    setErrorMessage(null);
    setTimeLeft(15 * 60);
    setIsCopied(false);
    onClose();
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
            <div className="p-2 bg-purple-500/10 rounded-xl">
              <QrCode className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">QRPH Payment</h2>
              <p className="text-sm text-zinc-400">Scan QR code to pay</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'qr' && (
            <>
              {/* Order Summary */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-zinc-400">Item</p>
                    <p className="text-sm font-semibold text-white">{itemName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-400">Amount</p>
                    <p className="text-xl font-extrabold text-white">{amount}</p>
                  </div>
                </div>
                {referenceId && (
                  <div className="mt-2 pt-2 border-t border-white/5 flex justify-between items-center">
                    <p className="text-xs text-zinc-400">Reference ID</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-mono text-white">{referenceId}</p>
                      <button
                        onClick={handleCopyReference}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                      >
                        {isCopied ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3 text-zinc-400" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* QR Code Display */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
                <div className="flex justify-center">
                  <div className="relative">
                    {qrCodeData ? (
                      <img
                        src={qrCodeData}
                        alt="QRPH Code"
                        className="w-48 h-48 object-contain bg-white rounded-lg p-2"
                      />
                    ) : (
                      <div className="w-48 h-48 bg-white rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <QrCode className="h-16 w-16 text-zinc-300 mx-auto" />
                          <p className="text-xs text-zinc-400 mt-2">QR Code Placeholder</p>
                        </div>
                      </div>
                    )}
                    <canvas id="qr-canvas" className="hidden" />
                  </div>
                </div>

                {/* Timer */}
                <div className="flex items-center justify-center gap-2 mt-3 text-sm">
                  <Clock className="h-4 w-4 text-yellow-400" />
                  <span className="text-zinc-400">Expires in:</span>
                  <span className={`font-mono font-bold ${timeLeft < 60 ? 'text-red-400' : 'text-yellow-400'}`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-2 mb-6">
                <div className="flex items-start gap-2 text-sm bg-white/5 border border-white/5 rounded-lg p-3">
                  <Smartphone className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Step 1</p>
                    <p className="text-zinc-400 text-xs">Open your banking or e-wallet app</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm bg-white/5 border border-white/5 rounded-lg p-3">
                  <QrCode className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Step 2</p>
                    <p className="text-zinc-400 text-xs">Scan the QR code or enter the reference ID</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm bg-white/5 border border-white/5 rounded-lg p-3">
                  <Shield className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Step 3</p>
                    <p className="text-zinc-400 text-xs">Confirm payment and wait for confirmation</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleDownloadQR}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Download className="h-4 w-4" />
                  Download QR
                </button>
                <button
                  onClick={handlePaymentComplete}
                  className="flex-1 py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold rounded-xl hover:opacity-90 transition-colors text-sm"
                >
                  I've Paid
                </button>
              </div>

              <p className="text-center text-xs text-zinc-500 mt-4">
                After payment, click "I've Paid" to confirm
              </p>
            </>
          )}

          {step === 'processing' && (
            <div className="text-center py-8">
              <div className="relative">
                <div className="h-16 w-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-purple-400 animate-spin" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mt-4">Verifying Payment</h3>
              <p className="text-sm text-zinc-400 mt-1">
                Please wait while we verify your payment...
              </p>
              <div className="mt-4 bg-white/5 border border-white/10 rounded-lg p-3">
                <p className="text-xs text-zinc-400">Reference ID</p>
                <p className="text-sm font-mono text-white font-bold">{referenceId}</p>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white mt-4">Payment Confirmed!</h3>
              <p className="text-sm text-zinc-400 mt-1">
                Your QRPH payment has been verified
              </p>
              <div className="mt-4 bg-white/5 border border-white/10 rounded-lg p-3">
                <p className="text-xs text-zinc-400">Reference ID</p>
                <p className="text-sm font-mono text-white font-bold">{referenceId}</p>
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
              <h3 className="text-lg font-bold text-white mt-4">Payment Error</h3>
              <p className="text-sm text-zinc-400 mt-1">{errorMessage}</p>
              <button
                onClick={() => {
                  setStep('qr');
                  setErrorMessage(null);
                  setTimeLeft(15 * 60);
                }}
                className="mt-6 px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors"
              >
                Request New QR
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === 'qr' || step === 'error') && (
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

export default QRPHModal;