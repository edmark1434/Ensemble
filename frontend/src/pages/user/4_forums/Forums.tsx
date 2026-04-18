import {
  Bookmark,
  CircleDot,
  MessageCircle,
  PlusCircle,
  Search,
  ThumbsUp,
  Filter,
  ChevronDown,
  X,
  Clock,
  ChevronUp,
  Send,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import UserHeader from "@/components/nav/user_header";

type ForumTab = "feed" | "groups" | "my-groups" | "my-discussions" | "saved";

type Reply = {
  id: number;
  author: string;
  authorAvatar: string;
  content: string;
  ago: string;
  likes: number;
};

type Post = {
  author: string;
  authorAvatar?: string;
  title: string;
  excerpt: string;
  topic: string;
  likes: number;
  comments: number;
  ago: string;
  date: string;
  replies?: Reply[];
};

type Group = {
  name: string;
  owner: string;
  members: string;
  joined?: boolean;
  gradient: string;
};

const categories = [
  { name: "All", count: 32 },
  { name: "Editing", count: 12 },
  { name: "Assets", count: 11 },
  { name: "Job Postings", count: 5 },
  { name: "Services", count: 4 },
];

const topContributors = [
  { name: "John Paul Mahilom", score: "120+", avatar: "https://i.pravatar.cc/150?u=john", role: "Expert Editor" },
  { name: "Edmark Tarlinging", score: "95+", avatar: "https://i.pravatar.cc/150?u=edmark", role: "Colorist" },
  { name: "Jodelic Pablo", score: "91+", avatar: "https://i.pravatar.cc/150?u=jodelic", role: "VFX Artist" },
  { name: "Jhoanessa Lacaya", score: "86+", avatar: "https://i.pravatar.cc/150?u=jhoanessa", role: "Sound Designer" },
  { name: "Judith Krisa", score: "75+", avatar: "https://i.pravatar.cc/150?u=judith", role: "Director" },
];

// Sample replies data
const sampleReplies: Record<number, Reply[]> = {
  0: [
    {
      id: 1,
      author: "Sarah Chen",
      authorAvatar: "https://i.pravatar.cc/150?u=sarah",
      content: "Great question! I usually start with a color space transform to get from S-Log3 to Rec.709, then do my primary corrections before moving to secondary.",
      ago: "30 min ago",
      likes: 8,
    },
    {
      id: 2,
      author: "Marcus Thompson",
      authorAvatar: "https://i.pravatar.cc/150?u=marcus",
      content: "I recommend using DaVinci Wide Gamut as your working space. It gives you more flexibility in grading.",
      ago: "15 min ago",
      likes: 5,
    },
  ],
  1: [
    {
      id: 3,
      author: "Emma Watson",
      authorAvatar: "https://i.pravatar.cc/150?u=emma",
      content: "Always get everything in writing! Make sure your contract clearly states the number of revisions included.",
      ago: "1 hour ago",
      likes: 12,
    },
  ],
  2: [
    {
      id: 4,
      author: "Jodelic Pablo",
      authorAvatar: "https://i.pravatar.cc/150?u=jodelic",
      content: "Motion Tools and FX Console are absolute must-haves! Also check out Animation Composer.",
      ago: "3 hours ago",
      likes: 23,
    },
    {
      id: 5,
      author: "John Paul Mahilom",
      authorAvatar: "https://i.pravatar.cc/150?u=john",
      content: "I'd add Overlord and RubberHose to that list. They save so much time!",
      ago: "2 hours ago",
      likes: 15,
    },
  ],
};

const posts: Post[] = [
  {
    author: "Forbes Talinging",
    authorAvatar: "https://i.pravatar.cc/150?u=forbes",
    title: "Best Practices for color grading log footage?",
    excerpt: "I am working with S-Log3 footage and looking for advice on the best workflow for color grading. What is your process?",
    topic: "Color Grading Society",
    likes: 12,
    comments: 8,
    ago: "45 min ago",
    date: "2024-01-15",
    replies: sampleReplies[0],
  },
  {
    author: "John Paul Mahilom",
    authorAvatar: "https://i.pravatar.cc/150?u=john",
    title: "Dealing with difficult clients - advice needed",
    excerpt: "Client keeps asking for revisions beyond what is in the contract. How do you handle this professionally?",
    topic: "Color Grading Society",
    likes: 24,
    comments: 15,
    ago: "2 hours ago",
    date: "2024-01-14",
    replies: sampleReplies[1],
  },
  {
    author: "Sarah Chen",
    authorAvatar: "https://i.pravatar.cc/150?u=sarah",
    title: "Best plugins for After Effects in 2024?",
    excerpt: "Looking for recommendations on must-have plugins for motion graphics and VFX work.",
    topic: "Editing",
    likes: 45,
    comments: 23,
    ago: "5 hours ago",
    date: "2024-01-14",
    replies: sampleReplies[2],
  },
  {
    author: "Marcus Thompson",
    authorAvatar: "https://i.pravatar.cc/150?u=marcus",
    title: "DaVinci Resolve vs Premiere Pro - which one do you prefer?",
    excerpt: "Curious about what everyone is using for their main editing suite and why.",
    topic: "Editing",
    likes: 67,
    comments: 42,
    ago: "1 day ago",
    date: "2024-01-13",
  },
  {
    author: "Emma Watson",
    authorAvatar: "https://i.pravatar.cc/150?u=emma",
    title: "Royalty-free music sources for YouTube content",
    excerpt: "Share your favorite places to get high-quality royalty-free music for videos.",
    topic: "Assets",
    likes: 34,
    comments: 18,
    ago: "2 days ago",
    date: "2024-01-12",
  },
];

const groups: Group[] = [
  {
    owner: "Jodelic Pacbe",
    name: "Discussion of the finests",
    members: "120 Members",
    gradient: "from-slate-400 via-slate-300 to-zinc-500",
  },
  {
    owner: "Edmark Tarlinging",
    name: "Starving Editors",
    members: "30 Members",
    gradient: "from-[#7c3aed] via-[#a78bfa] to-[#f5d0fe]",
  },
  {
    owner: "John Paul Mahilom",
    name: "Color Grading Society",
    members: "20 Members",
    joined: true,
    gradient: "from-cyan-500 via-blue-500 to-indigo-500",
  },
  {
    owner: "Username",
    name: "Group Name",
    members: "11 Members",
    gradient: "from-[#22d3ee] via-[#0ea5e9] to-[#38bdf8]",
  },
  {
    owner: "Username",
    name: "Group Name",
    members: "11 Member",
    gradient: "from-[#f59e0b] via-[#f97316] to-[#ea580c]",
  },
  {
    owner: "Username",
    name: "Group Name",
    members: "11 Member",
    gradient: "from-[#8b5cf6] via-[#ec4899] to-[#ef4444]",
  },
];

const tabOptions: { key: ForumTab; label: string }[] = [
  { key: "feed", label: "Feed" },
  { key: "groups", label: "Groups" },
  { key: "my-groups", label: "My Groups" },
  { key: "my-discussions", label: "My Discussions" },
  { key: "saved", label: "Saved" },
];

const sortOptions = [
  { value: "latest", label: "Latest", icon: <Clock className="h-3 w-3" /> },
  { value: "most-liked", label: "Most Liked", icon: <ThumbsUp className="h-3 w-3" /> },
  { value: "most-commented", label: "Most Commented", icon: <MessageCircle className="h-3 w-3" /> },
];

// Skeleton Components
const SidebarSkeleton = () => (
  <div className="space-y-4">
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="mb-2 h-5 w-24 animate-pulse rounded bg-white/10" />
      <div className="mb-3 h-3 w-32 animate-pulse rounded bg-white/5" />
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-7 w-16 animate-pulse rounded-full bg-white/10" />
        ))}
      </div>
    </div>
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="mb-2 h-5 w-20 animate-pulse rounded bg-white/10" />
      <div className="mb-3 h-3 w-32 animate-pulse rounded bg-white/5" />
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-7 w-20 animate-pulse rounded-full bg-white/10" />
        ))}
      </div>
    </div>
  </div>
);

const TopContributorsSkeleton = () => (
  <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-4 backdrop-blur-sm">
    <div className="mb-2 h-5 w-28 animate-pulse rounded bg-white/10" />
    <div className="mb-3 h-3 w-40 animate-pulse rounded bg-white/5" />
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
          <div className="flex-1">
            <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
            <div className="mt-1 h-3 w-16 animate-pulse rounded bg-white/5" />
          </div>
          <div className="text-right">
            <div className="h-4 w-12 animate-pulse rounded bg-white/10" />
            <div className="mt-1 h-3 w-10 animate-pulse rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const PostCardSkeleton = () => (
  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
    <div className="flex gap-3">
      <div className="h-10 w-10 animate-pulse rounded-full bg-white/10" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
          <div className="h-3 w-20 animate-pulse rounded bg-white/5" />
        </div>
        <div className="mt-2 h-5 w-3/4 animate-pulse rounded bg-white/10" />
        <div className="mt-2 space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-white/5" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-white/5" />
        </div>
        <div className="mt-3 flex gap-4">
          <div className="h-6 w-16 animate-pulse rounded-full bg-white/10" />
          <div className="h-4 w-20 animate-pulse rounded bg-white/5" />
          <div className="h-4 w-16 animate-pulse rounded bg-white/5" />
          <div className="h-4 w-12 animate-pulse rounded bg-white/5" />
        </div>
      </div>
    </div>
  </div>
);
const Forums = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ForumTab>("feed");
  const [isFilterVisible, setIsFilterVisible] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["All"]);
  const [sortBy, setSortBy] = useState("latest");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedPostId, setExpandedPostId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState<{ [key: number]: string }>({});

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const visiblePosts = useMemo(() => {
    let filtered = posts;

    if (activeTab === "saved") {
      filtered = posts.slice(0, 2);
    } else if (activeTab === "my-discussions") {
      filtered = posts.filter(p => p.author === "John Paul Mahilom");
    }

    // Filter by categories
    if (!selectedCategories.includes("All") && selectedCategories.length > 0) {
      filtered = filtered.filter(post => selectedCategories.includes(post.topic));
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.author.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    if (sortBy === "latest") {
      filtered = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (sortBy === "most-liked") {
      filtered = [...filtered].sort((a, b) => b.likes - a.likes);
    } else if (sortBy === "most-commented") {
      filtered = [...filtered].sort((a, b) => b.comments - a.comments);
    }

    return filtered;
  }, [activeTab, selectedCategories, sortBy, searchQuery]);

  const visibleGroups = useMemo(() => {
    if (activeTab === "my-groups") {
      return groups.filter((group) => group.joined);
    }
    return groups;
  }, [activeTab]);

  const actionLabel = activeTab === "groups" || activeTab === "my-groups" ? "Create a Group" : "New Discussion";

  const toggleCategory = (category: string) => {
    if (category === "All") {
      setSelectedCategories(["All"]);
    } else {
      const newSelected = selectedCategories.filter(c => c !== "All");
      if (newSelected.includes(category)) {
        const filtered = newSelected.filter(c => c !== category);
        setSelectedCategories(filtered.length === 0 ? ["All"] : filtered);
      } else {
        setSelectedCategories([...newSelected, category]);
      }
    }
  };

  const activeFiltersCount = selectedCategories.filter(c => c !== "All").length + (sortBy !== "latest" ? 1 : 0);

  const toggleExpand = (postId: number) => {
    setExpandedPostId(expandedPostId === postId ? null : postId);
  };

  const handleReply = (postId: number) => {
    if (replyText[postId]?.trim()) {
      console.log(`Reply to post ${postId}: ${replyText[postId]}`);
      setReplyText({ ...replyText, [postId]: "" });
    }
  };

  const updateReplyText = (postId: number, text: string) => {
    setReplyText({ ...replyText, [postId]: text });
  };

  // Show skeleton while loading
  if (loading) {
    return (
      <div className="min-h-screen bg-[#080a12]">
        <UserHeader pageTitle="Forums" credits={1250} />
        <div className="mx-auto max-w-7xl p-6 md:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="h-8 w-48 animate-pulse rounded-lg bg-white/10" />
              <div className="mt-1 h-4 w-64 animate-pulse rounded-lg bg-white/5" />
            </div>
          </div>
          <div className="mb-6 flex justify-end">
            <div className="h-10 w-36 animate-pulse rounded-full bg-white/10" />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
            <div>
              <SidebarSkeleton />
              <div className="mt-4">
                <TopContributorsSkeleton />
              </div>
            </div>
            <div>
              <div className="mb-4 h-10 w-full animate-pulse rounded-full bg-white/5" />
              <div className="mb-4 flex gap-2 border-b border-white/10 pb-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-white/10" />
                ))}
              </div>
              <div className="mb-4 h-4 w-48 animate-pulse rounded bg-white/5" />
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <PostCardSkeleton key={i} />
                ))}
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
      <UserHeader pageTitle="Forums" credits={1250} />

      {/* Main Content */}
      <div className="mx-auto max-w-7xl p-6 md:p-8">

        {/* Header Section */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Community Forums
            </h1>
            <p className="text-sm text-zinc-400" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Connect, discuss, and collaborate with fellow creators
            </p>
          </div>
        </div>

        {/* New Discussion Button */}
        <div className="mb-6 flex justify-end">
          <button
            type="button"
            className="group flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95 active:bg-gradient-to-r active:from-cyan-500 active:via-yellow-500 active:to-purple-600 active:text-white"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            <PlusCircle className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
            {actionLabel}
          </button>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">

          {/* Left Sidebar */}
          <div>
            {/* Filter Section - Collapsible */}
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
                  <span className="text-xs text-zinc-500" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{activeFiltersCount}</span>
                  <button
                    onClick={() => {
                      setSelectedCategories(["All"]);
                      setSortBy("latest");
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

            {isFilterVisible && (
              <div className="space-y-4 animate-slide-in">
                {/* Categories Section */}
                <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-4 backdrop-blur-sm">
                  <h3 className="text-sm font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Categories
                  </h3>
                  <p className="mb-3 text-[11px] text-zinc-500" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Filter by topic
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <button
                        key={category.name}
                        onClick={() => toggleCategory(category.name)}
                        className={`rounded-full px-3 py-1 text-xs transition-all duration-200 ${
                          selectedCategories.includes(category.name)
                            ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                            : "border border-white/15 bg-white/5 text-zinc-400 hover:border-white/30 hover:text-white"
                        }`}
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                      >
                        {category.name}
                        <span className="ml-1 text-[10px] opacity-70">({category.count})</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort By Section */}
                <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-4 backdrop-blur-sm">
                  <h3 className="text-sm font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Sort By
                  </h3>
                  <p className="mb-3 text-[11px] text-zinc-500" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Order discussions
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setSortBy(option.value)}
                        className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs transition-all duration-200 ${
                          sortBy === option.value
                            ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                            : "border border-white/15 bg-white/5 text-zinc-400 hover:border-white/30 hover:text-white"
                        }`}
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                      >
                        {option.icon}
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Top Contributors Section - Always visible, NOT part of filter */}
            <div className="mt-4 rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-4 backdrop-blur-sm">
              <h3 className="text-sm font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Top Contributors
              </h3>
              <p className="mb-3 text-[11px] text-zinc-500" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Leaderboard of Reputation
              </p>
              <ul className="space-y-3">
                {topContributors.map((contributor, idx) => (
                  <li key={contributor.name} className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={contributor.avatar}
                        alt={contributor.name}
                        className="h-8 w-8 rounded-full object-cover ring-2 ring-white/20"
                      />
                      <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 text-[9px] font-bold text-black">
                        {idx + 1}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {contributor.name}
                      </p>
                      <p className="text-[10px] text-zinc-500">{contributor.role}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-400">{contributor.score}</p>
                      <p className="text-[9px] text-zinc-500">points</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Content */}
          <div>
            {/* Search Bar */}
            <div className="mb-4 flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5">
              <Search className="h-4 w-4 text-zinc-500" />
              <input
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                placeholder="Search discussions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Tabs Bar */}
            <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
              {tabOptions.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                    activeTab === tab.key
                      ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                      : "border border-white/15 bg-white/5 text-zinc-400 hover:border-white/30 hover:text-white"
                  }`}
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Groups View */}
            {(activeTab === "groups" || activeTab === "my-groups") && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visibleGroups.map((group, idx) => (
                  <div key={`${group.owner}-${group.name}-${idx}`} className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:scale-[1.02]">
                    <div className={`h-24 bg-gradient-to-r ${group.gradient}`} />
                    <div className="p-4">
                      <p className="text-xs text-zinc-500" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        By {group.owner}
                      </p>
                      <h3 className="mt-1 text-sm font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {group.name}
                      </h3>
                      <p className="mt-1 text-xs text-zinc-500" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {group.members}
                      </p>
                      <button className="mt-3 rounded-full border border-white/20 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-white/10">
                        {group.joined ? "Joined" : "Join Group"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Posts View */}
            {(activeTab === "feed" || activeTab === "my-discussions" || activeTab === "saved") && (
              <div className="space-y-4">
                <p className="text-sm text-zinc-500" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Showing {visiblePosts.length} of {posts.length} discussions
                </p>

                {visiblePosts.map((post, idx) => (
                  <div key={`${post.author}-${post.title}-${idx}`} className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent transition-all duration-300 hover:border-white/20 hover:bg-white/10">
                    <div className="p-4">
                      <div className="mb-3 flex items-start gap-3">
                        <img
                          src={post.authorAvatar}
                          alt={post.author}
                          className="h-10 w-10 rounded-full object-cover ring-2 ring-white/20"
                        />

                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                              {post.author}
                            </p>
                            <span className="text-xs text-zinc-500">{post.ago}</span>
                          </div>
                          <h3 className="mt-1 text-base font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            {post.title}
                          </h3>
                          <p className="mt-2 text-sm text-zinc-400" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            {post.excerpt}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-400">
                              {post.topic}
                            </span>
                            <button
                              onClick={() => toggleExpand(idx)}
                              className="inline-flex items-center gap-1 text-zinc-500 transition hover:text-white"
                              type="button"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                {post.comments} replies
                              </span>
                              {expandedPostId === idx ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button className="inline-flex items-center gap-1 text-zinc-500 transition hover:text-white" type="button">
                              <ThumbsUp className="h-3.5 w-3.5" />
                              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{post.likes} likes</span>
                            </button>
                            <button className="inline-flex items-center gap-1 text-zinc-500 transition hover:text-white" type="button">
                              <Bookmark className="h-3.5 w-3.5" />
                              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Save</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Replies Section */}
                      {expandedPostId === idx && (
                        <div className="mt-4 border-t border-white/10 pt-4 animate-fade-in">
                          <div className="space-y-4">
                            {post.replies && post.replies.length > 0 ? (
                              post.replies.map((reply) => (
                                <div key={reply.id} className="flex gap-3">
                                  <img
                                    src={reply.authorAvatar}
                                    alt={reply.author}
                                    className="h-8 w-8 rounded-full object-cover ring-2 ring-white/20"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="text-sm font-medium text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                        {reply.author}
                                      </p>
                                      <span className="text-xs text-zinc-500">{reply.ago}</span>
                                    </div>
                                    <p className="mt-1 text-sm text-zinc-400" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                      {reply.content}
                                    </p>
                                    <div className="mt-2 flex items-center gap-3">
                                      <button className="inline-flex items-center gap-1 text-xs text-zinc-500 transition hover:text-white">
                                        <ThumbsUp className="h-3 w-3" />
                                        <span>{reply.likes}</span>
                                      </button>
                                      <button className="inline-flex items-center gap-1 text-xs text-zinc-500 transition hover:text-white">
                                        <MessageCircle className="h-3 w-3" />
                                        <span>Reply</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-zinc-500 text-center py-4">
                                No replies yet. Be the first to reply!
                              </p>
                            )}
                          </div>

                          <div className="mt-4 flex gap-3">
                            <img
                              src="https://i.pravatar.cc/150?u=currentuser"
                              alt="You"
                              className="h-8 w-8 rounded-full object-cover ring-2 ring-white/20"
                            />
                            <div className="flex-1">
                              <textarea
                                value={replyText[idx] || ""}
                                onChange={(e) => updateReplyText(idx, e.target.value)}
                                placeholder="Write a reply..."
                                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none"
                                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                rows={2}
                              />
                              <div className="mt-2 flex justify-end">
                                <button
                                  onClick={() => handleReply(idx)}
                                  disabled={!replyText[idx]?.trim()}
                                  className="flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Send className="h-3 w-3" />
                                  Post Reply
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {activeTab !== "groups" && activeTab !== "my-groups" && visiblePosts.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 p-12 text-center">
                <CircleDot className="mb-3 h-8 w-8 text-zinc-500" />
                <h3 className="text-lg font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  No discussions found
                </h3>
                <p className="mt-1 text-sm text-zinc-400" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Try adjusting your filters or search query
                </p>
              </div>
            )}
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
        
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Forums;