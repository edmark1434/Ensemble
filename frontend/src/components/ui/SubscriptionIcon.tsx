import React from "react";

export function getSubscriptionIcon(plan?: string | null): string {
  const normalized = (plan || "").trim().toLowerCase();
  if (normalized === "premium") {
    return "/icons/subscription/premium.png";
  }
  if (normalized === "business" || normalized === "studio") {
    return "/icons/subscription/studio.png";
  }
  return "/icons/subscription/freemium.png";
}

export function getSubscriptionPlanLabel(plan?: string | null): string {
  const normalized = (plan || "").trim().toLowerCase();
  if (normalized === "premium") return "Premium";
  if (normalized === "business") return "Business";
  if (normalized === "studio") return "Studio";
  return "Free";
}

export interface SubscriptionIconProps {
  plan?: string | null;
  className?: string;
  sizeClassName?: string;
  showTooltip?: boolean;
}

export const SubscriptionIcon: React.FC<SubscriptionIconProps> = ({
  plan,
  className = "",
  sizeClassName = "w-3.5 h-3.5",
  showTooltip = true,
}) => {
  const iconSrc = getSubscriptionIcon(plan);
  const planLabel = getSubscriptionPlanLabel(plan);

  return (
    <img
      src={iconSrc}
      alt={`${planLabel} Tier`}
      title={showTooltip ? `${planLabel} Tier` : undefined}
      className={`inline-block object-contain shrink-0 align-middle ${sizeClassName} ${className}`}
      loading="lazy"
    />
  );
};

export default SubscriptionIcon;
