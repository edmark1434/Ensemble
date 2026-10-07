import { CreditIcon } from "@/components/credit-icon";

export const MarketPriceBadge = ({
  credits,
  className = ""
}: {
  credits?: number | null;
  className?: string;
}) => {
  // No badge for missing or free items
  if (credits == null || Number(credits) <= 0) return null;

  return (
    <span className={`pointer-events-none inline-flex align-middle ${className}`}>
      <span className="relative inline-flex items-center gap-1 rounded-md bg-secondary/90 py-0.5 pl-1.5 pr-2 text-xs ring-1 ring-inset ring-yellow-500/30">
        {/* Gold tint */}
        <span className="absolute inset-0 rounded-md bg-gradient-to-r from-yellow-500/15 via-amber-500/15 to-orange-500/15" />

        <CreditIcon className="relative h-3.5 w-3.5" />

        <span className="relative text-yellow-600 dark:text-yellow-200">
          {Number(credits).toLocaleString()}
        </span>
      </span>
    </span>
  );
};