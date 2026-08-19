import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, Clock, Bookmark, Wrench } from "lucide-react";
import { CreditIcon } from "@/components/ui/credit-icon";
import { EmptyState } from "@/components/ui/EmptyState";
import api from "@/lib/axios";
import toast from "react-hot-toast";

function getTimeAgo(date: Date) {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
}

interface ProfileServicesProps {
  accountId?: string;
  isOwner?: boolean;
}

export const Profile_Services: React.FC<ProfileServicesProps> = ({ accountId, isOwner = false }) => {
  const navigate = useNavigate();
  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const handleToggleSave = async (e: React.MouseEvent, gigId: string | number) => {
    e.stopPropagation();
    try {
      const gigToUpdate = services.find((g) => g.id === gigId);
      if (!gigToUpdate) return;

      const willBeSaved = !gigToUpdate.isSaved;
      await api.post(`/api/gigs/${gigId}/save`);

      if (willBeSaved) toast.success("Service saved successfully!");
      else toast.success("Service removed from saved list");

      setServices((prev) =>
        prev.map((gig) => {
          if (gig.id === gigId) {
            return {
              ...gig,
              isSaved: willBeSaved,
              savesCount: willBeSaved ? gig.savesCount + 1 : Math.max(0, gig.savesCount - 1),
            };
          }
          return gig;
        })
      );
    } catch (err) {
      toast.error("Failed to save service");
      console.error(err);
    }
  };

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
            return `${cloudFrontUrl}${path.startsWith('/') ? '' : '/'}${path}`;
          };

          const userGigs = response.data.data
            .filter((g: any) => {
              // g.freelancerAccountId is returned by getAllGigsRepository
              const creatorId =
                g.freelancerAccountId ??
                g.freelancer_account_id ??
                g.account_id ??
                g.accountId ??
                g.client_account_id ??
                g.user_id ??
                g.userId;

              return creatorId && String(creatorId).toLowerCase() === String(accountId).toLowerCase();
            })
            .map((g: any) => {
              const startingPrice =
                g.tiers && g.tiers.length > 0
                  ? Math.min(...g.tiers.map((t: any) => Number(t.price) || 0))
                  : Number(g.price) || 0;

              const postDate = g.postedAt || g.created_at;

              return {
                id: g.id || g.gig_id,
                title: g.title,
                description: g.description || "",
                status: g.status || "Open",
                category: g.category,
                price: startingPrice,
                tiersCount: g.tiers?.length || 0,
                slots: g.slots || 0,
                timeAgo: postDate ? getTimeAgo(new Date(postDate)) : null,
                thumbnail: mapUrl(g.thumbnail),
                skills: Array.isArray(g.skills) ? g.skills : Array.isArray(g.tags) ? g.tags : [],
                isSaved: g.isSaved || g.is_saved || false,
                savesCount: parseInt(g.savesCount || g.saves_count || 0, 10),
                createdAt: postDate,
              };
            })
            .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

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

  return (
    <div className="flex-1 space-y-4">
      {/* Permanent Header Bar */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/5 pb-2">
        <h4 className="text-xs font-extrabold text-gray-900 dark:text-white tracking-wider uppercase flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
          {isOwner ? "My Services" : "Services"}
          <span className="text-[10px] font-medium text-gray-500 dark:text-zinc-500 lowercase">
            ({services.length})
          </span>
        </h4>
        <span className="text-[10px] text-gray-500 dark:text-zinc-500 font-medium">
          {services.length} active listings
        </span>
      </div>

      {isLoading ? (
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
      ) : services.length === 0 ? (
        <div className="py-2">
          <EmptyState
            title="No Services Listed"
            description={
              isOwner
                ? "You haven't listed any freelance services yet. Create your first service gig to start getting clients!"
                : "This user hasn't listed any services yet."
            }
            actionLabel={isOwner ? "Create a Service" : undefined}
            onAction={isOwner ? () => navigate("/gigs/create") : undefined}
            className="!p-6 !py-8 [&_dotlottie-wc]:!h-20 [&_dotlottie-wc]:!w-20 [&_.grayscale]:!h-20 [&_.grayscale]:!w-20 [&_.grayscale]:!mb-2 [&_h3]:!text-sm [&_p]:!text-xs [&_button]:!mt-4 [&_button]:!py-2 [&_button]:!px-4 [&_button]:!text-xs"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((gig) => (
            <div
              key={gig.id}
              onClick={() => {
                navigate(`/gigs/services/${gig.id}/page`);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="group relative flex cursor-pointer flex-col justify-between rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-dark-base/50 p-4 transition-all hover:border-blue-500/30 hover:bg-white dark:hover:bg-dark-base hover:shadow-lg hover:shadow-blue-500/5"
            >
              <button
                onClick={(e) => handleToggleSave(e, gig.id)}
                className={`absolute top-4 right-4 z-10 p-2 rounded-lg backdrop-blur-sm transition-colors flex items-center justify-center ${
                  gig.isSaved
                    ? "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30"
                    : "bg-black/30 text-white/80 hover:bg-black/50 hover:text-white"
                }`}
                title="Save Gig"
              >
                <Bookmark className={`h-4 w-4 ${gig.isSaved ? "fill-current" : ""}`} />
              </button>

              <div className="flex-1">
                <div className="relative mb-3 h-36 w-full overflow-hidden rounded-xl border border-gray-100 dark:border-white/5 bg-gray-200 dark:bg-zinc-900">
                  <img
                    src={gig.thumbnail}
                    alt={gig.title}
                    className="h-full w-full object-cover opacity-80 transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 dark:from-black/60 via-transparent to-transparent" />
                </div>

                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded border px-2 py-0.5 text-[10px] font-medium ${
                      gig.status?.toLowerCase() === "closed"
                        ? "border-red-300 bg-red-100 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
                        : "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
                    }`}
                  >
                    {gig.status}
                  </span>
                  {gig.category && (
                    <span className="rounded border border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-gray-800 dark:text-zinc-300">
                      {gig.category}
                    </span>
                  )}
                  {gig.tiersCount > 0 && (
                    <span className="rounded border border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-gray-800 dark:text-zinc-300">
                      {gig.tiersCount} Package{gig.tiersCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                <div className="mb-1 flex items-center gap-1 text-base font-black text-yellow-500">
                  <CreditIcon className="h-4 w-4 shrink-0 text-yellow-500" />
                  <span>{gig.price.toLocaleString()}</span>
                  <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-wide ml-1">
                    Starting at
                  </span>
                </div>

                <h3
                  className="mb-1 line-clamp-1 text-sm font-bold text-gray-900 dark:text-white transition-colors group-hover:text-blue-500 dark:group-hover:text-blue-400"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {gig.title}
                </h3>

                <div className="mb-3">
                  <p className="line-clamp-2 text-[11px] text-gray-600 dark:text-zinc-400 leading-relaxed">
                    {gig.description.replace(/[*#_`]/g, "")}
                  </p>
                </div>

                {Array.isArray(gig.skills) && gig.skills.length > 0 && (
                  <div className="mb-3 flex flex-wrap items-center gap-1.5">
                    <Wrench className="h-3 w-3 shrink-0 text-gray-400 dark:text-zinc-400" />
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

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-zinc-500">
                  <Clock className="h-3 w-3" />
                  <span>{gig.timeAgo ? `Listed ${gig.timeAgo}` : `${gig.slots} Slots available`}</span>
                </div>
                <div className="text-[11px] font-bold text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-white/5 px-2.5 py-1 rounded-md">
                  {gig.savesCount} Saves
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};