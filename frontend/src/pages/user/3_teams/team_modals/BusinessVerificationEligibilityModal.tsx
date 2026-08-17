import { ShieldAlert, ShieldCheck, X } from "lucide-react";

interface BusinessVerificationEligibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerifyAccount: () => void;
}

export default function BusinessVerificationEligibilityModal({
  isOpen,
  onClose,
  onVerifyAccount,
}: BusinessVerificationEligibilityModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-dark-surface p-6 text-center shadow-2xl animate-scale-in">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-amber-400/25 bg-amber-500/10 text-amber-300">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <h3 className="mt-5 text-xl font-semibold text-white">
          Verify your account first
        </h3>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Your personal account must be verified before you can submit a
          business verification application for this Team.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onVerifyAccount}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2.5 text-sm font-medium text-white transition hover:scale-[1.02]"
          >
            <ShieldCheck className="h-4 w-4" />
            Verify My Account
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-white/15 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/5"
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
}
