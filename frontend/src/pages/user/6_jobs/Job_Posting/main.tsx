import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Search,
  Star,
  Users,
  Clock,
  Bookmark,
  X,
  Send,
  Briefcase,
  Grid3x3,
  Calendar
} from "lucide-react";
import UserHeader from "@/components/nav/user_header";
import { useNavigate, useParams } from "react-router-dom";

// Modular Imports
import CategoriesSidebar from "./CategoriesSidebar";
import FilterSidebar from "./FilterSidebar";

interface Job {
  id: string;
  title: string;
  description: string;
  status: "Open" | "Closed";
  category: string;
  difficulty: "Beginner" | "Intermediate" | "Expert";
  priceRange: string;
  minBudget: number;
  postedBy: string;
  postedAt: string;         // e.g., "Oct 24, 2026 • 2:30 PM"
  timeAgo: string;          // e.g., "Posted 2 hours ago"
  clientRating: number;
  ratingCount: number;
  positionsNeeded: number;
  applicantsCount: number;
  timeline: string;         // e.g., "3-5 Days"
  thumbnail: string;
  isSaved?: boolean;
  isOwnPost?: boolean;
}

const sampleJobs: Job[] = [
  {
    id: "JP001",
    title: "Wedding Video Edit - Romantic Style",
    description: "Looking for an experienced editor to create a 10-minute wedding highlight reel. Must be proficient in color grading and narrative storytelling. Raw footage provided is around 50GB in 4K.\n\nRequirements:\n• Advanced Multi-cam editing\n• Dynamic Audio syncing & sound design\n• High-end cinematic color grading matching log profiles.",
    status: "Open",
    category: "Events",
    difficulty: "Intermediate",
    priceRange: "₱28,000 ~ 36,000",
    minBudget: 28000,
    postedBy: "Edmark Talingting",
    postedAt: "Oct 24, 2026 • 2:30 PM",
    timeAgo: "Posted 2 hours ago",
    clientRating: 4.5,
    ratingCount: 12,
    positionsNeeded: 3,
    applicantsCount: 28,
    timeline: "3-5 Days",
    thumbnail: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80",
    isSaved: true,
    isOwnPost: false
  },
  {
    id: "JP002",
    title: "YouTube Channel Intro Animation",
    description: "Need a 10-second animated intro for a tech review channel. Should include clean typography, slick sound effects, and source project delivery file formats.",
    status: "Open",
    category: "YouTube",
    difficulty: "Beginner",
    priceRange: "₱12,000 ~ 14,000",
    minBudget: 12000,
    postedBy: "Jodeci Pacibe",
    postedAt: "Oct 24, 2026 • 11:15 AM",
    timeAgo: "Posted 2 hours ago",
    clientRating: 4.5,
    ratingCount: 5,
    positionsNeeded: 1,
    applicantsCount: 33,
    timeline: "1-3 Days",
    thumbnail: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=600&q=80",
    isSaved: false,
    isOwnPost: true
  },
  {
    id: "JP003",
    title: "Corporate Brand Identity Video",
    description: "Seeking a professional video creator to craft a high-end promotional commercial sequence highlighting global enterprise logistics infrastructure updates.",
    status: "Open",
    category: "Corporate",
    difficulty: "Expert",
    priceRange: "₱45,000 ~ 60,000",
    minBudget: 45000,
    postedBy: "Sarah Chen",
    postedAt: "Oct 24, 2026 • 9:00 AM",
    timeAgo: "Posted 5 hours ago",
    clientRating: 4.9,
    ratingCount: 42,
    positionsNeeded: 2,
    applicantsCount: 14,
    timeline: "1-2 Weeks",
    thumbnail: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80",
    isSaved: false,
    isOwnPost: false
  }
];

type TabType = "all" | "saved" | "my-posts";

// --- SKELETON LOADING COMPONENTS ---
const SearchBarSkeleton = () => (
  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center w-full">
    <div className="h-11 w-36 animate-pulse rounded-full bg-white/10 shrink-0" />
    <div className="h-11 flex-1 animate-pulse rounded-full bg-white/5" />
  </div>
);

const TabsSkeleton = () => (
  <div className="mb-8 flex gap-1 border-b border-white/10">
    {[1, 2, 3].map((i) => (
      <div key={i} className="h-11 w-32 animate-pulse border-b-2 border-transparent px-6 py-3" />
    ))}
  </div>
);

const SidebarSkeleton = () => (
  <div className="space-y-6">
    {/* Categories Card Skeleton */}
    <div className="rounded-2xl border border-white/10 bg-[#0d0f1a]/60 p-5 backdrop-blur-sm">
      <div className="mb-4 h-3 w-20 animate-pulse rounded bg-white/10" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-9 w-full animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    </div>
    {/* Filter Card Skeleton */}
    <div className="rounded-2xl border border-white/10 bg-[#0d0f1a]/60 p-5 backdrop-blur-sm space-y-4">
      <div className="h-3 w-28 animate-pulse rounded bg-white/10" />
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-white/5" />
        <div className="flex gap-2">
          <div className="h-8 flex-1 animate-pulse rounded-lg bg-white/5" />
          <div className="h-8 flex-1 animate-pulse rounded-lg bg-white/5" />
        </div>
      </div>
      <div className="space-y-2 pt-2">
        <div className="h-4 w-16 animate-pulse rounded bg-white/5" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-4 w-32 animate-pulse rounded bg-white/5" />
        ))}
      </div>
    </div>
  </div>
);

const JobCardSkeleton = () => (
  <div className="flex flex-col md:flex-row gap-6 rounded-2xl border border-white/10 bg-[#0d0f1a]/40 p-5 animate-pulse">
    {/* Thumbnail Skeleton */}
    <div className="h-40 w-full md:w-64 shrink-0 rounded-xl bg-white/5" />
    {/* Content Skeleton */}
    <div className="flex-1 flex flex-col justify-between py-1">
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="h-5 w-12 rounded bg-white/10" />
          <div className="h-5 w-16 rounded bg-white/10" />
          <div className="h-5 w-14 rounded bg-white/5" />
        </div>
        <div className="h-5 w-28 rounded bg-white/10" />
        <div className="h-6 w-3/4 rounded bg-white/10" />
        <div className="space-y-1.5">
          <div className="h-4 w-full rounded bg-white/5" />
          <div className="h-4 w-5/6 rounded bg-white/5" />
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-white/10" />
          <div className="h-4 w-24 rounded bg-white/5" />
        </div>
        <div className="flex gap-2">
          <div className="h-5 w-28 rounded bg-white/5" />
          <div className="h-5 w-20 rounded bg-white/5" />
        </div>
      </div>
    </div>
  </div>
);

// --- MAIN DASHBOARD COMPONENT ---
const JobPostingMain: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("All");
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [jobsList, setJobsList] = useState<Job[]>(sampleJobs);

  // --- FILTER STATES ---
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [priceSort, setPriceSort] = useState<"inc" | "dec" | null>(null);
  const [selectedDiffs, setSelectedDifficulty] = useState<string[]>([]);
  const [posValue, setPosValue] = useState<string>("");
  const [posSort, setPosSort] = useState<"inc" | "dec" | null>(null);
  const [ratingSort, setRatingSort] = useState<boolean>(false);

  // Simulate dashboard loading sequence
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Monitor URL Route parameters for detailing drawer panel view synchronization
  useEffect(() => {
    if (id) {
      const foundJob = jobsList.find((j) => j.id === id);
      if (foundJob) setSelectedJob(foundJob);
      else navigate("/jobs", { replace: true });
    } else {
      setSelectedJob(null);
    }
  }, [id, jobsList, navigate]);

  const toggleSaveJob = (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    setJobsList(prev => prev.map(job => job.id === jobId ? { ...job, isSaved: !job.isSaved } : job));
  };

  const handleClearFilters = () => {
    setSearchQuery(""); setActiveCategoryFilter("All"); setMinPrice(""); setMaxPrice("");
    setPriceSort(null); setSelectedDifficulty([]); setPosValue(""); setPosSort(null); setRatingSort(false);
  };

  const filteredJobs = useMemo(() => {
    const result = jobsList.filter((job) => {
      const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) || job.postedBy.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategoryFilter === "All" || job.category === activeCategoryFilter;
      const matchesTab = activeTab === "all" || (activeTab === "saved" && job.isSaved) || (activeTab === "my-posts" && job.isOwnPost);
      const matchesMinPrice = minPrice === "" || job.minBudget >= parseInt(minPrice);
      const matchesMaxPrice = maxPrice === "" || job.minBudget <= parseInt(maxPrice);
      const matchesDiff = selectedDiffs.length === 0 || selectedDiffs.includes(job.difficulty);
      const matchesPos = posValue === "" || job.positionsNeeded === parseInt(posValue);
      return matchesSearch && matchesCategory && matchesTab && matchesMinPrice && matchesMaxPrice && matchesDiff && matchesPos;
    });

    if (priceSort) result.sort((a, b) => priceSort === "inc" ? a.minBudget - b.minBudget : b.minBudget - a.minBudget);
    else if (posSort) result.sort((a, b) => posSort === "inc" ? a.positionsNeeded - b.positionsNeeded : b.positionsNeeded - a.positionsNeeded);
    else if (ratingSort) result.sort((a, b) => b.clientRating - a.clientRating);

    return result;
  }, [jobsList, searchQuery, activeCategoryFilter, activeTab, minPrice, maxPrice, priceSort, selectedDiffs, posValue, posSort, ratingSort]);

  // --- SKELETON SCREEN INTERFACE ---
  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#080a12] overflow-x-hidden">
        <UserHeader pageTitle="Job Posting" credits={1250} />
        <div className="mx-auto max-w-7xl p-6 md:p-8 w-full">
          <SearchBarSkeleton />
          <TabsSkeleton />
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
            <div className="space-y-6 sticky top-24">
              <SidebarSkeleton />
            </div>
            <div className="lg:col-span-3 space-y-4">
              {[1, 2, 3].map((i) => (
                <JobCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- ACTUAL RENDERING VIEW ---
  return (
    <div className="w-full min-h-screen bg-[#080a12] overflow-x-hidden relative">
      <UserHeader pageTitle="Job Posting" credits={1250} />

      <div className="mx-auto max-w-7xl p-6 md:p-8 w-full">
        {/* Top Bar Search */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center w-full">
          <button onClick={() => navigate("/jobs/create")} className="shrink-0 flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-black transition hover:scale-105">
            <Plus className="h-4 w-4" /> <span>Post a Job</span>
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input type="text" placeholder="Search by job title, client name, or keywords..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full rounded-full border border-white/10 bg-white/5 pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all" />
          </div>
        </div>

        {/* Tabs System */}
        <div className="mb-8 flex gap-1 border-b border-white/10">
          {[
            { id: "all", label: "All Jobs", icon: <Grid3x3 className="h-4 w-4" /> },
            { id: "saved", label: "Saved", icon: <Bookmark className="h-4 w-4" /> },
            { id: "my-posts", label: "My Job Posts", icon: <Briefcase className="h-4 w-4" /> }
          ].map((tab) => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id as TabType); navigate("/jobs"); }} className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all ${activeTab === tab.id ? "text-blue-400 border-b-2 border-blue-500 bg-blue-500/5" : "text-zinc-400 hover:text-white"}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Sidebars Panel */}
          <div className="space-y-6 sticky top-24">
            <CategoriesSidebar
              categories={[{ label: "All", count: 748 }, { label: "Social", count: 119 }, { label: "YouTube", count: 101 }, { label: "Corporate", count: 78 }, { label: "Events", count: 65 }]}
              activeCategory={activeCategoryFilter}
              onCategoryChange={setActiveCategoryFilter}
            />
            <FilterSidebar
              filters={{ minPrice, maxPrice, priceSort, selectedDiffs, posValue, posSort, ratingSort }}
              setters={{ setMinPrice, setMaxPrice, setPriceSort, setSelectedDifficulty, setPosValue, setPosSort, setRatingSort }}
              onClear={handleClearFilters}
            />
          </div>

          {/* Feed List Container Grid */}
          <div className="lg:col-span-3 space-y-4">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                onClick={() => navigate(`/jobs/${job.id}`)}
                className={`group flex flex-col md:flex-row gap-6 rounded-2xl border p-5 transition-all cursor-pointer ${id === job.id ? "border-blue-500 bg-blue-500/5 shadow-[0_0_30px_rgba(59,130,246,0.1)]" : "border-white/10 bg-[#0d0f1a]/40 hover:border-white/20"}`}
              >
                {/* Thumbnail Display Box */}
                <div className="h-40 w-full md:w-64 shrink-0 overflow-hidden rounded-xl bg-zinc-900 border border-white/5 relative">
                  <img src={job.thumbnail} alt="" className="h-full w-full object-cover opacity-80 transition-transform group-hover:scale-105 duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </div>

                {/* Content Layout Parameter Specs */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-green-500/20">{job.status}</span>
                        <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-blue-500/20">{job.difficulty}</span>
                        <span className="bg-white/5 text-zinc-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{job.category}</span>
                      </div>
                      <button onClick={(e) => toggleSaveJob(e, job.id)} className={`transition-colors ${job.isSaved ? "text-yellow-500" : "text-zinc-600 hover:text-white"}`}>
                        <Bookmark className={`h-5 w-5 ${job.isSaved ? "fill-current" : ""}`} />
                      </button>
                    </div>

                    <div className="text-yellow-500 text-lg font-black mb-1">{job.priceRange}</div>
                    <h3 className="text-white text-xl font-bold mb-1.5 group-hover:text-blue-400 transition-colors">{job.title}</h3>
                    <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed mb-3">{job.description}</p>
                    <p className="text-[11px] text-zinc-500 font-medium mb-1">{job.timeAgo}</p>
                  </div>

                  {/* Restored Metadata Row Footer Layout */}
                  <div className="mt-2 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between text-[11px] font-bold text-zinc-500 uppercase tracking-widest gap-3">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] text-white font-bold border border-white/10 overflow-hidden">
                        {job.postedBy.charAt(0)}
                      </div>
                      <div className="text-left leading-tight">
                        <p className="text-xs font-bold text-zinc-300 normal-case">{job.postedBy}</p>
                        <div className="flex items-center gap-1 text-[10px] text-yellow-500">
                          <Star className="h-2.5 w-2.5 fill-current" />
                          <span>{job.clientRating} ({job.ratingCount} reviews)</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-400 tracking-wider">
                      <span className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5">{job.positionsNeeded} Positions Needed</span>
                      <span className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5">{job.applicantsCount} Applicants</span>
                      <span className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-zinc-500" /> {job.timeline}
                      </span>
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- RIGHT SLIDE-OUT PANEL DRAWER --- */}
      <div className={`fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] transition-opacity ${selectedJob ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`} onClick={() => navigate("/jobs")} />
      <div className={`fixed right-0 top-0 bottom-0 w-full md:w-1/2 bg-[#0d0f1a] border-l border-white/10 z-[101] shadow-2xl flex flex-col transition-transform duration-300 ${selectedJob ? "translate-x-0" : "translate-x-full"}`}>
        {selectedJob && (
          <>
            <div className="relative h-64 shrink-0 bg-zinc-950 border-b border-white/5">
              <img src={selectedJob.thumbnail} alt="" className="w-full h-full object-cover opacity-60" />
              <button onClick={() => navigate("/jobs")} className="absolute top-5 left-5 h-10 w-10 flex items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition hover:scale-110"><X className="h-5 w-5" /></button>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f1a] to-transparent" />
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-green-500/15 border border-green-500/20 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase text-green-400">{selectedJob.status}</span>
                  <span className="bg-blue-500/15 border border-blue-500/20 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase text-blue-400">{selectedJob.difficulty}</span>
                  <span className="bg-white/5 border border-white/5 px-2.5 py-0.5 rounded-md text-[10px] font-medium text-zinc-300">{selectedJob.category}</span>
                </div>

                <h2 className="text-2xl font-bold text-white leading-tight mb-1">{selectedJob.title}</h2>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{selectedJob.postedAt} • {selectedJob.timeAgo}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                <p className="text-[10px] uppercase font-bold text-zinc-500 mb-0.5">Budget Range</p>
                <p className="text-xl font-extrabold text-yellow-500">{selectedJob.priceRange}</p>
              </div>

              {/* Extended Metrics Specs Grid Block */}
              <div className="grid grid-cols-3 gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.02] text-center text-xs">
                <div>
                  <p className="text-zinc-500 uppercase text-[9px] font-bold tracking-wider mb-1 flex items-center justify-center gap-1"><Clock className="h-3 w-3" /> Timeline</p>
                  <p className="text-zinc-200 font-semibold">{selectedJob.timeline}</p>
                </div>
                <div>
                  <p className="text-zinc-500 uppercase text-[9px] font-bold tracking-wider mb-1 flex items-center justify-center gap-1"><Briefcase className="h-3 w-3" /> Positions</p>
                  <p className="text-zinc-200 font-semibold">{selectedJob.positionsNeeded} Slot(s)</p>
                </div>
                <div>
                  <p className="text-zinc-500 uppercase text-[9px] font-bold tracking-wider mb-1 flex items-center justify-center gap-1"><Users className="h-3 w-3" /> Applicants</p>
                  <p className="text-zinc-200 font-semibold">{selectedJob.applicantsCount} Bidders</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <h4 className="text-xs uppercase font-bold tracking-wider text-zinc-400">Scope of Work & Requirements</h4>
                <div className="text-sm text-zinc-400 leading-relaxed whitespace-pre-line bg-white/[0.01] border border-white/5 p-4 rounded-xl">
                  {selectedJob.description}
                </div>
              </div>

              {/* Client Profile Segment Card */}
              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-zinc-800 flex items-center justify-center text-sm text-white font-bold border border-white/10">
                    {selectedJob.postedBy.charAt(0)}
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider mb-0.5">Project Client</p>
                    <p className="text-sm font-bold text-white leading-none">{selectedJob.postedBy}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 rounded-md bg-yellow-500/10 px-2.5 py-1 text-xs font-semibold text-yellow-500 border border-yellow-500/10">
                  <Star className="h-3 w-3 fill-current" />
                  <span>{selectedJob.clientRating} Rating</span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-white/10 bg-[#0d0f1a] shrink-0 flex gap-3">
              <button onClick={() => navigate("/jobs")} className="px-5 rounded-xl border border-white/10 text-zinc-400 font-bold hover:text-white transition">Close View</button>

              {!selectedJob.isOwnPost ? (
                <button
                  onClick={() => navigate(`/jobs/${selectedJob.id}/make-proposal`)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-500 py-3.5 text-sm font-bold text-white hover:bg-blue-600 transition shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                >
                  <Send className="h-4 w-4" /> Send Proposal
                </button>
              ) : (
                <button
                  onClick={() => navigate(`/jobs/manage/${selectedJob.id}`)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-zinc-800 border border-white/10 py-3.5 text-sm font-bold text-white hover:bg-zinc-700 transition"
                >
                  Manage Post Applicants
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
};

export default JobPostingMain;