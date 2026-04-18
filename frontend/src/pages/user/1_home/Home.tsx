import {
  Play,
  Briefcase,
  Search,
  FileText,
  Wrench,
  Upload,
  Users,
  MessageCircle,
  Heart,
  Download,
  Music,
  Image,
  Video,
  Filter,
  ChevronDown,
  Star,
  StarHalf,
  X,
} from "lucide-react";
import UserHeader from "@/components/nav/user_header";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

interface Asset {
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

const suggestedAssets: Asset[] = [
  {
    id: 1,
    title: "Sound Effects Library - Ultimate",
    credits: 299,
    description: "500+ professional sound effects for all your editing needs. Organized by category.",
    author: "Robert Simion",
    type: "audio",
    imagePlaceholder: "https://placehold.co/400x300/1e2130/4a6fa5?text=Audio+Library",
    rating: 4.8,
    category: "Sound Effects"
  },
  {
    id: 2,
    title: "Industrial Audio Library",
    credits: 299,
    description: "500+ professional sound library for modern industrial themed audio.",
    author: "Robert Simion",
    type: "audio",
    imagePlaceholder: "https://placehold.co/400x300/1e2130/4a6fa5?text=Industrial+Audio",
    rating: 4.6,
    category: "Sound Effects"
  },
  {
    id: 3,
    title: "Oil Canvas Themed Textures",
    credits: 129,
    description: "100+ professional paint textures for your videos. Organized by category.",
    author: "Robert Simion",
    type: "image",
    imagePlaceholder: "https://placehold.co/400x300/1e2130/4a6fa5?text=Oil+Canvas",
    rating: 4.9,
    category: "Textures"
  },
  {
    id: 4,
    title: "Slow-Motion Ink Drops",
    credits: 129,
    description: "100+ professional ink textures for all your editing needs. Organized by category.",
    author: "Robert Simion",
    type: "image",
    imagePlaceholder: "https://placehold.co/400x300/1e2130/4a6fa5?text=Ink+Drops",
    rating: 4.7,
    category: "Textures"
  },
  {
    id: 5,
    title: "Cinematic Trailer Kit",
    credits: 499,
    description: "Complete cinematic trailer sound design kit with risers, hits, and whooshes.",
    author: "Sarah Chen",
    type: "audio",
    imagePlaceholder: "https://placehold.co/400x300/1e2130/4a6fa5?text=Cinematic+Trailer",
    rating: 4.9,
    category: "Sound Effects"
  },
  {
    id: 6,
    title: "4K Nature Stock Footage",
    credits: 399,
    description: "200+ 4K nature clips including forests, mountains, oceans, and wildlife.",
    author: "Marcus Thompson",
    type: "video",
    imagePlaceholder: "https://placehold.co/400x300/1e2130/4a6fa5?text=Nature+Footage",
    rating: 4.8,
    category: "Stock Footage"
  },
  {
    id: 7,
    title: "Modern Transitions Pack",
    credits: 149,
    description: "100+ modern video transitions for professional editing. Includes glitch, zoom, and slide effects.",
    author: "Emma Watson",
    type: "video",
    imagePlaceholder: "https://placehold.co/400x300/1e2130/4a6fa5?text=Transitions+Pack",
    rating: 4.7,
    category: "Transitions"
  },
  {
    id: 8,
    title: "Retro Wave Music Pack",
    credits: 199,
    description: "50+ synthwave and retro electronic tracks for your creative projects.",
    author: "Alex Rivera",
    type: "audio",
    imagePlaceholder: "https://placehold.co/400x300/1e2130/4a6fa5?text=Retro+Wave",
    rating: 4.6,
    category: "Music"
  },
  {
    id: 9,
    title: "LUTs Color Grading Bundle",
    credits: 249,
    description: "200+ professional LUTs for cinematic color grading. Compatible with all major editors.",
    author: "David Kim",
    type: "image",
    imagePlaceholder: "https://placehold.co/400x300/1e2130/4a6fa5?text=LUTs+Bundle",
    rating: 4.9,
    category: "Color Grading"
  },
  {
    id: 10,
    title: "Motion Graphics Templates",
    credits: 349,
    description: "150+ animated motion graphics templates for titles, lower thirds, and callouts.",
    author: "Jessica Martinez",
    type: "video",
    imagePlaceholder: "https://placehold.co/400x300/1e2130/4a6fa5?text=Motion+Graphics",
    rating: 4.8,
    category: "Templates"
  },
  {
    id: 11,
    title: "Ambient Soundscapes",
    credits: 179,
    description: "100+ ambient and atmospheric soundscapes for documentaries and films.",
    author: "Michael Lee",
    type: "audio",
    imagePlaceholder: "https://placehold.co/400x300/1e2130/4a6fa5?text=Ambient+Sound",
    rating: 4.5,
    category: "Music"
  },
  {
    id: 12,
    title: "Typography Animation Pack",
    credits: 199,
    description: "80+ text animation presets for stunning kinetic typography.",
    author: "Olivia Parker",
    type: "video",
    imagePlaceholder: "https://placehold.co/400x300/1e2130/4a6fa5?text=Typography+Pack",
    rating: 4.7,
    category: "Templates"
  }
];

const categories = ["All", ...new Set(suggestedAssets.map(asset => asset.category))];
const priceRanges = ["All", "Under 150", "150 - 300", "300 - 500", "500+"];
const ratings = ["All", "4.5+", "4.0+", "3.5+"];

// Skeleton Components
const WelcomeCardSkeleton = () => (
  <div className="mb-12 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8">
    <div className="h-10 w-48 animate-pulse rounded-lg bg-white/10" />
    <div className="mt-2 h-12 w-96 animate-pulse rounded-lg bg-white/10" />
    <div className="mt-4 h-5 w-full max-w-2xl animate-pulse rounded-lg bg-white/5" />
    <div className="mt-6 h-px w-32 animate-pulse bg-white/10" />
  </div>
);

const ActionButtonSkeleton = () => (
  <div className="h-11 w-full animate-pulse rounded-full bg-white/10" />
);

const SecondaryButtonSkeleton = () => (
  <div className="h-10 w-40 animate-pulse rounded-full bg-white/10" />
);

const AssetCardSkeleton = () => (
  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
    <div className="mb-3 h-40 w-full animate-pulse rounded-lg bg-white/10" />
    <div className="h-5 w-24 animate-pulse rounded-lg bg-white/10" />
    <div className="mt-2 h-4 w-full animate-pulse rounded-lg bg-white/5" />
    <div className="mt-2 h-4 w-3/4 animate-pulse rounded-lg bg-white/5" />
    <div className="mt-3 flex items-center justify-between">
      <div className="h-5 w-20 animate-pulse rounded-lg bg-white/5" />
      <div className="h-8 w-16 animate-pulse rounded-lg bg-white/10" />
    </div>
  </div>
);

const FilterButtonSkeleton = () => (
  <div className="h-8 w-24 animate-pulse rounded-full bg-white/10" />
);

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hoveredAsset, setHoveredAsset] = useState<number | null>(null);
  const [isFilterVisible, setIsFilterVisible] = useState(true);
  const [isActionsSticky, setIsActionsSticky] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedPriceRange, setSelectedPriceRange] = useState("All");
  const [selectedRating, setSelectedRating] = useState("All");

  const assetsSectionRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  // Simulate loading on mount
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Check scroll position for sticky actions
  useEffect(() => {
    const handleScroll = () => {
      if (actionsRef.current) {
        const rect = actionsRef.current.getBoundingClientRect();
        setIsActionsSticky(rect.top <= 80);
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const getTypeIcon = (type: Asset["type"]) => {
    switch (type) {
      case "audio": return <Music className="h-3 w-3" />;
      case "image": return <Image className="h-3 w-3" />;
      case "video": return <Video className="h-3 w-3" />;
      default: return null;
    }
  };

  const getTypeColor = (type: Asset["type"]) => {
    switch (type) {
      case "audio": return "bg-purple-500/20 text-purple-400";
      case "image": return "bg-green-500/20 text-green-400";
      case "video": return "bg-red-500/20 text-red-400";
      default: return "bg-blue-500/20 text-blue-400";
    }
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center gap-0.5">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={`full-${i}`} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
        ))}
        {hasHalfStar && <StarHalf className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
        {[...Array(emptyStars)].map((_, i) => (
          <Star key={`empty-${i}`} className="h-3 w-3 text-zinc-600" />
        ))}
        <span className="ml-1 text-xs text-zinc-400">{rating}</span>
      </div>
    );
  };

  const getPriceRangeValue = (range: string) => {
    switch (range) {
      case "Under 150": return { min: 0, max: 150 };
      case "150 - 300": return { min: 150, max: 300 };
      case "300 - 500": return { min: 300, max: 500 };
      case "500+": return { min: 500, max: Infinity };
      default: return { min: 0, max: Infinity };
    }
  };

  const getRatingValue = (rating: string) => {
    switch (rating) {
      case "4.5+": return 4.5;
      case "4.0+": return 4.0;
      case "3.5+": return 3.5;
      default: return 0;
    }
  };

  const filteredAssets = suggestedAssets.filter(asset => {
    if (selectedCategory !== "All" && asset.category !== selectedCategory) return false;
    const priceRange = getPriceRangeValue(selectedPriceRange);
    if (selectedPriceRange !== "All") {
      if (asset.credits < priceRange.min || asset.credits > priceRange.max) return false;
    }
    const ratingValue = getRatingValue(selectedRating);
    if (selectedRating !== "All" && asset.rating < ratingValue) return false;
    return true;
  });

  const activeFiltersCount = [
    selectedCategory !== "All",
    selectedPriceRange !== "All",
    selectedRating !== "All"
  ].filter(Boolean).length;

  // Show skeleton while loading
  if (loading) {
    return (
      <div className="min-h-screen bg-[#080a12]">
        <UserHeader pageTitle="Home" credits={1250} />
        <div className="mx-auto max-w-7xl p-6 md:p-8">
          <WelcomeCardSkeleton />
          <div className="mb-12 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ActionButtonSkeleton key={i} />
            ))}
          </div>
          <div className="mb-12 flex flex-wrap justify-center gap-4">
            <SecondaryButtonSkeleton />
            <SecondaryButtonSkeleton />
          </div>
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="h-7 w-40 animate-pulse rounded-lg bg-white/10" />
                <div className="mt-1 h-4 w-48 animate-pulse rounded-lg bg-white/5" />
              </div>
              <div className="h-5 w-32 animate-pulse rounded-lg bg-white/5" />
            </div>
            <div className="flex flex-col gap-6 lg:flex-row">
              <div className="lg:w-64">
                <div className="sticky top-48 rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-4">
                    <div className="mb-2 h-4 w-16 animate-pulse rounded bg-white/10" />
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3, 4].map((i) => (
                        <FilterButtonSkeleton key={i} />
                      ))}
                    </div>
                  </div>
                  <div className="my-4 h-px bg-white/10" />
                  <div className="mb-4">
                    <div className="mb-2 h-4 w-20 animate-pulse rounded bg-white/10" />
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3, 4].map((i) => (
                        <FilterButtonSkeleton key={i} />
                      ))}
                    </div>
                  </div>
                  <div className="my-4 h-px bg-white/10" />
                  <div>
                    <div className="mb-2 h-4 w-16 animate-pulse rounded bg-white/10" />
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3, 4].map((i) => (
                        <FilterButtonSkeleton key={i} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <div className="mb-4 h-5 w-48 animate-pulse rounded-lg bg-white/5" />
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <AssetCardSkeleton key={i} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080a12]">
      {/* Top Header */}
      <UserHeader pageTitle="Home" credits={1250} />

      {/* Main Content */}
      <div className="mx-auto max-w-7xl p-6 md:p-8">

        {/* Welcome Card */}
        <div className="group relative mb-12 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 via-white/5 to-transparent p-8 backdrop-blur-sm transition-all duration-500 hover:border-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-500/10">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/30 via-yellow-500/30 to-purple-500/30 opacity-40 animate-gradient-xy" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer group-hover:animate-shimmer-fast" />
          <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-cyan-500/30 blur-3xl animate-float-pulse group-hover:animate-float-pulse-fast" />
          <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-500/20 blur-3xl animate-breathing group-hover:animate-breathing-fast" />
          <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-purple-500/30 blur-3xl animate-float-pulse-delayed group-hover:animate-float-pulse-fast-delayed" />

          <h1 className="mb-2 text-3xl font-bold text-white md:text-4xl animate-slide-right-subtle group-hover:animate-slide-right-fast" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Welcome, User!
          </h1>
          <p className="text-2xl font-semibold text-white md:text-3xl animate-slide-right-subtle-delayed group-hover:animate-slide-right-fast-delayed" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Your Complete Video Editing<br />Ecosystem
          </p>
          <p className="mt-4 max-w-2xl text-sm text-zinc-400 animate-slide-right-subtle-more-delayed group-hover:animate-slide-right-fast-more-delayed" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Find job posts or services, buy assets, collaborate and connect with talented video editors or clients.
          </p>

          <div className="mt-6 h-px bg-gradient-to-r from-cyan-500 via-yellow-500 to-purple-500 animate-pulse-width group-hover:animate-pulse-width-fast" />
          <div className="mt-4 flex gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-cyan-400/60 animate-bounce-subtle group-hover:animate-bounce-fast" />
            <div className="h-1.5 w-1.5 rounded-full bg-yellow-400/60 animate-bounce-subtle-delayed group-hover:animate-bounce-fast-delayed" />
            <div className="h-1.5 w-1.5 rounded-full bg-purple-400/60 animate-bounce-subtle-more-delayed group-hover:animate-bounce-fast-more-delayed" />
          </div>
        </div>

        {/* Sticky Action Buttons Container */}
        <div
          ref={actionsRef}
          className={`sticky top-[78px] z-40 transition-all duration-300 ${
            isActionsSticky
              ? "rounded-xl border border-white/10 bg-[#080a12]/50 px-1 py-1 backdrop-blur-md shadow-lg"
              : ""
          }`}
        >
          {/* Action Buttons Grid - Row 1 */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <button
              onClick={() => navigate("/projects/select")}
              className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-full border border-white/15 bg-white/5 px-4 py-2.5 transition-all duration-300 hover:border-blue-500/50 hover:bg-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <Play className="relative h-4 w-4 text-blue-400 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
              <span className="relative text-sm font-medium text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Start Project</span>
            </button>

            <button
              onClick={() => navigate("/services")}
              className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-full border border-white/15 bg-white/5 px-4 py-2.5 transition-all duration-300 hover:border-green-500/50 hover:bg-green-500/10 hover:shadow-lg hover:shadow-green-500/20"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 via-green-500/10 to-green-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <Search className="relative h-4 w-4 text-green-400 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
              <span className="relative text-sm font-medium text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Find Services</span>
            </button>

            <button
              onClick={() => navigate("/jobs")}
              className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-full border border-white/15 bg-white/5 px-4 py-2.5 transition-all duration-300 hover:border-orange-500/50 hover:bg-orange-500/10 hover:shadow-lg hover:shadow-orange-500/20"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/10 to-orange-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <FileText className="relative h-4 w-4 text-orange-400 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
              <span className="relative text-sm font-medium text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Post a Job</span>
            </button>

            <button
              onClick={() => navigate("/my-proposals")}
              className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-full border border-white/15 bg-white/5 px-4 py-2.5 transition-all duration-300 hover:border-purple-500/50 hover:bg-purple-500/10 hover:shadow-lg hover:shadow-purple-500/20"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-purple-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <Briefcase className="relative h-4 w-4 text-purple-400 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
              <span className="relative text-sm font-medium text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Look for a Job</span>
            </button>

            <button
              onClick={() => navigate("/gigs")}
              className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-full border border-white/15 bg-white/5 px-4 py-2.5 transition-all duration-300 hover:border-pink-500/50 hover:bg-pink-500/10 hover:shadow-lg hover:shadow-pink-500/20"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 via-pink-500/10 to-pink-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <Wrench className="relative h-4 w-4 text-pink-400 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
              <span className="relative text-sm font-medium text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Create Service</span>
            </button>

            <button
              onClick={() => navigate("/assets")}
              className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-full border border-white/15 bg-white/5 px-4 py-2.5 transition-all duration-300 hover:border-cyan-500/50 hover:bg-cyan-500/10 hover:shadow-lg hover:shadow-cyan-500/20"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <Upload className="relative h-4 w-4 text-cyan-400 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
              <span className="relative text-sm font-medium text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Upload Asset</span>
            </button>
          </div>

          {/* Action Buttons Grid - Row 2 */}
          <div className="mt-3 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => navigate("/teams")}
              className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full border border-white/15 bg-white/5 px-4 py-2.5 transition-all duration-300 hover:border-blue-500/50 hover:bg-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20 sm:w-[calc(33.333%-0.75rem)] md:w-[calc(25%-0.75rem)] lg:w-[calc(16.666%-0.75rem)]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <Users className="relative h-4 w-4 text-blue-400 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
              <span className="relative text-sm font-medium text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Join a Team</span>
            </button>

            <button
              onClick={() => navigate("/forums")}
              className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full border border-white/15 bg-white/5 px-4 py-2.5 transition-all duration-300 hover:border-yellow-500/50 hover:bg-yellow-500/10 hover:shadow-lg hover:shadow-yellow-500/20 sm:w-[calc(33.333%-0.75rem)] md:w-[calc(25%-0.75rem)] lg:w-[calc(16.666%-0.75rem)]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/10 to-yellow-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <MessageCircle className="relative h-4 w-4 text-yellow-400 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
              <span className="relative text-sm font-medium text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Group Discussions</span>
            </button>
          </div>
        </div>

        {/* Suggested Assets Section with Filter */}
        <div ref={assetsSectionRef} className="mt-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Suggested Assets
              </h2>
              <p className="text-xs text-zinc-500" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Recommended based on your activity</p>
            </div>
            <button className="text-sm text-blue-400 hover:text-blue-300 transition" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              View More on Asset Library →
            </button>
          </div>

          {/* Filter Toggle Button */}
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() => setIsFilterVisible(!isFilterVisible)}
              className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-zinc-400 transition hover:border-white/30 hover:text-white"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              <Filter className="h-4 w-4" />
              {isFilterVisible ? "Hide Filters" : "Show Filters"}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isFilterVisible ? "rotate-180" : ""}`} />
            </button>

            {activeFiltersCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{activeFiltersCount} active filter(s)</span>
                <button
                  onClick={() => {
                    setSelectedCategory("All");
                    setSelectedPriceRange("All");
                    setSelectedRating("All");
                  }}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  <X className="h-3 w-3" />
                  Clear all
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6 lg:flex-row">
            {/* Filter Sidebar - Toggleable */}
            {isFilterVisible && (
              <div className="lg:w-64 animate-slide-in">
                <div className="sticky top-48 rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Category</p>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((category) => (
                        <button
                          key={category}
                          onClick={() => setSelectedCategory(category)}
                          className={`rounded-full px-3 py-1 text-xs transition-all duration-200 ${
                            selectedCategory === category
                              ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                              : "border border-white/15 bg-white/5 text-zinc-400 hover:border-white/30 hover:text-white"
                          }`}
                          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-white/10 my-4" />

                  <div className="mb-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Price Range</p>
                    <div className="flex flex-wrap gap-2">
                      {priceRanges.map((range) => (
                        <button
                          key={range}
                          onClick={() => setSelectedPriceRange(range)}
                          className={`rounded-full px-3 py-1 text-xs transition-all duration-200 ${
                            selectedPriceRange === range
                              ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                              : "border border-white/15 bg-white/5 text-zinc-400 hover:border-white/30 hover:text-white"
                          }`}
                          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        >
                          {range}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-white/10 my-4" />

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Rating</p>
                    <div className="flex flex-wrap gap-2">
                      {ratings.map((rating) => (
                        <button
                          key={rating}
                          onClick={() => setSelectedRating(rating)}
                          className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs transition-all duration-200 ${
                            selectedRating === rating
                              ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                              : "border border-white/15 bg-white/5 text-zinc-400 hover:border-white/30 hover:text-white"
                          }`}
                          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        >
                          {rating !== "All" && <Star className="h-3 w-3 fill-current" />}
                          {rating}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Assets Grid */}
            <div className={`flex-1 transition-all duration-300 ${isFilterVisible ? "" : "lg:ml-0"}`}>
              <p className="mb-4 text-sm text-zinc-500" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Showing {filteredAssets.length} of {suggestedAssets.length} assets
              </p>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:scale-[1.02]"
                    onMouseEnter={() => setHoveredAsset(asset.id)}
                    onMouseLeave={() => setHoveredAsset(null)}
                  >
                    <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-[#1a1f2e] to-[#0d0f1a]">
                      <img
                        src={asset.imagePlaceholder}
                        alt={asset.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#080a12] via-transparent to-transparent" />

                      <div className="absolute left-3 top-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${getTypeColor(asset.type)}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {getTypeIcon(asset.type)}
                          <span className="capitalize">{asset.type}</span>
                        </span>
                      </div>

                      <button className="absolute right-3 top-3 rounded-full bg-black/50 p-1.5 text-zinc-400 transition hover:text-red-400 backdrop-blur-sm">
                        <Heart className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{asset.category}</span>
                        {renderStars(asset.rating)}
                      </div>

                      <div className="mb-2 flex items-baseline gap-1">
                        <span className="text-xl font-bold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{asset.credits}</span>
                        <span className="text-xs text-zinc-500" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Credits</span>
                      </div>

                      <h3 className="mb-2 text-sm font-semibold text-white leading-tight line-clamp-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {asset.title}
                      </h3>

                      <p className="mb-3 text-xs text-zinc-400 line-clamp-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {asset.description}
                      </p>

                      <div className="flex items-center justify-between border-t border-white/10 pt-3">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-500" />
                          <span className="text-xs text-zinc-500 hover:text-blue-400 transition cursor-pointer" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            {asset.author}
                          </span>
                        </div>
                        <button className="flex items-center gap-1 rounded-lg bg-blue-500/20 px-2.5 py-1 text-xs font-medium text-blue-400 transition hover:bg-blue-500/30" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          <Download className="h-3 w-3" />
                          Get
                        </button>
                      </div>
                    </div>

                    {hoveredAsset === asset.id && (
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none" />
                    )}
                  </div>
                ))}
              </div>

              {filteredAssets.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-zinc-400" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>No assets found matching your filters.</p>
                  <button
                    onClick={() => {
                      setSelectedCategory("All");
                      setSelectedPriceRange("All");
                      setSelectedRating("All");
                    }}
                    className="mt-4 text-sm text-blue-400 hover:text-blue-300"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes gradient-xy {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-xy {
          background-size: 200% 200%;
          animation: gradient-xy 3s ease infinite;
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer { animation: shimmer 4s ease-in-out infinite; }
        .group:hover .animate-shimmer-fast { animation: shimmer 1.5s ease-in-out infinite; }
        
        @keyframes float-pulse {
          0%, 100% { transform: scale(1) translate(0, 0); opacity: 0.3; }
          50% { transform: scale(1.3) translate(-10px, -10px); opacity: 0.5; }
        }
        .animate-float-pulse { animation: float-pulse 4s ease-in-out infinite; }
        .group:hover .animate-float-pulse-fast { animation: float-pulse 1.5s ease-in-out infinite; }
        .animate-float-pulse-delayed { animation: float-pulse 4s ease-in-out infinite 2s; }
        .group:hover .animate-float-pulse-fast-delayed { animation: float-pulse 1.5s ease-in-out infinite 0.75s; }
        
        @keyframes breathing {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.2; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.4; }
        }
        .animate-breathing { animation: breathing 3s ease-in-out infinite; }
        .group:hover .animate-breathing-fast { animation: breathing 1.2s ease-in-out infinite; }
        
        @keyframes slide-right-subtle {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(5px); }
        }
        @keyframes slide-right-fast {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(8px); }
        }
        .animate-slide-right-subtle { animation: slide-right-subtle 4s ease-in-out infinite; }
        .group:hover .animate-slide-right-fast { animation: slide-right-fast 1s ease-in-out infinite; }
        .animate-slide-right-subtle-delayed { animation: slide-right-subtle 4s ease-in-out infinite 0.5s; }
        .group:hover .animate-slide-right-fast-delayed { animation: slide-right-fast 1s ease-in-out infinite 0.2s; }
        .animate-slide-right-subtle-more-delayed { animation: slide-right-subtle 4s ease-in-out infinite 1s; }
        .group:hover .animate-slide-right-fast-more-delayed { animation: slide-right-fast 1s ease-in-out infinite 0.4s; }
        
        @keyframes pulse-width {
          0%, 100% { width: 8rem; }
          50% { width: 12rem; }
        }
        @keyframes pulse-width-fast {
          0%, 100% { width: 8rem; }
          50% { width: 14rem; }
        }
        .animate-pulse-width { animation: pulse-width 3s ease-in-out infinite; }
        .group:hover .animate-pulse-width-fast { animation: pulse-width-fast 1s ease-in-out infinite; }
        
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes bounce-fast {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-subtle { animation: bounce-subtle 2s ease-in-out infinite; }
        .group:hover .animate-bounce-fast { animation: bounce-fast 0.6s ease-in-out infinite; }
        .animate-bounce-subtle-delayed { animation: bounce-subtle 2s ease-in-out infinite 0.3s; }
        .group:hover .animate-bounce-fast-delayed { animation: bounce-fast 0.6s ease-in-out infinite 0.15s; }
        .animate-bounce-subtle-more-delayed { animation: bounce-subtle 2s ease-in-out infinite 0.6s; }
        .group:hover .animate-bounce-fast-more-delayed { animation: bounce-fast 0.6s ease-in-out infinite 0.3s; }
        
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Home;