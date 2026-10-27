import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { X, ShieldCheck, AlertCircle, ShoppingCart, Loader2 } from "lucide-react";
import { CreditIcon } from "@/components/ui/credit-icon";
import { SlideCommit } from "@/components/ui/SlideCommit";
import api from "@/lib/axios";
import useGlobalState from "@/lib/global_state";

interface OrderCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  gigTitle: string;
  gigThumbnail?: string;
  tierName: string;
  totalPrice: number;
  totalDeliveryDays: number;
  onConfirmOrder: () => Promise<void>;
  editOrderId?: string | null;
}

export const OrderCheckoutModal: React.FC<OrderCheckoutModalProps> = ({
  isOpen,
  onClose,
  gigTitle,
  gigThumbnail,
  tierName,
  totalPrice,
  totalDeliveryDays,
  onConfirmOrder,
  editOrderId,
}) => {
  const user = useGlobalState((state) => state.user);
  const rawGlobalCredits = user?.wallet?.balance_credits;
  const initialCredits =
    rawGlobalCredits !== undefined && rawGlobalCredits !== null && !isNaN(Number(rawGlobalCredits))
      ? Number(rawGlobalCredits)
      : null;

  const [walletBalance, setWalletBalance] = useState<number | null>(initialCredits);
  const [isLoadingBalance, setIsLoadingBalance] = useState(initialCredits === null);

  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;

    // Refresh live balance from accounts wallet endpoint
    api
      .get("/api/accounts/wallet", { params: { type: "account_wallets" } })
      .then((res) => {
        if (!isCancelled) {
          const raw = res.data?.wallet?.balance_credits;
          if (raw !== undefined && raw !== null && !isNaN(Number(raw))) {
            const val = Number(raw);
            setWalletBalance(val);
            const currentUser = useGlobalState.getState().user;
            if (currentUser) {
              useGlobalState.getState().setUser({
                ...currentUser,
                wallet: { ...(currentUser.wallet || {}), balance_credits: val },
              });
            }
          }
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch wallet balance:", err);
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingBalance(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentBalance = walletBalance ?? 0;
  // If editing an existing order, funds are usually already allocated or held
  const isInsufficient = !editOrderId && walletBalance !== null && currentBalance < totalPrice;
  const remainingBalance = currentBalance - totalPrice;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-dark-surface border border-zinc-200 dark:border-zinc-800 p-6 sm:p-7 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-center shrink-0">
              <ShoppingCart className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white leading-tight">
                {editOrderId ? "Update Gig Order" : "Place Gig Order"}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Confirm your order details and commit with escrow protection.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Service Summary Strip */}
        <div className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 flex items-center gap-3">
          {gigThumbnail && (
            <img
              src={gigThumbnail}
              alt=""
              className="h-12 w-12 rounded-xl object-cover shrink-0 border border-zinc-200 dark:border-zinc-700"
            />
          )}
          <div className="min-w-0 flex-1">
            <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white truncate">
              {gigTitle}
            </h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
              {tierName} • {totalDeliveryDays} Days Timeline
            </p>
          </div>
          <div className="flex items-center gap-1 font-bold text-sm text-zinc-900 dark:text-white shrink-0">
            <CreditIcon className="h-3.5 w-3.5 text-amber-500" />
            <span>{totalPrice.toLocaleString()} Cr</span>
          </div>
        </div>

        {/* Escrow Notice */}
        <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 flex items-start gap-2.5 text-xs text-zinc-600 dark:text-zinc-400">
          <ShieldCheck className="h-4 w-4 text-zinc-500 dark:text-zinc-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px] sm:text-xs">
            <strong className="font-semibold text-zinc-800 dark:text-zinc-200">
              Escrow Protection:
            </strong>{" "}
            Credits are held securely by the platform upon seller acceptance and only released when you inspect and approve completed deliverables.
          </p>
        </div>

        {/* Ledger & Balance Details */}
        <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-2.5 text-xs">
          <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
            <span>Your Available Balance</span>
            {isLoadingBalance ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />
            ) : (
              <span className="font-bold text-zinc-900 dark:text-white flex items-center gap-1">
                <CreditIcon className="h-3.5 w-3.5 text-amber-500" />
                {currentBalance.toLocaleString()} Credits
              </span>
            )}
          </div>

          <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
            <span>Order Escrow Commitment</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-200 flex items-center gap-1">
              <CreditIcon className="h-3.5 w-3.5 text-amber-500" />
              -{totalPrice.toLocaleString()} Credits
            </span>
          </div>

          <div className="h-px w-full bg-zinc-200 dark:bg-zinc-800 my-1" />

          <div className="flex justify-between items-center pt-0.5">
            <span className="font-bold text-zinc-900 dark:text-white">
              Estimated Remaining Balance
            </span>
            <span
              className={`font-bold flex items-center gap-1 ${
                remainingBalance < 0
                  ? "text-zinc-500 dark:text-zinc-400"
                  : "text-zinc-900 dark:text-white"
              }`}
            >
              <CreditIcon className="h-3.5 w-3.5 text-amber-500" />
              {remainingBalance.toLocaleString()} Credits
            </span>
          </div>
        </div>

        {/* Insufficient Balance Callout */}
        {isInsufficient && (
          <div className="p-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 flex items-center justify-between gap-3 text-xs text-zinc-700 dark:text-zinc-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
              <span className="font-medium text-[11px] sm:text-xs">
                You need {(totalPrice - currentBalance).toLocaleString()} more credits to place this order.
              </span>
            </div>
            <Link
              to="/credits/shop"
              target="_blank"
              className="px-3 py-1.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-xs hover:opacity-90 transition shrink-0"
            >
              Top Up
            </Link>
          </div>
        )}

        {/* Swipe Handle & Buttons */}
        <div className="pt-2 flex flex-col items-center gap-3">
          <SlideCommit
            label={editOrderId ? "Save Changes" : "Swipe to Order"}
            doneLabel={editOrderId ? "Order Saved!" : "Order Placed!"}
            errorLabel="Submission Failed"
            disabled={isInsufficient}
            onConfirm={async () => {
              await onConfirmOrder();
            }}
            className="w-full"
          />

          <button
            type="button"
            onClick={onClose}
            className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 font-semibold transition cursor-pointer"
          >
            Return to Review
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

export default OrderCheckoutModal;
