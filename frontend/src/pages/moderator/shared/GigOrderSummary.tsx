import type { CaseGigOrder } from "@/pages/admin/ticketManagement/ticketTypes";

function credits(n: number | null | undefined) {
  return `${Number(n || 0).toLocaleString()} credits`;
}

function plural(n: number, word: string) {
  return `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;
}

function extraDays(n: number) {
  return n > 0 ? `+${plural(n, "day")}` : "no extra days";
}

/**
 * A gig order's package and the add-ons the client picked, shown beside the milestones on the
 * staff dispute and ticket case views. Add-on prices are the ones the order was placed with; the
 * package price is the gig tier's current price, so a total that differs from the contract rate
 * is called out instead of trusted.
 */
export default function GigOrderSummary({ order, rateCredits }: { order: CaseGigOrder; rateCredits: number }) {
  const ordered = order.tierCredits != null ? order.tierCredits + order.addonCredits : null;
  const mismatch = ordered != null && ordered !== rateCredits;
  const packageFacts = [
    order.tierCredits != null ? credits(order.tierCredits) : null,
    order.tierDeliveryDays != null ? `${plural(order.tierDeliveryDays, "day")} delivery` : null,
    order.tierRevisions != null ? plural(order.tierRevisions, "revision") : null,
  ].filter(Boolean);

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Gig order</p>
        {ordered != null ? (
          <p className="text-[11px] tabular-nums text-zinc-500">Package + add-ons: {credits(ordered)}</p>
        ) : null}
      </div>

      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-200">
        <span className="min-w-0 break-words">Package: {order.tierTitle || "Unknown package"}</span>
        {packageFacts.length ? (
          <span className="text-xs tabular-nums text-zinc-400">{packageFacts.join(" · ")}</span>
        ) : null}
      </div>

      <p className="mt-2.5 text-[10px] uppercase tracking-wide text-zinc-500">Add-ons ({order.addons.length})</p>
      {order.addons.length === 0 ? (
        <p className="mt-1 text-xs text-zinc-500">The client did not pick any add-ons.</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {order.addons.map((addon) => (
            <li key={addon.id} className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-300">
              <span className="min-w-0 break-words">{addon.name}</span>
              <span className="tabular-nums text-zinc-400">
                +{credits(addon.priceCredits)} · {extraDays(addon.additionalDays)}
              </span>
            </li>
          ))}
          {order.addons.length > 1 ? (
            <li className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-1 text-xs text-zinc-200">
              <span>All add-ons</span>
              <span className="tabular-nums">
                +{credits(order.addonCredits)} · {extraDays(order.addonDays)}
              </span>
            </li>
          ) : null}
        </ul>
      )}

      {mismatch ? (
        <p className="mt-2 text-[11px] leading-relaxed text-amber-200/90">
          Package + add-ons come to {credits(ordered)}, but the contract is priced at {credits(rateCredits)}. The
          package may have been repriced since the order, or the order was priced without its add-ons.
        </p>
      ) : null}
    </div>
  );
}
