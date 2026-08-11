// src/pages/user/1_home/home_components/home_featured_assets.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Music,
  Image as ImageIcon,
  Video as VideoIcon,
  Star,
  StarHalf,
  Heart,
  Download,
  ArrowRight,
} from "lucide-react";

export interface Asset {
  id: number;
  title: string;
  credits: number;
  description: string;
  author: string;
  type: "audio" | "image" | "video";
  imagePlaceholder: string;
  rating: number;
  category: string;
}

export const suggestedAssets: Asset[] = [
  {
    id: 1,
    title: "Sound Effects Library - Ultimate",
    credits: 299,
    description: "500+ professional sound effects for all your editing needs.",
    author: "Robert Simion",
    type: "audio",
    imagePlaceholder: "https://placehold.co/400x400/1e2130/4a6fa5?text=Audio+Library",
    rating: 4.8,
    category: "Sound Effects",
  },
  {
    id: 2,
    title: "Oil Canvas Themed Textures",
    credits: 129,
    description: "100+ professional paint textures for your video projects.",
    author: "Robert Simion",
    type: "image",
    imagePlaceholder: "https://placehold.co/400x400/1e2130/4a6fa5?text=Oil+Canvas",
    rating: 4.9,
    category: "Textures",
  },
  {
    id: 3,
    title: "Cinematic Trailer Kit",
    credits: 499,
    description: "Complete cinematic trailer sound design kit with risers and hits.",
    author: "Sarah Chen",
    type: "audio",
    imagePlaceholder: "https://placehold.co/400x400/1e2130/4a6fa5?text=Cinematic+Trailer",
    rating: 4.9,
    category: "Sound Effects",
  },
];

export const AssetCardSkeleton: React.FC = () => (
  <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4">
    <div className="mb-3 aspect-square w-full animate-pulse rounded-lg bg-gray-200 dark:bg-white/10" />
    <div className="h-5 w-24 animate-pulse rounded-lg bg-gray-200 dark:bg-white/10" />
    <div className="mt-2 h-4 w-full animate-pulse rounded-lg bg-gray-100 dark:bg-white/5" />
    <div className="mt-2 h-4 w-3/4 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5" />
    <div className="mt-3 flex items-center justify-between">
      <div className="h-5 w-20 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5" />
      <div className="h-8 w-16 animate-pulse rounded-lg bg-gray-200 dark:bg-white/10" />
    </div>
  </div>
);

export const FilterButtonSkeleton: React.FC = () => (
  <div className="h-8 w-24 animate-pulse rounded-full bg-white/10" />
);

interface HomeFeaturedAssetsProps {
  searchQuery: string;
}

export const HomeFeaturedAssets: React.FC<HomeFeaturedAssetsProps> = ({
  searchQuery,
}) => {
  const navigate = useNavigate();
  const [, setHoveredAsset] = useState<number | null>(null);

  const getTypeIcon = (type: Asset["type"]) => {
    switch (type) {
      case "audio":
        return <Music className="h-3 w-3" />;
      case "image":
        return <ImageIcon className="h-3 w-3" />;
      case "video":
        return <VideoIcon className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getTypeColor = (type: Asset["type"]) => {
    switch (type) {
      case "audio":
        return "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400";
      case "image":
        return "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400";
      case "video":
        return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400";
      default:
        return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400";
    }
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center gap-0.5">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={`full-${i}`} className="h-3 w-3 fill-yellow-500 text-yellow-500 dark:fill-yellow-400 dark:text-yellow-400" />
        ))}
        {hasHalfStar && <StarHalf className="h-3 w-3 fill-yellow-500 text-yellow-500 dark:fill-yellow-400 dark:text-yellow-400" />}
        {[...Array(emptyStars)].map((_, i) => (
          <Star key={`empty-${i}`} className="h-3 w-3 text-gray-300 dark:text-zinc-600" />
        ))}
        <span className="ml-1 text-xs text-gray-500 dark:text-zinc-400">{rating}</span>
      </div>
    );
  };

  const filteredAssets = suggestedAssets.filter((asset) => {
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      return (
        asset.title.toLowerCase().includes(query) ||
        asset.description.toLowerCase().includes(query) ||
        asset.category.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2
            className="text-xl font-bold tracking-tight text-gray-900 dark:text-white"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Popular Assets
          </h2>
          <p
            className="text-xs text-gray-500 dark:text-zinc-400"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Top-rated assets trending across the platform
          </p>
        </div>
        <button
          onClick={() => navigate("/assets")}
          className="flex items-center gap-1 text-xs font-semibold text-gray-700 dark:text-white transition hover:text-gray-900 dark:hover:text-zinc-300"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          View More on Asset Library <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid gap-5 grid-cols-1 md:grid-cols-3">
        {filteredAssets.slice(0, 3).map((asset) => (
          <div
            key={asset.id}
            className="group relative overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] shadow-sm dark:shadow-none transition-all duration-300 hover:-translate-y-1 hover:border-gray-300 dark:hover:border-white/30 hover:bg-gray-50 dark:hover:bg-white/[0.06] cursor-pointer"
            onMouseEnter={() => setHoveredAsset(asset.id)}
            onMouseLeave={() => setHoveredAsset(null)}
          >
            <div className="relative aspect-square w-full overflow-hidden bg-gray-200 dark:bg-gradient-to-br dark:from-[#1a1f2e] dark:to-[#0d0f1a]">
              <img
                src={asset.imagePlaceholder}
                alt={asset.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 dark:from-[#080a12] via-transparent to-transparent" />

              <div className="absolute left-3 top-3">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${getTypeColor(
                    asset.type
                  )}`}
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {getTypeIcon(asset.type)}
                  <span className="capitalize">{asset.type}</span>
                </span>
              </div>

              <button
                onClick={(e) => e.stopPropagation()}
                className="absolute right-3 top-3 rounded-full bg-white/80 dark:bg-black/50 p-1.5 text-gray-500 dark:text-zinc-400 backdrop-blur-sm transition hover:text-red-500 dark:hover:text-red-400"
              >
                <Heart className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <span
                  className="text-[10px] text-gray-500 dark:text-zinc-500"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {asset.category}
                </span>
                {renderStars(asset.rating)}
              </div>

              <div className="mb-2 flex items-baseline gap-1">
                <span
                  className="text-xl font-bold text-gray-900 dark:text-white"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {asset.credits}
                </span>
                <span
                  className="text-xs text-gray-500 dark:text-zinc-500"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  Credits
                </span>
              </div>

              <h3
                className="mb-2 line-clamp-2 text-sm font-semibold leading-tight text-gray-900 dark:text-white transition-colors group-hover:text-gray-900 dark:group-hover:text-white"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {asset.title}
              </h3>

              <p
                className="mb-3 line-clamp-2 text-xs text-gray-600 dark:text-zinc-400"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {asset.description}
              </p>

              <div className="flex items-center justify-between border-t border-gray-200 dark:border-white/10 pt-3">
                <span
                  className="text-xs text-gray-500 dark:text-zinc-500 transition hover:text-gray-900 dark:hover:text-white"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {asset.author}
                </span>
                <button className="flex items-center gap-1 rounded-lg bg-gray-100 dark:bg-white/10 px-2.5 py-1 text-xs font-medium text-gray-900 dark:text-white transition hover:bg-gray-200 dark:hover:bg-white/20">
                  <Download className="h-3 w-3" />
                  Get
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};