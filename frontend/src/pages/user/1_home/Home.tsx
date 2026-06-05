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
  Video as VideoIcon,
  Filter,
  ChevronDown,
  Star,
  StarHalf,
  X,
} from "lucide-react";
import UserHeader from "@/components/nav/user_header";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import useGlobalState from "@/lib/global_state";

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
    imagePlaceholder: "https://placehold.co/400x400/1e2130/4a6fa5?text=Audio+Library",
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
    imagePlaceholder: "https://placehold.co/400x400/1e2130/4a6fa5?text=Industrial+Audio",
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
    imagePlaceholder: "https://placehold.co/400x400/1e2130/4a6fa5?text=Oil+Canvas",
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
    imagePlaceholder: "https://placehold.co/400x400/1e2130/4a6fa5?text=Ink+Drops",
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
    imagePlaceholder: "https://placehold.co/400x400/1e2130/4a6fa5?text=Cinematic+Trailer",
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
    imagePlaceholder: "https://placehold.co/400x400/1e2130/4a6fa5?text=Nature+Footage",
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
    imagePlaceholder: "https://placehold.co/400x400/1e2130/4a6fa5?text=Transitions+Pack",
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
    imagePlaceholder: "https://placehold.co/400x400/1e2130/4a6fa5?text=Retro+Wave",
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
    imagePlaceholder: "https://placehold.co/400x400/1e2130/4a6fa5?text=LUTs+Bundle",
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
    imagePlaceholder: "https://placehold.co/400x400/1e2130/4a6fa5?text=Motion+Graphics",
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
    imagePlaceholder: "https://placehold.co/400x400/1e2130/4a6fa5?text=Ambient+Sound",
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
    imagePlaceholder: "https://placehold.co/400x400/1e2130/4a6fa5?text=Typography+Pack",
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
  <div className="h-11 w-full animate-pulse rounded-xl bg-white/10" />
);

const AssetCardSkeleton = () => (
  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
    <div className="mb-3 aspect-square w-full animate-pulse rounded-lg bg-white/10" />
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
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isActionsSticky, setIsActionsSticky] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedPriceRange, setSelectedPriceRange] = useState("All");
  const [selectedRating, setSelectedRating] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  console.log("userInfo from global state:", useGlobalState((state) => state.user));
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
      case "video": return <VideoIcon className="h-3 w-3" />;
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

  const activeFiltersCount = [
    selectedCategory !== "All",
    selectedPriceRange !== "All",
    selectedRating !== "All",
    searchQuery.trim() !== ""
  ].filter(Boolean).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080a12]">
        <UserHeader pageTitle="Home" credits={1250} />
        <div className="mx-auto max-w-7xl p-6 md:p-8">
          <WelcomeCardSkeleton />

          {/* Row of Action Buttons Skeletons */}
          <div className="mb-12 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
            <ActionButtonSkeleton />
            <ActionButtonSkeleton />
            <ActionButtonSkeleton />
            <ActionButtonSkeleton />
            <ActionButtonSkeleton />
            <ActionButtonSkeleton />
            <ActionButtonSkeleton />
            <ActionButtonSkeleton />
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
              {/* Sidebar Filters Skeletons */}
              <div className="lg:w-64">
                <div className="sticky top-48 rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-4">
                    <div className="mb-2 h-4 w-16 animate-pulse rounded bg-white/10" />
                    <div className="flex flex-wrap gap-2">
                      <FilterButtonSkeleton />
                      <FilterButtonSkeleton />
                      <FilterButtonSkeleton />
                      <FilterButtonSkeleton />
                    </div>
                  </div>
                  <div className="my-4 h-px bg-white/10" />
                  <div className="mb-4">
                    <div className="mb-2 h-4 w-20 animate-pulse rounded bg-white/10" />
                    <div className="flex flex-wrap gap-2">
                      <FilterButtonSkeleton />
                      <FilterButtonSkeleton />
                      <FilterButtonSkeleton />
                      <FilterButtonSkeleton />
                    </div>
                  </div>
                </div>
              </div>

              {/* Asset Grid Skeletons */}
              <div className="flex-1">
                <div className="mb-4 h-5 w-48 animate-pulse rounded-lg bg-white/5" />
                <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                  <AssetCardSkeleton />
                  <AssetCardSkeleton />
                  <AssetCardSkeleton />
                  <AssetCardSkeleton />
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

        {/* Welcome Banner with Cinematic Video Background */}
        <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/15 bg-zinc-950/40 p-8 md:p-12 shadow-2xl">

          {/* Background Video Element */}
          <video
            src="/clip/banner_vid.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover opacity-35 select-none pointer-events-none"
          />

          {/* Gradients for text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/60 to-transparent backdrop-blur-[1px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/50 via-transparent to-transparent" />

          {/* Content Layer */}
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-400 mb-4 tracking-wide uppercase">
              <span className="flex h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              V1.2.0.8 : Pre-Alpha
            </div>

            <h1
              className="text-3xl font-extrabold tracking-tight text-white md:text-5xl"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Welcome back, Editor
            </h1>

            <p
              className="mt-3 text-lg font-medium text-zinc-200 md:text-xl leading-relaxed"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Your complete ecosystem for production, assets, and elite client collaboration.
            </p>

            <p
              className="mt-4 text-sm text-zinc-400 leading-relaxed"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Secure your next project, discover high-fidelity audio and video assets, or sync up with teams around the globe. Everything you need to scale your production workflow lives here.
            </p>

            <div className="mt-8 h-[2px] w-24 bg-gradient-to-r from-cyan-500 via-purple-500 to-transparent rounded-full" />
          </div>
        </div>

        {/* Global Hub Search Bar Container */}
        <div className="mb-12 relative max-w-3xl mx-auto z-20">
          <div className="relative flex items-center rounded-xl border border-white/10 bg-white/5 p-1.5 backdrop-blur-xl shadow-xl focus-within:border-blue-500/50 focus-within:shadow-blue-500/5 transition duration-300">
            <div className="flex items-center justify-center pl-3 pr-2 text-zinc-400">
              <Search className="h-5 w-5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assets, libraries, effects, or templates across the ecosystem..."
              className="w-full bg-transparent px-2 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition mr-1"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Improved Responsive Quick Action Buttons Grid */}
        <div
          ref={actionsRef}
          className={`mb-12 p-1 transition-all duration-300 ${
            isActionsSticky
              ? "sticky top-[78px] z-40 rounded-xl border border-white/10 bg-[#080a12]/70 backdrop-blur-md shadow-2xl"
              : ""
          }`}
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">

            <button
              onClick={() => navigate("/projects/select")}
              className="group flex flex-col items-center justify-center rounded-xl border border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent p-4 text-center transition duration-300 hover:border-blue-500/30 hover:from-blue-500/10 hover:shadow-lg hover:shadow-blue-500/5"
            >
              <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 group-hover:bg-blue-500/20 transition duration-300">
                <Play className="h-5 w-5 fill-current text-blue-400" />
              </div>
              <span className="text-xs font-semibold tracking-wide text-zinc-200 group-hover:text-white transition" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Start Project</span>
            </button>

            <button
              onClick={() => navigate("/services")}
              className="group flex flex-col items-center justify-center rounded-xl border border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent p-4 text-center transition duration-300 hover:border-green-500/30 hover:from-green-500/10 hover:shadow-lg hover:shadow-green-500/5"
            >
              <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-400 group-hover:scale-110 group-hover:bg-green-500/20 transition duration-300">
                <Search className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold tracking-wide text-zinc-200 group-hover:text-white transition" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Find Services</span>
            </button>

            <button
              onClick={() => navigate("/jobs")}
              className="group flex flex-col items-center justify-center rounded-xl border border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent p-4 text-center transition duration-300 hover:border-orange-500/30 hover:from-orange-500/10 hover:shadow-lg hover:shadow-orange-500/5"
            >
              <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400 group-hover:scale-110 group-hover:bg-orange-500/20 transition duration-300">
                <FileText className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold tracking-wide text-zinc-200 group-hover:text-white transition" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Post a Job</span>
            </button>

            <button
              onClick={() => navigate("/my-proposals")}
              className="group flex flex-col items-center justify-center rounded-xl border border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent p-4 text-center transition duration-300 hover:border-purple-500/30 hover:from-purple-500/10 hover:shadow-lg hover:shadow-purple-500/5"
            >
              <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 group-hover:scale-110 group-hover:bg-purple-500/20 transition duration-300">
                <Briefcase className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold tracking-wide text-zinc-200 group-hover:text-white transition" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Find a Job</span>
            </button>

            <button
              onClick={() => navigate("/gigs")}
              className="group flex flex-col items-center justify-center rounded-xl border border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent p-4 text-center transition duration-300 hover:border-pink-500/30 hover:from-pink-500/10 hover:shadow-lg hover:shadow-pink-500/5"
            >
              <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-lg bg-pink-500/10 text-pink-400 group-hover:scale-110 group-hover:bg-pink-500/20 transition duration-300">
                <Wrench className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold tracking-wide text-zinc-200 group-hover:text-white transition" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Create Service</span>
            </button>

            <button
              onClick={() => navigate("/assets")}
              className="group flex flex-col items-center justify-center rounded-xl border border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent p-4 text-center transition duration-300 hover:border-cyan-500/30 hover:from-cyan-500/10 hover:shadow-lg hover:shadow-cyan-500/5"
            >
              <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:scale-110 group-hover:bg-cyan-500/20 transition duration-300">
                <Upload className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold tracking-wide text-zinc-200 group-hover:text-white transition" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Upload Asset</span>
            </button>

            <button
              onClick={() => navigate("/teams")}
              className="group flex flex-col items-center justify-center rounded-xl border border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent p-4 text-center transition duration-300 hover:border-teal-500/30 hover:from-teal-500/10 hover:shadow-lg hover:shadow-teal-500/5"
            >
              <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400 group-hover:scale-110 group-hover:bg-teal-500/20 transition duration-300">
                <Users className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold tracking-wide text-zinc-200 group-hover:text-white transition" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Join a Team</span>
            </button>

            <button
              onClick={() => navigate("/forums")}
              className="group flex flex-col items-center justify-center rounded-xl border border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent p-4 text-center transition duration-300 hover:border-yellow-500/30 hover:from-yellow-500/10 hover:shadow-lg hover:shadow-yellow-500/5"
            >
              <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10 text-yellow-400 group-hover:scale-110 group-hover:bg-yellow-500/20 transition duration-300">
                <MessageCircle className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold tracking-wide text-zinc-200 group-hover:text-white transition" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Discussions</span>
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
                    setSearchQuery("");
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

            {/* Assets 4-Column Grid */}
            <div className={`flex-1 transition-all duration-300 ${isFilterVisible ? "" : "lg:ml-0"}`}>
              <p className="mb-4 text-sm text-zinc-500" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Showing {filteredAssets.length} of {suggestedAssets.length} assets
              </p>

              <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {filteredAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:scale-[1.02]"
                    onMouseEnter={() => setHoveredAsset(asset.id)}
                    onMouseLeave={() => setHoveredAsset(null)}
                  >
                    {/* 1:1 Square Media Section */}
                    <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-[#1a1f2e] to-[#0d0f1a]">
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
                      setSearchQuery("");
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