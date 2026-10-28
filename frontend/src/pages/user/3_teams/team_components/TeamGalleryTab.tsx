import React, { useState, useEffect } from "react";
import {
  Film,
  Play,
  ExternalLink,
  Eye,
  Sparkles,
  Search,
} from "lucide-react";
import api from "@/lib/axios";

interface GalleryProject {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  duration?: number;
  category?: string;
}

interface TeamGalleryTabProps {
  teamId: string;
  teamName: string;
}

export const TeamGalleryTab: React.FC<TeamGalleryTabProps> = ({
  teamId,
  teamName,
}) => {
  const [items, setItems] = useState<GalleryProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let mounted = true;
    const fetchGallery = async () => {
      try {
        setLoading(true);
        // Fetch projects or marketplace posts associated with the team
        const res = await api.get(`/api/teams/${teamId}/marketplace-posts`, {
          params: { type: "gigs" },
        });
        if (mounted) {
          const raw = res.data.data || [];
          setItems(
            raw.map((post: any) => ({
              id: post.id,
              title: post.title,
              description: post.description,
              thumbnail_url: post.thumbnail_path,
              category: post.category,
            }))
          );
        }
      } catch (err: unknown) {
        console.error("Failed to load gallery items:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void fetchGallery();
    return () => {
      mounted = false;
    };
  }, [teamId]);

  const filtered = items.filter(
    (i) =>
      !search.trim() ||
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      (i.description && i.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            {teamName} Showcase Gallery
          </h3>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
            Explore recent video productions, motion graphics, and edits by this team.
          </p>
        </div>

        <div className="relative min-w-[200px] sm:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search gallery..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-dark-base text-xs text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-blue-500 transition"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-4 animate-pulse space-y-3"
            >
              <div className="aspect-video w-full bg-gray-200 dark:bg-zinc-800 rounded-xl" />
              <div className="h-4 w-3/4 bg-gray-200 dark:bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/[0.01] p-12 text-center space-y-2">
          <Film className="w-8 h-8 text-gray-400 mx-auto" />
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">
            No showcase media published yet
          </h4>
          <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-sm mx-auto">
            Check back soon as this team uploads video reels and portfolio highlights.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="group rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-3.5 shadow-xs hover:shadow-md hover:border-blue-500/40 transition-all duration-200 space-y-3"
            >
              <div className="relative aspect-video w-full rounded-xl bg-gray-900 overflow-hidden flex items-center justify-center">
                {item.thumbnail_url ? (
                  <img
                    src={item.thumbnail_url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                ) : (
                  <Film className="w-8 h-8 text-zinc-600" />
                )}
                {item.category && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-white backdrop-blur-xs">
                    {item.category}
                  </span>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1">
                  {item.title}
                </h4>
                {item.description && (
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1 line-clamp-2">
                    {item.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
