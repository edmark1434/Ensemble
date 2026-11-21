import React from "react";
import { CreditIcon } from "@/components/ui/credit-icon";

export interface OrderAddonItem {
  id?: string;
  title: string;
  price: number;
  deliveryDays?: number;
}

interface OrderPricingBreakdownProps {
  tierTitle?: string;
  basePrice?: number | null;
  baseDeliveryDays?: number | null;
  totalPrice?: number | null;
  totalDeliveryDays?: number | null;
  addOns?: OrderAddonItem[];
}

/**
 * Standalone section displaying the tier price, selected add-ons breakdown,
 * and total order amount below "Order Participants & Target Service".
 */
export const OrderPricingBreakdown: React.FC<OrderPricingBreakdownProps> = ({
  tierTitle,
  basePrice,
  baseDeliveryDays,
  totalPrice,
  totalDeliveryDays,
  addOns = [],
}) => {
  const safeAddons = Array.isArray(addOns) ? addOns : [];
  const addonsTotal = safeAddons.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
  const resolvedTotalPrice = Number(totalPrice ?? 0);
  const resolvedTierPrice =
    basePrice != null ? Number(basePrice) : Math.max(0, resolvedTotalPrice - addonsTotal);
  const resolvedBaseDays =
    baseDeliveryDays != null ? Number(baseDeliveryDays) : Number(totalDeliveryDays ?? 0);
  const resolvedTotalDays = Number(totalDeliveryDays ?? resolvedBaseDays);

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 overflow-hidden shadow-2xs">
      {/* Section Header */}
      <div className="w-full flex items-center justify-between p-4 sm:p-4.5 bg-zinc-50/80 dark:bg-zinc-800/40 border-b border-zinc-200 dark:border-zinc-800/80">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            Order Pricing &amp; Add-ons Breakdown
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-200/80 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300">
            {safeAddons.length > 0 ? `${safeAddons.length} Add-on${safeAddons.length === 1 ? "" : "s"}` : "Tier Only"}
          </span>
        </div>

        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 shrink-0">
          <CreditIcon className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          {resolvedTotalPrice.toLocaleString()} Credits Total
        </span>
      </div>

      {/* Section Body */}
      <div className="p-5 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: Selected Tier + Selected Add-ons */}
          <div className="lg:col-span-7 space-y-3">
            {/* Base Tier Row */}
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block">
                  Selected Tier
                </span>
                <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white block truncate">
                  {tierTitle}
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">
                  {resolvedBaseDays} Days Base Delivery
                </span>
              </div>
              <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1 shrink-0">
                <CreditIcon className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                {resolvedTierPrice.toLocaleString()} Credits
              </span>
            </div>

            {/* Selected Add-ons List */}
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500">
                  Selected Add-ons ({safeAddons.length})
                </span>
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <CreditIcon className="h-3 w-3 shrink-0" />
                  {addonsTotal > 0 ? `+${addonsTotal.toLocaleString()}` : "0"} Credits
                </span>
              </div>

              {safeAddons.length > 0 ? (
                <div className="space-y-1.5">
                  {safeAddons.map((addon, idx) => (
                    <div
                      key={addon.id || idx}
                      className="flex items-center justify-between gap-2 text-xs text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-zinc-700/60 rounded-lg px-3 py-2"
                    >
                      <span className="font-medium truncate">{addon.title}</span>
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 shrink-0 flex items-center gap-1">
                        +{Number(addon.price || 0).toLocaleString()} Cr
                        {Number(addon.deliveryDays) > 0 && (
                          <span className="text-zinc-400 font-normal">
                            • +{addon.deliveryDays}d
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  No optional add-ons were selected for this order.
                </p>
              )}
            </div>
          </div>

          {/* Right: Price Summary */}
          <div className="lg:col-span-5">
            <div className="h-full p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block">
                  Order Cost Summary
                </span>

                <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300">
                  <span>Tier Price</span>
                  <span className="font-semibold flex items-center gap-1 text-zinc-900 dark:text-zinc-100">
                    <CreditIcon className="h-3 w-3 text-amber-500 shrink-0" />
                    {resolvedTierPrice.toLocaleString()} Credits
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300">
                  <span>Add-ons ({safeAddons.length})</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <CreditIcon className="h-3 w-3 text-amber-500 shrink-0" />
                    {addonsTotal > 0 ? `+${addonsTotal.toLocaleString()}` : "0"} Credits
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300">
                  <span>Delivery Timeline</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {resolvedTotalDays} Days Total
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-700/80 flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
                  Total Order Amount
                </span>
                <span className="text-sm sm:text-base font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <CreditIcon className="h-4 w-4 text-amber-500 shrink-0" />
                  {resolvedTotalPrice.toLocaleString()} Credits
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
