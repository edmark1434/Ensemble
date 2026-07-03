import { useState } from "react";
import { Loader2, X } from "lucide-react";
import api from "@/lib/axios";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast.ts";
import type { MarketplaceListing } from "./marketplaceTypes";

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function ListingDetailModal({
  listing,
  onClose,
  onUpdated,
}: {
  listing: MarketplaceListing;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const review = async (status: "approved" | "rejected", reason?: string) => {
    setSaving(true);
    try {
      await api.patch(`/api/moderator/marketplace/listings/${listing.id}`, {
        status,
        rejectionReason: reason,
      });
      showSuccessToast(status === "approved" ? "Listing approved" : "Listing rejected");
      onUpdated();
      onClose();
    } catch {
      showErrorToast("Failed to update listing");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f1016] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-400">Listing detail</p>
            <h2 className="text-lg font-bold text-white">{listing.number}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {listing.thumbnailUrl && (
            <img src={listing.thumbnailUrl} alt={listing.title} className="h-40 w-full rounded-xl object-cover" />
          )}

          <div>
            <h3 className="text-xl font-semibold text-white">{listing.title}</h3>
            <p className="mt-1 text-sm text-zinc-500">
              @{listing.submittedBy.handle} · {listing.category || "Uncategorized"} · {formatDateTime(listing.createdAt)}
            </p>
          </div>

          <p className="text-sm text-zinc-300">{listing.description}</p>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-500">Price:</span>
            <span className="font-semibold text-white">{listing.priceCredits.toLocaleString()} credits</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-500">Status:</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                listing.status === "approved"
                  ? "bg-emerald-500/15 text-emerald-300"
                  : listing.status === "rejected"
                    ? "bg-red-500/15 text-red-300"
                    : "bg-amber-500/15 text-amber-300"
              }`}
            >
              {listing.status}
            </span>
          </div>

          {listing.rejectionReason && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-200">
              Rejection reason: {listing.rejectionReason}
            </div>
          )}

          {listing.reviewedBy && (
            <p className="text-xs text-zinc-500">
              Reviewed by {listing.reviewedBy.name} · {formatDateTime(listing.reviewedAt)}
            </p>
          )}

          {listing.status === "pending" && (
            <div className="space-y-3 border-t border-white/10 pt-4">
              {showRejectForm ? (
                <div className="rounded-xl border border-white/10 bg-[#14151c] p-4">
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    placeholder="Reason for rejection…"
                    className="w-full resize-none rounded-lg border border-white/10 bg-[#0f1016] px-3 py-2 text-sm text-white outline-none"
                  />
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRejectForm(false)}
                      className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={saving || !rejectionReason.trim()}
                      onClick={() => void review("rejected", rejectionReason.trim())}
                      className="rounded-lg bg-red-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
                    >
                      Confirm reject
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void review("approved")}
                    className="flex-1 rounded-xl bg-emerald-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Approve listing"}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setShowRejectForm(true)}
                    className="flex-1 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    Reject listing
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
