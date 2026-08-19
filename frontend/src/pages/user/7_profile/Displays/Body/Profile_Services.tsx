import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, Bookmark, Wrench } from "lucide-react";
import { CreditIcon } from "@/components/ui/credit-icon";
import { EmptyState } from "@/components/ui/EmptyState";
import api from "@/lib/axios";

interface ProfileServicesProps {
  accountId?: string;
  isOwner?: boolean;
}

export const Profile_Services: React.FC<ProfileServicesProps> = ({ accountId, isOwner = false }) => {
  const navigate = useNavigate();
  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserGigs = async () => {
      if (!accountId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await api.get("/api/gigs");
        if (response.data && response.data.success) {
          const cloudFrontUrl = import.meta.env.VITE_CLOUDFRONT_URL || "";
          const mapUrl = (path?: string) => {
            if (!path) return "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80";
            if (path.startsWith("http") || path.startsWith("/")) return path;
            return `${cloudFrontUrl}/${path}`;
          };

          const userGigs = response.data.data
            .filter((g: any) => {
              const creatorId =
                g.client_account_id ||
                g.creator_account_id ||
                g.account_id ||
                g.accountId ||
                g.user_id ||
                g.userId ||
                g.account?.account_id ||
                g.creator?.account_id ||
                g.user?.account_id;
              return creatorId === accountId;
            })
            .map((g: any) => ({
              ...g,
              thumbnail: mapUrl(g.thumbnail_path || g.thumbnail),
              clientAvatar: g.client_avatar_path || g.clientAvatar ? mapUrl(g.client_avatar_path || g.clientAvatar) : undefined,
            }));

          setServices(userGigs);
        }
      } catch (error) {
        console.error("Failed to load user services/gigs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserGigs();
  }, [accountId]);

  if (isLoading) {
    return (
      <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="flex flex-col justify-between rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/40 p-4 animate-pulse"
          >
            <div>
              <div className="mb-3 h-36 w-full rounded-xl bg-gray-200 dark:bg-zinc-800" />
              <div className="mb-2 flex items-center gap-1.5">
                <div className="h-4 w-12 rounded bg-gray-200 dark:bg-zinc-800" />
                <div className="h-4 w-16 rounded bg-gray-200 dark:bg-zinc-800" />
              </div>
              <div className="mb-2 h-5 w-24 rounded bg-gray-200 dark:bg-zinc-800" />
              <div className="mb-1.5 h-4 w-3/4 rounded bg-gray-200 dark:bg-zinc-800" />
              <div className="mb-1 h-3 w-full rounded bg-gray-200 dark:bg-zinc-800" />
              <div className="mb-3 h-3 w-2/3 rounded bg-gray-200 dark:bg-zinc-800" />
              <div className="flex gap-1.5 mb-1">
                <div className="h-4 w-14 rounded-md bg-gray-200 dark:bg-zinc-800" />
                <div className="h-4 w-14 rounded-md bg-gray-200 dark:bg-zinc-800" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-white/5 flex items-center justify-between">
              <div className="h-3 w-20 rounded bg-gray-200 dark:bg-zinc-800" />
              <div className="h-4 w-14 rounded-md bg-gray-200 dark:bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/5 pb-2">
        <h4 className="text-xs font-extrabold text-gray-900 dark:text-white tracking-wider uppercase flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
          {isOwner ? "My Services" : "Services"}
        </h4>
        <span className="text-[10px] text-gray-500 dark:text-zinc-500 font-medium">
          {services.length} active listings
        </span>
      </div>

      {services.length === 0 ? (
        <div className="py-2">
          <EmptyState
            title="No Services Listed"
            description={isOwner ? "You haven't listed any freelance services yet. Create your first service gig to start getting clients!" : "This user hasn't listed any services yet."}
            actionLabel={isOwner ? "Create a Service" : undefined}
            onAction={isOwner ? () => navigate("/gigs/create") : undefined}
            className="!p-6 !py-8 [&_dotlottie-wc]:!h-20 [&_dotlottie-wc]:!w-20 [&_.grayscale]:!h-20 [&_.grayscale]:!w-20 [&_.grayscale]:!mb-2 [&_h3]:!text-sm [&_p]:!text-xs [&_button]:!mt-4 [&_button]:!py-2 [&_button]:!px-4 [&_button]:!text-xs"
          />
        </div>
      ) : (
        <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 content-start">
          {services.map((gig) => {
            const startingPrice =
              gig.tiers && gig.tiers.length > 0
                ? Math.min(...gig.tiers.map((t: any) => Number(t.price) || 0))
                : 0;

            return (
              <div
                key={gig.id}
                onClick={() => {
                  navigate(`/gigs/services/${gig.id}/page`);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="group flex flex-col justify-between rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/40 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-gray-300 dark:hover:border-white/30 hover:bg-gray-50 dark:hover:bg-white/[0.06] cursor-pointer shadow-sm dark:shadow-none"
              >
                <div>
                  {/* Thumbnail Image */}
                  <div className="relative mb-3 h-36 w-full overflow-hidden rounded-xl border border-gray-100 dark:border-white/5 bg-gray-200 dark:bg-zinc-900">
                    <img
                      src={gig.thumbnail}
                      alt={gig.title}
                      className="h-full w-full object-cover opacity-80 transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 dark:from-black/60 via-transparent to-transparent" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className={`absolute top-2 right-2 rounded-full bg-white/80 dark:bg-black/50 p-1.5 backdrop-blur-sm transition ${
                        gig.isSaved
                          ? "text-yellow-500"
                          : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      <Bookmark className={`h-3.5 w-3.5 ${gig.isSaved ? "fill-current" : ""}`} />
                    </button>
                  </div>

                  {/* Badges */}
                  <div className="mb-2 flex items-center gap-1.5">
                    <span
                      className={`rounded border px-2 py-0.5 text-[10px] font-medium ${
                        gig.status?.toLowerCase() === "closed"
                          ? "border-red-300 bg-red-100 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
                          : "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
                      }`}
                    >
                      {gig.status || "Open"}
                    </span>
                    <span className="rounded border border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-gray-800 dark:text-zinc-300">
                      {gig.category}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="mb-1 flex items-center gap-1.5">
                    <CreditIcon className="h-4 w-4 shrink-0 text-yellow-500" />
                    <span className="text-base font-black text-yellow-500">
                      {startingPrice.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                      Starting at
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    className="mb-1 text-[15px] font-bold leading-snug text-gray-900 dark:text-white line-clamp-1 group-hover:text-blue-500 transition-colors"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {gig.title}
                  </h3>

                  {/* Description */}
                  <div
                    className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-2 mb-3 leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: (gig.description || "")
                        .replace(/\n/g, "<br/>")
                        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                        .replace(/\*(.*?)\*/g, "<em>$1</em>"),
                    }}
                  />

                  {/* Skills */}
                  {Array.isArray(gig.skills) && gig.skills.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <Wrench className="h-3 w-3 text-gray-400 dark:text-zinc-400 shrink-0 mr-0.5" />
                      {gig.skills.slice(0, 3).map((skill: string) => (
                        <span
                          key={skill}
                          className="rounded-md border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:text-zinc-300"
                        >
                          {skill}
                        </span>
                      ))}
                      {gig.skills.length > 3 && (
                        <span className="rounded-md border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:text-zinc-400">
                          +{gig.skills.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-auto pt-3 border-t border-gray-200 dark:border-white/5 flex items-center justify-between text-xs text-gray-500 dark:text-zinc-400">
                  <span className="text-[11px] font-medium">
                    {gig.tiers?.length || 0} Package{gig.tiers?.length !== 1 ? "s" : ""}
                  </span>

                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-100 dark:bg-zinc-800 text-[10px] font-semibold text-gray-600 dark:text-zinc-300 border border-gray-300 dark:border-white/10 shrink-0">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    {gig.slots} Slots
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};