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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-center shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-amber-300/80 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
          <ShieldAlert className="h-7 w-7" />
        </div>

        <h3 className="mt-4 text-lg font-bold text-zinc-900 dark:text-white">
          Verify your account first
        </h3>
        <p className="mt-2 text-xs sm:text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          Your personal account must be verified before you can submit a
          business verification application for this Team.
        </p>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold px-4 py-2.5 text-xs transition active:scale-[0.98] cursor-pointer order-2 sm:order-1"
          >
            Not Now
          </button>
          <button
            type="button"
            onClick={onVerifyAccount}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition cursor-pointer order-1 sm:order-2"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Verify My Account</span>
          </button>
        </div>
      </div>
    </div>
  );
}
