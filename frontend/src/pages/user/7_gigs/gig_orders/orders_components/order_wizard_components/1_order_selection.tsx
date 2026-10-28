import React, { useMemo } from "react";
import { Check, Clock, RotateCcw, PackagePlus, Sparkles, ArrowRight, ShieldCheck, Mail, User } from "lucide-react";
import type { Gig, GigTier, GigAddon } from "@/pages/user/7_gigs/gig_datasets";
import { CreditIcon } from "@/components/ui/credit-icon";
import useGlobalState from "@/lib/global_state";
import { constructAvatarUrl } from "@/lib/accountAvatars";
import { resolveBannerPreset, bannerPresetUrl } from "@/lib/profileBanners";
import { getImageUrl } from "@/lib/utils";
import MarketplaceIdentitySelector from "@/components/marketplace/MarketplaceIdentitySelector";

interface OrderSelectionProps {
  gig: Gig;
  tierIndex: number;
  setTierIndex: (index: number) => void;
  selectedAddonIds: string[];
  setSelectedAddonIds: React.Dispatch<React.SetStateAction<string[]>>;
  actingTeamId: string;
  setActingTeamId: (teamId: string) => void;
  editOrderId?: string | null;
  onNext: () => void;
  onReturn: () => void;
}

export const OrderSelection: React.FC<OrderSelectionProps> = ({
  gig,
  tierIndex,
  setTierIndex,
  selectedAddonIds,
  setSelectedAddonIds,
  actingTeamId,
  setActingTeamId,
  editOrderId,
  onNext,
  onReturn,
}) => {
  const user = useGlobalState((state) => state.user);

  // Client card details
  const userName = user?.display_name || user?.name || user?.username || "Client";
  const userHandle = user?.handle || user?.username || "client";
  const userEmail = user?.email || "";

  const userAvatarUrl = useMemo(() => {
    const raw = user?.avatar_preset_url || user?.avatar_url || (user as any)?.profile_photo || user?.avatar;
    if (raw) return constructAvatarUrl(raw);
    return constructAvatarUrl(undefined, userName);
  }, [user, userName]);

  const userBannerUrl = useMemo(() => {
    if (user?.profile_banner_url) {
      return getImageUrl(user.profile_banner_url);
    }
    const preset = resolveBannerPreset((user as any)?.banner_preset, userHandle || userName);
    return bannerPresetUrl(preset) || "/profile_banner_presets/Ensemble%20Blue.png";
  }, [user, userHandle, userName]);

  const tiers: GigTier[] = gig.tiers || [];
  const activeTier = tiers[tierIndex] || tiers[0];

  const addOns: GigAddon[] = gig.addOns || [];

  const handleToggleAddon = (addonId: string) => {
    setSelectedAddonIds((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    );
  };

  // Calculations
  const basePrice = activeTier?.price || 0;
  const baseDelivery = activeTier?.daysOfDelivery || 0;

  const selectedAddonsList = useMemo(() => {
    return addOns.filter((a) => a.id && selectedAddonIds.includes(String(a.id)));
  }, [addOns, selectedAddonIds]);

  const addonsTotalPrice = useMemo(() => {
    return selectedAddonsList.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
  }, [selectedAddonsList]);

  const addonsTotalDays = useMemo(() => {
    return selectedAddonsList.reduce((sum, a) => sum + (Number(a.deliveryDays) || 0), 0);
  }, [selectedAddonsList]);

  const totalPrice = basePrice + addonsTotalPrice;
  const totalDeliveryDays = baseDelivery + addonsTotalDays;

  return (
    <div className="space-y-8">
      {/* 1. Client Identity Card */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface overflow-hidden shadow-sm">
        {/* Banner Area */}
        <div className="relative h-28 sm:h-36 w-full overflow-hidden bg-zinc-800">
          <img
            src={userBannerUrl}
            alt="Profile Banner"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/profile_banner_presets/Ensemble%20Blue.png";
            }}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
            <User className="h-3.5 w-3.5 text-blue-400" />
            <span>Ordering Client</span>
          </div>
        </div>

        {/* User Profile Info */}
        <div className="p-5 sm:p-6 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-10 sm:-mt-12 mb-4">
            <div className="flex items-end gap-3.5">
              <div className="relative">
                <img
                  src={userAvatarUrl}
                  alt={userName}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = constructAvatarUrl(undefined, userName);
                  }}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-white dark:border-dark-surface object-cover shadow-md bg-white dark:bg-zinc-800"
                />
              </div>
              <div className="pb-1">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                  {userName}
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400">@{userHandle}</p>
              </div>
            </div>

            {userEmail && (
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-zinc-300 bg-gray-50 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 self-start sm:self-auto">
                <Mail className="h-3.5 w-3.5 text-gray-400 dark:text-zinc-500" />
                <span className="font-medium">{userEmail}</span>
              </div>
            )}
          </div>

          {!editOrderId && (
            <div className="pt-4 border-t border-gray-100 dark:border-white/5">
              <MarketplaceIdentitySelector
                teamId={actingTeamId}
                onChange={setActingTeamId}
                label="Order Representation"
              />
            </div>
          )}
        </div>
      </div>

      {/* 2. Package Selection (Tiers) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              Choose Service Tier
            </h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Select the pricing tier that matches the scope of your video project.
            </p>
          </div>
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
            {tiers.length} Tier{tiers.length > 1 ? "s" : ""} Available
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tiers.map((tier, idx) => {
            const isSelected = tierIndex === idx;
            return (
              <div
                key={tier.tierId || idx}
                onClick={() => setTierIndex(idx)}
                className={`relative rounded-2xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between select-none ${
                  isSelected
                    ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-600 dark:border-blue-500 shadow-md ring-2 ring-blue-500/10"
                    : "bg-white dark:bg-dark-surface border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
                }`}
              >
                {/* Selection Badge */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                      isSelected
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400"
                    }`}
                  >
                    {tier.tierName || `Tier ${idx + 1}`}
                  </span>
                  <div
                    className={`h-5 w-5 rounded-full flex items-center justify-center border transition-colors ${
                      isSelected
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "border-gray-300 dark:border-zinc-700 text-transparent"
                    }`}
                  >
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                </div>

                {/* Title & Description */}
                <div className="mb-4">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1.5">
                    {tier.title}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-zinc-400 line-clamp-3 leading-relaxed">
                    {tier.description || "Complete delivery according to tier specifications."}
                  </p>
                </div>

                {/* Turnaround & Revisions */}
                <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-white/5 mt-auto">
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      <span>Timeline</span>
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {tier.daysOfDelivery} Days
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <RotateCcw className="h-3.5 w-3.5 text-gray-400" />
                      <span>Revisions</span>
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {tier.revisions}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="pt-2 flex items-center justify-between border-t border-gray-100 dark:border-white/5">
                    <span className="text-[11px] font-medium text-gray-500">Tier Rate</span>
                    <div className="flex items-center gap-1 text-base font-black text-gray-900 dark:text-white">
                      <CreditIcon className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>{tier.price?.toLocaleString()} Cr</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Add-ons & Extras */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <PackagePlus className="h-4 w-4 text-blue-500" />
              <span>Select Add-ons & Extras</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Customize your order with optional speed boosts, extra deliverables, or production add-ons.
            </p>
          </div>
          {addOns.length > 0 && (
            <span className="text-xs text-gray-500">
              {selectedAddonIds.length} of {addOns.length} selected
            </span>
          )}
        </div>

        {addOns.length === 0 ? (
          <div className="p-6 rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.01] text-center">
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              This freelancer does not have optional add-ons configured for this service.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {addOns.map((addon, aIdx) => {
              const addonId = String(addon.id || aIdx);
              const isChecked = selectedAddonIds.includes(addonId);
              return (
                <div
                  key={addonId}
                  onClick={() => handleToggleAddon(addonId)}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                    isChecked
                      ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-600 dark:border-blue-500 shadow-2xs"
                      : "bg-white dark:bg-dark-surface border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`h-5 w-5 mt-0.5 rounded flex items-center justify-center border transition-colors shrink-0 ${
                        isChecked
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-gray-300 dark:border-zinc-700 text-transparent"
                      }`}
                    >
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                        {addon.title}
                      </h4>
                      {addon.deliveryDays ? (
                        <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                          +{addon.deliveryDays} Day{addon.deliveryDays > 1 ? "s" : ""} Delivery Timeline
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 font-bold text-sm text-amber-500 shrink-0">
                    <CreditIcon className="h-3.5 w-3.5" />
                    <span>+{addon.price?.toLocaleString()} Cr</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Real-time Summary Card & Next Button */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gray-50 dark:bg-zinc-900/60 border border-gray-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-zinc-500 tracking-wider block">
              Estimated Timeline
            </span>
            <span className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5 mt-0.5">
              <Clock className="h-4 w-4 text-blue-500" />
              {totalDeliveryDays} Days Total
              {addonsTotalDays > 0 && (
                <span className="text-xs text-gray-400 font-normal">
                  ({baseDelivery} + {addonsTotalDays} add-ons)
                </span>
              )}
            </span>
          </div>

          <div className="h-8 w-px bg-gray-200 dark:bg-white/10 hidden sm:block" />

          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-zinc-500 tracking-wider block">
              Total Order Price
            </span>
            <span className="text-base sm:text-lg font-black text-gray-900 dark:text-white flex items-center gap-1.5 mt-0.5">
              <CreditIcon className="h-5 w-5 text-amber-500" />
              {totalPrice.toLocaleString()} Credits
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={onReturn}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-zinc-300 font-semibold text-xs transition cursor-pointer text-center"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={onNext}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <span>Next: Order Details</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderSelection;
