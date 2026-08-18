import React, { useState } from 'react';
import { X, LoaderCircle, CheckCircle } from 'lucide-react';
import { CreditIcon } from '@/components/ui/credit-icon';
import { showSuccessToast } from '@/components/utility/toast';
import useGlobalState from '@/lib/global_state';

interface ClaimCreditsModalProps {
    isOpen: boolean;
    onClose: () => void;
    contractId: string;
    contractValue: string;
    onSuccess: () => void;
}

export const ClaimCreditsModal: React.FC<ClaimCreditsModalProps> = ({ isOpen, onClose, contractId, contractValue, onSuccess }) => {
    const { user } = useGlobalState();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isClaimed, setIsClaimed] = useState(false);

    if (!isOpen) return null;

    const rawValue = typeof contractValue === 'number' ? contractValue : parseInt(String(contractValue).replace(/,/g, ''));
    const fee = Math.floor(rawValue * 0.10);
    const net = Math.floor(rawValue * 0.90);

    const handleClaim = () => {
        setIsSubmitting(true);
        // Simulate API call for claiming credits
        setTimeout(() => {
            setIsSubmitting(false);
            setIsClaimed(true);
            showSuccessToast(`Successfully claimed ${net.toLocaleString()} credits!`);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1500);
        }, 1200);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-dark-base border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white">Claim Credits</h2>
                    <button 
                        onClick={onClose}
                        disabled={isSubmitting || isClaimed}
                        className="text-zinc-500 hover:text-white transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    <div className="text-center space-y-2">
                        <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-500/20">
                            <CreditIcon className="w-8 h-8 text-yellow-500" />
                        </div>
                        <h3 className="text-lg font-bold text-white">Ready to Claim</h3>
                        <p className="text-sm text-zinc-400">The client has completed their review. Your payment is ready to be released to your wallet.</p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between text-zinc-400">
                                <span>Gross Contract Value:</span>
                                <span className="flex items-center gap-1 font-mono text-zinc-300">
                                    <CreditIcon className="w-4 h-4 text-yellow-500" /> {rawValue.toLocaleString()}
                                </span>
                            </div>
                            <div className="flex justify-between text-red-400">
                                <span>Platform Fee (10%):</span>
                                <span className="flex items-center gap-1 font-mono">
                                    - <CreditIcon className="w-4 h-4 text-yellow-500" /> {fee.toLocaleString()}
                                </span>
                            </div>
                            <div className="pt-3 border-t border-white/10 flex justify-between font-bold text-white text-base">
                                <span>Net Payout:</span>
                                <span className="flex items-center gap-1 font-mono text-yellow-400">
                                    <CreditIcon className="w-5 h-5" /> {net.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Final Balance Preview */}
                    <div className="bg-dark-base/50 border border-white/5 rounded-xl p-4 flex items-center justify-between">
                        <span className="text-sm font-semibold text-zinc-400">New Wallet Balance:</span>
                        <span className="flex items-center gap-1 font-mono text-lg font-bold text-white">
                            <CreditIcon className="w-5 h-5 text-yellow-500" /> 
                            {((user?.credits || 0) + net).toLocaleString()}
                        </span>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 bg-dark-surface/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting || isClaimed}
                        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-zinc-300 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleClaim}
                        disabled={isSubmitting || isClaimed}
                        className={`flex items-center justify-center min-w-[140px] px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 shadow-lg ${
                            isClaimed 
                                ? 'bg-emerald-600 text-white shadow-emerald-600/20' 
                                : 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-yellow-500/20'
                        }`}
                    >
                        {isClaimed ? (
                            <><CheckCircle className="w-5 h-5 mr-2" /> Claimed</>
                        ) : isSubmitting ? (
                            <LoaderCircle className="w-5 h-5 animate-spin" />
                        ) : (
                            "Confirm & Claim"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
